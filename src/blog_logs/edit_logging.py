# redactoria/src/blog_logs/edit_logging.py

from datetime import datetime, timezone
from uuid import UUID, uuid4
import logging
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from src.entities.blog_logs import BlogStructureLog

class BlogEditLoggingService:
    def __init__(self):
        pass # Eliminamos analizadores para que no pesen ni den error

    def log_structure_edit(
        self,
        db: Session,
        user_id: UUID,
        blog_id: UUID,
        titles_after: Any,
        structure_after: Any = None, 
        scraping_id: Optional[UUID] = None,
        action_type: str = "manual_edit",
        action_context: Dict[str, Any] = None
    ) -> Optional[BlogStructureLog]:
        try:
            # Buscamos si ya existe un log para este blog para actualizarlo
            existing_log = db.query(BlogStructureLog).filter(
                BlogStructureLog.blog_id == blog_id
            ).first()

            if existing_log:
                existing_log.titles_after = titles_after
                # Forzamos lista vacía si es None para que la DB no lo rechace
                existing_log.structure_after = structure_after if structure_after is not None else []
                existing_log.action_type = action_type
                existing_log.created_at = datetime.now(timezone.utc)
                db.commit()
                return existing_log

            # Si no existe, creamos el registro
            new_log = BlogStructureLog(
                id=uuid4(),
                blog_id=blog_id,
                user_id=user_id,
                scraping_id=scraping_id,
                titles_after=titles_after, # <--- AQUÍ SE GUARDAN TUS TÍTULOS
                structure_after=structure_after if structure_after is not None else [], # <--- OBLIGATORIO PARA LA DB
                action_type=action_type,
                change_summary=action_context or {}, # <--- OBLIGATORIO PARA LA DB
                created_at=datetime.now(timezone.utc)
            )
            
            db.add(new_log)
            db.commit()
            return new_log

        except Exception as e:
            logging.error(f"✗ ERROR CRÍTICO AL GUARDAR TITLES_AFTER: {e}")
            db.rollback()
            return None