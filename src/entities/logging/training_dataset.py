from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Float, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import relationship
from src.database.core import Base

class TrainingDataset(Base):
    """
    Curated examples for future model fine-tuning.

    Contains input/output pairs where the output is the user-preferred version
    (edited or verified by humans). Includes quality scoring and verification status.
    """
    __tablename__ = "training_dataset"

    # Primary key
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Foreign keys (source of this training example)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    ai_generation_id = Column(PG_UUID(as_uuid=True), ForeignKey("ai_generations.id"), nullable=True)
    user_edit_id = Column(PG_UUID(as_uuid=True), ForeignKey("user_edits.id"), nullable=True)

    # Training pair
    input_prompt = Column(Text, nullable=False)  # Full prompt sent to LLM
    expected_output = Column(Text, nullable=False)  # The user's final version (preferred)
    original_ai_output = Column(Text, nullable=True)  # What AI initially generated (for comparison)

    # Context
    block_type = Column(String(50), nullable=False)  # quicksearch, fleet, etc.
    generation_context = Column(JSONB, nullable=True)
    """
    JSONB structure (full context that was used):
    {
        "tit_seo": "SEO title",
        "tema": "Miami car rental",
        "ejemplos_count": 5,
        "template_proyecto": "mcr",
        "template_dominio": "com",
        "template_categoria": "ciudad",
        "system_message": "...",
        "metadata": {...}
    }
    """

    # Quality scoring
    quality_score = Column(Float, nullable=True)  # 0.0-1.0, human-rated or computed
    is_verified = Column(Boolean, nullable=False, default=False)  # Human-verified quality
    verified_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    # Dataset metadata
    dataset_version = Column(String(20), nullable=False, default="v1")  # For version control
    split_assignment = Column(String(10), nullable=True)  # "train", "validation", "test"
    is_excluded = Column(Boolean, nullable=False, default=False)  # Exclude from training
    exclusion_reason = Column(Text, nullable=True)

    # Metadata tags for filtering and organization
    tags = Column(JSONB, nullable=True)
    """
    JSONB structure:
    ["high_quality", "user_approved", "contains_brand", "translation", "multilingual"]
    """
    extra_metadata = Column(JSONB, nullable=True)
    """
    JSONB structure (flexible):
    {
        "language": "es",
        "target_language": "en",
        "user_edit_magnitude": 0.45,
        "semantic_drift": "low",
        "notes": "Excellent example of persuasive tone"
    }
    """

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    verified_user = relationship("User", foreign_keys=[verified_by])
    ai_generation = relationship("AIGeneration", foreign_keys=[ai_generation_id])
    user_edit = relationship("UserEdit", foreign_keys=[user_edit_id])

    # Indexes for filtering and queries
    __table_args__ = (
        Index('ix_training_block_type', 'block_type'),
        Index('ix_training_quality', 'quality_score'),
        Index('ix_training_verified', 'is_verified'),
        Index('ix_training_split', 'split_assignment'),
        Index('ix_training_created', 'created_at'),
    )

    def __repr__(self):
        return f"<TrainingDataset(id={self.id}, block='{self.block_type}', verified={self.is_verified}, quality={self.quality_score})>"
