from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from enum import Enum

class SectionType(str, Enum):
    QUICKSEARCH = "quicksearch"
    FLEET = "fleet"
    AGENCIES = "agencies"
    FAQ = "faq"
    FAQ_RESPUESTA = "faq_respuesta"
    CAR_RENTAL = "car_rental"
    CAR_TYPE = "car_type"
    FAV_CITY = "fav_city"
    CUSTOM = "custom"  # Para contenido manual sin LLM

class SeccionLPBase(BaseModel):
    cell_position: str  # "0-2", "1-3", etc. (formato row-col)
    section_type: Optional[SectionType] = SectionType.CUSTOM
    title: Optional[str] = None  # El tit_seo que ingresa el usuario
    content: Optional[str] = None  # Contenido generado por LLM o manual

class SeccionLPCreate(SeccionLPBase):
    landing_page_id: UUID

class SeccionLPUpdate(BaseModel):
    section_type: Optional[SectionType] = None
    title: Optional[str] = None
    content: Optional[str] = None

class SeccionLPResponse(SeccionLPBase):
    id: UUID
    landing_page_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

# Modelos para Content Generator integration
class GenerateContentRequest(BaseModel):
    """Request para generar contenido en una sección específica"""
    section_type: SectionType
    title: str  # El tit_seo
    nuevo_tema: Optional[str] = "Tema por defecto"
    # Campos específicos para algunos tipos
    preguntas: Optional[list[str]] = None  # Para FAQ_RESPUESTA
    titulos_autos: Optional[list[str]] = None  # Para CAR_TYPE
    
class BulkSectionUpdate(BaseModel):
    cell_position: str
    content: str
    section_type: Optional[SectionType] = SectionType.CUSTOM

class BulkUpdateSectionsRequest(BaseModel):
    """Request para actualizar múltiples secciones de una vez"""
    sections: list[BulkSectionUpdate]

class CellContentUpdate(BaseModel):
    """Update específico para una celda desde el redactor"""
    cell_position: str
    content: str

# Response para vista pública
class SeccionLPPublicResponse(BaseModel):
    """Sección para mostrar en landing page pública"""
    cell_position: str
    content: str
    section_type: str
    model_config = ConfigDict(from_attributes=True)
    