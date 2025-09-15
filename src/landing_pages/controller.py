from fastapi import APIRouter, status, Query
from typing import List, Optional
from uuid import UUID

from ..database.core import DbSession
from . import models
from . import service
from ..auth.service import CurrentUser

router = APIRouter(
    prefix="/landing-pages",
    tags=["Landing Pages"]
)

# CRUD básico para landing pages
@router.post("/", response_model=models.LandingPageResponse, status_code=status.HTTP_201_CREATED)
def create_landing_page(db: DbSession, landing_page: models.LandingPageCreate, current_user: CurrentUser):
    """Crear nueva landing page"""
    return service.create_landing_page(current_user, db, landing_page)

@router.get("/", response_model=List[models.LandingPageResponse])
def get_landing_pages(
    db: DbSession, 
    current_user: CurrentUser,
    is_published: Optional[bool] = Query(None)
):
    """Obtener landing pages del usuario con filtro de publicación"""
    return service.get_landing_pages(current_user, db, is_published)

@router.get("/{landing_page_id}", response_model=models.LandingPageResponse)
def get_landing_page(db: DbSession, landing_page_id: UUID, current_user: CurrentUser):
    """Obtener una landing page específica"""
    return service.get_landing_page_by_id(current_user, db, landing_page_id)

@router.put("/{landing_page_id}", response_model=models.LandingPageResponse)
def update_landing_page(db: DbSession, landing_page_id: UUID, landing_page_update: models.LandingPageUpdate, current_user: CurrentUser):
    """Actualizar una landing page"""
    return service.update_landing_page(current_user, db, landing_page_id, landing_page_update)

@router.delete("/{landing_page_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_landing_page(db: DbSession, landing_page_id: UUID, current_user: CurrentUser):
    """Eliminar una landing page"""
    service.delete_landing_page(current_user, db, landing_page_id)

# Endpoints específicos para publicación
@router.post("/{landing_page_id}/publish", response_model=models.LandingPageResponse)
def publish_landing_page(db: DbSession, landing_page_id: UUID, publish_request: models.PublishLandingPageRequest, current_user: CurrentUser):
    """Publicar/despublicar landing page"""
    return service.publish_landing_page(current_user, db, landing_page_id, publish_request.is_published)

@router.get("/by-proyecto/{proyecto_id}", response_model=models.LandingPageResponse)
def get_landing_page_by_proyecto(db: DbSession, proyecto_id: UUID, current_user: CurrentUser):
    """Obtener landing page de un proyecto específico"""
    return service.get_landing_page_by_proyecto(current_user, db, proyecto_id)

# Endpoints públicos (sin autenticación)
@router.get("/public/{url_slug}", response_model=models.LandingPagePublicResponse)
def get_landing_page_public(db: DbSession, url_slug: str):
    """Obtener landing page pública por URL slug"""
    return service.get_landing_page_public(db, url_slug)

@router.get("/public/preview/{landing_page_id}", response_model=models.LandingPagePublicResponse)
def preview_landing_page(db: DbSession, landing_page_id: UUID, current_user: CurrentUser):
    """Preview de landing page (para desarrollo/testing)"""
    return service.preview_landing_page(current_user, db, landing_page_id)