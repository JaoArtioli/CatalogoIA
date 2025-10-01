export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export type SearchType = "codigo" | "texto" | "imagem";
export type ConfidenceLevel = "alto" | "medio" | "baixo";
export type CodeType = "OEM" | "ALT" | "INTERNO";
