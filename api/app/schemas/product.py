from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class BrandBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    logo_url: Optional[str] = None

class BrandResponse(BrandBase):
    id: str
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    parent_id: Optional[str] = None

class CategoryResponse(CategoryBase):
    id: str
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ProductImageBase(BaseModel):
    url: str = Field(..., max_length=500)
    alt: Optional[str] = Field(None, max_length=200)
    is_primary: bool = False
    order: int = 0

class ProductImageResponse(ProductImageBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class ProductCodeBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=100)
    code_type: str = Field(..., regex="^(OEM|ALT|INTERNO)$")

class ProductCodeResponse(ProductCodeBase):
    id: str
    normalized_code: str
    created_at: datetime

    class Config:
        from_attributes = True

class ProductApplicationBase(BaseModel):
    vehicle_make: Optional[str] = Field(None, max_length=50)
    vehicle_model: Optional[str] = Field(None, max_length=100)
    engine_code: Optional[str] = Field(None, max_length=50)
    year_from: Optional[int] = Field(None, ge=1950, le=2050)
    year_to: Optional[int] = Field(None, ge=2050, le=2050)
    notes: Optional[str] = None

class ProductApplicationResponse(ProductApplicationBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    sku: str = Field(..., min_length=1, max_length=50)
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    type: Optional[str] = Field(None, max_length=50)
    brand_id: Optional[str] = None
    category_id: Optional[str] = None

class ProductCreate(ProductBase):
    images: Optional[List[ProductImageBase]] = []
    codes: Optional[List[ProductCodeBase]] = []
    applications: Optional[List[ProductApplicationBase]] = []

class ProductUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    type: Optional[str] = Field(None, max_length=50)
    brand_id: Optional[str] = None
    category_id: Optional[str] = None
    active: Optional[bool] = None

class ProductResponse(ProductBase):
    id: str
    active: bool = True
    original_codes: Optional[str] = None  # ADICIONADO - String de códigos OEM
    image_urls: Optional[str] = None      # ADICIONADO - String de URLs de imagem
    created_at: datetime
    updated_at: Optional[datetime]
    brand: Optional[BrandResponse]
    category: Optional[CategoryResponse]
    images: List[ProductImageResponse] = []
    codes: List[ProductCodeResponse] = []

    class Config:
        from_attributes = True

class ProductDetail(ProductResponse):
    applications: List[ProductApplicationResponse] = []

# Schema simplificado para responses da API atual
class SimpleProductResponse(BaseModel):
    id: str
    sku: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    brand: Optional[dict] = None
    category: Optional[str] = None
    original_codes: Optional[str] = None  # String separada por " / "
    images: List[dict] = []               # Array de {"url": "..."}
    codes: List[dict] = []                # Array de {"code": "...", "type": "OEM"}

    class Config:
        from_attributes = True