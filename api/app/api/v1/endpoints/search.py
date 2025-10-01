# api/app/api/v1/endpoints/search.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from sqlalchemy import text
import json
from app.core.database import get_db

router = APIRouter()

# Sistema de confiança
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
        if f" {search_lower} " in f" {original_codes} ":
            score += 50
            reasons.append("Código OEM exato")
        else:
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
            urls = []
            for url in image_urls_str.split(','):
                clean_url = url.strip().strip('"').strip("'").strip()
                clean_url = clean_url.replace('%22', '').replace('%27', '')
                if clean_url:
                    urls.append(clean_url)
            return urls
    except json.JSONDecodeError:
        urls = []
        for url in image_urls_str.split(','):
            clean_url = url.strip().strip('"').strip("'").strip()
            clean_url = clean_url.replace('%22', '').replace('%27', '')
            if clean_url:
                urls.append(clean_url)
        return urls

def parse_original_codes_to_array(original_codes_str):
    if not original_codes_str or original_codes_str.strip() == '':
        return []
    
    codes = [code.strip() for code in original_codes_str.split(' / ') if code.strip()]
    return [{"code": code, "type": "OEM"} for code in codes]

def normalize_code_simple(code: str) -> str:
    """Normalização simples de códigos"""
    if not code:
        return ""
    return ''.join(c.upper() for c in code if c.isalnum())

