from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Float, Integer, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import relationship
from src.database.core import Base

class AIGeneration(Base):
    """
    Tracks all AI content generations with full context, model parameters, and user acceptance.

    Each record represents one call to the LLM (LMStudio/GPT-OSS-20B) for content generation,
    including translations and regenerations.
    """
    __tablename__ = "ai_generations"

    # Primary key
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)

    # Foreign keys
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    landing_page_id = Column(PG_UUID(as_uuid=True), ForeignKey("landing_pages.id"), nullable=False)
    proyecto_id = Column(PG_UUID(as_uuid=True), ForeignKey("proyectos.id"), nullable=False)
    seccion_lp_id = Column(PG_UUID(as_uuid=True), ForeignKey("secciones_lp.id"), nullable=True)

    # Generation context
    block_type = Column(String(50), nullable=False)  # quicksearch, fleet, agencies, faq, car_rental, fav_city
    cell_position = Column(String(10), nullable=False)  # "0-3", "1-4"
    generation_type = Column(String(50), nullable=False)  # "initial", "regenerate", "translate"

    # Model configuration
    model_name = Column(String(100), nullable=False)  # "openai/gpt-oss-20b"
    model_url = Column(String(255), nullable=True)
    temperature = Column(Float, nullable=False, default=0.4)
    max_tokens = Column(Integer, nullable=True)

    # Prompt engineering
    system_message = Column(Text, nullable=True)
    user_prompt = Column(Text, nullable=False)
    prompt_metadata = Column(JSONB, nullable=True)
    """
    JSONB structure:
    {
        "regla": "30-50 palabras",
        "tema": "Renta de autos en Miami",
        "ejemplos_count": 5,
        "template_proyecto": "mcr",
        "template_dominio": "com",
        "template_categoria": "ciudad",
        "car_types": ["SUV", "Sedan"],
        "faq_questions": ["¿Precio?", "¿Seguro?"]
    }
    """

    # Generation output
    raw_output = Column(Text, nullable=False)
    processed_output = Column(JSONB, nullable=False)
    """
    JSONB structure:
    {
        "tit": "Title here",
        "desc": "Description",
        "ip_usa": "US variant",
        "ip_bra": "Brazil variant",
        "structured_fields_count": 4
    }
    """
    think_content = Column(Text, nullable=True)  # Content from <think> tags

    # Context data
    input_context = Column(JSONB, nullable=True)
    """
    JSONB structure:
    {
        "tit_seo": "SEO title",
        "tema": "Miami car rental",
        "current_content": "Previous content...",
        "block_number": 1
    }
    """
    translation_context = Column(JSONB, nullable=True)
    """
    JSONB structure:
    {
        "source_lang": "es",
        "target_lang": "en",
        "source_content": "Original Spanish text"
    }
    """
    adjacent_blocks = Column(JSONB, nullable=True)
    """
    JSONB structure:
    {
        "before": "Previous block content...",
        "after": "Next block content..."
    }
    """

    # Quality metrics
    word_count = Column(Integer, nullable=True)
    character_count = Column(Integer, nullable=True)
    generation_duration_ms = Column(Integer, nullable=True)
    post_processing_passes = Column(Integer, nullable=False, default=3)  # 3-pass correction system

    # Generation success tracking
    generation_success = Column(Boolean, nullable=False, default=True)  # False if generation failed or content was empty/invalid
    failure_reason = Column(Text, nullable=True)  # Error message or reason for failure

    # User interaction
    was_accepted = Column(String(20), nullable=True)  # "accepted", "rejected", "modified" (only set if generation_success=True)
    user_feedback = Column(Text, nullable=True)
    acceptance_timestamp = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    landing_page = relationship("LandingPage", foreign_keys=[landing_page_id])
    proyecto = relationship("Proyecto", foreign_keys=[proyecto_id])
    seccion_lp = relationship("SeccionLP", foreign_keys=[seccion_lp_id])

    # Indexes for common queries
    __table_args__ = (
        Index('ix_ai_gen_user_created', 'user_id', 'created_at'),
        Index('ix_ai_gen_lp_block', 'landing_page_id', 'block_type'),
        Index('ix_ai_gen_cell_pos', 'cell_position'),
        Index('ix_ai_gen_acceptance', 'was_accepted'),
        Index('ix_ai_gen_created', 'created_at'),
    )

    def __repr__(self):
        return f"<AIGeneration(id={self.id}, block_type='{self.block_type}', cell='{self.cell_position}')>"
