from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Float, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import relationship
from src.database.core import Base

class NarrativeFlow(Base):
    """
    Analysis of coherence and narrative flow across blocks in a landing page.

    Tracks how well the content flows from one block to another, semantic continuity,
    and detected coherence issues.
    """
    __tablename__ = "narrative_flow"

    # Primary key
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Foreign keys
    landing_page_id = Column(PG_UUID(as_uuid=True), ForeignKey("landing_pages.id"), nullable=False)
    proyecto_id = Column(PG_UUID(as_uuid=True), ForeignKey("proyectos.id"), nullable=False)

    # Coherence analysis
    block_sequence = Column(JSONB, nullable=False)
    """
    JSONB structure:
    ["quicksearch", "fleet", "agencies", "faq", "car_rental", "fav_city"]
    """
    coherence_score = Column(Float, nullable=True)  # 0.0-1.0, computed via spaCy semantic similarity

    # Semantic relationships between blocks
    block_transitions = Column(JSONB, nullable=True)
    """
    JSONB structure:
    {
        "quicksearch_to_fleet": {
            "semantic_similarity": 0.78,
            "topic_continuity": "high",
            "tone_consistency": "maintained",
            "keyword_overlap": ["renta", "autos", "Miami"],
            "transition_quality": "smooth"
        },
        "fleet_to_agencies": {
            "semantic_similarity": 0.65,
            "topic_continuity": "medium",
            "tone_consistency": "slight_shift",
            "keyword_overlap": ["renta", "Miami"],
            "transition_quality": "acceptable"
        }
    }
    """

    # Content progression analysis
    narrative_arc = Column(JSONB, nullable=True)
    """
    JSONB structure:
    {
        "introduction_strength": 0.8,
        "value_proposition_clarity": 0.9,
        "call_to_action_presence": true,
        "information_density_curve": [0.3, 0.7, 0.6, 0.5, 0.4, 0.3],
        "persuasion_progression": "gradual",
        "engagement_pattern": "hook_and_retain"
    }
    """

    # Issues detected
    coherence_issues = Column(JSONB, nullable=True)
    """
    JSONB structure:
    {
        "detected_issues": [
            {
                "type": "topic_jump",
                "location": "fleet_to_agencies",
                "severity": "medium",
                "description": "Abrupt topic change without transition",
                "suggestion": "Add transitional phrase or linking sentence"
            },
            {
                "type": "tone_shift",
                "location": "agencies_to_faq",
                "severity": "low",
                "description": "Tone becomes more formal in FAQ section",
                "suggestion": "Maintain persuasive tone throughout"
            }
        ],
        "overall_quality": "good",
        "improvement_priority": ["topic_jump"]
    }
    """

    # Analysis metadata
    analysis_version = Column(String(20), nullable=False, default="v1")
    analyzed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    landing_page = relationship("LandingPage", foreign_keys=[landing_page_id])
    proyecto = relationship("Proyecto", foreign_keys=[proyecto_id])

    # Indexes
    __table_args__ = (
        Index('ix_narrative_lp', 'landing_page_id'),
        Index('ix_narrative_score', 'coherence_score'),
        Index('ix_narrative_analyzed', 'analyzed_at'),
    )

    def __repr__(self):
        score_str = f"{self.coherence_score:.2f}" if self.coherence_score else "N/A"
        return f"<NarrativeFlow(lp={self.landing_page_id}, coherence={score_str})>"
