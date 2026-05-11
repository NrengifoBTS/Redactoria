#redactoria/src/blog/service.py
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from src.entities.blog import Blog 
from datetime import datetime, timezone
from uuid import UUID
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
import logging
from . import models

logging.basicConfig(level=logging.INFO)

# =======================================================================
# UTILERÍAS DE PERMISOS (Asumiendo que se mantiene esta estructura temporal)
# =======================================================================

# Lista de IDs de administradores (Manteniendo el snippet original)
ADMIN_USER_IDS = [
  '65cd97a4-c3b9-4bfd-b014-55457ae847e3',
  'f49cda9b-2138-435e-a497-fda85be87e63',
  'c7c17838-074d-44fa-9248-8dc87c15edd5',
  '152c46be-e2f4-48da-86b1-592af570624a',
  'b43f1d04-f339-4cf9-8e4e-4f127f12af5a',
  ]


class CurrentUser(object): 
    """Clase de utilidad para simular el usuario actual obtenido del token."""
    def __init__(self, id: UUID): self.id = id 
    def get_uuid(self) -> UUID: return self.id 

def is_admin_user(user_uuid: UUID) -> bool:
    """Verificar si el usuario es administrador"""
    if user_uuid is None:
        return False
    # Convertir el UUID a string para la comparación con la lista
    return str(user_uuid) in ADMIN_USER_IDS


# =======================================================================
# 1. HELPER: OBTENER BLOG CON VERIFICACIÓN DE PERMISOS
# =======================================================================

def get_blog(current_user: CurrentUser, db: Session, blog_id: UUID) -> Blog:
    """
    Obtiene un blog por su ID. 
    Permite la LECTURA a cualquier usuario autenticado (Visualizador incluido).
    """
    # 1. Búsqueda del blog
    blog = db.query(Blog).filter(Blog.id == blog_id).first()
    
    # 2. Manejo de 404
    if not blog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog no encontrado.")

    return blog

# =======================================================================
# 2. CRUD BÁSICO
# =======================================================================

# En service.py, en la función create_blog

def create_blog(current_user: CurrentUser, db: Session, blog_request: models.BlogCreate) -> Blog:
    user_id = current_user.get_uuid()
    
    # 1. Preparar datos
    initial_params_data = blog_request.model_dump(by_alias=False) 
    query_string = f"{blog_request.title} {blog_request.categoria} {blog_request.keywords}"
    
    # 2. Inicializar la entidad ORM (incluyendo el campo 'title' directamente en el constructor)
    new_blog = Blog(
        title=blog_request.title,
        estado=blog_request.estado.value,
        prioridad=blog_request.prioridad.value,
        created_by=user_id,
        created_at=datetime.now(timezone.utc),
        last_modified=datetime.now(timezone.utc),
        

        categoria=blog_request.categoria,
        keywords=blog_request.keywords,
        idioma=blog_request.idioma,
        tecnica=blog_request.tecnica,
        acento=blog_request.acento,
        tono=blog_request.tono,
    )
    
    # 4. Persistir en la base de datos
    db.add(new_blog)
    db.commit()
    db.refresh(new_blog)
    
    logging.info(f"Blog {new_blog.id} creado por usuario {user_id}")
    return new_blog


def update_blog(current_user: CurrentUser, db: Session, blog_id: UUID, blog_update: models.BlogUpdate) -> Optional[Blog]:
    """Actualiza un blog. Solo el creador o un admin pueden actualizar."""
    try:
        blog = get_blog(current_user, db, blog_id)
    except HTTPException:
        return None 
    
    user_id = current_user.get_uuid()

    # Solo el creador o un admin pueden actualizar
    if not is_admin_user(user_id) and blog.created_by != user_id:
        logging.warning(f"Intento de UPDATE no autorizado en blog {blog_id} por usuario {user_id}")
        return None

    update_data = blog_update.model_dump(exclude_unset=True)
    
    # Mapear los campos del modelo Pydantic al ORM
    for key, value in update_data.items():
        if value is not None:
            # === MODIFICACIÓN CLAVE AQUÍ: Manejar la estructura JSON ===
            if key == 'estructura_blog_json':
                # Asignar el diccionario JSON directamente.
                setattr(blog, key, value) 
            # ==========================================================
            elif key == 'estimated_word_count': 
                setattr(blog, key, value)
            elif key in ('estado', 'prioridad'):
                # Lógica existente para Enums
                setattr(blog, key, value)
            else:
                # Lógica existente para otros campos (title, keywords, consolidated_content, etc.)
                setattr(blog, key, value)

    blog.last_modified = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(blog)
    logging.info(f"Blog {blog_id} actualizado por usuario {user_id}. Estructura guardada.")
    return blog

def delete_blog(current_user: CurrentUser, db: Session, blog_id: UUID) -> bool:
    """Elimina un blog. Solo el creador o un admin pueden eliminar."""
    try:
        blog = get_blog(current_user, db, blog_id)
    except HTTPException:
        return False
        
    user_id = current_user.get_uuid()

    # Solo el creador o un admin pueden eliminar
    if not is_admin_user(user_id) and blog.created_by != user_id:
        logging.warning(f"Intento de DELETE no autorizado en blog {blog_id} por usuario {user_id}")
        return False

    db.delete(blog)
    db.commit()
    logging.info(f"Blog {blog_id} eliminado por usuario {user_id}")
    return True

