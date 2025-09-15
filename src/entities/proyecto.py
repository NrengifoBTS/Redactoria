# src/entities/proyecto.py

from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from ..database.core import Base

class Proyecto(Base):
    __tablename__ = "proyectos"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    estado = Column(String(50), nullable=False, default="Pendiente")  # En progreso, Completado, Cancelado
    prioridad = Column(String(20), nullable=False, default="Baja")  # Baja, Media, Alta
    
    # Relaciones con usuarios
    created_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_to = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Relación con template
    template_id = Column(PG_UUID(as_uuid=True), ForeignKey("templates.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    last_modified = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_projects")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_projects")
    template = relationship("Template", back_populates="proyectos")
    landing_page = relationship("LandingPage", back_populates="proyecto", uselist=False)

    def __repr__(self):
        return f"<Proyecto(id={self.id}, name='{self.name}', estado='{self.estado}', prioridad='{self.prioridad}')>"