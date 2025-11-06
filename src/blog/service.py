from sqlalchemy.orm import Session
from . import models
from src.entities.blog import Blog
from datetime import datetime
from uuid import UUID
from typing import List, Optional, Dict, Any
import json

class CurrentUser(object): 
    def __init__(self, id: UUID): self.id = id 

# =======================================================================
# CREACIÓN DE BLOG
# =======================================================================
def create_blog(current_user: CurrentUser, db: Session, blog_request: models.BlogCreate) -> Blog:
    user_id = current_user.id 
    
    # Los datos del formulario inicial se guardan como JSON
    initial_params_data = blog_request.model_dump(by_alias=True)
    
    # Extraer el título para name/title y la query
    blog_name = initial_params_data.get("titulo") 
    blog_query = initial_params_data.get("keywords") # Usamos las keywords como query principal

    new_blog = Blog(
        # Campos básicos y de usuario
        name=blog_name,          
        title=blog_name,         
        author="[ID:{}]".format(user_id), # Se puede mejorar para usar el nombre real
        estado=blog_request.estado.value,
        prioridad=blog_request.prioridad.value,
        created_by=user_id,             
        query=blog_query, # La query de búsqueda inicial
        
        # Guardar la estructura de parámetros iniciales como JSON
        initial_parameters_json=initial_params_data, 
        
        # Inicializar los campos de contenido a nulo
        estructura_blog_json=None,
        consolidated_content=None,
        
        last_modified=datetime.utcnow()
    )
    
    db.add(new_blog)
    db.commit()
    db.refresh(new_blog)
    return new_blog

# =======================================================================
# LECTURA / OBTENCIÓN (Adaptado para UUID y CurrentUser)
# =======================================================================
def get_blogs(
    current_user: CurrentUser, 
    db: Session, 
    estado: Optional[str] = None, 
    prioridad: Optional[str] = None, 
    assigned_to: Optional[UUID] = None
    ) -> List[Blog]:
    # Por defecto, solo trae los creados por el usuario actual
    query = db.query(Blog).filter(Blog.created_by == current_user.id) 
    
    # Aplicar filtros opcionales
    if estado:
        query = query.filter(Blog.estado == estado)
    if prioridad:
        query = query.filter(Blog.prioridad == prioridad)
    if assigned_to:
        query = query.filter(Blog.assigned_to == assigned_to)
        
    return query.all()

def get_blog_by_id(current_user: CurrentUser, db: Session, blog_id: UUID) -> Optional[Blog]: 
    # Solo puede ver el blog si lo creó o si le fue asignado
    return db.query(Blog).filter(
        Blog.id == blog_id,
        (Blog.created_by == current_user.id) | (Blog.assigned_to == current_user.id)
    ).first()

# =======================================================================
# ACTUALIZACIÓN Y ELIMINACIÓN (Adaptado para UUID y CurrentUser)
# =======================================================================
def update_blog(current_user: CurrentUser, db: Session, blog_id: UUID, blog_update: models.BlogUpdate) -> Optional[Blog]: 
    # Solo permite actualizar al creador
    blog = db.query(Blog).filter(
        Blog.id == blog_id,
        Blog.created_by == current_user.id
    ).first()
    
    if not blog:
        return None # No encontrado o no autorizado
    
    update_data = blog_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            # Asegura que los enums se guarden como valor de string
            if hasattr(value, 'value'):
                 setattr(blog, field, value.value)
            else:
                 setattr(blog, field, value)
    
    blog.last_modified = datetime.utcnow()
    db.commit()
    db.refresh(blog)
    return blog

def delete_blog(current_user: CurrentUser, db: Session, blog_id: UUID) -> bool: 
    # Solo permite eliminar al creador
    blog = db.query(Blog).filter(
        Blog.id == blog_id,
        Blog.created_by == current_user.id
    ).first()
    
    if blog:
        db.delete(blog)
        db.commit()
        return True 
    return False

# --- Endpoints Adicionales (Igual que Proyectos) ---

def get_blogs_created_by_user(current_user: CurrentUser, db: Session) -> List[Blog]:
    return db.query(Blog).filter(Blog.created_by == current_user.id).all() 

def get_blogs_assigned_to_user(current_user: CurrentUser, db: Session) -> List[Blog]:
    return db.query(Blog).filter(Blog.assigned_to == current_user.id).all()

def assign_blog(current_user: CurrentUser, db: Session, blog_id: UUID, assigned_to_id: UUID) -> Optional[Blog]:
    # Lógica de asignación (solo si el usuario actual es el creador o un admin)
    blog = db.query(Blog).filter(
        Blog.id == blog_id,
        Blog.created_by == current_user.id # Asume solo el creador puede reasignar
    ).first()
    
    if not blog:
        return None
        
    blog.assigned_to = assigned_to_id
    blog.last_modified = datetime.utcnow()
    db.commit()
    db.refresh(blog)
    return blog