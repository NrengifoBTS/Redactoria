from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from src.database.core import Base
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSON
from sqlalchemy.orm import relationship

class Blog(Base):
    __tablename__ = "Blogs"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    author = Column(String(100), nullable=False)
    estado = Column(String(50), nullable=False, default="Pendiente")  # En progreso, Completado, Cancelado
    prioridad = Column(String(20), nullable=False, default="Baja")  # Baja, Media, Alta

    #Estructura final del formato del blog 
    estructura_blog_json = Column(JSON, nullable=True)

    #Relacion con con los usuarios 
    created_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_to = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Timestamps para determinar cuando se actualiza un blog 
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    last_modified = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    #Relacion con la entidad User
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_projects")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_projects")
    

    def __repr__(self):
        return f"<Blog(id={self.id}, title='{self.title}', author='{self.author}')>"
