from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Float, Integer, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import relationship
from src.database.core import Base

class TranslationQuality(Base):
    """
    Translation-specific quality tracking for ES -> EN/PT translations.

    Tracks translation quality issues, terminology consistency, and user corrections.
    """
    __tablename__ = "translation_quality_log"

    # Primary key
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Foreign keys
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    landing_page_id = Column(PG_UUID(as_uuid=True), ForeignKey("landing_pages.id"), nullable=False)
    ai_generation_id = Column(PG_UUID(as_uuid=True), ForeignKey("ai_generations.id"), nullable=True)

    # Translation context
    source_language = Column(String(10), nullable=False)  # "es"
    target_language = Column(String(10), nullable=False)  # "en", "pt"
    cell_position = Column(String(10), nullable=False)
    block_type = Column(String(50), nullable=True)

    # Content
    source_text = Column(Text, nullable=False)
    translated_text = Column(Text, nullable=False)
    edited_translation = Column(Text, nullable=True)  # If user edited the translation

    # Quality metrics
    translation_duration_ms = Column(Integer, nullable=True)
    was_edited = Column(Boolean, nullable=False, default=False)
    edit_magnitude = Column(Float, nullable=True)  # 0.0-1.0 (percentage of change)

    # Semantic analysis
    semantic_preservation = Column(Float, nullable=True)  # How well meaning was preserved (0.0-1.0)
    tone_preservation = Column(Float, nullable=True)  # How well tone was preserved (0.0-1.0)
    formality_level_source = Column(String(20), nullable=True)  # "formal", "informal", "neutral"
    formality_level_target = Column(String(20), nullable=True)

    # Translation-specific issues
    quality_issues = Column(JSONB, nullable=True)
    """
    JSONB structure:
    {
        "detected_issues": [
            {
                "type": "literal_translation",
                "severity": "low",
                "location": "phrase 2",
                "original": "renta de autos",
                "translated_as": "rent of cars",
                "suggestion": "car rental"
            },
            {
                "type": "brand_name_translated",
                "severity": "high",
                "original": "Viajemos",
                "translated_as": "Let's Travel",
                "suggestion": "Keep brand names untranslated"
            },
            {
                "type": "missing_cultural_adaptation",
                "severity": "medium",
                "description": "Metric units not converted (km -> miles for US)",
                "suggestion": "Use 'mileage' instead of 'kilometraje' for EN"
            }
        ],
        "overall_quality": "good",
        "auto_quality_score": 0.78
    }
    """

    # Terminology consistency
    terminology_used = Column(JSONB, nullable=True)
    """
    JSONB structure:
    {
        "car_rental": "car rental",
        "insurance": "insurance",
        "mileage": "mileage",
        "agencies": "agencies",
        "inconsistencies": [
            {
                "term": "auto",
                "translations": ["car", "vehicle", "automobile"],
                "preferred": "car",
                "occurrences": {"car": 5, "vehicle": 2, "automobile": 1}
            }
        ],
        "terminology_consistency_score": 0.85
    }
    """

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    landing_page = relationship("LandingPage", foreign_keys=[landing_page_id])
    ai_generation = relationship("AIGeneration", foreign_keys=[ai_generation_id])

    # Indexes
    __table_args__ = (
        Index('ix_translation_user_lang', 'user_id', 'target_language'),
        Index('ix_translation_lp', 'landing_page_id'),
        Index('ix_translation_edited', 'was_edited'),
        Index('ix_translation_created', 'created_at'),
    )

    def __repr__(self):
        return f"<TranslationQuality(id={self.id}, {self.source_language}->{self.target_language}, cell='{self.cell_position}', edited={self.was_edited})>"
