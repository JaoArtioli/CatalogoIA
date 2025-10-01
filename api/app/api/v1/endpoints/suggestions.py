# app/api/v1/endpoints/suggestions.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List, Optional
import re
from app.core.database import get_db
from app.models.product import Product

router = APIRouter()

class SKUNormalizer:
    """Normalizador de SKU para Python backend"""
    
    @staticmethod
    def normalize_sku(input_sku: str) -> List[str]:
        """Normaliza SKU em diferentes variações"""
        if not input_sku:
            return []
        
        variations = []
        clean = input_sku.strip().upper()
        variations.append(clean)
        
        # RV401031 → RV0401.0031
        if re.match(r'^RV\d{7,8}$', clean):
            digits = clean[2:]
            if len(digits) == 7:
                formatted = f"RV{digits[:4]}.{digits[4:]}"
                variations.append(formatted)
                # Com zero à esquerda
                with_zero = f"RV0{digits[:3]}.{digits[3:]}"
                variations.append(with_zero)
            elif len(digits) == 8:
                formatted = f"RV{digits[:4]}.{digits[4:]}"
                variations.append(formatted)
        
        # Adicionar/remover pontos
        if '.' in clean:
            without_dots = clean.replace('.', '')
            variations.append(without_dots)
        elif re.match(r'^RV\d{8}$', clean):
            digits = clean[2:]
            with_dot = f"RV{digits[:4]}.{digits[4:]}"
            variations.append(with_dot)
        
        return list(set(variations))
    
    @staticmethod
    def levenshtein_distance(s1: str, s2: str) -> int:
        """Calcula distância de Levenshtein"""
        if len(s1) < len(s2):
            return SKUNormalizer.levenshtein_distance(s2, s1)
        
        if len(s2) == 0:
            return len(s1)
        
        previous_row = list(range(len(s2) + 1))
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        
        return previous_row[-1]

