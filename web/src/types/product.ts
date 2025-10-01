import { CodeType } from "./common";

export interface Brand {
  id: string;
  name: string;
  logo_url?: string;
  active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  parent_id?: string;
  active: boolean;
  created_at: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  is_primary: boolean;
  order: number;
  created_at: string;
}

export interface ProductCode {
  id: string;
  code: string;
  code_type: CodeType;
  normalized_code: string;
  created_at: string;
}

export interface ProductApplication {
  id: string;
  vehicle_make?: string;
  vehicle_model?: string;
  engine_code?: string;
  year_from?: number;
  year_to?: number;
  notes?: string;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string;
  title: string;
  description?: string;
  type?: string;
  active: boolean;
  created_at: string;
  updated_at?: string;
  brand?: Brand;
  category?: Category;
  images: ProductImage[];
  codes: ProductCode[];
  applications?: ProductApplication[];
}
