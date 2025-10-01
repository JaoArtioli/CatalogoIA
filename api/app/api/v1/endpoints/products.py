from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from sqlalchemy import text
import json
from app.core.database import get_db

router = APIRouter()

# Sistema de confiança (copie do arquivo confidence.py)
def calculate_confidence_score(product, search_query, search_type):
    score = 0
    reasons = []
    search_lower = search_query.lower().strip()
    
    # Verificar SKU
    sku = str(product.get("sku", "")).lower()
    if search_type == "codigo" or search_type == "CODIGO":
        if sku == search_lower:
            score += 45
            reasons.append("SKU exato")
        elif search_lower in sku or sku in search_lower:
            score += 25
            reasons.append("SKU parcial")
    
    # Verificar códigos originais
    original_codes = str(product.get("original_codes", "")).lower()
    if original_codes and search_lower in original_codes:
        if f" {search_lower} " in f" {original_codes} ":  # Match exato
            score += 50
            reasons.append("Código OEM exato")
        else:  # Match parcial
            score += 35
            reasons.append("Código OEM parcial")
    
    title = str(product.get("title", "")).lower()
    description = str(product.get("description", "")).lower()
    
    if search_type == "texto" or search_type == "TEXTO":
        if search_lower == title:
            score += 40
            reasons.append("Título exato")
        elif search_lower in title:
            if len(search_lower) > 3:
                score += 25
                reasons.append("Título contém termo")
            else:
                score += 15
                reasons.append("Termo encontrado no título")
        
        if search_lower in description:
            if len(search_lower) > 5:
                score += 15
                reasons.append("Descrição contém termo")
            else:
                score += 8
                reasons.append("Termo na descrição")
        
        if search_lower in sku:
            score += 20
            reasons.append("SKU relacionado")
    
    brand = product.get("brand")
    if brand:
        brand_name = ""
        if isinstance(brand, dict):
            brand_name = str(brand.get("name", "")).lower()
        elif isinstance(brand, str):
            brand_name = brand.lower()
        
        if search_lower in brand_name or brand_name in search_lower:
            score += 12
            reasons.append("Marca correspondente")
    
    if product.get("images") and len(product["images"]) > 0:
        score += 8
        reasons.append("Tem imagens")
    
    if description and len(description) > 100:
        score += 5
        reasons.append("Descrição detalhada")
    
    if not title or len(title) < 10:
        score -= 10
        reasons.append("Título incompleto")
    
    if score >= 70:
        level = "alto"
    elif score >= 40:
        level = "medio"
    else:
        level = "baixo"
    
    return {
        "level": level,
        "score": min(max(score, 0), 100),
        "reasons": reasons
    }

def enhance_products_with_confidence(products, search_query, search_type):
    enhanced_products = []
    
    for product in products:
        confidence = calculate_confidence_score(product, search_query, search_type)
        enhanced_product = {
            **product,
            "confidence": confidence
        }
        enhanced_products.append(enhanced_product)
    
    priority_order = {"alto": 3, "medio": 2, "baixo": 1}
    enhanced_products.sort(
        key=lambda x: (
            priority_order.get(x["confidence"]["level"], 0),  
            x["confidence"]["score"],
            x.get("title", "")
        ), 
        reverse=True
    )
    
    return enhanced_products

def get_confidence_stats(products):
    if not products:
        return {"total": 0, "alto": 0, "medio": 0, "baixo": 0}
    
    stats = {"total": len(products), "alto": 0, "medio": 0, "baixo": 0}
    
    for product in products:
        confidence_level = product.get("confidence", {}).get("level", "baixo")
        if confidence_level in stats:
            stats[confidence_level] += 1
    
    return stats

def parse_image_urls(image_urls_str):
    if not image_urls_str:
        return []
    
    try:
        if image_urls_str.startswith('[') and image_urls_str.endswith(']'):
            urls = json.loads(image_urls_str)
            return [url.strip() for url in urls if url.strip()]
        else:
            return [url.strip().strip('"').strip("'") for url in image_urls_str.split(',') if url.strip()]
            
    except json.JSONDecodeError:
        return [url.strip().strip('"').strip("'") for url in image_urls_str.split(',') if url.strip()]

def parse_original_codes_to_array(original_codes_str):
    """Converte string 'HY 1534017 / YA 580039672' em array de objetos"""
    if not original_codes_str or original_codes_str.strip() == '':
        return []
    
    codes = [code.strip() for code in original_codes_str.split(' / ') if code.strip()]
    return [{"code": code, "type": "OEM"} for code in codes]

