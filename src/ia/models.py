# src/ia/models.py

from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from uuid import UUID

class IAContentRequest(BaseModel):
    """Request para generar contenido con IA"""
    cellKey: str
    currentContent: Optional[str] = ""
    blockNumber: int
    tit: str
    blockType: Optional[str] = None
    tema: str
    lpId: UUID
    brand: Optional[str] = "mcr"
    faq_questions: Optional[List[str]] = None
    car_types: Optional[List[str]] = None
    fav_city_questions: Optional[List[str]] = None

class StructuredContent(BaseModel):
    """Contenido estructurado específico por bloque"""
    # Campos comunes
    tit: Optional[str] = None
    desc: Optional[str] = None
    
    # Campos específicos del bloque Fleet
    ip_usa: Optional[str] = None
    ip_bra: Optional[str] = None
    
    # Campos específicos del bloque Agencies
    desc_h2: Optional[str] = None
    desc_h3: Optional[str] = None
    
    # Campos específicos del bloque FAQs
    faq_1: Optional[str] = None
    faq_2: Optional[str] = None
    faq_3: Optional[str] = None
    faq_4: Optional[str] = None
    faq_5: Optional[str] = None
    faq_6: Optional[str] = None
    faq_7: Optional[str] = None
    
    # Campos específicos del bloque Car Rental
    desc_1: Optional[str] = None
    desc_2: Optional[str] = None
    desc_3: Optional[str] = None
    desc_4: Optional[str] = None
    desc_5: Optional[str] = None
    desc_6: Optional[str] = None
    desc_7: Optional[str] = None
    desc_8: Optional[str] = None
    desc_9: Optional[str] = None
    desc_10: Optional[str] = None
    desc_11: Optional[str] = None
    desc_12: Optional[str] = None
    desc_13: Optional[str] = None
    desc_14: Optional[str] = None
    desc_15: Optional[str] = None
    desc_16: Optional[str] = None

class FrontendReady(BaseModel):
    """Información lista para el frontend"""
    has_think: bool
    available_fields: List[str]
    field_count: int
    content_preview: Dict[str, str]

class ProcessedIAContent(BaseModel):
    """Contenido IA procesado y estructurado"""
    think: str
    raw_content: str
    processed_fields: Dict[str, str]
    structured_content: StructuredContent
    block_type: str
    frontend_ready: FrontendReady
    error: Optional[str] = None

class IAContentResponse(BaseModel):
    """Response del contenido generado por IA - Versión mejorada"""
    generatedContent: Dict[str, Any]  
    blockName: str
    cellKey: str
    
    class Config:
        """Configuración para permitir tipos complejos"""
        arbitrary_types_allowed = True

class TranslationRequest(BaseModel):
    """Request para traducir contenido"""
    sourceContent: str
    targetLanguage: str  # 'en' o 'pt'
    cellKey: str
    lpId: UUID

class TranslationResponse(BaseModel):
    """Response del contenido traducido"""
    translatedContent: str
    sourceLanguage: str = "es"
    targetLanguage: str
    cellKey: str