@router.get("/")
async def get_products(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    try:
        print(f"Buscando produtos: skip={skip}, limit={limit}")
        query = text("SELECT id, sku, title, description, brand, category, image_urls, original_codes, base_price FROM products ORDER BY id LIMIT :limit OFFSET :offset")
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
                "original_codes": row.original_codes,
                "images": [{"url": url} for url in parse_image_urls(row.image_urls)],
                "codes": parse_original_codes_to_array(row.original_codes),
                "base_price": float(row.base_price) if row.base_price else None
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
        print(f"Busca aprimorada: q={q}, type={type}")
        
        if type == "codigo":
            # Busca por código - incluindo SKU e códigos originais
            query = text("""
                SELECT id, sku, title, description, brand, category, image_urls, original_codes, base_price 
                FROM products 
                WHERE LOWER(sku) LIKE LOWER(:term) 
                   OR LOWER(original_codes) LIKE LOWER(:term)
                   -- Busca normalizada para códigos
                   OR UPPER(REPLACE(REPLACE(REPLACE(original_codes, '-', ''), ' ', ''), '.', '')) 
                      LIKE '%' || UPPER(REPLACE(REPLACE(REPLACE(:q, '-', ''), ' ', ''), '.', '')) || '%'
                   OR UPPER(REPLACE(REPLACE(REPLACE(sku, '-', ''), ' ', ''), '.', '')) 
                      LIKE '%' || UPPER(REPLACE(REPLACE(REPLACE(:q, '-', ''), ' ', ''), '.', '')) || '%'
                ORDER BY 
                    CASE 
                        WHEN LOWER(sku) = LOWER(:exact) THEN 1
                        WHEN LOWER(original_codes) LIKE LOWER(:exact_code) THEN 2
                        WHEN LOWER(sku) LIKE LOWER(:term) THEN 3
                        ELSE 4
                    END,
                    title
                LIMIT :limit OFFSET :offset
            """)
            result = db.execute(query, {
                "term": f"%{q}%", 
                "exact": q,
                "exact_code": f"% {q} %",
                "q": q,
                "limit": limit * 2, 
                "offset": skip
            })
        else:
            # Busca por texto - muito mais flexível
            # Divide a query em palavras para busca mais inteligente
            words = q.strip().split()
            
            if len(words) == 1:
                # Busca simples para uma palavra
                query = text("""
                    SELECT id, sku, title, description, brand, category, image_urls, original_codes, base_price 
                    FROM products 
                    WHERE LOWER(title) LIKE LOWER(:term) 
                       OR LOWER(description) LIKE LOWER(:term) 
                       OR LOWER(sku) LIKE LOWER(:term)
                       OR LOWER(brand) LIKE LOWER(:term)
                       OR LOWER(original_codes) LIKE LOWER(:term)
                    ORDER BY 
                        CASE 
                            WHEN LOWER(title) LIKE LOWER(:exact) THEN 1
                            WHEN LOWER(title) LIKE LOWER(:start) THEN 2
                            WHEN LOWER(sku) LIKE LOWER(:term) THEN 3
                            WHEN LOWER(brand) LIKE LOWER(:term) THEN 4
                            ELSE 5
                        END,
                        title
                    LIMIT :limit OFFSET :offset
                """)
                result = db.execute(query, {
                    "term": f"%{q}%",
                    "exact": q,
                    "start": f"{q}%",
                    "limit": limit * 2, 
                    "offset": skip
                })
            else:
                # Busca inteligente para múltiplas palavras
                # Cria condições para cada palavra
                word_conditions = []
                params = {"limit": limit * 2, "offset": skip}
                
                for i, word in enumerate(words):
                    if len(word) > 2:  # Ignora palavras muito pequenas
                        word_param = f"word_{i}"
                        word_conditions.append(f"LOWER(title) LIKE LOWER(:{word_param})")
                        word_conditions.append(f"LOWER(description) LIKE LOWER(:{word_param})")
                        params[word_param] = f"%{word}%"
                
                # Query dinâmica para múltiplas palavras
                conditions_sql = " OR ".join(word_conditions) if word_conditions else "1=1"
                
                # Conta quantas palavras encontrou para relevância
                score_conditions = []
                for param in params.keys():
                    if param.startswith('word_'):
                        score_conditions.append(f"(CASE WHEN LOWER(title) LIKE LOWER(:{param}) THEN 10 ELSE 0 END)")
                        score_conditions.append(f"(CASE WHEN LOWER(description) LIKE LOWER(:{param}) THEN 5 ELSE 0 END)")
                
                query = text(f"""
                    SELECT id, sku, title, description, brand, category, image_urls, original_codes, base_price,
                           -- Score baseado em quantas palavras encontrou
                           (CASE WHEN LOWER(title) LIKE LOWER(:full_term) THEN 100 ELSE 0 END +
                            {' + '.join(score_conditions) if score_conditions else '0'}
                           ) as relevance_score
                    FROM products 
                    WHERE ({conditions_sql})
                       OR LOWER(title) LIKE LOWER(:full_term)
                       OR LOWER(description) LIKE LOWER(:full_term)
                    ORDER BY relevance_score DESC, title
                    LIMIT :limit OFFSET :offset
                """)
                
                params["full_term"] = f"%{q}%"
                result = db.execute(query, params)
        
        products = []
        
        for row in result:
            products.append({
                "id": str(row.id),
                "sku": row.sku,
                "title": row.title,
                "description": row.description,
                "brand": {"name": row.brand} if row.brand else None,
                "original_codes": row.original_codes,
                "images": [{"url": url} for url in parse_image_urls(row.image_urls)],
                "codes": parse_original_codes_to_array(row.original_codes),
                "base_price": float(row.base_price) if row.base_price else None
            })
        
        products_with_confidence = enhance_products_with_confidence(products, q, type)
        paginated_products = products_with_confidence[skip:skip + limit]
        
        print(f"Produtos encontrados: {len(products_with_confidence)}")
        
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

@router.get("/normalized")
async def search_products_normalized_simple(
    q: str,
    type: str = "codigo",
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Busca normalizada melhorada"""
    try:
        print(f"Busca normalizada melhorada: q={q}, type={type}")
        
        if type == "codigo":
            # Normalização mais robusta para códigos
            query = text("""
                SELECT id, sku, title, description, brand, category, image_urls, original_codes, base_price 
                FROM products 
                WHERE 
                    -- Busca normal
                    LOWER(sku) LIKE LOWER(:term) 
                    OR LOWER(original_codes) LIKE LOWER(:term)
                    -- Busca normalizada (remove hífens, espaços, pontos)
                    OR UPPER(REPLACE(REPLACE(REPLACE(REPLACE(original_codes, '-', ''), ' ', ''), '.', ''), '_', '')) 
                       LIKE '%' || UPPER(REPLACE(REPLACE(REPLACE(REPLACE(:q, '-', ''), ' ', ''), '.', ''), '_', '')) || '%'
                    OR UPPER(REPLACE(REPLACE(REPLACE(REPLACE(sku, '-', ''), ' ', ''), '.', ''), '_', '')) 
                       LIKE '%' || UPPER(REPLACE(REPLACE(REPLACE(REPLACE(:q, '-', ''), ' ', ''), '.', ''), '_', '')) || '%'
                ORDER BY 
                    CASE 
                        WHEN LOWER(sku) = LOWER(:q) THEN 1
                        WHEN LOWER(original_codes) LIKE LOWER(:exact_code) THEN 2
                        WHEN LOWER(sku) LIKE LOWER(:term) THEN 3
                        ELSE 4
                    END,
                    title
                LIMIT :limit OFFSET :offset
            """)
            
            result = db.execute(query, {
                "term": f"%{q}%",
                "q": q,
                "exact_code": f"% {q} %",
                "limit": limit,
                "offset": skip
            })
            
        else:
            # Busca por texto usando a mesma lógica melhorada
            words = q.strip().split()
            
            if len(words) == 1:
                query = text("""
                    SELECT id, sku, title, description, brand, category, image_urls, original_codes, base_price 
                    FROM products 
                    WHERE LOWER(title) LIKE LOWER(:term) 
                       OR LOWER(description) LIKE LOWER(:term) 
                       OR LOWER(sku) LIKE LOWER(:term)
                       OR LOWER(brand) LIKE LOWER(:term)
                    ORDER BY 
                        CASE 
                            WHEN LOWER(title) = LOWER(:q) THEN 1
                            WHEN LOWER(title) LIKE LOWER(:start) THEN 2
                            ELSE 3
                        END,
                        title
                    LIMIT :limit OFFSET :offset
                """)
                result = db.execute(query, {
                    "term": f"%{q}%", 
                    "q": q,
                    "start": f"{q}%",
                    "limit": limit, 
                    "offset": skip
                })
            else:
                # Para múltiplas palavras, busca que cada palavra apareça
                word_likes = []
                params = {"limit": limit, "offset": skip}
                
                for i, word in enumerate(words):
                    if len(word) > 2:
                        param = f"word_{i}"
                        word_likes.append(f"(LOWER(title) LIKE LOWER(:{param}) OR LOWER(description) LIKE LOWER(:{param}))")
                        params[param] = f"%{word}%"
                
                if word_likes:
                    conditions = " AND ".join(word_likes)
                    query = text(f"""
                        SELECT id, sku, title, description, brand, category, image_urls, original_codes, base_price 
                        FROM products 
                        WHERE {conditions}
                           OR LOWER(title) LIKE LOWER(:full_term)
                        ORDER BY 
                            CASE 
                                WHEN LOWER(title) LIKE LOWER(:full_term) THEN 1
                                ELSE 2
                            END,
                            title
                        LIMIT :limit OFFSET :offset
                    """)
                    params["full_term"] = f"%{q}%"
                    result = db.execute(query, params)
                else:
                    # Fallback para busca simples
                    query = text("""
                        SELECT id, sku, title, description, brand, category, image_urls, original_codes, base_price 
                        FROM products 
                        WHERE LOWER(title) LIKE LOWER(:term)
                        LIMIT :limit OFFSET :offset
                    """)
                    result = db.execute(query, {"term": f"%{q}%", "limit": limit, "offset": skip})
        
        products = []
        for row in result:
            products.append({
                "id": str(row.id),
                "sku": row.sku,
                "title": row.title,
                "description": row.description,
                "brand": {"name": row.brand} if row.brand else None,
                "original_codes": row.original_codes,
                "images": [{"url": url} for url in parse_image_urls(row.image_urls)],
                "codes": parse_original_codes_to_array(row.original_codes),
                "base_price": float(row.base_price) if row.base_price else None,
                "confidence": {"score": 85, "level": "alto", "reasons": ["Match normalizado aprimorado"]}
            })
        
        return {
            "success": True,
            "products": products,
            "total": len(products),
            "page": (skip // limit) + 1,
            "limit": limit,
            "hasMore": len(products) == limit,
            "confidence_stats": {"total": len(products), "alto": len(products), "medio": 0, "baixo": 0}
        }
        
    except Exception as e:
        print(f"ERRO na busca normalizada: {e}")
        return {
            "success": False,
            "products": [],
            "total": 0,
            "error": str(e)
        }

@router.get("/{product_id}")
async def get_product(
    product_id: str = Path(...),
    db: Session = Depends(get_db)
):
    try:
        query = text("SELECT id, sku, title, description, brand, category, image_urls, original_codes, base_price FROM products WHERE id = :id OR sku = :sku LIMIT 1")
        result = db.execute(query, {"id": product_id, "sku": product_id})
        row = result.first()
        
        if row:
            return {
                "id": str(row.id),
                "sku": row.sku,
                "title": row.title,
                "description": row.description,
                "brand": {"name": row.brand} if row.brand else None,
                "original_codes": row.original_codes,
                "images": [{"url": url} for url in parse_image_urls(row.image_urls)],
                "codes": parse_original_codes_to_array(row.original_codes),
                "base_price": float(row.base_price) if row.base_price else None
            }
        raise HTTPException(status_code=404, detail="Produto nao encontrado")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERRO ao buscar produto {product_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")