@router.get("/")
async def get_products(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    try:
        print(f"Buscando produtos: skip={skip}, limit={limit}")
        # INCLUINDO original_codes na query
        query = text("SELECT id, sku, title, description, brand, category, image_urls, original_codes FROM products ORDER BY id LIMIT :limit OFFSET :offset")
        result = db.execute(query, {"limit": limit, "offset": skip})
        
        products = []
        count = 0
        for row in result:
            count += 1
            products.append({
                "id": str(row.id),
                "sku": row.sku,
                "title": row.title,
                "description": row.description,
                "brand": {"name": row.brand} if row.brand else None,
                "original_codes": row.original_codes,  # ADICIONADO
                "images": [{"url": url} for url in parse_image_urls(row.image_urls)],
                "codes": parse_original_codes_to_array(row.original_codes)  # ADICIONADO
            })
        
        print(f"Produtos encontrados: {count}")
        return products
        
    except Exception as e:
        print(f"ERRO ao buscar produtos: {e}")
        return [{"id": "1", "sku": "ERROR", "title": f"Erro de conexao: {str(e)}", "description": "Verifique logs", "brand": None, "images": [], "codes": [], "original_codes": ""}]

@router.get("/search")
async def search_products_get(
    q: str,
    type: str = "texto",
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    try:
        print(f"Busca com confiança: q={q}, type={type}")
        
        if type == "codigo":
            # INCLUINDO original_codes na busca por código
            query = text("""
                SELECT id, sku, title, description, brand, category, image_urls, original_codes 
                FROM products 
                WHERE LOWER(sku) LIKE LOWER(:term) 
                   OR LOWER(original_codes) LIKE LOWER(:term)
                ORDER BY 
                    CASE 
                        WHEN LOWER(sku) = LOWER(:exact) THEN 1
                        WHEN LOWER(original_codes) LIKE LOWER(:exact_code) THEN 2
                        ELSE 3
                    END,
                    id 
                LIMIT :limit OFFSET :offset
            """)
            result = db.execute(query, {
                "term": f"%{q}%", 
                "exact": q,
                "exact_code": f"% {q} %",
                "limit": limit * 2, 
                "offset": skip
            })
        else:
            # INCLUINDO original_codes na busca por texto
            query = text("""
                SELECT id, sku, title, description, brand, category, image_urls, original_codes 
                FROM products 
                WHERE LOWER(title) LIKE LOWER(:term) 
                   OR LOWER(description) LIKE LOWER(:term) 
                   OR LOWER(sku) LIKE LOWER(:term)
                   OR LOWER(original_codes) LIKE LOWER(:term)
                ORDER BY 
                    CASE 
                        WHEN LOWER(title) LIKE LOWER(:exact) THEN 1
                        WHEN LOWER(sku) = LOWER(:q) THEN 2
                        WHEN LOWER(original_codes) LIKE LOWER(:exact_code) THEN 3
                        ELSE 4
                    END,
                    id 
                LIMIT :limit OFFSET :offset
            """)
            result = db.execute(query, {
                "term": f"%{q}%",
                "exact": f"%{q}%", 
                "q": q,
                "exact_code": f"% {q} %",
                "limit": limit * 2, 
                "offset": skip
            })
        
        products = []
        
        for row in result:
            products.append({
                "id": str(row.id),
                "sku": row.sku,
                "title": row.title,
                "description": row.description,
                "brand": {"name": row.brand} if row.brand else None,
                "original_codes": row.original_codes,  # ADICIONADO
                "images": [{"url": url} for url in parse_image_urls(row.image_urls)],
                "codes": parse_original_codes_to_array(row.original_codes)  # ADICIONADO
            })
        
        # Sistema de confiança
        products_with_confidence = enhance_products_with_confidence(products, q, type)
        paginated_products = products_with_confidence[skip:skip + limit]
        
        print(f"Produtos com confiança: {len(products_with_confidence)}")
        
        return {
            "products": paginated_products,
            "total": len(products_with_confidence),
            "page": (skip // limit) + 1,
            "limit": limit,
            "hasMore": len(products_with_confidence) > skip + limit,
            "confidence_stats": get_confidence_stats(products_with_confidence)
        }
        
    except Exception as e:
        print(f"ERRO na busca: {e}")
        return {"products": [], "total": 0, "page": 1, "limit": limit, "hasMore": False, "confidence_stats": {"total": 0, "alto": 0, "medio": 0, "baixo": 0}}

@router.get("/{product_id}")
async def get_product(
    product_id: str = Path(...),
    db: Session = Depends(get_db)
):
    try:
        # INCLUINDO original_codes na query
        query = text("SELECT id, sku, title, description, brand, category, image_urls, original_codes FROM products WHERE id = :id OR sku = :sku LIMIT 1")
        result = db.execute(query, {"id": product_id, "sku": product_id})
        row = result.first()
        
        if row:
            return {
                "id": str(row.id),
                "sku": row.sku,
                "title": row.title,
                "description": row.description,
                "brand": {"name": row.brand} if row.brand else None,
                "original_codes": row.original_codes,  # ADICIONADO
                "images": [{"url": url} for url in parse_image_urls(row.image_urls)],
                "codes": parse_original_codes_to_array(row.original_codes)  # ADICIONADO
            }
        raise HTTPException(status_code=404, detail="Produto nao encontrado")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERRO ao buscar produto {product_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")