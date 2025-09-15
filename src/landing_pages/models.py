from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class LandingPageBase(BaseModel):
    url_slug: str
    title: str
    meta_description: Optional[str] = None

class LandingPageCreate(LandingPageBase):
    proyecto_id: UUID
    template_id: Optional[UUID] = None

class LandingPageUpdate(BaseModel):
    url_slug: Optional[str] = None
    title: Optional[str] = None
    meta_description: Optional[str] = None

class LandingPageResponse(LandingPageBase):
    id: UUID
    proyecto_id: UUID
    template_id: Optional[UUID] = None
    is_published: bool
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

# Modelos para publicación
class PublishLandingPageRequest(BaseModel):
    """Request para publicar/despublicar landing page"""
    is_published: bool

class LandingPagePublicResponse(BaseModel):
    """Response pública (sin datos internos)"""
    url_slug: str
    title: str
    meta_description: Optional[str] = None
    published_at: datetime
    
    model_config = ConfigDict(from_attributes=True)