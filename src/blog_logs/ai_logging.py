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
            # 1. BUSCAR SI YA EXISTE UN LOG PARA ESTE BLOG
            existing_log = db.query(BlogAIGenerationLog).filter(
                BlogAIGenerationLog.blog_id == blog_id
            ).first()

            if existing_log:
                # 2. ACTUALIZAR EL EXISTENTE (Evita duplicados)
                existing_log.titles_before = titles_before
                existing_log.structure_before = titles_before
                existing_log.scraping_id = scraping_id
                existing_log.created_at = datetime.now(timezone.utc) # Actualizar fecha
                db.commit()
                db.refresh(existing_log)
                return existing_log
            else:
                # 3. CREAR UNO NUEVO SI ES LA PRIMERA VEZ
                new_generation = BlogAIGenerationLog(
                    blog_id=blog_id,
                    scraping_id=scraping_id,
                    titles_before=titles_before, 
                    structure_before=titles_before, 
                    prompt_used="Generación inicial de estructura",
                    model_name="gpt-4o",
                    raw_ai_output={"info": "Generación base"}
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