# =======================================================================
# 3. CONSULTAS Y FILTROS (Dashboard Principal)
# =======================================================================

def get_blogs(
    current_user: CurrentUser, 
    db: Session, 
    estado: Optional[str] = None, 
    prioridad: Optional[str] = None, 
    assigned_to: Optional[UUID] = None
) -> List[Blog]:
    """
    Obtiene blogs aplicando filtros. La visibilidad se limita por usuario, 
    a menos que sea admin.
    """
    user_id = current_user.get_uuid()
    query = db.query(Blog)

    # 1. FILTRO DE VISIBILIDAD (Solo aplica si NO es Admin)
    if not is_admin_user(user_id):
        # El usuario normal solo ve blogs que creó O le fueron asignados
        query = query.filter(or_(Blog.created_by == user_id, Blog.assigned_to == user_id))
    else:
        # Si es Admin y se especifica 'assigned_to', aplica el filtro global
        if assigned_to:
            query = query.filter(Blog.assigned_to == assigned_to)
            
    # 2. FILTROS OPCIONALES
    if estado:
        query = query.filter(Blog.estado == estado)
        
    if prioridad:
        query = query.filter(Blog.prioridad == prioridad)

    # Ordenar por fecha de última modificación (el más reciente primero)
    blogs = query.order_by(Blog.last_modified.desc()).all()
    
    logging.info(f"Retrieved {len(blogs)} blogs for user {user_id} with filters.")
    return blogs


# =======================================================================
# 4. CONSULTAS ESPECÍFICAS PARA EL DASHBOARD
# =======================================================================

def get_blogs_created_by_user(current_user: CurrentUser, db: Session) -> List[Blog]:
    """Obtener blogs creados por el usuario actual."""
    user_id = current_user.get_uuid()
    blogs = db.query(Blog).filter(Blog.created_by == user_id).all()
    logging.info(f"Retrieved {len(blogs)} created blogs for user {user_id}.")
    return blogs

def get_blogs_assigned_to_user(current_user: CurrentUser, db: Session) -> List[Blog]:
    """Obtener blogs asignados al usuario actual."""
    user_id = current_user.get_uuid()
    blogs = db.query(Blog).filter(Blog.assigned_to == user_id).all()
    logging.info(f"Retrieved {len(blogs)} assigned blogs for user {user_id}.")
    return blogs

def get_blogs_by_user(current_user: CurrentUser, db: Session, user_id: UUID) -> List[Blog]:
    """Obtener blogs asignados a un usuario específico (solo Admin)."""
    current_user_id = current_user.get_uuid()
    
    # Solo el admin puede usar este endpoint para ver los blogs de otro
    if not is_admin_user(current_user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado. Solo administradores pueden ver blogs de otros usuarios por ID.")
        
    blogs = db.query(Blog).filter(Blog.assigned_to == user_id).all()
    logging.info(f"Admin user {current_user_id} retrieved {len(blogs)} assigned blogs for user {user_id}.")
    return blogs


# =======================================================================
# 5. ASIGNACIÓN Y DESASIGNACIÓN
# =======================================================================

def assign_blog(current_user: CurrentUser, db: Session, blog_id: UUID, assigned_to_id: UUID) -> Optional[Blog]:
    """Asigna un blog a un usuario. Solo el creador o un admin pueden asignar."""
    try:
        # Reutiliza get_blog para verificar existencia y permisos de lectura
        blog = get_blog(current_user, db, blog_id) 
    except HTTPException:
        return None

    user_id = current_user.get_uuid()
    # Solo el creador o un admin pueden asignar
    if not is_admin_user(user_id) and blog.created_by != user_id:
        logging.warning(f"Intento de ASSIGN no autorizado en blog {blog_id} por usuario {user_id}")
        return None

    if assigned_to_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Se requiere un ID de usuario para la asignación.")
        
    blog.assigned_to = assigned_to_id
    blog.last_modified = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(blog)
    logging.info(f"Blog {blog_id} asignado a {assigned_to_id} por usuario {user_id}")
    return blog

def unassign_blog(current_user: CurrentUser, db: Session, blog_id: UUID) -> Optional[Blog]:
    """Desasigna un blog (establece assigned_to en None)."""
    try:
        blog = get_blog(current_user, db, blog_id)
    except HTTPException:
        return None

    user_id = current_user.get_uuid()

    # Solo el creador o un admin pueden desasignar
    if not is_admin_user(user_id) and blog.created_by != user_id:
        logging.warning(f"Intento de UNASSIGN no autorizado en blog {blog_id} por usuario {user_id}")
        return None
        
    blog.assigned_to = None
    blog.last_modified = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(blog)
    logging.info(f"Blog {blog_id} desasignado por usuario {user_id}")
    return blog