# src/entities/template.py

from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSON
from sqlalchemy.orm import relationship
from ..database.core import Base

class Template(Base):
    __tablename__ = "templates"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Configuración del template (estructura de celdas, tipos, etc.)
    template_config = Column(JSON, nullable=False)
    
    landing_pages = relationship("LandingPage", back_populates="template")
    
    #CAMPOS DE ORGANIZACIÓN
    proyecto = Column(String(100), nullable=False)  
    dominio = Column(String(100), nullable=False)   
    categoria = Column(String(100), nullable=False) 
    
    # Control de estado
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relación con usuario creador
    created_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    
    # Relationships (cuando creemos las otras entidades)
    creator = relationship("User", back_populates="created_templates")
    proyectos = relationship("Proyecto", back_populates="template")

    def __repr__(self):
        return f"<Template(id={self.id}, name='{self.name}', is_active={self.is_active})>"