# redactoria/src/blog_logs/profile_builder.py

from datetime import datetime, timezone
from uuid import UUID
import logging
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional, Union
from collections import Counter

from src.entities.blog_logs import UserStyleProfile, BlogStructureLog as UserEdit

class ProfileBuilderService:
    """
    Construye el perfil de estilo del redactor analizando la evolución
    de los bloques (H1, H2, P) y su alineación con la IA.
    """

    @staticmethod
    def update_profile(db: Session, user_id: UUID, proyecto_id: UUID) -> Optional[UserStyleProfile]:
        try:
            # 1. Obtener o crear el perfil
            profile = db.query(UserStyleProfile).filter(
                UserStyleProfile.user_id == user_id,
                UserStyleProfile.proyecto_id == proyecto_id
            ).first()

            if not profile:
                profile = UserStyleProfile(
                    user_id=user_id,
                    proyecto_id=proyecto_id,
                    profile_confidence=0.0,
                    total_edits_analyzed=0,
                    style_signature={},
                    semantic_patterns={},
                    created_at=datetime.now(timezone.utc)
                )
                db.add(profile)

            # 2. Obtener todas las ediciones históricas de este usuario en este proyecto
            edits = db.query(UserEdit).filter(
                UserEdit.user_id == user_id,
                UserEdit.proyecto_id == proyecto_id
            ).all()

            if not edits:
                return profile

            # 3. Procesar patrones granulares (Bloque por bloque)
            # Extraemos la data que guardamos en edit_logging.py -> change_summary['detailed_sections']
            all_sections_data = []
            for edit in edits:
                if edit.change_summary and "detailed_sections" in edit.change_summary:
                    all_sections_data.extend(edit.change_summary["detailed_sections"])

            # 4. Actualizar métricas del perfil
            profile.total_edits_analyzed = len(edits)
            
            # Calculamos la confianza basándonos en la cantidad de secciones analizadas
            # A más secciones procesadas, más conocemos al usuario (cap de 1.0)
            profile.profile_confidence = min(len(all_sections_data) / 50, 1.0) 

            # 5. Construir la firma de estilo (Style Signature)
            profile.style_signature = ProfileBuilderService._build_style_signature(all_sections_data)
            
            # 6. Patrones semánticos (Entidades y Keywords recurrentes)
            profile.semantic_patterns = ProfileBuilderService._analyze_semantic_trends(all_sections_data)

            profile.updated_at = datetime.now(timezone.utc)
            db.commit()
            return profile

        except Exception as e:
            logging.error(f"✗ Error al actualizar perfil de estilo: {e}")
            db.rollback()
            return None

    @staticmethod
    def _build_style_signature(sections: List[Dict]) -> Dict[str, Any]:
        """Analiza tendencias por tipo de bloque (H1, H2, P)"""
        if not sections:
            return {}

        # Agrupamos similitudes por nivel de título/párrafo
        level_stats = {}
        for sec in sections:
            lvl = sec.get('level', 'unknown')
            if lvl not in level_stats:
                level_stats[lvl] = []
            level_stats[lvl].append(sec.get('similarity_score', 0))

        # Promediamos qué tanto cambia el usuario cada tipo de bloque
        avg_by_level = {
            lvl: round(sum(scores) / len(scores), 3) 
            for lvl, scores in level_stats.items()
        }

        # Detectamos el tono predominante en las ediciones
        tones = Counter([s.get('tone_shift') for s in sections if s.get('tone_shift')])
        
        return {
            "retention_by_level": avg_by_level,
            "dominant_edit_tone": tones.most_common(1)[0][0] if tones else "neutral",
            "edit_intensity": "high" if any(v < 0.5 for v in avg_by_level.values()) else "low"
        }

    @staticmethod
    def _analyze_semantic_trends(sections: List[Dict]) -> Dict[str, Any]:
        """Extrae qué entidades o conceptos suele añadir el usuario consistentemente"""
        added_entities = []
        for sec in sections:
            added_entities.extend(sec.get('entities_added', []))

        common_entities = Counter(added_entities).most_common(10)
        
        return {
            "frequent_user_concepts": [ent[0] for ent in common_entities],
            "vocabulary_expansion": len(set(added_entities))
        }