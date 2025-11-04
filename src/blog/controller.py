from fastapi import APIRouter, status, Query, HTTPException
from typing import List, Optional
from uuid import UUID
from src.database.core import DbSession 
from . import models
from . import service
from ..auth.service import CurrentUser 

router = APIRouter(
    prefix="/blogs",
    tags=["Blogs"]
)

# --- CRUD Básico ---
@router.post("/", response_model=models.BlogResponse, status_code=status.HTTP_201_CREATED)
def create_blog(db: DbSession, blog_request: models.BlogCreate, current_user: CurrentUser):
    """Crear nuevo blog, el current_user se asigna como 'created_by'."""
    # El service ahora recibe current_user como primer argumento
    return service.create_blog(current_user, db, blog_request)

@router.get("/", response_model=List[models.BlogResponse])
def get_blogs(
    db: DbSession, 
    current_user: CurrentUser,
    estado: Optional[str] = Query(None),
    prioridad: Optional[str] = Query(None),
    assigned_to: Optional[UUID] = Query(None)
):
    """Obtener blogs del usuario actual con filtros opcionales."""
    return service.get_blogs(current_user, db, estado, prioridad, assigned_to)

@router.get("/{blog_id}", response_model=models.BlogResponse)
def get_blog(db: DbSession, blog_id: UUID, current_user: CurrentUser):
    """Obtener un blog específico (solo si el usuario actual es el creador)."""
    blog = service.get_blog_by_id(current_user, db, blog_id) 
    if not blog:
        raise HTTPException(status_code=404, detail="Blog no encontrado")
    return blog

@router.put("/{blog_id}", response_model=models.BlogResponse)
def update_blog(db: DbSession, blog_id: UUID, blog_update: models.BlogUpdate, current_user: CurrentUser):
    """Actualizar un blog (solo si el usuario actual es el creador)."""
    blog = service.update_blog(current_user, db, blog_id, blog_update)
    if not blog:
        raise HTTPException(status_code=404, detail="Blog no encontrado o no autorizado")
    return blog

@router.delete("/{blog_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_blog(db: DbSession, blog_id: UUID, current_user: CurrentUser):
    """Eliminar un blog (solo si el usuario actual es el creador)."""
    success = service.delete_blog(current_user, db, blog_id)
    if not success:
        raise HTTPException(status_code=404, detail="Blog no encontrado o no autorizado")
    return

# --- Endpoints específicos para Dashboard (Replicando /created-by/me y /assigned-to/me) ---
@router.get("/created-by/me", response_model=List[models.BlogResponse])
def get_my_created_blogs(db: DbSession, current_user: CurrentUser):
    """Obtener blogs creados por el usuario actual."""
    return service.get_blogs_created_by_user(current_user, db)

@router.get("/assigned-to/me", response_model=List[models.BlogResponse])
def get_my_assigned_blogs(db: DbSession, current_user: CurrentUser):
    """Obtener blogs asignados al usuario actual."""
    return service.get_blogs_assigned_to_user(current_user, db)