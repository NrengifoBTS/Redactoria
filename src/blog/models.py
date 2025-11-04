from typing import List, Dict, Optional, Any
from pydantic import BaseModel, ConfigDict, Field
from  datetime import datetime
from uuid import UUID

#Validaciones
class EstadoBlog(str):
    DRAFT ="draft"
    GENERATED = "generated"
    REVIEW = "review"
    APPROVED = "approved"
    PUBLISHED = "published"

# Modelo de creacion(Peticion desde el dashboard)
class BlogCreate(BaseModel):
    titulo: str = Field(..., description="El título base/idea del blog.")
    categoria: str
    keywords: str = Field(..., description="Palabras clave separadas por coma.")
    idioma: str = 'es'
    tecnica: str = 'persuasiva' 
    acento: str = 'neutral'
    tono: str = 'profesional'
    estado: str = 'Pendiente' 
    prioridad: str = 'Baja'

#Modelo de actualizacion 
class BlogUpdate(BaseModel):
    title: Optional[str] = None 
    name: Optional[str] = None
    estado: Optional[str] = None
    prioridad: Optional[str] = None
    estructura_blog_json: Optional[Any] = None 

class BlogResponse(BaseModel): 
    id: UUID
    name: str
    title: str
    author: str
    estado: str
    prioridad: str
    created_at: datetime
    last_modified: datetime
    estructura_blog_json: Optional[Any] = None 

    model_config = ConfigDict(from_attributes=True)
