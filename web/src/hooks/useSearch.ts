// web/src/hooks/useSearch.ts
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

const VITE_API = "http://192.168.7.35:8000";
const API_BASE = String(VITE_API).replace(/\/$/, "");

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export interface Product {
  id: string;
  title?: string;
  description?: string;
  sku?: string;
  brand?: string | { name: string };
  images?: Array<{ url: string }>;
  image_urls?: string;
  codes?: Array<{ code: string; type?: string }>;
  original_codes?: string;
  highlighted_codes?: string;
  _confidence_score?: number;
  _confidence_level?: 'alto' | 'medio' | 'baixo';
  _match_reasons?: string[];
  _match_type?: 'exact' | 'normalized' | 'partial' | 'fuzzy'; // NOVO
  confidence?: {
    score: number;
    level: 'alto' | 'medio' | 'baixo';
    reasons: string[];
    match_type?: 'exact' | 'normalized' | 'partial' | 'fuzzy'; // NOVO
  };
}

export interface SearchParams {
  query?: string;
  tipo?: 'TEXTO' | 'CODIGO' | 'IMAGEM';
  page?: number;
  limit?: number;
}

export interface SearchResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  confidence_stats: {
    total: number;
    alto: number;
    medio: number;
    baixo: number;
  };
  success?: boolean;
  message?: string;
}

