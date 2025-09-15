# src/entities/landing_page.py

from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from ..database.core import Base

class LandingPage(Base):
    __tablename__ = "landing_pages"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Relación con proyecto (1:1)
    proyecto_id = Column(PG_UUID(as_uuid=True), ForeignKey("proyectos.id"), nullable=False, unique=True)
    template_id = Column(PG_UUID(as_uuid=True), ForeignKey("templates.id"), nullable=True)
    
    # Configuración pública
    url_slug = Column(String(255), nullable=False, unique=True) 
    title = Column(String(255), nullable=False)  # SEO title
    meta_description = Column(Text, nullable=True)  # SEO meta description
    
    # Control de publicación
    is_published = Column(Boolean, default=False, nullable=False)
    published_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    
    # Relationships (cuando creemos las otras entidades)
    proyecto = relationship("Proyecto", back_populates="landing_page")
    secciones = relationship("SeccionLP", back_populates="landing_page", cascade="all, delete-orphan")
    template = relationship("Template", back_populates="landing_pages")
    anotaciones = relationship("Anotacion", back_populates="landing_page", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<LandingPage(id={self.id}, url_slug='{self.url_slug}', is_published={self.is_published})>"