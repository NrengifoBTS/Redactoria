from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class AnotacionBase(BaseModel):
    cell_position: str  # "0-2", "1-3", etc. (formato row-col)
    text: str
    author: str  # Nombre del autor para mostrar en UI

class AnotacionCreate(AnotacionBase):
    landing_page_id: UUID

class AnotacionUpdate(BaseModel):
    text: Optional[str] = None

class AnotacionResponse(AnotacionBase):
    id: UUID
    landing_page_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

# Modelos para el sistema colaborativo
class AnotacionesPorCelda(BaseModel):
    """Anotaciones agrupadas por celda para el frontend"""
    cell_position: str
    anotaciones: list[AnotacionResponse]

class CreateAnotacionRequest(BaseModel):
    """Request simplificado para crear anotación desde redactor"""
    cell_position: str
    text: str

class BulkDeleteAnotacionesRequest(BaseModel):
    """Request para eliminar todas las anotaciones de una celda"""
    cell_position: str

# Response para el panel de anotaciones del frontend
class AnotacionPanelResponse(BaseModel):
    """Response completo para el panel de anotaciones"""
    landing_page_id: UUID
    anotaciones_por_celda: dict[str, list[AnotacionResponse]]  # "0-2": [anotacion1, anotacion2]
    total_anotaciones: int
    
    model_config = ConfigDict(from_attributes=True)