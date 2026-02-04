#ruta : redactoria/src/blog/models.py
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from uuid import UUID
import enum

# =======================================================================
# 1. ENUMS (Estados y Prioridades)
# =======================================================================

class EstadoBlog(str, enum.Enum):
    """Estados posibles de un Blog en el sistema."""
    DRAFT = "draft"         # Borrador, recién creado (por defecto)
    GENERATED = "generated" # Estructura generada
    REVIEW = "review"       # En revisión por un editor
    APPROVED = "approved"   # Aprobado para publicación
    PUBLISHED = "published" # Publicado

class PrioridadBlog(str, enum.Enum):
    """Niveles de prioridad para un Blog."""
    BAJA = "Baja"
    MEDIA = "Media"
    ALTA = "Alta"

# =======================================================================
# 2. MODELOS BASE PARA PETICIONES (Pydantic)
# =======================================================================

class InitialParams(BaseModel):
    """Estructura para los parámetros iniciales del formulario de creación."""
    # 'titulo' del formulario se mapea al campo 'titulo' del ORM/BaseModel
    title: str 
    categoria: str
    keywords: str
    idioma: str
    tecnica: str
    acento: str
    tono: Optional[str] = None
    
class BlogBase(BaseModel):
    """Campos base que representan la entidad Blog en la DB."""
    title: str 
    estado: EstadoBlog
    prioridad: PrioridadBlog
    
    # --- Campos de Generación/Contenido (NUEVOS EN EL CONTEXTO) ---
    estructura_blog_json: Optional[Any] = None 
    estimated_word_count: Optional[int] = None

    
    # Asignación de usuario
    assigned_to: Optional[UUID] = None
    urls: Optional[str]= None

# =======================================================================
# 3. MODELOS DE PETICIÓN (Request Models)
# =======================================================================

class BlogCreate(InitialParams):
    """Modelo usado para la creación inicial de un Blog desde el formulario."""
    # Hereda los campos de InitialParams (titulo, categoria, etc.)
    estado: EstadoBlog = EstadoBlog.DRAFT
    prioridad: PrioridadBlog = PrioridadBlog.BAJA

class BlogUpdate(BaseModel):
    """Modelo usado para la actualización parcial de un Blog (PUT/PATCH)."""
    title: Optional[str] = None
    estado: Optional[EstadoBlog] = None
    prioridad: Optional[PrioridadBlog] = None
    urls: Optional[str]= None
    estimated_word_count: Optional[int] = None 
    estructura_blog_json: Optional[Any] = None 
    assigned_to: Optional[UUID] = None
    keywords: Optional[str] = None

class AssignBlogRequest(BaseModel):
    """Modelo específico para la asignación a un usuario."""
    assigned_to: UUID
    
# =======================================================================
# 4. MODELOS DE RESPUESTA (Response Models)
# =======================================================================

class BlogResponse(BlogBase, InitialParams):
    """Modelo usado para devolver la entidad Blog al cliente."""
    id: UUID
    created_by: UUID
    created_at: datetime
    last_modified: datetime

    model_config = ConfigDict(from_attributes=True) # Habilitar compatibilidad con el ORM de SQLAlchemy

