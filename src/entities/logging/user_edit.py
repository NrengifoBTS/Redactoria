from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Float, Integer, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import relationship
from src.database.core import Base

class UserEdit(Base):
    """
    Tracks all user edits with semantic analysis, timing metrics, and magnitude classification.

    Each record represents one edit action by a user on a cell, with full before/after content
    and spaCy-based semantic analysis.
    """
    __tablename__ = "user_edits"

    # Primary key
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Foreign keys
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    landing_page_id = Column(PG_UUID(as_uuid=True), ForeignKey("landing_pages.id"), nullable=False)
    proyecto_id = Column(PG_UUID(as_uuid=True), ForeignKey("proyectos.id"), nullable=False)
    seccion_lp_id = Column(PG_UUID(as_uuid=True), ForeignKey("secciones_lp.id"), nullable=True)
    ai_generation_id = Column(PG_UUID(as_uuid=True), ForeignKey("ai_generations.id"), nullable=True)  # Link to AI source

    # Edit context
    cell_position = Column(String(10), nullable=False)  # "0-3", "1-4"
    block_type = Column(String(50), nullable=True)  # quicksearch, fleet, etc.
    edit_type = Column(String(50), nullable=False)  # "ai_modification", "manual_creation", "translation_edit", "manual_edit"

    # Content tracking
    content_before = Column(Text, nullable=True)  # None if new content
    content_after = Column(Text, nullable=False)

    # Edit magnitude
    char_added = Column(Integer, nullable=False, default=0)
    char_removed = Column(Integer, nullable=False, default=0)
    char_delta = Column(Integer, nullable=False, default=0)  # net change (can be negative)
    word_count_before = Column(Integer, nullable=True)
    word_count_after = Column(Integer, nullable=False)

    # Timing metrics
    edit_start_time = Column(DateTime(timezone=True), nullable=True)  # onFocus timestamp
    edit_end_time = Column(DateTime(timezone=True), nullable=False)  # onBlur timestamp
    edit_duration_seconds = Column(Float, nullable=True)

    # Semantic analysis (populated by spaCy)
    semantic_analysis = Column(JSONB, nullable=True)
    """
    JSONB structure from SemanticAnalyzer:
    {
        "similarity_score": 0.85,
        "tone_shift": "more_persuasive",
        "entities_added": ["Miami", "Florida"],
        "entities_removed": [],
        "grammar_changes": ["passive_to_active", "verb_tense_change"],
        "keyword_changes": {
            "added": ["descuento", "exclusivo", "garantía"],
            "removed": ["caro", "económico"]
        },
        "structural_changes": ["added_bold", "added_list"],
        "semantic_drift": "low"
    }
    """

    # Alignment tracking (NEW - ASS implementation)
    ai_content_baseline = Column(Text, nullable=True)
    """Original AI-generated content for this cell (baseline for ASS calculation)"""

    alignment_shift_score = Column(Float, nullable=True)
    """
    Semantic divergence from AI baseline (0.0-1.0).
    - 1.0: Perfect alignment (identical meaning)
    - 0.9-1.0: Minimal editing
    - 0.7-0.9: Moderate editing (style/tone)
    - 0.5-0.7: Significant editing (structure changes)
    - <0.5: Complete rewrite
    NULL if no AI baseline available (manual creation or old data)
    """

    format_analysis = Column(JSONB, nullable=True)
    """
    HTML formatting patterns for LoRA training:
    {
        "html_tags_added": ["strong", "ul"],
        "html_tags_removed": ["b"],
        "semantic_tags_count": {"strong": 3, "em": 1, "ul": 2},
        "html_to_content_ratio": 0.15,
        "formatting_changes": {
            "added_bold": true,
            "added_lists": true,
            "added_emphasis": false,
            "restructured_paragraphs": false
        },
        "has_special_chars": false
    }
    """

    # Admin attribution tracking
    performed_by_user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        comment="Actual user who performed the edit (if admin editing on behalf of original creator)"
    )
    """
    WHO actually made the edit (admin user ID).
    - NULL for regular user edits (user_id == performed_by conceptually)
    - Set to admin's user_id when admin makes corrections for an editor
    - Used for audit trail and dashboard metrics
    """

    is_admin_edit = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Flag indicating this edit was performed by an admin/supervisor"
    )
    """
    Quick flag for filtering admin edits.
    - True: Edit was made by admin/supervisor
    - False: Edit was made by regular user
    - Used for metrics and to attribute edits to original creator
    """

    # Context awareness
    adjacent_content = Column(JSONB, nullable=True)
    """
    JSONB structure:
    {
        "cell_above": "Content from cell above...",
        "cell_below": "Content from cell below..."
    }
    """
    block_context = Column(JSONB, nullable=True)
    """
    JSONB structure:
    {
        "type": "fleet",
        "titleRow": 3,
        "descRow": 4,
        "startRow": 3,
        "endRow": 8
    }
    """

    # Classification flags
    is_minor_edit = Column(Boolean, nullable=False, default=False)  # < 10% change
    is_major_rewrite = Column(Boolean, nullable=False, default=False)  # > 50% change
    is_stylistic_only = Column(Boolean, nullable=True)  # No semantic change detected
    is_factual_correction = Column(Boolean, nullable=True)

    # User behavior patterns
    keystroke_patterns = Column(JSONB, nullable=True)
    """
    JSONB structure (future enhancement):
    {
        "avg_typing_speed": 45,
        "pauses": 3,
        "corrections": 2
    }
    """
    revision_count = Column(Integer, nullable=False, default=1)  # How many times this cell was edited

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    performed_by = relationship("User", foreign_keys=[performed_by_user_id])  # Admin who performed edit
    landing_page = relationship("LandingPage", foreign_keys=[landing_page_id])
    proyecto = relationship("Proyecto", foreign_keys=[proyecto_id])
    seccion_lp = relationship("SeccionLP", foreign_keys=[seccion_lp_id])
    ai_generation = relationship("AIGeneration", foreign_keys=[ai_generation_id])

    # Indexes for common queries
    __table_args__ = (
        Index('ix_user_edit_user_created', 'user_id', 'created_at'),
        Index('ix_user_edit_lp', 'landing_page_id'),
        Index('ix_user_edit_cell_pos', 'cell_position'),
        Index('ix_user_edit_ai_gen', 'ai_generation_id'),
        Index('ix_user_edit_type', 'edit_type'),
        Index('ix_user_edit_created', 'created_at'),
    )

    def __repr__(self):
        return f"<UserEdit(id={self.id}, user={self.user_id}, cell='{self.cell_position}', type='{self.edit_type}')>"
