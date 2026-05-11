#redactoria/src/blog/controller.py
from fastapi import APIRouter, status, Query, HTTPException
from typing import List, Optional
from uuid import UUID
from src.database.core import DbSession
from . import models
from . import service
from .review_service import review_blog_spelling
from ..auth.service import CurrentUser # Asegúrate de que esta importación sea correcta

router = APIRouter(
    prefix="/blogs",
    tags=["Blogs"]
)

# =======================================================================
# 1. CRUD BÁSICO
# =======================================================================

@router.post("/", response_model=models.BlogResponse, status_code=status.HTTP_201_CREATED)
def create_blog(db: DbSession, blog_request: models.BlogCreate, current_user: CurrentUser):
    """
    Crear nuevo blog. El current_user se asigna como 'created_by'.
    """
    return service.create_blog(current_user, db, blog_request)

@router.get("/", response_model=List[models.BlogResponse])
def get_blogs(
    db: DbSession, 
    current_user: CurrentUser,
    estado: Optional[str] = Query(None),
    prioridad: Optional[str] = Query(None),
    assigned_to: Optional[UUID] = Query(None)
):
    """
    Obtener blogs del usuario actual con filtros opcionales (Estado, Prioridad, Asignado a).
    """
    return service.get_blogs(current_user, db, estado, prioridad, assigned_to)

@router.get("/{blog_id}", response_model=models.BlogResponse)
def get_blog(db: DbSession, blog_id: UUID, current_user: CurrentUser):
    """
    Obtener un blog específico por ID.
    """
    blog = service.get_blog(current_user, db, blog_id)
    if not blog:
        raise HTTPException(status_code=404, detail="Blog no encontrado")
    return blog



@router.put("/{blog_id}", response_model=models.BlogResponse)
def update_blog(db: DbSession, blog_id: UUID, blog_update: models.BlogUpdate, current_user: CurrentUser):
    """
    Actualizar un blog (solo si el usuario actual es el creador/admin).
    Este endpoint se utiliza para actualizar el nombre, el estado, el contenido, etc.
    """
    blog = service.update_blog(current_user, db, blog_id, blog_update)
    if not blog:
        raise HTTPException(status_code=404, detail="Blog no encontrado o no autorizado")
    return blog

@router.delete("/{blog_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_blog(db: DbSession, blog_id: UUID, current_user: CurrentUser):
    """
    Eliminar un blog (solo si el usuario actual es el creador/admin).
    """
    success = service.delete_blog(current_user, db, blog_id)
    if not success:
        raise HTTPException(status_code=404, detail="Blog no encontrado o no autorizado")
    return

# =======================================================================
# 2. ENDPOINTS DE GESTIÓN (Asignación)
# =======================================================================


@router.post("/{blog_id}/assign", response_model=models.BlogResponse)
def assign_blog(db: DbSession, blog_id: UUID, assign_request: models.AssignBlogRequest, current_user: CurrentUser):
    """
    Asignar un blog a un usuario (Admin o Creador).
    """
    # El service se encarga de la lógica de permisos y persistencia
    blog = service.assign_blog(current_user, db, blog_id, assign_request.assigned_to)
    if not blog:
        raise HTTPException(status_code=404, detail="Blog no encontrado o no autorizado para asignar")
    return blog

@router.post("/{blog_id}/unassign", response_model=models.BlogResponse)
def unassign_blog(db: DbSession, blog_id: UUID, current_user: CurrentUser):
    """
    Desasignar un blog (poner 'assigned_to' en NULL). (Admin o Creador).
    """
    blog = service.unassign_blog(current_user, db, blog_id)
    if not blog:
        raise HTTPException(status_code=404, detail="Blog no encontrado o no autorizado para desasignar")
    return blog


# =======================================================================
# 3. ENDPOINTS DE DASHBOARD (Filtros por usuario)
# =======================================================================

@router.get("/created-by/me", response_model=List[models.BlogResponse])
def get_my_created_blogs(db: DbSession, current_user: CurrentUser):
    """
    Obtener blogs creados por el usuario actual.
    """
    return service.get_blogs_created_by_user(current_user, db)

@router.get("/assigned-to/me", response_model=List[models.BlogResponse])
def get_my_assigned_blogs(db: DbSession, current_user: CurrentUser):
    """
    Obtener blogs asignados al usuario actual.
    """
    return service.get_blogs_assigned_to_user(current_user, db)

@router.get("/user/{user_id}", response_model=List[models.BlogResponse])
def get_blogs_by_user(db: DbSession, user_id: UUID, current_user: CurrentUser):
    """
    Obtener blogs asignados a un usuario específico (Solo Admin/Editor puede usar este endpoint).
    """
    return service.get_blogs_by_user(current_user, db, user_id)


# =======================================================================
# 4. ENDPOINTS DE REVISIÓN POR IA (Revisión ortográfica)
# =======================================================================

@router.post("/{blog_id}/review-ia", response_model=models.BlogReviewResponse)
def review_blog_with_ai(db: DbSession, blog_id: UUID, current_user: CurrentUser):
    """
    Ejecuta una revisión ortográfica del contenido del blog usando OpenAI.
    Devuelve la lista de errores detectados sin modificar el contenido y teniendo en cuenta el contexto.
    El frontend se encarga de resaltarlos y, una vez aplicados, marcar el
    blog con estado 'reviewed_ai' vía PUT /blogs/{id}.
    """
    # El get_blog valida su existencia (lanza 404 si no existe :D)
    service.get_blog(current_user, db, blog_id)
    return review_blog_spelling(db, blog_id)