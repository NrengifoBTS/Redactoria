# redactoria/src/blog_logs/edit_logging.py

from datetime import datetime, timezone
from uuid import UUID, uuid4
import logging
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List

from src.entities.blog_logs import BlogStructureLog, BlogAIGenerationLog
from .semantic_analyzer import SemanticAnalyzer
from .alignment_analyzer import BlogAlignmentAnalyzer

class BlogEditLoggingService:
    def __init__(self):
        self.semantic_analyzer = SemanticAnalyzer()
        self.alignment_analyzer = BlogAlignmentAnalyzer()

    def log_structure_edit(
        self,
        db: Session,
        user_id: UUID,
        blog_id: UUID,
        titles_after: Any,
        structure_after: List[Dict[str, Any]] = None, 
        scraping_id: Optional[UUID] = None,
        action_type: str = "manual_edit",
        action_context: Dict[str, Any] = None
    ) -> Optional[BlogStructureLog]:
        try:
            # 1. Recuperar la generación base de la IA
            ai_gen = db.query(BlogAIGenerationLog).filter(
                BlogAIGenerationLog.blog_id == blog_id
            ).first()

            section_analysis = []
            avg_similarity = 0.0
            alignment_score = 0.0 # <--- Agregamos variable para la columna alignment_score

            # 2. PROCESAMIENTO SEMÁNTICO POR BLOQUE
            if ai_gen and ai_gen.structure_before and structure_after:
                before_map = {block['uniqueId']: block for block in ai_gen.structure_before}
                
                total_similarity = 0
                compared_blocks = 0

                for block_after in structure_after:
                    uid = block_after.get('uniqueId')
                    content_after = block_after.get('content', '')
                    
                    if uid in before_map:
                        content_before = before_map[uid].get('content', '')
                        metrics = self.semantic_analyzer.analyze_edit(content_before, content_after)
                        
                        analysis = {
                            "uniqueId": uid,
                            "level": block_after.get('level'),
                            "similarity_score": metrics.get("similarity_score", 0),
                            "tone_shift": metrics.get("tone_shift", "neutral"),
                            "entities_added": metrics.get("entities_added", []), # Complemento para el front
                            "was_reordered": before_map[uid].get('enumeration') != block_after.get('enumeration')
                        }
                        section_analysis.append(analysis)
                        
                        total_similarity += metrics.get("similarity_score", 0)
                        compared_blocks += 1
                
                if compared_blocks > 0:
                    avg_similarity = total_similarity / compared_blocks

                # --- NUEVO: Cálculo de alineación estructural para la columna alignment_score ---
                structural_data = self.alignment_analyzer.analyze_structural_alignment(
                    ai_gen.structure_before, structure_after
                )
                alignment_score = structural_data.get("retention_score", 0.0)

            # 3. Construir el resumen de cambios
            summary = action_context or {}
            summary.update({
                "sections_analyzed": len(section_analysis),
                "avg_semantic_similarity": round(avg_similarity, 4),
                "detailed_sections": section_analysis,
                "structural_summary": structural_data if 'structural_data' in locals() else {}
            })

            # 4. Guardado o Actualización en DB
            existing_log = db.query(BlogStructureLog).filter(
                BlogStructureLog.blog_id == blog_id
            ).first()

            if existing_log:
                existing_log.titles_after = titles_after
                existing_log.structure_after = structure_after if structure_after is not None else []
                existing_log.action_type = action_type
                existing_log.change_summary = summary
                # AGREGADO: Guardar los scores analizados en sus columnas
                existing_log.semantic_score = round(avg_similarity, 4)
                existing_log.alignment_score = round(alignment_score, 4)
                
                existing_log.created_at = datetime.now(timezone.utc)
                db.commit()
                return existing_log

            new_log = BlogStructureLog(
                id=uuid4(),
                blog_id=blog_id,
                user_id=user_id,
                scraping_id=scraping_id,
                titles_after=titles_after,
                structure_after=structure_after if structure_after is not None else [],
                action_type=action_type,
                change_summary=summary,
                # AGREGADO: Guardar los scores analizados en sus columnas
                semantic_score=round(avg_similarity, 4),
                alignment_score=round(alignment_score, 4),
                created_at=datetime.now(timezone.utc)
            )
            
            db.add(new_log)
            db.commit()
            return new_log

        except Exception as e:
            logging.error(f"✗ ERROR CRÍTICO AL PROCESAR LOG DE EDICIÓN: {e}")
            db.rollback()
            return None