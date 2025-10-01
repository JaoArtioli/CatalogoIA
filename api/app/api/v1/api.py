# api/app/api/v1/api.py
from fastapi import APIRouter
from app.api.v1.endpoints import products, search, health, pricing, suggestions

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(pricing.router, prefix="/pricing", tags=["pricing"])
api_router.include_router(suggestions.router, prefix="/suggestions", tags=["suggestions"])
