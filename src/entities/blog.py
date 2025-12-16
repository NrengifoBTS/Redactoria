#redactoria/src/entities/blog.py
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import relationship
from uuid import uuid4
import json
from ..database.core import Base 
from .scraping import Scraping # <--- IMPORTAR LA NUEVA ENTIDAD

class Blog(Base):
    """
    Modelo ORM para la entidad Blog.
    Refleja la estructura de Proyecto, añadiendo campos de generación IA.
    """
    __tablename__ = 'blogs'

    # =======================================================================
    # 1. CAMPOS BASE Y DE AUDITORÍA (Similar a Proyecto)
    # =======================================================================
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    title = Column(String(255), nullable=False)
    estado = Column(String(50), nullable=False, default='draft') 
    prioridad = Column(String(50), nullable=False, default='Baja') 
    categoria = Column(String(255), nullable=True)
    keywords = Column(Text, nullable=True)
    idioma = Column(String(50), nullable=True) 
    tecnica = Column(String(50), nullable=True)
    acento = Column(String(50), nullable=True)
    tono = Column(String(50), nullable=True)
    
    # Auditoría y Asignación
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    # Columna que estaba dando error
    assigned_to = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)

    # ==========================================================
    # NUEVAS RELACIONES AÑADIDAS PARA EVITAR NoReferencedTableError
    # ==========================================================
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_blogs")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_blogs")

    # Tiempos
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_modified = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )
    
    # =======================================================================
    # 2. CAMPOS ESPECÍFICOS DE BLOG/GENERACIÓN DE CONTENIDO
    # =======================================================================
    
    # Estructura detallada del blog (títulos H1, H2, H3 con contenido parcial o IDs)
    estructura_blog_json = Column(JSON, nullable=True)      

    estimated_word_count = Column(Integer, nullable=True)

    urls = Column(Text, nullable=True)


    scraping = relationship(
        "Scraping", 
        uselist=False, 
        back_populates="blog",
        cascade="all, delete-orphan" 
    )

    def __repr__(self):
        return f"<Blog(id='{self.id}', title='{self.title}', estado='{self.estado}')>"
