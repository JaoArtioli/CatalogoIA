// hooks/useSmartSuggestions.ts
import { useState, useEffect, useCallback } from 'react';
import { SKUNormalizer } from '../utils/skuNormalizer';

interface Suggestion {
  text: string;
  type: 'history' | 'popular' | 'similar' | 'correction';
  confidence: number;
  metadata?: {
    count?: number;
    distance?: number;
    lastUsed?: Date;
  };
}

interface SearchHistory {
  query: string;
  timestamp: Date;
  count: number;
}

export const useSmartSuggestions = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Gerenciar histórico local
  const getSearchHistory = (): SearchHistory[] => {
    try {
      const history = localStorage.getItem('search_history');
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  };

  const saveSearch = (query: string) => {
    if (!query.trim()) return;
    
    const history = getSearchHistory();
    const existing = history.find(item => item.query.toLowerCase() === query.toLowerCase());
    
    if (existing) {
      existing.count++;
      existing.timestamp = new Date();
    } else {
      history.unshift({
        query: query.trim(),
        timestamp: new Date(),
        count: 1
      });
    }

    // Manter apenas os últimos 50 itens
    const limitedHistory = history
      .sort((a, b) => b.count - a.count) // Ordenar por frequência
      .slice(0, 50);

    localStorage.setItem('search_history', JSON.stringify(limitedHistory));
  };

  // Buscar sugestões da API
  const fetchAPISuggestions = async (query: string): Promise<Suggestion[]> => {
    try {
      const response = await fetch(`/api/v1/suggestions?q=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        return data.suggestions.map((item: any) => ({
          text: item.sku || item.text,
          type: 'popular' as const,
          confidence: item.confidence || 0.8,
          metadata: { count: item.search_count }
        }));
      }
    } catch (error) {
      console.warn('Erro ao buscar sugestões da API:', error);
    }
    return [];
  };

  // Gerar sugestões inteligentes
  const generateSuggestions = useCallback(async (query: string): Promise<Suggestion[]> => {
    if (!query || query.length < 2) return [];

    const allSuggestions: Suggestion[] = [];
    const lowerQuery = query.toLowerCase();

    // 1. Histórico de buscas
    const history = getSearchHistory();
    const historySuggestions = history
      .filter(item => item.query.toLowerCase().includes(lowerQuery))
      .slice(0, 5)
      .map(item => ({
        text: item.query,
        type: 'history' as const,
        confidence: Math.min(0.9, 0.5 + (item.count * 0.1)),
        metadata: { count: item.count, lastUsed: item.timestamp }
      }));

    allSuggestions.push(...historySuggestions);

    // 2. Normalizações de SKU
    const skuVariations = SKUNormalizer.normalize(query);
    const skuSuggestions = skuVariations
      .filter(variation => variation !== query.toUpperCase())
      .slice(0, 3)
      .map(variation => ({
        text: variation,
        type: 'correction' as const,
        confidence: 0.85,
        metadata: { distance: 1 }
      }));

    allSuggestions.push(...skuSuggestions);

    // 3. Correções automáticas
    const corrections = SKUNormalizer.generateCorrections(query);
    const correctionSuggestions = corrections
      .slice(0, 2)
      .map(correction => ({
        text: correction,
        type: 'correction' as const,
        confidence: 0.75,
        metadata: { distance: 2 }
      }));

    allSuggestions.push(...correctionSuggestions);

    // 4. Sugestões da API (produtos populares)
    try {
      const apiSuggestions = await fetchAPISuggestions(query);
      allSuggestions.push(...apiSuggestions);
    } catch (error) {
      console.warn('Erro ao buscar sugestões da API');
    }

    // 5. Remover duplicatas e ordenar por confiança
    const uniqueSuggestions = allSuggestions
      .filter((suggestion, index, array) => 
        array.findIndex(s => s.text.toLowerCase() === suggestion.text.toLowerCase()) === index
      )
      .filter(suggestion => suggestion.text.toLowerCase() !== lowerQuery)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);

    return uniqueSuggestions;
  }, []);

  // Hook principal para buscar sugestões
  const getSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await generateSuggestions(query);
      setSuggestions(results);
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [generateSuggestions]);

  // Debounce para evitar muitas requisições
  const [debouncedGetSuggestions] = useState(() => {
    let timeoutId: NodeJS.Timeout;
    return (query: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => getSuggestions(query), 300);
    };
  });

  return {
    suggestions,
    isLoading,
    getSuggestions: debouncedGetSuggestions,
    saveSearch,
    clearHistory: () => localStorage.removeItem('search_history')
  };
};