# redactoria/src/blog_logs/profile_builder.py

from datetime import datetime, timezone
from uuid import UUID
import logging
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional, Union
from collections import Counter, defaultdict

from src.entities.blog_logs import UserStyleProfile, BlogStructureLog as UserEdit


class ProfileBuilderService:
    """Service for building and updating user style profiles"""

    @staticmethod
    def update_profile(db: Session, user_id: UUID, proyecto_id: UUID) -> Optional[UserStyleProfile]:
        """
        Actualiza el perfil de estilo del usuario basado en las últimas ediciones.
        Perfiles por usuario y proyecto para distinguir estilos (ej: Viajemos vs MCR).
        """
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

            # 2. Obtener últimas 50 ediciones del blog para este usuario y proyecto
            recent_edits = db.query(UserEdit).filter(
                UserEdit.user_id == user_id,
                UserEdit.structure_before.isnot(None) # Solo cambios, no creaciones iniciales
            ).order_by(UserEdit.created_at.desc()).limit(50).all()

            if not recent_edits:
                logging.debug(f"No hay ediciones suficientes para el usuario {user_id}")
                return profile

            # 3. Análisis de patrones (adaptado a la estructura de BlogStructureLog)
            updated_signature = ProfileBuilderService._analyze_edits(recent_edits)
            
            # 4. Actualizar métricas de alineación (ASS)
            avg_alignment = ProfileBuilderService._calculate_avg_alignment(recent_edits)

            # 5. Guardar cambios en el perfil
            profile.style_signature = updated_signature
            profile.avg_alignment_shift_score = avg_alignment
            profile.total_edits_analyzed = len(recent_edits)
            profile.profile_confidence = min(len(recent_edits) / 50.0, 1.0)
            profile.last_updated = datetime.now(timezone.utc)
            profile.profile_version = (profile.profile_version or 0) + 1

            db.commit()
            logging.info(f"✓ Perfil de estilo actualizado para {user_id} (v{profile.profile_version})")

            return profile

        except Exception as e:
            logging.error(f"✗ Error al actualizar perfil: {e}", exc_info=True)
            db.rollback()
            return None

    @staticmethod
    def _analyze_edits(edits: List[UserEdit]) -> Dict:
        """Extrae preferencias de tono y cambios estructurales."""
        tone_prefs = Counter()
        action_types = Counter()
        
        for edit in edits:
            # Extraer tono del change_summary
            if edit.change_summary:
                tone = edit.change_summary.get('semantic_meta')
                if tone:
                    tone_prefs[tone] += 1
            
            action_types[edit.action_type] += 1

        total = len(edits)
        return {
            "tone_distribution": {t: round(c/total, 2) for t, c in tone_prefs.items()},
            "action_distribution": {a: round(c/total, 2) for a, c in action_types.items()},
            "most_common_action": action_types.most_common(1)[0][0] if action_types else "unknown"
        }

    @staticmethod
    def _calculate_avg_alignment(edits: List[UserEdit]) -> float:
        """Calcula el promedio de Alignment Shift Score."""
        scores = [e.semantic_score for e in edits if e.semantic_score is not None]
        return round(sum(scores) / len(scores), 3) if scores else 0.0

    @staticmethod
    def get_profile(db: Session, user_id: UUID, proyecto_id: Optional[UUID] = None) -> Union[UserStyleProfile, List[UserStyleProfile], None]:
        """Recupera el perfil activo."""
        try:
            query = db.query(UserStyleProfile).filter(UserStyleProfile.user_id == user_id)
            if proyecto_id:
                return query.filter(UserStyleProfile.proyecto_id == proyecto_id).first()
            return query.all()
        except Exception as e:
            logging.error(f"✗ Error al obtener perfil: {e}")
            return None