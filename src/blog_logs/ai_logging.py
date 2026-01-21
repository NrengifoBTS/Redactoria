# redactoria/src/blog_logs/ai_logging.py
from datetime import datetime, timezone
from uuid import UUID
import logging
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from src.entities.blog_logs import BlogAIGenerationLog 

class BlogAILoggingService:
    """
    Servicio para registrar las generaciones de contenido de IA para Blogs.
    Establece el 'Baseline' (punto de partida) para comparar contra las ediciones del usuario.
    """

    @staticmethod
    def log_generation(
        db: Session,
        blog_id: UUID,
        titles_before: Any,
        structure_before: Any = None,
        scraping_id: Optional[UUID] = None,
        model_name: str = "gpt-4o",
        prompt_used: str = "Generación inicial Baseline"
    ) -> Optional[BlogAIGenerationLog]:
        """
        Registra o actualiza el intento de generación de la IA.
        Mantiene intacto el primer contenido generado para no perder la base de comparación.
        """
        try:
            # 1. Buscamos si ya existe un registro para este blog
            existing_log = db.query(BlogAIGenerationLog).filter(
                BlogAIGenerationLog.blog_id == blog_id
            ).first()

            if existing_log:
                # Incrementamos el contador de generaciones
                # (Útil para saber si la IA falló mucho antes de que al usuario le gustara algo)
                existing_log.generation_counts = (existing_log.generation_counts or 0) + 1
                
                # PROTECCIÓN DEL BASELINE: 
                # Solo guardamos el contenido si es la primera vez que recibimos datos reales.
                # Si ya había contenido, NO lo sobreescribimos para no perder contra qué comparar.
                if not existing_log.structure_before or len(existing_log.structure_before) == 0:
                    existing_log.titles_before = titles_before
                    existing_log.structure_before = structure_before or []
                    existing_log.model_name = model_name
                    existing_log.prompt_used = prompt_used
                    logging.info(f"✓ Baseline guardado para el blog {blog_id}")
                else:
                    logging.info(f"✓ Re-generación {existing_log.generation_counts} para blog {blog_id}. Baseline original preservado.")

                existing_log.updated_at = datetime.now(timezone.utc)
                db.commit()
                return existing_log

            else:
                # 2. Creación del registro inicial (El punto cero para el entrenamiento)
                new_generation = BlogAIGenerationLog(
                    blog_id=blog_id,
                    scraping_id=scraping_id,
                    titles_before=titles_before, 
                    structure_before=structure_before or [], 
                    prompt_used=prompt_used,
                    model_name=model_name,
                    raw_ai_output={}, # Aquí podrías guardar el JSON crudo si fuera necesario
                    generation_counts=1,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(new_generation)
                db.commit()
                db.refresh(new_generation)
                return new_generation

        except Exception as e:
            db.rollback()
            logging.error(f"✗ Error crítico en BlogAILoggingService.log_generation: {e}")
            return None

    @staticmethod
    def get_latest_generation(db: Session, blog_id: UUID) -> Optional[BlogAIGenerationLog]:
        """Recupera el Baseline para que el EditLogging pueda comparar."""
        try:
            return db.query(BlogAIGenerationLog)\
                .filter(BlogAIGenerationLog.blog_id == blog_id)\
                .first()
        except Exception as e:
            logging.error(f"✗ Error al obtener Baseline: {e}")
            return None