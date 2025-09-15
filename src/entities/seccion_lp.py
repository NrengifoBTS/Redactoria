# src/entities/seccion_lp.py

from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from ..database.core import Base

class SeccionLP(Base):
    __tablename__ = "secciones_lp"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Relación con landing page
    landing_page_id = Column(PG_UUID(as_uuid=True), ForeignKey("landing_pages.id"), nullable=False)
    
    # Configuración de la sección
    section_type = Column(String(50), nullable=False)  # quicksearch, fleet, agencies, faq, etc.
    title = Column(Text, nullable=True)  # El tit_seo que ingresa el usuario
    content = Column(Text, nullable=True)  # Contenido generado por el LLM
    
    # Posición en el redactor
    cell_position = Column(String(10), nullable=False)  # A1, B2, C3, etc.
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    
    # Relationships (cuando creemos las otras entidades)
    landing_page = relationship("LandingPage", back_populates="secciones")

    def __repr__(self):
        return f"<SeccionLP(id={self.id}, cell_position='{self.cell_position}', section_type='{self.section_type}')>"