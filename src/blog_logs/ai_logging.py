# redactoria/src/blog_logs/ai_logging.py
from datetime import datetime, timezone
from uuid import UUID
import logging
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

# Importamos la entidad actualizada
from src.entities.blog_logs import BlogAIGenerationLog 

class BlogAILoggingService:
    """
    Servicio para registrar las generaciones de contenido de IA para Blogs.
    Esto permite guardar el 'punto de partida' antes de que el usuario haga cambios.
    """

    @staticmethod
    def log_generation(
        db: Session,
        blog_id: UUID,
        titles_before: Any,
        scraping_id: Optional[UUID] = None
    ) -> Optional[BlogAIGenerationLog]:
        try:
            existing_log = db.query(BlogAIGenerationLog).filter(
                BlogAIGenerationLog.blog_id == blog_id
            ).first()

            if existing_log:
                existing_log.titles_before = titles_before
                existing_log.created_at = datetime.now(timezone.utc)
                db.commit()
                return existing_log
            else:
                new_generation = BlogAIGenerationLog(
                    blog_id=blog_id,
                    scraping_id=scraping_id,
                    titles_before=titles_before, 
                    structure_before=[], 
                    prompt_used="Generación inicial de esqueleto",
                    model_name="gpt-4o",
                    raw_ai_output={} 
                )
                db.add(new_generation)
                db.commit()
                db.refresh(new_generation)
                return new_generation
        except Exception as e:
            logging.error(f"✗ Error en log_generation: {e}")
            db.rollback()
            return None
        
    @staticmethod
    def get_latest_generation(db: Session, blog_id: UUID) -> Optional[BlogAIGenerationLog]:
        """
        Obtiene la última generación de IA para un blog específico.
        """
        try:
            return db.query(BlogAIGenerationLog)\
                .filter(BlogAIGenerationLog.blog_id == blog_id)\
                .order_by(BlogAIGenerationLog.created_at.desc())\
                .first()
        except Exception as e:
            logging.error(f"✗ Error al obtener última generación: {e}")
            return None