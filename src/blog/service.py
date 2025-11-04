from sqlalchemy.orm import Session
from . import models
from src.entities.blog import Blog
from uuid import UUID # Necesaria para los IDs
from typing import List, Optional
from datetime import datetime # Necesaria para last_modified


# CREACIÓN 
def create_blog(db: Session, blog_request: models.BlogCreate, user_id: UUID) -> Blog:
    
    initial_data = {
        "initial_params": blog_request.model_dump(exclude={"estado", "prioridad"}),
        "structure": None,
        "content": None
    }
    
    new_blog = Blog(
        name=blog_request.titulo,          
        title=blog_request.titulo,         
        author="[ID:{}]".format(user_id),
        estado=blog_request.estado,
        prioridad=blog_request.prioridad,
        created_by=user_id,
        estructura_blog_json=initial_data, 
        last_modified=datetime.utcnow()
    )
    
    db.add(new_blog)
    db.commit()
    db.refresh(new_blog)
    return new_blog

# LECTURA / OBTENCIÓN 

def get_blogs(db: Session, user_id: UUID) -> List[Blog]:
    return db.query(Blog).filter(Blog.created_by == user_id).all() 

def get_blog(db: Session, blog_id: UUID, user_id: UUID) -> Optional[Blog]: 
    return db.query(Blog).filter(
        Blog.id == blog_id,
        Blog.created_by == user_id 
    ).first()


# ACTUALIZACIÓN 

def update_blog(db: Session, blog_id: UUID, blog_update: models.BlogUpdate, user_id: UUID) -> Optional[Blog]: 
    blog = db.query(Blog).filter(
        Blog.id == blog_id,
        Blog.created_by == user_id
    ).first()
    
    if not blog:
        return None
    
    update_data = blog_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(blog, field, value)
    
    blog.last_modified = datetime.utcnow() # Actualizar timestamp
    db.commit()
    db.refresh(blog)
    return blog

# ELIMINACIÓN 

def delete_blog(db: Session, blog_id: UUID, user_id: UUID) -> bool: 
    blog = db.query(Blog).filter(
        Blog.id == blog_id,
        Blog.created_by == user_id
    ).first()
    
    if blog:
        db.delete(blog)
        db.commit()
        return True 
    return False