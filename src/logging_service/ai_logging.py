from datetime import datetime, timezone
from uuid import UUID
import logging
import re
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from src.entities.logging.ai_generation import AIGeneration
from src.auth.models import TokenData


class AILoggingService:
    """Service for logging AI content generations"""

    @staticmethod
    def log_generation(
        db: Session,
        current_user: TokenData,
        landing_page_id: UUID,
        proyecto_id: UUID,
        block_type: str,
        cell_position: str,
        generation_context: Dict[str, Any],
        raw_output: str,
        processed_output: Dict[str, Any],
        duration_ms: int,
        generation_success: bool = True,
        failure_reason: Optional[str] = None
    ) -> Optional[AIGeneration]:
        """
        Log an AI generation event with full context.

        Args:
            db: Database session
            current_user: Current user token data
            landing_page_id: Landing page UUID
            proyecto_id: Project UUID
            block_type: Type of block (quicksearch, fleet, agencies, etc.)
            cell_position: Cell position (e.g., "0-3")
            generation_context: Full context dict with model config, prompts, metadata
            raw_output: Raw LLM output text
            processed_output: Processed/structured output dict
            duration_ms: Generation duration in milliseconds

        Returns:
            AIGeneration instance if successful, None if failed
        """
        try:
            # Extract <think> content if present
            think_content = None
            if "<think>" in raw_output:
                think_match = re.search(r'<think>(.*?)</think>', raw_output, re.DOTALL)
                if think_match:
                    think_content = think_match.group(1).strip()

            # Calculate basic metrics
            word_count = len(raw_output.split())
            char_count = len(raw_output)

            # Create log entry
            log_entry = AIGeneration(
                user_id=current_user.get_uuid(),
                landing_page_id=landing_page_id,
                proyecto_id=proyecto_id,
                seccion_lp_id=generation_context.get('seccion_lp_id'),
                block_type=block_type,
                cell_position=cell_position,
                generation_type=generation_context.get('generation_type', 'initial'),
                model_name=generation_context.get('model_name', 'redactoria-v3-gold'),
                model_url=generation_context.get('model_url'),
                temperature=generation_context.get('temperature', 0.4),
                max_tokens=generation_context.get('max_tokens', -1),
                system_message=generation_context.get('system_message'),
                user_prompt=generation_context.get('user_prompt', ''),
                prompt_metadata=generation_context.get('metadata', {}),
                raw_output=raw_output,
                processed_output=processed_output,
                think_content=think_content,
                input_context=generation_context.get('input_context', {}),
                translation_context=generation_context.get('translation_context'),
                adjacent_blocks=generation_context.get('adjacent_blocks'),
                word_count=word_count,
                character_count=char_count,
                generation_duration_ms=duration_ms,
                post_processing_passes=generation_context.get('post_processing_passes', 3),
                generation_success=generation_success,
                failure_reason=failure_reason,
                was_accepted='accepted' if generation_success else None,  # Only set if successful - will change to 'modified' if user edits or 'rejected' if regenerates
                created_at=datetime.now(timezone.utc)
            )

            db.add(log_entry)
            db.commit()
            db.refresh(log_entry)

            logging.info(
                f"✓ Logged AI generation: cell={cell_position}, block={block_type}, "
                f"duration={duration_ms}ms, words={word_count}"
            )
            return log_entry

        except Exception as e:
            logging.error(f"✗ Failed to log AI generation: {e}", exc_info=True)
            db.rollback()
            # Don't fail the main operation if logging fails
            return None

    @staticmethod
    def update_acceptance_status(
        db: Session,
        generation_id: UUID,
        status: str,
        feedback: Optional[str] = None
    ) -> bool:
        """
        Update acceptance status when user accepts/rejects/modifies AI content.

        Args:
            db: Database session
            generation_id: AI generation UUID
            status: "accepted", "rejected", "modified"
            feedback: Optional user feedback text

        Returns:
            True if successful, False otherwise
        """
        try:
            generation = db.query(AIGeneration).filter(
                AIGeneration.id == generation_id
            ).first()

            if not generation:
                logging.warning(f"AI generation {generation_id} not found")
                return False

            generation.was_accepted = status
            generation.user_feedback = feedback
            generation.acceptance_timestamp = datetime.now(timezone.utc)

            db.commit()

            logging.info(
                f"✓ Updated acceptance status for generation {generation_id}: {status}"
            )
            return True

        except Exception as e:
            logging.error(f"✗ Failed to update acceptance status: {e}")
            db.rollback()
            return False

    @staticmethod
    def get_generation_by_cell(
        db: Session,
        landing_page_id: UUID,
        cell_position: str
    ) -> Optional[AIGeneration]:
        """
        Get the most recent AI generation for a specific cell.

        Args:
            db: Database session
            landing_page_id: Landing page UUID
            cell_position: Cell position (e.g., "0-3")

        Returns:
            Most recent AIGeneration or None
        """
        try:
            return db.query(AIGeneration).filter(
                AIGeneration.landing_page_id == landing_page_id,
                AIGeneration.cell_position == cell_position
            ).order_by(AIGeneration.created_at.desc()).first()
        except Exception as e:
            logging.error(f"✗ Failed to get generation by cell: {e}")
            return None
