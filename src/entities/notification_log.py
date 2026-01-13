from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import relationship
from ..database.core import Base


class NotificationLog(Base):
    """
    Tracks all notification attempts with delivery status and error handling.
    """
    __tablename__ = "notification_logs"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    proyecto_id = Column(PG_UUID(as_uuid=True), ForeignKey("proyectos.id", ondelete="CASCADE"), nullable=False)
    triggered_by_user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Status change context
    status_change_id = Column(PG_UUID(as_uuid=True), nullable=False)
    old_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)

    # Notification details
    notification_type = Column(String(50), nullable=False)
    recipient_user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    recipient_teams_id = Column(String(255), nullable=True)
    recipient_email = Column(String(255), nullable=True)

    # Delivery tracking
    status = Column(String(20), nullable=False, default="pending")
    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivery_duration_ms = Column(Integer, nullable=True)

    # Message content
    message_payload = Column(JSONB, nullable=False)
    webhook_url = Column(String(500), nullable=True)

    # Error tracking
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    last_retry_at = Column(DateTime(timezone=True), nullable=True)

    # Metadata - renamed to avoid SQLAlchemy conflict
    extra_data = Column('metadata', JSONB, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    proyecto = relationship("Proyecto", foreign_keys=[proyecto_id])
    triggered_by_user = relationship("User", foreign_keys=[triggered_by_user_id])
    recipient_user = relationship("User", foreign_keys=[recipient_user_id])

    def __repr__(self):
        return f"<NotificationLog(id={self.id}, proyecto_id={self.proyecto_id}, status={self.status})>"


class ProjectStatusChange(Base):
    """
    Audit log of all project status changes.
    """
    __tablename__ = "project_status_changes"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    proyecto_id = Column(PG_UUID(as_uuid=True), ForeignKey("proyectos.id", ondelete="CASCADE"), nullable=False)
    changed_by_user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    old_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)

    assigned_to_at_change = Column(PG_UUID(as_uuid=True), nullable=True)
    created_by_at_change = Column(PG_UUID(as_uuid=True), nullable=True)
    change_reason = Column(Text, nullable=True)

    extra_data = Column('metadata', JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    proyecto = relationship("Proyecto", foreign_keys=[proyecto_id])
    changed_by_user = relationship("User", foreign_keys=[changed_by_user_id])

    def __repr__(self):
        return f"<ProjectStatusChange(id={self.id}, proyecto_id={self.proyecto_id}, {self.old_status}->{self.new_status})>"
