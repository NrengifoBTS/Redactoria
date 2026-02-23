from fastapi import APIRouter, status, Query
from typing import List, Optional
from uuid import UUID

from ..database.core import DbSession
from . import models
from . import service
from ..auth.service import CurrentUser

router = APIRouter(
    prefix="/templates",
    tags=["Templates"]
)

# CRUD básico para templates
@router.post("/", response_model=models.TemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(db: DbSession, template: models.TemplateCreate, current_user: CurrentUser):
    """Crear nuevo template"""
    return service.create_template(current_user, db, template)

@router.get("/", response_model=List[models.TemplateResponse])
def get_templates(
    db: DbSession,
    current_user: CurrentUser,
    is_active: Optional[bool] = Query(None)
):
    """Obtener templates del usuario (por defecto todos, usa is_active=true/false para filtrar)"""
    return service.get_templates(current_user, db, is_active)

@router.get("/{template_id}", response_model=models.TemplateResponse)
def get_template(db: DbSession, template_id: UUID, current_user: CurrentUser):
    """Obtener un template específico"""
    return service.get_template_by_id(current_user, db, template_id)

@router.put("/{template_id}", response_model=models.TemplateResponse)
def update_template(db: DbSession, template_id: UUID, template_update: models.TemplateUpdate, current_user: CurrentUser):
    """Actualizar un template"""
    return service.update_template(current_user, db, template_id, template_update)

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(db: DbSession, template_id: UUID, current_user: CurrentUser):
    """Eliminar un template (soft delete - marca como inactivo)"""
    service.delete_template(current_user, db, template_id)

# Endpoints específicos para templates
@router.post("/{template_id}/toggle", response_model=models.TemplateResponse)
def toggle_template(db: DbSession, template_id: UUID, toggle_request: models.ToggleTemplateRequest, current_user: CurrentUser):
    """Activar/desactivar template"""
    return service.toggle_template(current_user, db, template_id, toggle_request.is_active)

@router.post("/from-config", response_model=models.TemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template_from_config(db: DbSession, config_request: models.CreateTemplateFromConfigRequest, current_user: CurrentUser):
    """Crear template desde configuración completa (como templateConfig.js)"""
    return service.create_template_from_config(current_user, db, config_request)

@router.get("/{template_id}/config", response_model=models.TemplateConfigStructure)
def get_template_config(db: DbSession, template_id: UUID, current_user: CurrentUser):
    """Obtener solo la configuración del template para el redactor"""
    return service.get_template_config(current_user, db, template_id)

@router.post("/{template_id}/duplicate", response_model=models.TemplateResponse, status_code=status.HTTP_201_CREATED)
def duplicate_template(db: DbSession, template_id: UUID, current_user: CurrentUser, new_name: str = Query(...)):
    """Duplicar un template existente"""
    return service.duplicate_template(current_user, db, template_id, new_name)

@router.get("/public/active", response_model=List[models.TemplateResponse])
def get_active_templates_public(db: DbSession):
    """Obtener templates activos (público - sin autenticación para selección inicial)"""
    return service.get_active_templates_public(db)

@router.get("/public/all-for-analytics", response_model=List[models.TemplateResponse])
def get_all_templates_for_analytics(db: DbSession):
    """Obtener TODOS los templates (activos e inactivos) para Dashboard/Analytics"""
    return service.get_all_templates_for_analytics(db)

@router.get("/public/proyectos", response_model=List[str])
def get_unique_proyectos(db: DbSession):
    """Obtener lista única de proyectos (Viajemos, MCR, etc.)"""
    return service.get_unique_proyectos(db)