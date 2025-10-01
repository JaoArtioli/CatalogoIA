# api/app/services/confidence.py - CRIAR este arquivo

def calculate_confidence_score(product, search_query, search_type):
    """
    Calcula o nível de confiança da correspondência baseado nos dados reais
    """
    score = 0
    reasons = []
    search_lower = search_query.lower().strip()
    
    # Correspondência exata de SKU (peso alto)
    sku = str(product.get("sku", "")).lower()
    if search_type == "codigo" or search_type == "CODIGO":
        if sku == search_lower:
            score += 45
            reasons.append("SKU exato")
        elif search_lower in sku or sku in search_lower:
            score += 25
            reasons.append("SKU parcial")
    
    # Correspondência de texto
    title = str(product.get("title", "")).lower()
    description = str(product.get("description", "")).lower()
    
    if search_type == "texto" or search_type == "TEXTO":
        # Correspondência exata no título
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
        
        # Correspondência na descrição
        if search_lower in description:
            if len(search_lower) > 5:
                score += 15
                reasons.append("Descrição contém termo")
            else:
                score += 8
                reasons.append("Termo na descrição")
        
        # Correspondência no SKU (mesmo em busca textual)
        if search_lower in sku:
            score += 20
            reasons.append("SKU relacionado")
    
    # Correspondência de marca
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
    
    # Bonus por qualidade dos dados
    if product.get("images") and len(product["images"]) > 0:
        score += 8
        reasons.append("Tem imagens")
    
    if description and len(description) > 100:
        score += 5
        reasons.append("Descrição detalhada")
    
    # Penalidade por dados incompletos
    if not title or len(title) < 10:
        score -= 10
        reasons.append("Título incompleto")
    
    # Determinar nível baseado no score
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
    """
    Adiciona sistema de confiança aos produtos retornados pela busca
    """
    enhanced_products = []
    
    for product in products:
        confidence = calculate_confidence_score(product, search_query, search_type)
        enhanced_product = {
            **product,
            "confidence": confidence
        }
        enhanced_products.append(enhanced_product)
    
    # Ordenar por nível de confiança e score
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
    """
    Gera estatísticas dos níveis de confiança
    """
    if not products:
        return {"total": 0, "alto": 0, "medio": 0, "baixo": 0}
    
    stats = {"total": len(products), "alto": 0, "medio": 0, "baixo": 0}
    
    for product in products:
        confidence_level = product.get("confidence", {}).get("level", "baixo")
        if confidence_level in stats:
            stats[confidence_level] += 1
    
    return stats