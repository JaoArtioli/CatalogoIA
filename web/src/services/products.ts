import api from "./api";
import { Product } from "@/types/product";

export const getProducts = async (params: {
  skip?: number;
  limit?: number;
  brand_id?: string;
  category_id?: string;
  active_only?: boolean;
} = {}): Promise<Product[]> => {
  const response = await api.get("/products", { params });
  return response.data;
};

export const getProductById = async (id: string): Promise<Product> => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

export const getSimilarProducts = async (id: string, limit = 10): Promise<Product[]> => {
  const response = await api.get(`/products/${id}/similar`, { params: { limit } });
  return response.data;
};
