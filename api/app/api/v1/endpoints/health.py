from fastapi import APIRouter

router = APIRouter()

@router.get("/healthz")
async def health_check():
    return {"status": "ok", "version": "1.0.0", "service": "log-parts-api"}
