// hooks/useProducts.ts
import axios from "axios";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { API_BASE_URL } from "../utils/constants";

export type Product = {
  id: string;
  sku?: string;
  title?: string;
  description?: string;
  brand?: { name?: string } | string | null;
  images?: Array<{ url: string }>;
  codes?: Array<{ code: string; code_type?: string }>;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

/**
 * Hook para buscar produtos - usando suas constantes
 */
export function useProducts(page = 1, limit = 20) {
  const queryKey = ["products", page, limit];

  return useQuery<Product[], Error>({
    queryKey,
    queryFn: async () => {
      console.log('📦 Buscando produtos:', { page, limit, API_BASE_URL });
      
      const res = await api.get("/api/v1/products", {
        params: { skip: (page - 1) * limit, limit },
      });
      
      const products = Array.isArray(res.data) ? res.data : res.data.products || [];
      console.log('✅ Produtos carregados:', products.length);
      
      return products;
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
    retry: 1,
  });
}