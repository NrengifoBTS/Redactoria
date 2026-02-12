from datetime import datetime, timezone
from uuid import UUID
import logging
import difflib
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from src.entities.logging.user_edit import UserEdit
from src.entities.landing_page import LandingPage
from src.entities.logging.ai_generation import AIGeneration
from src.auth.models import TokenData
from src.core.config import settings
from .semantic_analyzer import SemanticAnalyzer
from .alignment_analyzer import AlignmentAnalyzer


class EditLoggingService:
    """Service for logging user edits with semantic analysis and alignment tracking"""

    def __init__(self):
        self.semantic_analyzer = SemanticAnalyzer()
        self.alignment_analyzer = AlignmentAnalyzer()

    def log_edit(
        self,
        db: Session,
        current_user: TokenData,
        landing_page_id: UUID,
        proyecto_id: UUID,
        cell_position: str,
        content_before: Optional[str],
        content_after: str,
        edit_context: Dict[str, Any]
    ) -> Optional[UserEdit]:
        """
        Log a user edit event with semantic analysis.

        Args:
            db: Database session
            current_user: Current user token data
            landing_page_id: Landing page UUID
            proyecto_id: Project UUID
            cell_position: Cell position (e.g., "0-3")
            content_before: Content before edit (None if new)
            content_after: Content after edit
            edit_context: Context dict with block_type, timing, adjacent_content, etc.

        Returns:
            UserEdit instance if successful, None if failed
        """
        try:
            # Calculate edit magnitude
            char_added, char_removed, char_delta = self._calculate_char_changes(
                content_before, content_after
            )

            word_count_before = len(content_before.split()) if content_before else 0
            word_count_after = len(content_after.split())

            # Calculate edit duration
            edit_duration = None
            if edit_context.get('edit_start_time') and edit_context.get('edit_end_time'):
                start = edit_context['edit_start_time']
                end = edit_context['edit_end_time']

                # Handle string timestamps
                if isinstance(start, str):
                    start = datetime.fromisoformat(start.replace('Z', '+00:00'))
                if isinstance(end, str):
                    end = datetime.fromisoformat(end.replace('Z', '+00:00'))

                edit_duration = (end - start).total_seconds()

            # Perform semantic analysis
            semantic_analysis = self.semantic_analyzer.analyze_edit(
                content_before, content_after
            )

            # NEW: Calculate Alignment Shift Score (ASS) if edit is linked to AI generation
            ai_baseline = None
            alignment_shift_score = None
            format_analysis = None
            ai_generation_id = edit_context.get('ai_generation_id')

            if ai_generation_id:
                try:
                    from src.entities.logging.ai_generation import AIGeneration

                    # Get the AI generation
                    ai_gen = db.query(AIGeneration).filter(
                        AIGeneration.id == ai_generation_id
                    ).first()

                    if ai_gen and ai_gen.raw_output:
                        ai_baseline = ai_gen.raw_output

                        # Calculate alignment shift score
                        alignment_shift_score = self.alignment_analyzer.calculate_alignment_shift_score(
                            ai_baseline=ai_baseline,
                            final_content=content_after
                        )

                        # Extract format patterns for LoRA training
                        format_analysis = self.alignment_analyzer.extract_format_patterns(
                            ai_baseline=ai_baseline,
                            final_content=content_after
                        )

                        logging.info(
                            f"[ASS] Calculated for cell {cell_position}: "
                            f"score={alignment_shift_score:.3f}, "
                            f"format_changes={format_analysis.get('formatting_changes', {})}"
                        )
                    else:
                        logging.debug(
                            f"[ASS] AI generation {ai_generation_id} has no raw_output, skipping ASS"
                        )

                except Exception as e:
                    logging.error(f"[ASS] Failed to calculate alignment score: {e}", exc_info=True)
                    # Continue without ASS - don't block edit logging

            # Classify edit magnitude
            is_minor_edit = False
            is_major_rewrite = False

            if content_after:
                change_ratio = abs(char_delta) / max(len(content_after), 1)
                is_minor_edit = char_delta < 50 and change_ratio < 0.1
                is_major_rewrite = (
                    char_delta > 100 or
                    (content_before and change_ratio > 0.5)
                )

            # Determine edit type
            edit_type = self._determine_edit_type(content_before, edit_context)

            # Admin attribution logic
            current_user_uuid = current_user.get_uuid()
            is_admin = settings.is_admin_user(current_user_uuid)

            attributed_user_id = current_user_uuid
            performed_by_user_id = None
            is_admin_correction = False  # Track if this is truly an admin correction

            # Check if admin is the assigned user for this LP's project
            admin_is_assignee = False
            if is_admin:
                lp = db.query(LandingPage).filter(
                    LandingPage.id == landing_page_id
                ).first()
                if lp and lp.proyecto:
                    admin_is_assignee = (lp.proyecto.assigned_to == current_user_uuid)

            if is_admin and not admin_is_assignee:
                # Admin is editing someone else's LP - find original creator
                original_creator_id = self._find_original_creator(
                    db, landing_page_id, cell_position
                )

                if original_creator_id and original_creator_id != current_user_uuid:
                    # Attribute edit to original creator for learning
                    attributed_user_id = original_creator_id
                    performed_by_user_id = current_user_uuid
                    is_admin_correction = True  # This is a real admin correction

                    logging.info(
                        f"[Admin Edit Attribution] Admin {current_user_uuid} edit "
                        f"attributed to original creator {original_creator_id} "
                        f"(cell {cell_position})"
                    )
                else:
                    # Admin created this content OR no original creator found
                    # Attribute to project assignee
                    if lp and lp.proyecto:
                        attributed_user_id = lp.proyecto.assigned_to or lp.proyecto.created_by
                        performed_by_user_id = current_user_uuid
                        is_admin_correction = True  # Still an admin correction

                        logging.info(
                            f"[Admin Edit Attribution] Admin {current_user_uuid} created content, "
                            f"attributed to project assignee/creator {attributed_user_id}"
                        )
            elif is_admin and admin_is_assignee:
                # Admin is the assignee - this is their own LP, not a correction
                logging.info(
                    f"[Admin Edit] Admin {current_user_uuid} is editing their own assigned LP, "
                    f"not counting as admin correction (cell {cell_position})"
                )

            # Create log entry with ASS and admin attribution fields
            log_entry = UserEdit(
                user_id=attributed_user_id,  # WHO gets credit for learning
                landing_page_id=landing_page_id,
                proyecto_id=proyecto_id,
                seccion_lp_id=edit_context.get('seccion_lp_id'),
                ai_generation_id=edit_context.get('ai_generation_id'),
                cell_position=cell_position,
                block_type=edit_context.get('block_type'),
                edit_type=edit_type,
                content_before=content_before,
                content_after=content_after,
                char_added=char_added,
                char_removed=char_removed,
                char_delta=char_delta,
                word_count_before=word_count_before,
                word_count_after=word_count_after,
                edit_start_time=edit_context.get('edit_start_time'),
                edit_end_time=edit_context.get('edit_end_time') or datetime.now(timezone.utc),
                edit_duration_seconds=edit_duration,
                semantic_analysis=semantic_analysis,
                adjacent_content=edit_context.get('adjacent_content'),
                block_context=edit_context.get('block_context'),
                is_minor_edit=is_minor_edit,
                is_major_rewrite=is_major_rewrite,
                revision_count=edit_context.get('revision_count', 1),
                # Alignment tracking fields
                ai_content_baseline=ai_baseline,
                alignment_shift_score=alignment_shift_score,
                format_analysis=format_analysis,
                # Admin attribution fields
                performed_by_user_id=performed_by_user_id,  # WHO actually did it (for audit)
                is_admin_edit=is_admin_correction,  # Only true if admin is correcting someone else's work
                created_at=datetime.now(timezone.utc)
            )

            db.add(log_entry)
            db.commit()
            db.refresh(log_entry)

            logging.info(
                f"✓ Logged user edit: cell={cell_position}, type={edit_type}, "
                f"delta={char_delta}, duration={edit_duration:.1f}s" if edit_duration else
                f"✓ Logged user edit: cell={cell_position}, type={edit_type}, delta={char_delta}"
            )
            return log_entry

        except Exception as e:
            logging.error(f"✗ Failed to log user edit: {e}", exc_info=True)
            db.rollback()
            return None

    def _calculate_char_changes(
        self,
        before: Optional[str],
        after: str
    ) -> tuple[int, int, int]:
        """
        Calculate character additions, removals, and net delta using difflib.

        Args:
            before: Original content
            after: Edited content

        Returns:
            Tuple of (chars_added, chars_removed, char_delta)
        """
        if not before:
            return len(after), 0, len(after)

        matcher = difflib.SequenceMatcher(None, before, after)
        opcodes = matcher.get_opcodes()

        added = 0
        removed = 0

        for tag, i1, i2, j1, j2 in opcodes:
            if tag == 'insert':
                added += j2 - j1
            elif tag == 'delete':
                removed += i2 - i1
            elif tag == 'replace':
                removed += i2 - i1
                added += j2 - j1

        delta = len(after) - len(before)

        return added, removed, delta

    def _determine_edit_type(self, content_before: Optional[str], context: Dict) -> str:
        """
        Determine the type of edit based on context.

        Returns:
            "manual_creation", "translation_edit", "ai_modification", or "manual_edit"
        """
        if not content_before:
            return "manual_creation"
        elif context.get('is_translation'):
            return "translation_edit"
        elif context.get('ai_generation_id'):
            return "ai_modification"
        else:
            return "manual_edit"

    def _find_original_creator(
        self,
        db: Session,
        landing_page_id: UUID,
        cell_position: str
    ) -> Optional[UUID]:
        """
        Find the original content creator for a specific cell.

        This is used for admin attribution - when an admin edits content,
        we need to attribute it to the original creator for learning purposes.

        Algorithm:
        1. Query user_edits for this (landing_page_id, cell_position)
        2. Find first edit where is_admin_edit = False (first non-admin user)
        3. Return that user_id
        4. If no user edits found (admin created content):
           - Get landing_page.proyecto
           - Return proyecto.assigned_to (editor assigned to project)
           - If NULL, return proyecto.created_by (project creator)

        Args:
            db: Database session
            landing_page_id: Landing page UUID
            cell_position: Cell position (e.g., "0-3")

        Returns:
            UUID of original creator, or None if not found
        """
        try:
            # Find first non-admin edit in this cell
            first_user_edit = db.query(UserEdit).filter(
                UserEdit.landing_page_id == landing_page_id,
                UserEdit.cell_position == cell_position,
                UserEdit.is_admin_edit == False
            ).order_by(UserEdit.created_at.asc()).first()

            if first_user_edit:
                logging.debug(
                    f"[Find Original Creator] Found first user edit by {first_user_edit.user_id} "
                    f"for cell {cell_position}"
                )
                return first_user_edit.user_id

            # Fallback: No user edits found (admin created this content)
            # Use project assignee or creator
            lp = db.query(LandingPage).filter(
                LandingPage.id == landing_page_id
            ).first()

            if lp and lp.proyecto:
                original_creator = lp.proyecto.assigned_to or lp.proyecto.created_by
                logging.debug(
                    f"[Find Original Creator] No user edits, using project "
                    f"{'assignee' if lp.proyecto.assigned_to else 'creator'}: {original_creator}"
                )
                return original_creator

            logging.warning(
                f"[Find Original Creator] Could not find original creator for "
                f"landing_page={landing_page_id}, cell={cell_position}"
            )
            return None

        except Exception as e:
            logging.error(f"✗ Error finding original creator: {e}")
            return None

    def get_edit_history(
        self,
        db: Session,
        landing_page_id: UUID,
        cell_position: str,
        limit: int = 10
    ) -> list:
        """
        Get edit history for a specific cell.

        Args:
            db: Database session
            landing_page_id: Landing page UUID
            cell_position: Cell position
            limit: Max number of edits to return

        Returns:
            List of UserEdit instances
        """
        try:
            return db.query(UserEdit).filter(
                UserEdit.landing_page_id == landing_page_id,
                UserEdit.cell_position == cell_position
            ).order_by(UserEdit.created_at.desc()).limit(limit).all()
        except Exception as e:
            logging.error(f"✗ Failed to get edit history: {e}")
            return []
