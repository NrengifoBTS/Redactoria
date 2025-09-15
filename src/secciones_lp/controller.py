from fastapi import APIRouter, status
from typing import List
from uuid import UUID

from ..database.core import DbSession
from . import models
from . import service
from ..auth.service import CurrentUser

router = APIRouter(
    prefix="/secciones-lp",
    tags=["Secciones Landing Page"]
)

# CRUD básico para secciones
@router.post("/", response_model=models.SeccionLPResponse, status_code=status.HTTP_201_CREATED)
def create_seccion(db: DbSession, seccion: models.SeccionLPCreate, current_user: CurrentUser):
    """Crear nueva sección"""
    return service.create_seccion(current_user, db, seccion)

@router.get("/landing-page/{landing_page_id}", response_model=List[models.SeccionLPResponse])
def get_secciones_by_landing_page(db: DbSession, landing_page_id: UUID, current_user: CurrentUser):
    """Obtener todas las secciones de una landing page"""
    return service.get_secciones_by_landing_page(current_user, db, landing_page_id)

@router.get("/{seccion_id}", response_model=models.SeccionLPResponse)
def get_seccion(db: DbSession, seccion_id: UUID, current_user: CurrentUser):
    """Obtener una sección específica"""
    return service.get_seccion_by_id(current_user, db, seccion_id)

@router.put("/{seccion_id}", response_model=models.SeccionLPResponse)
def update_seccion(db: DbSession, seccion_id: UUID, seccion_update: models.SeccionLPUpdate, current_user: CurrentUser):
    """Actualizar una sección"""
    return service.update_seccion(current_user, db, seccion_id, seccion_update)

@router.delete("/{seccion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_seccion(db: DbSession, seccion_id: UUID, current_user: CurrentUser):
    """Eliminar una sección"""
    service.delete_seccion(current_user, db, seccion_id)

# Endpoints específicos para el redactor
@router.post("/landing-page/{landing_page_id}/cell", response_model=models.SeccionLPResponse)
def update_cell_content(db: DbSession, landing_page_id: UUID, cell_update: models.CellContentUpdate, current_user: CurrentUser):
    """Actualizar contenido de una celda específica desde el redactor"""
    return service.update_cell_content(current_user, db, landing_page_id, cell_update)

@router.post("/landing-page/{landing_page_id}/bulk-update", response_model=List[models.SeccionLPResponse])
def bulk_update_secciones(db: DbSession, landing_page_id: UUID, bulk_request: models.BulkUpdateSectionsRequest, current_user: CurrentUser):
    """Actualizar múltiples secciones de una vez (auto-guardado del redactor)"""
    return service.bulk_update_secciones(current_user, db, landing_page_id, bulk_request)

@router.get("/landing-page/{landing_page_id}/cell/{cell_position}", response_model=models.SeccionLPResponse)
def get_seccion_by_cell(db: DbSession, landing_page_id: UUID, cell_position: str, current_user: CurrentUser):
    """Obtener sección por posición de celda"""
    return service.get_seccion_by_cell(current_user, db, landing_page_id, cell_position)

# Endpoints para Content Generator integration
@router.post("/{seccion_id}/generate", response_model=models.SeccionLPResponse)
def generate_content_for_seccion(db: DbSession, seccion_id: UUID, generate_request: models.GenerateContentRequest, current_user: CurrentUser):
    """Generar contenido para una sección específica usando LLM"""
    return service.generate_content_for_seccion(current_user, db, seccion_id, generate_request)

@router.post("/landing-page/{landing_page_id}/generate-cell", response_model=models.SeccionLPResponse)
def generate_content_for_cell(db: DbSession, landing_page_id: UUID, cell_position: str, generate_request: models.GenerateContentRequest, current_user: CurrentUser):
    """Generar contenido directamente para una celda específica"""
    return service.generate_content_for_cell(current_user, db, landing_page_id, cell_position, generate_request)

# Endpoints públicos para landing page
@router.get("/public/landing-page/{landing_page_id}", response_model=List[models.SeccionLPPublicResponse])
def get_secciones_public(db: DbSession, landing_page_id: UUID):
    """Obtener secciones para mostrar en landing page pública"""
    return service.get_secciones_public(db, landing_page_id)

@router.get("/public/by-slug/{url_slug}", response_model=List[models.SeccionLPPublicResponse])
def get_secciones_by_slug_public(db: DbSession, url_slug: str):
    """Obtener secciones por URL slug para landing page pública"""
    return service.get_secciones_by_slug_public(db, url_slug)