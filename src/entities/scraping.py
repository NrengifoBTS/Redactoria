# redactoria/src/entities/scraping.py

from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import relationship
from uuid import uuid4
from ..database.core import Base  # Asume la ubicación de tu Base

class Scraping(Base):
    """
    Modelo ORM para almacenar el contenido consolidado resultante del scraping.
    Esta tabla es independiente de 'blogs' pero se vincula a ella.
    """
    __tablename__ = 'scraping'

    # Clave primaria para la tabla de resultados de scraping
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Clave Foránea a la tabla de Blog (Relación One-to-One)
    blog_id = Column(
        UUID(as_uuid=True), 
        ForeignKey('blogs.id', ondelete="CASCADE"), 
        unique=True, 
        nullable=False
    )

    # Campo solicitado: El texto consolidado
    consolidated_content = Column(Text, nullable=True) 
    
    # Datos brutos del scraping (artículos individuales)
    scrape_blocks_json = Column(JSON, nullable=True) 

    
    # Auditoría
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relación de vuelta al Blog
    blog = relationship("Blog", back_populates="scraping")