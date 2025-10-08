from sqlalchemy.orm import Session
from . import models
from . import service 
from src.entities.blog import Blog

def create_blog(db: Session, blog: models.BlogCreate) -> Blog:
    new_blog = Blog(**blog.model_dump())
    db.add(new_blog)
    db.commit()
    db.refresh(new_blog)
    return new_blog

def get_blogs(db: Session):
    return db.query(Blog).all()

def get_blog(db: Session, blog_id: int):
    return db.query(Blog).filter(Blog.id == blog_id).first()

def update_blog(db: Session, blog_id: int, blog_update: models.BlogUpdate):
    blog = get_blog(db, blog_id)
    if not blog:
        return None
    
    update_data = blog_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(blog, field, value)
    
    db.commit()
    db.refresh(blog)
    return blog

def delete_blog(db: Session, blog_id: int):
    blog = get_blog(db, blog_id)
    if blog:
        db.delete(blog)
        db.commit()
