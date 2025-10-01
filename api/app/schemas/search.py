from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class SearchType(str, Enum):
    codigo = "codigo"
    texto = "texto"
    imagem = "imagem"

class ConsultaQuery(BaseModel):
    tipo: SearchType
    valor: str = Field(..., min_length=1, max_length=500)
    confianca_min: Optional[float] = Field(0.1, ge=0.0, le=1.0)

class SearchFilters(BaseModel):
    brand_ids: Optional[List[str]] = None
    category_ids: Optional[List[str]] = None
    min_conf: Optional[int] = Field(None, ge=0, le=100)
    year_from: Optional[int] = None
    year_to: Optional[int] = None

class SearchOptions(BaseModel):
    max_resultados: int = Field(20, ge=1, le=100)
    incluir_similares: bool = True
    incluir_aplicacoes: bool = True
    filtros: Optional[SearchFilters] = None

class SearchQuery(BaseModel):
    consulta: ConsultaQuery
    opcoes: Optional[SearchOptions] = None

class SearchExplanation(BaseModel):
    code_exact: Optional[float] = None
    code_fuzzy: Optional[float] = None
    text_sim: Optional[float] = None
    image_sim: Optional[float] = None
    app_boost: Optional[float] = None
    brand_boost: Optional[float] = None
    matched_code: Optional[str] = None
    match_type: str

class SearchResult(BaseModel):
    product: Dict[str, Any]
    confidence: int = Field(..., ge=0, le=100)
    nivel: str = Field(..., pattern="^(alto|medio|baixo)$")
    explain: SearchExplanation

    class Config:
        from_attributes = True
