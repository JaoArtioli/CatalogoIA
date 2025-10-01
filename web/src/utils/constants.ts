// utils/constants.ts
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const APP_NAME = import.meta.env.VITE_APP_NAME || "Catálogo Log Parts";

export const SEARCH_TYPES = {
  CODIGO: "codigo",
  TEXTO: "texto", 
  IMAGEM: "imagem",
} as const;

export const CONFIDENCE_LEVELS = {
  ALTO: "alto",
  MEDIO: "medio",
  BAIXO: "baixo",
} as const;

export const CODE_TYPES = {
  OEM: "OEM",
  ALT: "ALT",
  INTERNO: "INTERNO",
} as const;