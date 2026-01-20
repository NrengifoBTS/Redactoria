from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Float
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import relationship
from ..database.core import Base

class BlogStructureLog(Base):
    """
    Audit log específico para artículos/blogs. 
    """
    __tablename__ = "blog_structure_logs"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    blog_id = Column(PG_UUID(as_uuid=True), ForeignKey("blogs.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    scraping_id = Column(PG_UUID(as_uuid=True), ForeignKey("scraping.id"), nullable=True)

    titles_after = Column(JSONB, nullable=True) # Titulos finales (H1, H2, H3)
    structure_after = Column(JSONB, nullable=True) # Estructura completa del blog después del cambio por el usuario 
    
    "--Metricas de IA--"
    semantic_score = Column(Float, nullable=True)     
    alignment_score = Column(Float, nullable=True)    
    
    action_type = Column(String(50), nullable=False)  
    change_summary = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    blog = relationship("Blog", foreign_keys=[blog_id])
    user = relationship("User", foreign_keys=[user_id])
    scraping = relationship("Scraping", foreign_keys=[scraping_id])

    def __repr__(self):
        return f"<BlogStructureLog(id={self.id}, blog_id={self.blog_id}, action={self.action_type})>"


class BlogAIGenerationLog(Base):
    """
    Historial de lo que la IA propuso originalmente.
    """
    __tablename__ = "blog_ai_generation_logs"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    blog_id = Column(PG_UUID(as_uuid=True), ForeignKey("blogs.id", ondelete="CASCADE"), nullable=False)
    scraping_id = Column(PG_UUID(as_uuid=True), ForeignKey("scraping.id"), nullable=True)

    titles_before = Column(JSONB, nullable=False) # Solo el esqueleto (H1, H2, H3)
    structure_before = Column(JSONB, nullable=False) # Estructura completa del blog con el primer contenido generado

    generation_counts = Column(Integer, default=1, nullable=False)
    
    prompt_used = Column(Text, nullable=False)
    raw_ai_output = Column(JSONB, nullable=False) 
    
    model_name = Column(String(100)) 
    tokens_used = Column(Integer)
    duration_ms = Column(Integer)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    blog = relationship("Blog", foreign_keys=[blog_id])
    scraping = relationship("Scraping", foreign_keys=[scraping_id])