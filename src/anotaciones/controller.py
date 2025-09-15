from fastapi import APIRouter, status
from typing import List
from uuid import UUID

from ..database.core import DbSession
from . import models
from . import service
from ..auth.service import CurrentUser

router = APIRouter(
    prefix="/anotaciones",
    tags=["Anotaciones"]
)

# CRUD básico para anotaciones
@router.post("/", response_model=models.AnotacionResponse, status_code=status.HTTP_201_CREATED)
def create_anotacion(db: DbSession, anotacion: models.AnotacionCreate, current_user: CurrentUser):
    """Crear nueva anotación"""
    return service.create_anotacion(current_user, db, anotacion)

@router.get("/landing-page/{landing_page_id}", response_model=List[models.AnotacionResponse])
def get_anotaciones_by_landing_page(db: DbSession, landing_page_id: UUID, current_user: CurrentUser):
    """Obtener todas las anotaciones de una landing page"""
    return service.get_anotaciones_by_landing_page(current_user, db, landing_page_id)

@router.get("/{anotacion_id}", response_model=models.AnotacionResponse)
def get_anotacion(db: DbSession, anotacion_id: UUID, current_user: CurrentUser):
    """Obtener una anotación específica"""
    return service.get_anotacion_by_id(current_user, db, anotacion_id)

@router.put("/{anotacion_id}", response_model=models.AnotacionResponse)
def update_anotacion(db: DbSession, anotacion_id: UUID, anotacion_update: models.AnotacionUpdate, current_user: CurrentUser):
    """Actualizar una anotación"""
    return service.update_anotacion(current_user, db, anotacion_id, anotacion_update)

@router.delete("/{anotacion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_anotacion(db: DbSession, anotacion_id: UUID, current_user: CurrentUser):
    """Eliminar una anotación"""
    service.delete_anotacion(current_user, db, anotacion_id)

# Endpoints específicos para el redactor
@router.post("/landing-page/{landing_page_id}/cell", response_model=models.AnotacionResponse, status_code=status.HTTP_201_CREATED)
def create_anotacion_for_cell(db: DbSession, landing_page_id: UUID, anotacion_request: models.CreateAnotacionRequest, current_user: CurrentUser):
    """Crear anotación para una celda específica desde el redactor"""
    return service.create_anotacion_for_cell(current_user, db, landing_page_id, anotacion_request)

@router.get("/landing-page/{landing_page_id}/cell/{cell_position}", response_model=List[models.AnotacionResponse])
def get_anotaciones_by_cell(db: DbSession, landing_page_id: UUID, cell_position: str, current_user: CurrentUser):
    """Obtener anotaciones de una celda específica"""
    return service.get_anotaciones_by_cell(current_user, db, landing_page_id, cell_position)

@router.delete("/landing-page/{landing_page_id}/cell/{cell_position}", status_code=status.HTTP_204_NO_CONTENT)
def delete_anotaciones_by_cell(db: DbSession, landing_page_id: UUID, cell_position: str, current_user: CurrentUser):
    """Eliminar todas las anotaciones de una celda específica"""
    service.delete_anotaciones_by_cell(current_user, db, landing_page_id, cell_position)

# Endpoint para panel de anotaciones
@router.get("/landing-page/{landing_page_id}/panel", response_model=models.AnotacionPanelResponse)
def get_anotaciones_panel(db: DbSession, landing_page_id: UUID, current_user: CurrentUser):
    """Obtener todas las anotaciones agrupadas por celda para el panel"""
    return service.get_anotaciones_panel(current_user, db, landing_page_id)

# Endpoints por usuario
@router.get("/user/me", response_model=List[models.AnotacionResponse])
def get_my_anotaciones(db: DbSession, current_user: CurrentUser):
    """Obtener todas las anotaciones creadas por el usuario actual"""
    return service.get_anotaciones_by_user(current_user, db)

@router.get("/landing-page/{landing_page_id}/by-user/{user_id}", response_model=List[models.AnotacionResponse])
def get_anotaciones_by_user_in_lp(db: DbSession, landing_page_id: UUID, user_id: UUID, current_user: CurrentUser):
    """Obtener anotaciones de un usuario específico en una landing page"""
    return service.get_anotaciones_by_user_in_lp(current_user, db, landing_page_id, user_id)