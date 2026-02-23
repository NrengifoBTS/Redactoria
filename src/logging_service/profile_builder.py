from datetime import datetime, timezone
from uuid import UUID
import logging
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional, Union
from collections import Counter, defaultdict

from src.entities.logging.user_style_profile import UserStyleProfile
from src.entities.logging.user_edit import UserEdit


class ProfileBuilderService:
    """Service for building and updating user style profiles"""

    @staticmethod
    def update_profile(db: Session, user_id: UUID, proyecto_id: UUID) -> Optional[UserStyleProfile]:
        """
        Update user style profile based on recent edits for a specific project.
        Incremental learning with confidence scoring from first edit.

        IMPORTANT: Profiles are now per-user-per-project to distinguish writing styles
        between different projects (e.g., Viajemos vs MCR) for future LoRA training.

        Args:
            db: Database session
            user_id: User UUID
            proyecto_id: Proyecto UUID

        Returns:
            Updated UserStyleProfile instance or None if failed
        """
        try:
            # Get or create profile for this user+project
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

            # Get recent edits for this user+project (last 50 for comprehensive analysis)
            recent_edits = db.query(UserEdit).filter(
                UserEdit.user_id == user_id,
                UserEdit.proyecto_id == proyecto_id,
                UserEdit.content_before.isnot(None)
            ).order_by(UserEdit.created_at.desc()).limit(50).all()

            if not recent_edits:
                logging.debug(f"No edits found for user {user_id}, profile not updated")
                return profile

            # Analyze edits and update profile
            updated_signature = ProfileBuilderService._analyze_edits(recent_edits, profile)
            updated_patterns = ProfileBuilderService._extract_semantic_patterns(recent_edits)
            block_prefs = ProfileBuilderService._extract_block_preferences(recent_edits)

            # Calculate performance metrics
            avg_time, avg_magnitude = ProfileBuilderService._calculate_performance_metrics(recent_edits)

            # NEW: Calculate alignment metrics
            avg_alignment, format_prefs = ProfileBuilderService._calculate_alignment_metrics(recent_edits)

            # Update profile
            profile.style_signature = updated_signature
            profile.semantic_patterns = updated_patterns
            profile.block_preferences = block_prefs
            profile.total_edits_analyzed = len(recent_edits)
            profile.profile_confidence = min(len(recent_edits) / 50.0, 1.0)  # Max at 50 edits
            profile.avg_edit_time_seconds = avg_time
            profile.avg_edit_magnitude = avg_magnitude  # Edit Behavior Intensity (Step 1: keep name)
            # NEW: Alignment tracking
            profile.avg_alignment_shift_score = avg_alignment
            profile.format_preferences = format_prefs
            profile.last_updated = datetime.now(timezone.utc)
            profile.profile_version = (profile.profile_version or 0) + 1

            db.commit()

            logging.info(
                f"✓ Updated style profile for user {user_id} (proyecto {proyecto_id}): "
                f"confidence={profile.profile_confidence:.2f}, "
                f"edits={profile.total_edits_analyzed}, "
                f"version={profile.profile_version}"
            )

            return profile

        except Exception as e:
            logging.error(f"✗ Failed to update user profile: {e}", exc_info=True)
            db.rollback()
            return None

    @staticmethod
    def _analyze_edits(edits: List[UserEdit], current_profile: UserStyleProfile) -> Dict:
        """
        Analyze edits to extract style patterns.

        Returns:
            Style signature dict
        """
        # Initialize counters
        tone_changes = Counter()
        keywords_added = Counter()
        keywords_removed = Counter()
        grammar_changes = Counter()
        structural_changes = Counter()

        total_duration = 0
        total_magnitude = 0
        edit_count = 0

        for edit in edits:
            if not edit.semantic_analysis:
                continue

            edit_count += 1

            # Tone analysis
            tone = edit.semantic_analysis.get('tone_shift')
            if tone:
                tone_changes[tone] += 1

            # Keyword analysis
            kw_changes = edit.semantic_analysis.get('keyword_changes', {})
            for kw in kw_changes.get('added', []):
                keywords_added[kw] += 1
            for kw in kw_changes.get('removed', []):
                keywords_removed[kw] += 1

            # Grammar changes
            for change in edit.semantic_analysis.get('grammar_changes', []):
                grammar_changes[change] += 1

            # Structural changes
            for change in edit.semantic_analysis.get('structural_changes', []):
                structural_changes[change] += 1

            # Timing
            if edit.edit_duration_seconds:
                total_duration += edit.edit_duration_seconds

            # Magnitude
            if edit.content_before and edit.content_after:
                magnitude = abs(edit.char_delta) / max(len(edit.content_before), 1)
                total_magnitude += magnitude

        if edit_count == 0:
            return {}

        # Build signature
        signature = {
            "tone_preferences": {
                tone: count / edit_count
                for tone, count in tone_changes.most_common(5)
            },
            "keyword_preferences": {
                "frequently_added": [kw for kw, _ in keywords_added.most_common(10)],
                "frequently_removed": [kw for kw, _ in keywords_removed.most_common(10)]
            },
            "grammar_patterns": {
                pattern: count / edit_count
                for pattern, count in grammar_changes.most_common(5)
            },
            "formatting_preferences": {
                change: count / edit_count
                for change, count in structural_changes.most_common(5)
            },
            "avg_edit_time_seconds": total_duration / edit_count if edit_count else 0,
            "avg_edit_magnitude": total_magnitude / edit_count if edit_count else 0
        }

        return signature

    @staticmethod
    def _extract_semantic_patterns(edits: List[UserEdit]) -> Dict:
        """
        Extract semantic patterns from edit history.

        Returns:
            Semantic patterns dict
        """
        patterns = []
        edit_types = Counter()

        for edit in edits:
            if not edit.semantic_analysis:
                continue

            # Track grammar patterns
            for change in edit.semantic_analysis.get('grammar_changes', []):
                patterns.append(change)

            # Track edit types
            edit_types[edit.edit_type] += 1

        pattern_frequencies = Counter(patterns)

        return {
            "common_edits": [
                {"pattern": pattern, "frequency": count / len(edits)}
                for pattern, count in pattern_frequencies.most_common(5)
            ],
            "edit_type_distribution": {
                edit_type: count / len(edits)
                for edit_type, count in edit_types.items()
            }
        }

    @staticmethod
    def _extract_block_preferences(edits: List[UserEdit]) -> Dict:
        """
        Extract block-specific preferences.

        Returns:
            Block preferences dict
        """
        block_stats = {}

        for edit in edits:
            if not edit.block_type:
                continue

            if edit.block_type not in block_stats:
                block_stats[edit.block_type] = {
                    "magnitudes": [],
                    "changes": []
                }

            # Track magnitude
            if edit.content_before and edit.content_after:
                magnitude = abs(edit.char_delta) / max(len(edit.content_before), 1)
                block_stats[edit.block_type]["magnitudes"].append(magnitude)

            # Track change types
            if edit.semantic_analysis:
                for change in edit.semantic_analysis.get('grammar_changes', []):
                    block_stats[edit.block_type]["changes"].append(change)

        # Calculate averages
        block_preferences = {}
        for block_type, stats in block_stats.items():
            avg_magnitude = sum(stats["magnitudes"]) / len(stats["magnitudes"]) if stats["magnitudes"] else 0
            common_changes = Counter(stats["changes"]).most_common(3)

            block_preferences[block_type] = {
                "avg_edit_magnitude": avg_magnitude,
                "typical_changes": [change for change, _ in common_changes]
            }

        return block_preferences

    @staticmethod
    def _calculate_performance_metrics(edits: List[UserEdit]) -> tuple[float, float]:
        """
        Calculate average edit time and magnitude.

        Returns:
            Tuple of (avg_time_seconds, avg_magnitude)
        """
        total_time = 0
        time_count = 0
        total_magnitude = 0
        magnitude_count = 0

        for edit in edits:
            if edit.edit_duration_seconds:
                total_time += edit.edit_duration_seconds
                time_count += 1

            if edit.content_before and edit.content_after:
                magnitude = abs(edit.char_delta) / max(len(edit.content_before), 1)
                total_magnitude += magnitude
                magnitude_count += 1

        avg_time = total_time / time_count if time_count else 0
        avg_magnitude = total_magnitude / magnitude_count if magnitude_count else 0

        return avg_time, avg_magnitude

    @staticmethod
    def _calculate_alignment_metrics(edits: List[UserEdit]) -> tuple[Optional[float], Optional[Dict]]:
        """
        Calculate alignment metrics and format preferences.

        Returns:
            Tuple of (avg_alignment_shift_score, format_preferences_dict)
        """
        # Collect alignment scores
        alignment_scores = [
            e.alignment_shift_score
            for e in edits
            if e.alignment_shift_score is not None
        ]

        avg_alignment = sum(alignment_scores) / len(alignment_scores) if alignment_scores else None

        # Collect format patterns by block type
        format_patterns = defaultdict(lambda: defaultdict(list))

        for edit in edits:
            if edit.format_analysis and edit.block_type:
                fmt = edit.format_analysis
                block = edit.block_type

                # Track semantic tag usage
                for tag, count in fmt.get('semantic_tags_count', {}).items():
                    format_patterns[block][tag].append(count > 0)

                # Track HTML ratio
                html_ratio = fmt.get('html_to_content_ratio', 0)
                if html_ratio > 0:
                    format_patterns[block]['html_ratio'].append(html_ratio)

        # Build format preferences structure
        if not format_patterns:
            return avg_alignment, None

        format_prefs = {
            "preferred_semantic_tags": {},
            "avg_html_ratio": 0.0,
            "block_specific_formats": {}
        }

        all_html_ratios = []

        for block_type, tags_data in format_patterns.items():
            block_prefs = {}

            for tag, usage_list in tags_data.items():
                if tag == 'html_ratio':
                    avg_ratio = sum(usage_list) / len(usage_list) if usage_list else 0
                    all_html_ratios.extend(usage_list)
                    block_prefs['avg_html_ratio'] = round(avg_ratio, 3)
                else:
                    # Calculate frequency of tag usage (% of edits that use this tag)
                    frequency = sum(usage_list) / len(usage_list) if usage_list else 0
                    block_prefs[f"uses_{tag}"] = round(frequency, 2)

                    # Also track globally
                    if tag not in format_prefs["preferred_semantic_tags"]:
                        format_prefs["preferred_semantic_tags"][tag] = []
                    format_prefs["preferred_semantic_tags"][tag].extend(usage_list)

            format_prefs["block_specific_formats"][block_type] = block_prefs

        # Calculate overall tag preferences
        for tag, usage_list in format_prefs["preferred_semantic_tags"].items():
            frequency = sum(usage_list) / len(usage_list) if usage_list else 0
            format_prefs["preferred_semantic_tags"][tag] = round(frequency, 2)

        # Overall HTML ratio
        format_prefs["avg_html_ratio"] = round(
            sum(all_html_ratios) / len(all_html_ratios), 3
        ) if all_html_ratios else 0.0

        return avg_alignment, format_prefs

    @staticmethod
    def get_profile(db: Session, user_id: UUID, proyecto_id: Optional[UUID] = None) -> Union[UserStyleProfile, List[UserStyleProfile], None]:
        """
        Get user style profile.

        Args:
            db: Database session
            user_id: User UUID
            proyecto_id: Optional proyecto UUID. If provided, returns profile for that project.
                        If None, returns all profiles for the user (for backward compatibility).

        Returns:
            UserStyleProfile instance or None (if proyecto_id specified)
            List of UserStyleProfile instances (if proyecto_id is None)
        """
        try:
            if proyecto_id:
                return db.query(UserStyleProfile).filter(
                    UserStyleProfile.user_id == user_id,
                    UserStyleProfile.proyecto_id == proyecto_id
                ).first()
            else:
                # Return all profiles for the user (for backward compatibility)
                return db.query(UserStyleProfile).filter(
                    UserStyleProfile.user_id == user_id
                ).all()
        except Exception as e:
            logging.error(f"✗ Failed to get user profile: {e}")
            return None
