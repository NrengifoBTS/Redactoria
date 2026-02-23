from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from enum import Enum

class EstadoProyecto(str, Enum):
    DRAFT = "draft"
    REVIEW = "review"
    IN_PROGRESS = "in_progress"
    PEN_REVIEW = "pen_review"
    PEN_AJUSTE = "pen_ajuste"
    APPROVED = "approved"
    REV_KWS = "rev_kws"
    CARGUE = "cargue"
    EN_IT = "en_it"
    TEST = "test"
    PUBLISHED = "published"

class PrioridadProyecto(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class ProyectoBase(BaseModel):
    name: str
    description: Optional[str] = None
    estado: EstadoProyecto = EstadoProyecto.DRAFT
    prioridad: PrioridadProyecto = PrioridadProyecto.MEDIUM

class ProyectoCreate(ProyectoBase):
    assigned_to: Optional[UUID] = None
    template_id: Optional[UUID] = None

class ProyectoUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    estado: Optional[EstadoProyecto] = None
    prioridad: Optional[PrioridadProyecto] = None
    assigned_to: Optional[UUID] = None
    template_id: Optional[UUID] = None

class ProyectoResponse(ProyectoBase):
    id: UUID
    created_by: UUID
    assigned_to: Optional[UUID] = None
    template_id: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_modified: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Modelos para requests específicos
class AssignProyectoRequest(BaseModel):
    assigned_to: UUID

class UpdateEstadoRequest(BaseModel):
    estado: EstadoProyecto