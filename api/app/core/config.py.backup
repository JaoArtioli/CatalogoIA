from pydantic_settings import BaseSettings
from typing import List, Optional
import secrets
import os

class Settings(BaseSettings):
    # Basic
    app_name: str = "Catálogo Log Parts"
    environment: str = "development"
    log_level: str = "INFO"

    # API
    api_v1_str: str = "/api/v1"
    secret_key: str = secrets.token_urlsafe(32)

    # JWT
    jwt_secret_key: str = secrets.token_urlsafe(32)
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Database - CORRIGIDO para usar variável de ambiente do Docker
    database_url: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://logparts:logparts123@db:5432/logparts"  # db:5432 ao invés de localhost:5432
    )

    # Redis - CORRIGIDO para usar variável de ambiente do Docker
    redis_url: str = os.getenv(
        "REDIS_URL",
        "redis://redis:6379/0"  # redis:6379 ao invés de localhost:6379
    )

    # Upload
    max_upload_size: int = 10 * 1024 * 1024  # 10MB
    upload_path: str = "/app/uploads"
    allowed_image_types: List[str] = ["image/jpeg", "image/png", "image/webp"]

    # Search weights
    search_code_exact_weight: float = 0.55
    search_code_fuzzy_weight: float = 0.15
    search_text_weight: float = 0.15
    search_image_weight: float = 0.10
    search_app_weight: float = 0.03
    search_brand_weight: float = 0.02

    class Config:
        env_file = ".env"
        case_sensitive = False

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Debug: imprimir configuração do banco
        print(f"🔧 DATABASE_URL configurada: {self.database_url}")
        print(f"🔧 REDIS_URL configurada: {self.redis_url}")
        print(f"🔧 Ambiente: {self.environment}")

settings = Settings()