from typing import List, Dict, Optional, Any
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from uuid import UUID
import enum

class EstadoBlog(str, enum.Enum):
    DRAFT = "draft"
    GENERATED = "generated"
    REVIEW = "review"
    APPROVED = "approved"
    PUBLISHED = "published"

class PrioridadBlog(str, enum.Enum):
    BAJA = "Baja"
    MEDIA = "Media"
    ALTA = "Alta"


# --- Estructura para los parámetros iniciales (del formulario) ---
class InitialParams(BaseModel):
    titulo: str = Field(..., alias="name") # Se mapea a 'name' del ORM
    categoria: str
    keywords: str
    idioma: str
    tecnica: str
    acento: str
    tono: str


# --- BASE (Campos compartidos) ---
class BlogBase(BaseModel):
    name: str 
    estado: EstadoBlog
    prioridad: PrioridadBlog
    
    # Campos que vienen de la generación IA y se guardan como JSON/TEXT
    query: str
    initial_parameters_json: Optional[Dict[str, Any]] = None # Parámetros iniciales
    estructura_blog_json: Optional[Dict[str, Any]] = None      # Estructura detallada
    consolidated_content: Optional[str] = None # Contenido final

    # Asignación de usuario
    assigned_to: Optional[UUID] = None

# --- CREATE ---
class BlogCreate(InitialParams):
    estado: EstadoBlog = EstadoBlog.DRAFT
    prioridad: PrioridadBlog = PrioridadBlog.BAJA

# --- UPDATE ---
class BlogUpdate(BaseModel):
    name: Optional[str] = None
    estado: Optional[EstadoBlog] = None
    prioridad: Optional[PrioridadBlog] = None
    
    # Permite actualizar la estructura y el contenido
    estructura_blog_json: Optional[Dict[str, Any]] = None 
    consolidated_content: Optional[str] = None
    assigned_to: Optional[UUID] = None


# --- RESPONSE ---
class BlogResponse(BlogBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_modified: datetime

    model_config = ConfigDict(from_attributes=True)