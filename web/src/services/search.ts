// web/src/services/search.ts
import api from "./api";
import { Product } from "@/types/product";
import { SearchType, ConfidenceLevel } from "@/types/common";

export interface SearchQuery {
  consulta: {
    tipo: SearchType;
    valor: string;
    confianca_min?: number;
  };
  opcoes?: {
    max_resultados?: number;
    incluir_similares?: boolean;
    incluir_aplicacoes?: boolean;
    filtros?: {
      brand_ids?: string[];
      category_ids?: string[];
      min_conf?: number;
      year_from?: number;
      year_to?: number;
    };
  };
}

export interface SearchResult {
  product: Product;
  confidence: number;
  nivel: ConfidenceLevel;
  explain: {
    code_exact?: number;
    code_fuzzy?: number;
    text_sim?: number;
    image_sim?: number;
    app_boost?: number;
    brand_boost?: number;
    matched_code?: string;
    match_type: string;
  };
}

export const searchProducts = async (query: SearchQuery): Promise<SearchResult[]> => {
  try {
    // USAR O NOVO ENDPOINT NORMALIZADO
    const response = await api.get("/search/normalized", {
      params: {
        q: query.consulta.valor,
        type: query.consulta.tipo.toLowerCase(),
        limit: query.opcoes?.max_resultados || 20
      }
    });
    
    if (response.data.success) {
      return response.data.products.map((product: any) => ({
        product,
        confidence: product.confidence?.score || 0,
        nivel: product.confidence?.level || 'baixo',
        explain: {
          match_type: product.confidence?.reasons?.[0] || 'unknown',
          matched_code: product.highlighted_codes || ''
        }
      }));
    }
    
    // Fallback para endpoint antigo se normalizado falhar
    const fallbackResponse = await api.post("/search", query);
    return fallbackResponse.data;
    
  } catch (error) {
    console.error('Erro na busca de produtos:', error);
    throw error;
  }
};

export const getSearchSuggestions = async (q: string, limit = 10): Promise<string[]> => {
  try {
    const response = await api.get("/search/suggestions", { params: { q, limit } });
    return response.data.suggestions ?? [];
  } catch (error) {
    console.error('Erro ao buscar sugestões:', error);
    return [];
  }
};

// Nova função para busca normalizada direta
export const searchProductsNormalized = async (
  query: string, 
  type: 'texto' | 'codigo' = 'codigo',
  limit = 20
): Promise<any> => {
  try {
    const response = await api.get("/search/normalized", {
      params: { q: query, type, limit }
    });
    
    return response.data;
  } catch (error) {
    console.error('Erro na busca normalizada:', error);
    throw error;
  }
};