import re
from unidecode import unidecode
from typing import List

def normalize_code(code: str) -> str:
    """Normaliza código removendo caracteres especiais"""
    if not code:
        return ""
    return re.sub(r'[-\s\.]', '', code.upper())

def normalize_text(text: str) -> str:
    """Normaliza texto removendo acentos"""
    if not text:
        return ""
    return unidecode(text.lower())

def extract_keywords(text: str, min_length: int = 3) -> List[str]:
    """Extrai palavras-chave de um texto"""
    if not text:
        return []
    
    # Remove stopwords
    stopwords = {
        'de', 'da', 'do', 'para', 'com', 'em', 'na', 'no', 'a', 'o', 'e',
        'das', 'dos', 'nas', 'nos', 'um', 'uma', 'uns', 'umas', 'por'
    }
    
    normalized = normalize_text(text)
    words = re.findall(r'\b\w+\b', normalized)
    
    return [word for word in words if len(word) >= min_length and word not in stopwords]
