from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from src.database.core import DbSession
from . import models
from . import service

router = APIRouter(
    prefix="/blogs",
    tags=["Blogs"]
)

@router.post("/", response_model=models.BlogResponse, status_code=status.HTTP_201_CREATED)
def create_blog(db: DbSession, blog: models.BlogCreate):
    return service.create_blog(db, blog)

@router.get("/", response_model=List[models.BlogResponse])
def get_blogs(db: DbSession):
    return service.get_blogs(db)

@router.get("/{blog_id}", response_model=models.BlogResponse)
def get_blog(blog_id: int, db: DbSession):
    blog = service.get_blog(db, blog_id)
    if not blog:
        raise HTTPException(status_code=404, detail="Blog no encontrado")
    return blog

@router.put("/{blog_id}", response_model=models.BlogResponse)
def update_blog(blog_id: int, blog_update: models.BlogUpdate, db: DbSession):
    blog = service.update_blog(db, blog_id, blog_update)
    if not blog:
        raise HTTPException(status_code=404, detail="Blog no encontrado")
    return blog

@router.delete("/{blog_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_blog(blog_id: int, db: DbSession):
    service.delete_blog(db, blog_id)
