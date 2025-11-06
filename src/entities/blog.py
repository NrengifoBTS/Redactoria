from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSON
from sqlalchemy.orm import relationship
from src.database.core import Base

class Blog(Base):
    __tablename__ = "Blogs"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False) 
    title = Column(String(255), nullable=False) 
    author = Column(String(100), nullable=False)
    estado = Column(String(50), nullable=False, default="draft")  # draft, generated, review, etc.
    prioridad = Column(String(20), nullable=False, default="Baja")  # Baja, Media, Alta
    
    # --- Nuevas Columnas para el contenido y la estructura ---
    query = Column(Text, nullable=False) # La consulta de keywords principal
    
    # Guarda los datos iniciales del formulario (categoría, keywords, idioma, tono, acento)
    initial_parameters_json = Column(JSON, nullable=True) 
    
    # Guarda la estructura editable detallada (similar a tablaEstructuraFinal del frontend)
    estructura_blog_json = Column(JSON, nullable=True)

    # Guarda el contenido final consolidado (similar a consolidated_content del frontend/AI)
    consolidated_content = Column(Text, nullable=True) 

    # --- Relación con usuarios ---
    created_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_to = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Relaciones de usuario con back-populates
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_blogs")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_blogs")

    # --- Timestamps ---
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    last_modified = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<Blog(id='{self.id}', name='{self.name}', estado='{self.estado}')>"