@router.get("/suggestions")
async def get_smart_suggestions(
    q: str = Query(..., description="Query de busca"),
    limit: int = Query(10, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """Retorna sugestões inteligentes baseadas na query"""
    
    if not q or len(q.strip()) < 2:
        return {"suggestions": []}
    
    suggestions = []
    query = q.strip()
    
    try:
        # 1. Buscar SKUs similares (match exato ou próximo)
        sku_variations = SKUNormalizer.normalize_sku(query)
        
        if sku_variations:
            # Buscar variações normalizadas
            placeholders = ','.join([f':var{i}' for i in range(len(sku_variations))])
            params = {f'var{i}': var for i, var in enumerate(sku_variations)}
            
            similar_products = db.execute(
                text(f"""
                    SELECT DISTINCT sku, title, 
                           CASE 
                               WHEN UPPER(sku) = UPPER(:original) THEN 1.0
                               WHEN UPPER(sku) IN ({placeholders}) THEN 0.9
                               ELSE 0.8
                           END as confidence
                    FROM products 
                    WHERE UPPER(sku) IN ({placeholders}) OR UPPER(sku) = UPPER(:original)
                    ORDER BY confidence DESC
                    LIMIT :limit
                """),
                {**params, 'original': query, 'limit': limit // 2}
            ).fetchall()
            
            for product in similar_products:
                suggestions.append({
                    "text": product.sku,
                    "type": "similar",
                    "confidence": float(product.confidence),
                    "metadata": {"title": product.title}
                })
        
        # 2. Buscar por match parcial em SKU, título ou descrição
        partial_matches = db.execute(
            text("""
                SELECT sku, title,
                       CASE 
                           WHEN UPPER(sku) LIKE UPPER(:exact) THEN 1.0
                           WHEN UPPER(sku) LIKE UPPER(:partial) THEN 0.8
                           WHEN UPPER(title) LIKE UPPER(:partial) THEN 0.6
                           WHEN UPPER(description) LIKE UPPER(:partial) THEN 0.4
                           ELSE 0.2
                       END as confidence
                FROM products 
                WHERE UPPER(sku) LIKE UPPER(:partial)
                   OR UPPER(title) LIKE UPPER(:partial)
                   OR UPPER(description) LIKE UPPER(:partial)
                ORDER BY confidence DESC, sku
                LIMIT :limit
            """),
            {
                'exact': f'{query}%',
                'partial': f'%{query}%',
                'limit': limit
            }
        ).fetchall()
        
        for match in partial_matches:
            # Evitar duplicatas
            if not any(s['text'] == match.sku for s in suggestions):
                suggestions.append({
                    "text": match.sku,
                    "type": "partial",
                    "confidence": float(match.confidence),
                    "metadata": {"title": match.title}
                })
        
        # 3. Buscar produtos populares (mais consultados)
        # Nota: Você precisaria de uma tabela de analytics para isso
        # Por ora, usar produtos com mais dados como proxy
        popular_products = db.execute(
            text("""
                SELECT sku, title, 0.5 as confidence
                FROM products 
                WHERE (
                    base_price IS NOT NULL 
                    AND image_urls IS NOT NULL 
                    AND description IS NOT NULL
                )
                AND (
                    UPPER(sku) LIKE UPPER(:partial)
                    OR UPPER(title) LIKE UPPER(:partial)
                )
                ORDER BY 
                    CASE WHEN base_price IS NOT NULL THEN 1 ELSE 0 END +
                    CASE WHEN image_urls IS NOT NULL THEN 1 ELSE 0 END +
                    CASE WHEN description IS NOT NULL THEN 1 ELSE 0 END DESC
                LIMIT :limit
            """),
            {
                'partial': f'%{query}%',
                'limit': max(3, limit // 3)
            }
        ).fetchall()
        
        for product in popular_products:
            if not any(s['text'] == product.sku for s in suggestions):
                suggestions.append({
                    "text": product.sku,
                    "type": "popular", 
                    "confidence": float(product.confidence),
                    "metadata": {"title": product.title}
                })
        
        # 4. Calcular correções baseadas em distância de edição
        if len(query) > 4:  # Só para queries maiores
            all_skus = db.execute(
                text("SELECT DISTINCT sku FROM products WHERE sku IS NOT NULL LIMIT 1000")
            ).fetchall()
            
            corrections = []
            for sku_row in all_skus:
                sku = sku_row.sku
                distance = SKUNormalizer.levenshtein_distance(query.upper(), sku.upper())
                
                # Aceitar correções com distância pequena
                if 1 <= distance <= min(3, len(query) // 3):
                    corrections.append({
                        "text": sku,
                        "type": "correction",
                        "confidence": max(0.1, 1.0 - (distance / len(query))),
                        "metadata": {"distance": distance}
                    })
            
            # Ordenar correções por confiança
            corrections.sort(key=lambda x: x['confidence'], reverse=True)
            suggestions.extend(corrections[:3])
        
        # Remover duplicatas e ordenar por confiança
        seen = set()
        unique_suggestions = []
        for suggestion in suggestions:
            text_lower = suggestion['text'].lower()
            if text_lower not in seen:
                seen.add(text_lower)
                unique_suggestions.append(suggestion)
        
        # Ordenar por confiança e limitar resultados
        unique_suggestions.sort(key=lambda x: x['confidence'], reverse=True)
        final_suggestions = unique_suggestions[:limit]
        
        return {
            "suggestions": final_suggestions,
            "query": query,
            "total": len(final_suggestions)
        }
        
    except Exception as e:
        print(f"Erro ao gerar sugestões: {e}")
        return {"suggestions": [], "error": str(e)}

@router.get("/popular-searches")
async def get_popular_searches(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Retorna buscas populares (produtos mais completos como proxy)"""
    
    try:
        popular = db.execute(
            text("""
                SELECT sku, title, 
                       (CASE WHEN base_price IS NOT NULL THEN 1 ELSE 0 END +
                        CASE WHEN image_urls IS NOT NULL THEN 1 ELSE 0 END +
                        CASE WHEN description IS NOT NULL THEN 1 ELSE 0 END) as completeness_score
                FROM products 
                WHERE sku IS NOT NULL
                ORDER BY completeness_score DESC, sku
                LIMIT :limit
            """),
            {"limit": limit}
        ).fetchall()
        
        return {
            "popular_searches": [
                {
                    "sku": item.sku,
                    "title": item.title,
                    "score": item.completeness_score
                }
                for item in popular
            ]
        }
        
    except Exception as e:
        return {"popular_searches": [], "error": str(e)}