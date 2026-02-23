from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime


class LogAIGenerationRequest(BaseModel):
    """Request schema for logging AI generation"""
    landing_page_id: UUID
    proyecto_id: UUID
    block_type: str
    cell_position: str
    generation_context: Dict[str, Any]
    raw_output: str
    processed_output: Dict[str, Any]
    duration_ms: int


class LogUserEditRequest(BaseModel):
    """Request schema for logging user edit"""
    landing_page_id: UUID
    proyecto_id: UUID
    cell_position: str
    content_before: Optional[str] = None
    content_after: str
    edit_context: Dict[str, Any]
    # Timing captured on frontend
    edit_start_time: Optional[datetime] = None
    edit_end_time: Optional[datetime] = None


class UserProfileResponse(BaseModel):
    """Response schema for user style profile"""
    user_id: UUID
    proyecto_id: Optional[UUID] = None
    profile_confidence: float
    total_edits_analyzed: int
    style_signature: Dict[str, Any]
    semantic_patterns: Dict[str, Any]
    block_preferences: Optional[Dict[str, Any]] = None
    avg_edit_time_seconds: Optional[float] = None
    avg_edit_magnitude: Optional[float] = None
    profile_version: int
    last_updated: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class BlockEditStats(BaseModel):
    """Statistics for edits on a specific block type"""
    block_type: str
    edit_count: int
    avg_magnitude: Optional[float] = None


class BlockAlignmentStats(BaseModel):
    """NEW: Alignment statistics per block type"""
    block_type: str
    edit_count: int
    avg_alignment_score: Optional[float] = None
    avg_edit_magnitude: Optional[float] = None  # For comparison


class UserActivityStats(BaseModel):
    """Statistics for a specific user's activity"""
    user_id: UUID
    user_email: str
    total_generations: int
    successful_generations: int
    failed_generations: int
    total_edits: int
    avg_edit_magnitude: Optional[float] = None  # Edit Behavior Intensity (Step 1: keep)
    avg_alignment_score: Optional[float] = None  # NEW: Average ASS for this user
    # NEW: Admin edit tracking
    admin_edits_received: int = 0  # Edits by admin attributed to this user
    admin_edits_performed: int = 0  # Edits performed BY this user (if admin)


class MetricsResponse(BaseModel):
    """Response schema for analytics metrics"""
    # Existing fields (NO TOCAR - Step 1 strategy)
    total_generations: int
    successful_generations: int
    failed_generations: int
    generation_success_rate: float
    total_edits: int
    acceptance_rate: float
    most_edited_blocks: List[BlockEditStats]
    avg_edit_magnitude: float  # Edit Behavior Intensity (Step 1: keep name)
    temporal_trends: Dict[str, Any]  # Daily aggregation of {date: {generations: int, edits: int}}
    user_activity: List[UserActivityStats]  # Activity breakdown by user

    # NEW: Alignment tracking fields
    avg_alignment_shift_score: Optional[float] = None  # Overall ASS across all edits
    alignment_trends: Optional[Dict[str, float]] = None  # Daily ASS: {date: avg_score}
    alignment_by_block: Optional[List[BlockAlignmentStats]] = None  # ASS per block type


class AcceptanceStatusRequest(BaseModel):
    """Request schema for updating AI generation acceptance status"""
    generation_id: UUID
    status: str  # "accepted", "rejected", "modified"
    feedback: Optional[str] = None


class EditHistoryResponse(BaseModel):
    """Response schema for edit history"""
    cell_position: str
    edit_type: str
    content_before: Optional[str]
    content_after: str
    char_delta: int
    edit_duration_seconds: Optional[float]
    semantic_analysis: Optional[Dict[str, Any]]
    created_at: datetime
    user_id: UUID
    # NEW: Admin attribution fields
    is_admin_edit: bool = False
    performed_by_user_id: Optional[UUID] = None
    performed_by_email: Optional[str] = None  # Enriched in controller

    class Config:
        from_attributes = True


class GenerationFailureRequest(BaseModel):
    """Request schema for marking AI generation as failed"""
    landing_page_id: UUID
    cell_position: str
    failure_reason: str
