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
    @staticmethod
    def log_generation(
        db: Session,
        blog_id: UUID,
        titles_before: Any,
        structure_before: Any = None,
        scraping_id: Optional[UUID] = None
    ) -> Optional[BlogAIGenerationLog]:
        try:
            # 1. Buscamos si ya existe un registro para este blog
            existing_log = db.query(BlogAIGenerationLog).filter(
                BlogAIGenerationLog.blog_id == blog_id
            ).first()

            if existing_log:
                # --- LÓGICA DE CONTEO ---
                # Incrementamos siempre que se entre aquí (clic en generar estructura)
                # Usamos (valor o 0) por si la columna está nula inicialmente
                existing_log.generation_counts = (existing_log.generation_counts or 0) + 1
                
                # --- PROTECCIÓN DE DATOS INICIALES ---
                # Solo actualizamos titles/structure si están vacíos (primera vez real)
                if not existing_log.titles_before:
                    existing_log.titles_before = titles_before
                    if structure_before:
                        existing_log.structure_before = structure_before
                    logging.info(f"✓ Baseline data saved for blog {blog_id}")
                else:
                    logging.info(f"✓ Incrementing generation count for blog {blog_id}. Baseline preserved.")

                existing_log.created_at = datetime.now(timezone.utc)
                db.commit()
                return existing_log

            else:
                # 2. Si no existe registro, lo creamos con conteo inicial = 1
                new_generation = BlogAIGenerationLog(
                    blog_id=blog_id,
                    scraping_id=scraping_id,
                    titles_before=titles_before, 
                    structure_before=structure_before or [], 
                    prompt_used="Generación inicial Baseline",
                    model_name="gpt-4o",
                    raw_ai_output={},
                    generation_counts=1  # <--- Iniciamos el contador
                )
                db.add(new_generation)
                db.commit()
                db.refresh(new_generation)
                return new_generation

        except Exception as e:
            db.rollback()
            logging.error(f"✗ Error en log_generation: {e}")
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