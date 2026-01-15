# redactoria/src/blog_logs/edit_logging.py

from datetime import datetime, timezone
from uuid import UUID,uuid4
import logging
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List

from src.entities.blog_logs import BlogStructureLog
# CORRECCIÓN: Rutas de importación ajustadas
from .semantic_analyzer import SemanticAnalyzer
from .alignment_analyzer import BlogAlignmentAnalyzer

class BlogEditLoggingService:
    """
    Servicio para registrar ediciones de artículos.
    Analiza movimientos de secciones, cambios de títulos y deriva semántica.
    """

    def __init__(self):
        self.semantic_analyzer = SemanticAnalyzer()
        self.alignment_analyzer = BlogAlignmentAnalyzer()

    def log_structure_edit(
        self,
        db: Session,
        user_id: UUID,
        blog_id: UUID,
        titles_after: Any,
        structure_after: Any, 
        scraping_id: Optional[UUID] = None,
        action_type: str = "manual_edit",
        action_context: Dict[str, Any] = None
    ) -> Optional[BlogStructureLog]:
        try:
            existing_log = db.query(BlogStructureLog).filter(
                BlogStructureLog.blog_id == blog_id
            ).first()

            if existing_log:
                existing_log.titles_after = titles_after
                existing_log.structure_after = structure_after # <--- Se guarda el JSON con contenido
                existing_log.action_type = action_type
                existing_log.change_summary = action_context
                existing_log.created_at = datetime.now(timezone.utc)
                db.commit()
                return existing_log

            new_log = BlogStructureLog(
                id=uuid4(),
                blog_id=blog_id,
                user_id=user_id,
                titles_after=titles_after,
                structure_after=structure_after, # <--- Se guarda el JSON con contenido
                action_type=action_type,
                change_summary=action_context
            )
            db.add(new_log)
            db.commit()
            return new_log
        except Exception as e:
            logging.error(f"Error: {e}")
            db.rollback()
            return None

    def _extract_full_text(self, structure: Optional[List[Dict[str, Any]]]) -> str:
        """Helper para aplanar el JSON y obtener un string único para spaCy."""
        if not structure:
            return ""
            
        full_text = []
        for section in structure:
            # Capturamos títulos y contenido de cada bloque
            full_text.append(section.get("text", ""))
            full_text.append(section.get("content", ""))
            
            # Recursión si hay hijos (secciones anidadas)
            if section.get("children"):
                full_text.append(self._extract_full_text(section["children"]))
                
        return " ".join([t for t in full_text if t]).strip()