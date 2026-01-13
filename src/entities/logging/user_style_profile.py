from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Float, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import relationship
from src.database.core import Base

class UserStyleProfile(Base):
    """
    Learned user writing style profiles with incremental confidence scoring.

    Profile is built automatically from user_edits analysis and updated after each edit.
    Confidence grows from 0.0 (no data) to 1.0 (50+ analyzed edits).

    IMPORTANT: Each user can have multiple profiles (one per project) to distinguish
    between different writing styles for different projects (e.g., Viajemos vs MCR).
    This enables project-specific LoRA training in the future.
    """
    __tablename__ = "user_style_profiles"

    # Primary key
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Foreign keys
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    proyecto_id = Column(PG_UUID(as_uuid=True), ForeignKey("proyectos.id", ondelete="CASCADE"), nullable=False)

    # Profile metadata
    profile_confidence = Column(Float, nullable=False, default=0.0)  # 0.0 to 1.0
    total_edits_analyzed = Column(Integer, nullable=False, default=0)
    last_updated = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Stylistic preferences (learned from edits)
    style_signature = Column(JSONB, nullable=False, default=dict)
    """
    JSONB structure built by ProfileBuilderService:
    {
        "tone_preferences": {
            "persuasive": 0.8,
            "formal": 0.2,
            "informal": 0.3,
            "neutral": 0.4
        },
        "vocabulary_level": "intermediate",
        "sentence_complexity": {
            "avg_words_per_sentence": 18.5,
            "clause_density": 1.3,
            "prefers_short_sentences": false
        },
        "punctuation_style": {
            "exclamation_frequency": 0.15,
            "question_frequency": 0.05,
            "ellipsis_usage": "rare",
            "em_dash_usage": "frequent"
        },
        "formatting_preferences": {
            "uses_bold": true,
            "uses_italic": false,
            "uses_lists": true,
            "html_comfort_level": "high"
        },
        "keyword_preferences": {
            "frequently_added": ["descuento", "exclusivo", "garantía"],
            "frequently_removed": ["barato", "económico"],
            "preferred_synonyms": {"auto": "vehículo", "renta": "alquiler"}
        },
        "avg_edit_time_seconds": 45.2,
        "avg_edit_magnitude": 0.35
    }
    """

    # Semantic patterns
    semantic_patterns = Column(JSONB, nullable=False, default=dict)
    """
    JSONB structure:
    {
        "common_edits": [
            {"pattern": "passive_to_active_voice", "frequency": 0.7},
            {"pattern": "add_call_to_action", "frequency": 0.6},
            {"pattern": "simplify_jargon", "frequency": 0.4}
        ],
        "topic_expertise": {
            "car_rental": 0.9,
            "insurance": 0.6,
            "destinations": 0.8
        },
        "consistency_score": 0.85,
        "creativity_score": 0.7
    }
    """

    # Block-specific preferences
    block_preferences = Column(JSONB, nullable=True)
    """
    JSONB structure:
    {
        "quicksearch": {
            "avg_edit_magnitude": 0.3,
            "typical_changes": ["add_urgency", "simplify"]
        },
        "fleet": {
            "avg_edit_magnitude": 0.5,
            "typical_changes": ["add_benefits", "expand_description"]
        },
        "agencies": {
            "avg_edit_magnitude": 0.2,
            "typical_changes": ["minor_tweaks", "format_adjustment"]
        }
    }
    """

    # Performance metrics
    avg_edit_time_seconds = Column(Float, nullable=True)
    avg_edit_magnitude = Column(Float, nullable=True)  # Average char_delta / original length (Edit Behavior Intensity)
    rejection_rate = Column(Float, nullable=True)  # How often they reject AI content

    # Alignment tracking (NEW - ASS implementation)
    avg_alignment_shift_score = Column(Float, nullable=True)
    """
    Average Alignment Shift Score (ASS) across all user edits.
    Range: 0.0-1.0 (higher = better alignment with AI, less editing needed)
    - >0.9: AI is generating content very close to user's style
    - 0.7-0.9: Good alignment, moderate adjustments
    - 0.5-0.7: Significant gap, AI needs improvement
    - <0.5: AI far from user expectations
    NULL if no edits with ASS available yet.
    """

    format_preferences = Column(JSONB, nullable=True)
    """
    Per-user HTML formatting patterns aggregated by block type.
    Used for future LoRA training to learn formatting preferences.

    JSONB structure:
    {
        "preferred_semantic_tags": {
            "strong": 0.75,
            "em": 0.45,
            "ul": 0.30
        },
        "avg_html_ratio": 0.12,
        "formatting_patterns": {
            "prefers_bold_emphasis": true,
            "prefers_lists_for_items": false,
            "prefers_short_paragraphs": true
        },
        "block_specific_formats": {
            "quicksearch": {
                "uses_bold": 0.8,
                "uses_lists": 0.1,
                "avg_html_ratio": 0.08
            },
            "fleet": {
                "uses_bold": 0.6,
                "uses_lists": 0.4,
                "avg_html_ratio": 0.15
            }
        }
    }
    """

    # Evolution tracking
    profile_version = Column(Integer, nullable=False, default=1)
    profile_history = Column(JSONB, nullable=True)
    """
    JSONB structure (snapshots of previous versions):
    [
        {
            "version": 1,
            "timestamp": "2025-01-15T10:00:00Z",
            "confidence": 0.3,
            "snapshot": {...}
        }
    ]
    """

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    proyecto = relationship("Proyecto", foreign_keys=[proyecto_id])

    # Indexes and constraints
    __table_args__ = (
        Index('ix_user_profile_confidence', 'profile_confidence'),
        Index('ix_user_profile_updated', 'last_updated'),
        Index('ix_user_profile_user_proyecto', 'user_id', 'proyecto_id'),
        UniqueConstraint('user_id', 'proyecto_id', name='user_style_profiles_user_proyecto_key'),
    )

    def __repr__(self):
        return f"<UserStyleProfile(user={self.user_id}, proyecto={self.proyecto_id}, confidence={self.profile_confidence:.2f}, edits={self.total_edits_analyzed})>"