function normalizeCode(code: string): string {
  if (!code) return '';
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// AUTO-DETECTAR SE É CÓDIGO OU TEXTO
function detectSearchType(searchQuery: string): 'codigo' | 'texto' {
  if (!searchQuery) return 'texto';
  
  const trimmed = searchQuery.trim();
  
  // Padrões que indicam código:
  const hasNumbers = /\d/.test(trimmed);
  const hasLetters = /[A-Za-z]/.test(trimmed);
  const hasTypicalCodePattern = /^[A-Za-z]{1,5}[\s\-\.\_]?\d+/.test(trimmed);
  const hasOnlyCodeChars = /^[A-Za-z0-9\s\-\.\_]+$/.test(trimmed);
  
  if (hasNumbers && hasLetters && (hasTypicalCodePattern || hasOnlyCodeChars)) {
    console.log(`🔍 Auto-detectado como CÓDIGO: "${trimmed}"`);
    return 'codigo';
  }
  
  console.log(`🔍 Auto-detectado como TEXTO: "${trimmed}"`);
  return 'texto';
}

// NOVA FUNÇÃO: Determinar tipo de match específico
function determineMatchType(product: Product, query: string, reasons: string[]): 'exact' | 'normalized' | 'partial' | 'fuzzy' {
  const searchTerm = query.toLowerCase().trim();
  const normalizedSearch = normalizeCode(query);
  
  // Verificar match exato
  if (product.sku && product.sku.toLowerCase() === searchTerm) {
    return 'exact';
  }
  
  // Verificar códigos originais
  if (product.original_codes) {
    const originalCodesArray = product.original_codes.split(' / ').map(code => code.trim());
    
    for (const code of originalCodesArray) {
      const lowerCode = code.toLowerCase();
      
      // Match exato no código original
      if (lowerCode === searchTerm) {
        return 'exact';
      }
      
      // Match normalizado (removeu separadores)
      const normalizedCode = normalizeCode(code);
      if (normalizedCode === normalizedSearch && normalizedCode !== query.toUpperCase()) {
        return 'normalized';
      }
    }
  }
  
  // Se chegou aqui, é match parcial ou fuzzy
  const hasPartialMatch = reasons.some(reason => 
    reason.includes('contém') || 
    reason.includes('parcial') ||
    reason.includes('Título') ||
    reason.includes('Descrição')
  );
  
  return hasPartialMatch ? 'partial' : 'fuzzy';
}

// NOVA FUNÇÃO: Gerar reasons mais específicos baseado no tipo de match
function generateSpecificReasons(product: Product, query: string, matchType: 'exact' | 'normalized' | 'partial' | 'fuzzy', originalReasons: string[]): string[] {
  const specificReasons: string[] = [];
  
  switch (matchType) {
    case 'exact':
      if (originalReasons.some(r => r.includes('SKU exato'))) {
        specificReasons.push('Match exato de SKU');
      } else if (originalReasons.some(r => r.includes('Código OEM exato'))) {
        specificReasons.push('Código original exato');
      } else if (originalReasons.some(r => r.includes('Título exato'))) {
        specificReasons.push('Título idêntico');
      } else {
        specificReasons.push('Match exato encontrado');
      }
      break;
      
    case 'normalized':
      if (originalReasons.some(r => r.includes('normalizado'))) {
        specificReasons.push('Match normalizado aprimorado');
      } else {
        specificReasons.push('Código com formatação similar');
      }
      break;
      
    case 'partial':
      if (originalReasons.some(r => r.includes('Título'))) {
        specificReasons.push('Encontrado no título');
      } else if (originalReasons.some(r => r.includes('SKU'))) {
        specificReasons.push('SKU relacionado');
      } else if (originalReasons.some(r => r.includes('Código'))) {
        specificReasons.push('Código parcialmente compatível');
      } else {
        specificReasons.push('Match parcial identificado');
      }
      break;
      
    case 'fuzzy':
      specificReasons.push('Similaridade detectada');
      break;
  }
  
  // Adicionar contexto adicional
  if (originalReasons.some(r => r.includes('Marca'))) {
    specificReasons.push('Marca compatível');
  }
  
  if (originalReasons.some(r => r.includes('Descrição'))) {
    specificReasons.push('Encontrado na descrição');
  }
  
  return specificReasons.length > 0 ? specificReasons : originalReasons;
}

function calculateConfidenceFallback(product: Product, query: string, tipo: string): { 
  score: number, 
  reasons: string[], 
  matchType: 'exact' | 'normalized' | 'partial' | 'fuzzy' 
} {
  const searchTerm = query.toLowerCase().trim();
  let score = 0;
  const reasons: string[] = [];

  console.log(`Analisando produto: ${product.sku} para busca: "${query}"`);

  // SKU Analysis
  if (product.sku && product.sku.toLowerCase() === searchTerm) {
    score += 100;
    reasons.push(`SKU exato: "${product.sku}"`);
  } else if (product.sku && product.sku.toLowerCase().includes(searchTerm)) {
    const similarity = searchTerm.length / product.sku.length;
    
    if (similarity >= 0.7) {
      // Match muito significativo (70%+ do SKU)
      score += 70;
      reasons.push(`SKU altamente relacionado: "${searchTerm}"`);
    } else if (similarity >= 0.4) {
      // Match moderado (40-70% do SKU)  
      score += 40;
      reasons.push(`SKU relacionado: "${searchTerm}"`);
    } else {
      // Match pequeno (<40% do SKU)
      score += 20;
      reasons.push(`SKU contém: "${searchTerm}"`);
    }
  }

  // Original Codes Analysis
  if (product.original_codes && product.original_codes.trim() !== '') {
    const originalCodesArray = product.original_codes.split(' / ').map(code => code.trim());
    let bestCodeMatch = 0;
    let matchedCode = '';
    
    for (const code of originalCodesArray) {
      const lowerCode = code.toLowerCase();
      
      if (lowerCode === searchTerm) {
        bestCodeMatch = Math.max(bestCodeMatch, 95);
        matchedCode = code;
        reasons.push(`Código OEM exato: "${code}"`);
        console.log(`Match exato: "${code}" = "${query}"`);
      } else if (lowerCode.includes(searchTerm)) {
        const similarity = searchTerm.length / lowerCode.length;
        const partialScore = Math.round(50 * similarity);
        if (partialScore > bestCodeMatch) {
          bestCodeMatch = partialScore;
          matchedCode = code;
        }
        console.log(`Match parcial: "${code}" contém "${query}"`);
      } else {
        const normalizedCode = normalizeCode(code);
        const normalizedSearch = normalizeCode(query);
        
        if (normalizedCode === normalizedSearch) {
          bestCodeMatch = Math.max(bestCodeMatch, 90);
          matchedCode = code;
          reasons.push(`Código OEM normalizado exato: "${code}"`);
          console.log(`Match normalizado: "${code}" = "${query}"`);
        } else if (normalizedCode.includes(normalizedSearch)) {
          const similarity = normalizedSearch.length / normalizedCode.length;
          const partialScore = Math.round(45 * similarity);
          if (partialScore > bestCodeMatch) {
            bestCodeMatch = partialScore;
            matchedCode = code;
          }
          console.log(`Match normalizado parcial: "${code}" contém "${query}"`);
        }
      }
    }
    
    if (bestCodeMatch > 0) {
      score += bestCodeMatch;
      if (bestCodeMatch < 95) {
        reasons.push(`Código OEM: "${matchedCode}"`);
      }
    }
  }

  // Title Analysis
  if (product.title) {
    const title = product.title.toLowerCase();
    if (title === searchTerm) {
      score += 85;
      reasons.push(`Título exato: "${product.title}"`);
    } else if (title.includes(searchTerm)) {
      // Ajustar score baseado no tamanho do termo vs título
      const titleWords = title.split(/\s+/).length;
      const searchWords = searchTerm.split(/\s+/).length;
      
      if (searchWords >= titleWords * 0.5) {
        // Se o termo de busca representa mais da metade do título
        score += 60;
        reasons.push(`Título muito relevante: "${searchTerm}"`);
      } else if (searchTerm.length >= 4) {
        // Termo significativo
        score += 35;
        reasons.push(`Título contém: "${searchTerm}"`);
      } else {
        // Termo muito pequeno
        score += 15;
        reasons.push(`Termo encontrado no título: "${searchTerm}"`);
      }
    }
  }

  // Brand Analysis
  const brandName = typeof product.brand === 'object' 
    ? (product.brand?.name || '').toLowerCase()
    : (product.brand || '').toLowerCase();
  
  if (brandName === searchTerm) {
    score += 40;
    reasons.push(`Marca exata: "${brandName}"`);
  } else if (brandName.includes(searchTerm)) {
    score += 20;
    reasons.push(`Marca contém: "${searchTerm}"`);
  }

  // Description Analysis
  if (product.description) {
    const description = product.description.toLowerCase();
    if (description.includes(searchTerm)) {
      score += 10;
      reasons.push(`Descrição contém: "${searchTerm}"`);
    }
  }

  // Determinar tipo de match
  const matchType = determineMatchType(product, query, reasons);
  
  console.log(`📊 Produto: ${product.sku}`);
  console.log(`   Score: ${score} → Nível: ${getConfidenceLevel(score)}`);
  console.log(`   Tipo: ${matchType}`);
  console.log(`   Razões: ${reasons.join(', ')}`);
  
  return { score, reasons, matchType };
}

function getConfidenceLevel(score: number): 'alto' | 'medio' | 'baixo' {
  if (score >= 85) return 'alto';   // Mais restritivo para verde
  if (score >= 50) return 'medio';  // Mais restritivo para amarelo
  return 'baixo';                   // Vermelho para o resto
}

export function useSearch(params: SearchParams) {
  const { query = '', tipo = 'TEXTO', page = 1, limit = 20 } = params;

  // AUTO-DETECTAR tipo se não especificado corretamente
  const autoDetectedType = detectSearchType(query);
  const finalType = (tipo === 'TEXTO' && autoDetectedType === 'codigo') ? 'CODIGO' : tipo;

  const queryKey = ['search', query, finalType, page, limit];

  return useQuery<SearchResponse, Error>({
    queryKey,
    queryFn: async () => {
      console.log('🔍 Iniciando busca:', { 
        query, 
        tipo_original: tipo, 
        tipo_detectado: autoDetectedType,
        tipo_final: finalType, 
        page, 
        limit 
      });

      if (!query.trim()) {
        return {
          products: [],
          total: 0,
          page,
          limit,
          hasMore: false,
          confidence_stats: { total: 0, alto: 0, medio: 0, baixo: 0 }
        };
      }

      try {
        // USAR SEMPRE O ENDPOINT NORMALIZADO
        console.log('🎯 Usando endpoint normalizado...');
        
        const searchRes = await api.get("/api/v1/search/normalized", {
          params: {
            q: query,
            type: finalType.toLowerCase(),
            skip: (page - 1) * limit,
            limit
          },
        });

        if (searchRes.data && searchRes.data.success) {
          console.log('✅ Sucesso com endpoint normalizado');
          console.log(`📈 Produtos encontrados: ${searchRes.data.products?.length || 0}`);
          
          const products = searchRes.data.products?.map((product: any) => {
            // SEMPRE recalcular localmente para ter controle total
            const localResult = calculateConfidenceFallback(product, query, finalType);
            const matchType = localResult.matchType;
            const score = localResult.score;
            const level = getConfidenceLevel(score);
            
            // Gerar reasons específicos baseado no tipo de match
            const specificReasons = generateSpecificReasons(product, query, matchType, localResult.reasons);
            
            console.log(`🎯 RESULTADO FINAL - ${product.sku}: ${score}pts → ${level} (${matchType})`);
            
            return {
              ...product,
              _confidence_score: score,                    // USA score local
              _confidence_level: level,                    // USA level local  
              _match_reasons: specificReasons,
              _match_type: matchType
            };
          }).filter((product: Product) => product._confidence_score && product._confidence_score > 0)
            .sort((a: Product, b: Product) => (b._confidence_score || 0) - (a._confidence_score || 0)) || []; // Ordenar por score local

          console.log(`🏆 TOP 3 RESULTADOS:`);
          products.slice(0, 3).forEach((p: Product, i: number) => {
            console.log(`${i + 1}. ${p.sku} → ${p._confidence_score}pts (${p._confidence_level}) - ${p._match_reasons?.[0]}`);
          });

          // Calcular estatísticas baseadas nos scores LOCAIS
          const confidence_stats = {
            total: products.length,
            alto: products.filter((p: Product) => p._confidence_level === 'alto').length,
            medio: products.filter((p: Product) => p._confidence_level === 'medio').length,
            baixo: products.filter((p: Product) => p._confidence_level === 'baixo').length,
          };

          console.log(`📊 ESTATÍSTICAS LOCAIS:`, confidence_stats);

          return {
            products,
            total: searchRes.data.total || products.length,
            page: searchRes.data.page || 1,
            limit: searchRes.data.limit || limit,
            hasMore: searchRes.data.hasMore || false,
            confidence_stats, // USA estatísticas locais
            success: true,
            message: searchRes.data.message || 'Busca realizada'
          };
        } else {
          console.log('⚠️ Endpoint normalizado retornou sem sucesso');
        }

      } catch (normalizedError) {
        console.log('❌ Erro no endpoint normalizado:', normalizedError);
      }

      // FALLBACK: Busca local apenas se o endpoint normalizado falhar
      try {
        console.log('🔄 Fazendo busca local como fallback...');
        
        const allProductsRes = await api.get("/api/v1/products", {
          params: { skip: 0, limit: 1000 }
        });

        if (!allProductsRes.data) {
          throw new Error('Nenhum produto encontrado na API');
        }

        const allProducts: Product[] = Array.isArray(allProductsRes.data) 
          ? allProductsRes.data 
          : allProductsRes.data.products || allProductsRes.data.data || [];

        console.log(`📦 Total de produtos no banco: ${allProducts.length}`);

        if (allProducts.length === 0) {
          return {
            products: [],
            total: 0,
            page,
            limit,
            hasMore: false,
            confidence_stats: { total: 0, alto: 0, medio: 0, baixo: 0 }
          };
        }

        const scoredProducts = allProducts
          .map(product => {
            const { score, reasons, matchType } = calculateConfidenceFallback(product, query, finalType);
            const specificReasons = generateSpecificReasons(product, query, matchType, reasons);
            
            return {
              ...product,
              _confidence_score: score,
              _confidence_level: getConfidenceLevel(score),
              _match_reasons: specificReasons,
              _match_type: matchType
            };
          })
          .filter(product => product._confidence_score && product._confidence_score > 0)
          .sort((a, b) => (b._confidence_score || 0) - (a._confidence_score || 0));

        console.log(`🎯 Produtos com match (fallback): ${scoredProducts.length}`);
        
        if (scoredProducts.length > 0) {
          console.log('✅ Produtos encontrados:');
          scoredProducts.slice(0, 3).forEach((p: Product) => {
            console.log(`  ${p.sku} (${p._confidence_score}%) [${p._match_type}]: ${p.title}`);
          });
        }

        const confidence_stats = {
          total: scoredProducts.length,
          alto: scoredProducts.filter((p: Product) => p._confidence_level === 'alto').length,
          medio: scoredProducts.filter((p: Product) => p._confidence_level === 'medio').length,
          baixo: scoredProducts.filter((p: Product) => p._confidence_level === 'baixo').length,
        };

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedProducts = scoredProducts.slice(startIndex, endIndex);
        const hasMore = endIndex < scoredProducts.length;

        return {
          products: paginatedProducts,
          total: scoredProducts.length,
          page,
          limit,
          hasMore,
          confidence_stats
        };

      } catch (error) {
        console.error('❌ Erro na busca:', error);
        throw error;
      }
    },
    enabled: !!query.trim(),
    staleTime: 1000 * 60 * 2,
    retry: 2,
  });
}