# src/entities/anotacion.py

from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from ..database.core import Base

class Anotacion(Base):
    __tablename__ = "anotaciones"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Relaciones
    landing_page_id = Column(PG_UUID(as_uuid=True), ForeignKey("landing_pages.id"), nullable=False)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Contenido de la anotación
    cell_position = Column(String(10), nullable=False)  # A1, B2, C3, etc.
    text = Column(Text, nullable=False)  # El contenido de la anotación
    author = Column(String(255), nullable=False)  # Nombre del autor (para mostrar en UI)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    
    # Relationships (cuando creemos las otras entidades)
    landing_page = relationship("LandingPage", back_populates="anotaciones")
    user = relationship("User", back_populates="anotaciones")

    def __repr__(self):
        return f"<Anotacion(id={self.id}, cell_position='{self.cell_position}', author='{self.author}')>"