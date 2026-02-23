from fastapi import APIRouter, status, Query, BackgroundTasks
from typing import List, Optional
from uuid import UUID

from ..database.core import DbSession
from . import models
from . import service
from ..auth.service import CurrentUser

router = APIRouter(
    prefix="/proyectos",
    tags=["Proyectos"]
)

# CRUD básico para proyectos
@router.post("/", response_model=models.ProyectoResponse, status_code=status.HTTP_201_CREATED)
def create_proyecto(db: DbSession, proyecto: models.ProyectoCreate, current_user: CurrentUser):
    """Crear nuevo proyecto"""
    return service.create_proyecto(current_user, db, proyecto)

@router.get("/", response_model=List[models.ProyectoResponse])
def get_proyectos(
    db: DbSession, 
    current_user: CurrentUser,
    estado: Optional[models.EstadoProyecto] = Query(None),
    prioridad: Optional[models.PrioridadProyecto] = Query(None),
    assigned_to: Optional[UUID] = Query(None)
):
    """Obtener proyectos del usuario con filtros opcionales"""
    return service.get_proyectos(current_user, db, estado, prioridad, assigned_to)

@router.get("/{proyecto_id}", response_model=models.ProyectoResponse)
def get_proyecto(db: DbSession, proyecto_id: UUID, current_user: CurrentUser):
    """Obtener un proyecto específico"""
    return service.get_proyecto_by_id(current_user, db, proyecto_id)

@router.put("/{proyecto_id}", response_model=models.ProyectoResponse)
def update_proyecto(
    db: DbSession,
    proyecto_id: UUID,
    proyecto_update: models.ProyectoUpdate,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks
):
    """Actualizar un proyecto"""
    return service.update_proyecto(current_user, db, proyecto_id, proyecto_update, background_tasks)

@router.delete("/{proyecto_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_proyecto(db: DbSession, proyecto_id: UUID, current_user: CurrentUser):
    """Eliminar un proyecto"""
    service.delete_proyecto(current_user, db, proyecto_id)

# Endpoints específicos para dashboard
@router.post("/{proyecto_id}/assign", response_model=models.ProyectoResponse)
def assign_proyecto(db: DbSession, proyecto_id: UUID, assign_request: models.AssignProyectoRequest, current_user: CurrentUser):
    """Asignar proyecto a un usuario"""
    return service.assign_proyecto(current_user, db, proyecto_id, assign_request.assigned_to)

@router.post("/{proyecto_id}/estado", response_model=models.ProyectoResponse)
def update_estado_proyecto(
    db: DbSession,
    proyecto_id: UUID,
    estado_request: models.UpdateEstadoRequest,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks
):
    """Cambiar estado del proyecto"""
    return service.update_estado_proyecto(current_user, db, proyecto_id, estado_request.estado, background_tasks)

@router.get("/user/{user_id}", response_model=List[models.ProyectoResponse])
def get_proyectos_by_user(db: DbSession, user_id: UUID, current_user: CurrentUser):
    """Obtener proyectos asignados a un usuario específico (solo admin)"""
    return service.get_proyectos_by_user(current_user, db, user_id)

@router.get("/created-by/me", response_model=List[models.ProyectoResponse])
def get_my_created_proyectos(db: DbSession, current_user: CurrentUser):
    """Obtener proyectos creados por el usuario actual"""
    return service.get_proyectos_created_by_user(current_user, db)

@router.get("/assigned-to/me", response_model=List[models.ProyectoResponse])
def get_my_assigned_proyectos(db: DbSession, current_user: CurrentUser):
    """Obtener proyectos asignados al usuario actual"""
    return service.get_proyectos_assigned_to_user(current_user, db)