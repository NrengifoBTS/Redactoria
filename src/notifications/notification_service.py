from datetime import datetime, timezone
from uuid import UUID, uuid4
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import logging

from src.entities.user import User
from src.entities.proyecto import Proyecto
from src.entities.notification_log import NotificationLog, ProjectStatusChange
from src.auth.models import TokenData
from src.core.config import settings
from .notification_config import (
    NotificationRecipientType,
    get_notification_rule
)
from .adaptive_card_builder import AdaptiveCardBuilder
from .teams_client import TeamsWebhookClient


class NotificationService:
    """
    Service for handling project status change notifications.
    """

    def __init__(self, teams_webhook_url: str):
        """
        Initialize notification service.

        Args:
            teams_webhook_url: Microsoft Teams incoming webhook URL
        """
        self.teams_webhook_url = teams_webhook_url
        self.teams_client = TeamsWebhookClient(teams_webhook_url)
        self.card_builder = AdaptiveCardBuilder()

    def notify_status_change(
        self,
        db: Session,
        proyecto: Proyecto,
        old_status: str,
        new_status: str,
        changed_by_user: TokenData,
        project_url: Optional[str] = None
    ) -> List[NotificationLog]:
        """
        Send notifications for a project status change.

        Args:
            db: Database session
            proyecto: Project that changed
            old_status: Previous status
            new_status: New status
            changed_by_user: User who made the change
            project_url: Optional URL to the project

        Returns:
            List of NotificationLog entries created
        """
        try:
            # 1. Log the status change to audit trail
            status_change_id = uuid4()
            self._log_status_change(
                db, proyecto, old_status, new_status,
                changed_by_user, status_change_id
            )

            # 2. Get notification rule for this transition
            rule = get_notification_rule(new_status)

            if not rule:
                logging.info(f"No notification rules for status change to '{new_status}'")
                return []

            # 3. Resolve recipients for the rule
            recipients = self._resolve_recipients(
                db, proyecto, changed_by_user, rule.recipients
            )

            if not recipients:
                logging.info(f"No recipients to notify for status change to '{new_status}'")
                return []

            # 4. Get changed_by user details
            changed_by_full = db.query(User).filter(User.id == changed_by_user.get_uuid()).first()
            if not changed_by_full:
                logging.error(f"User {changed_by_user.get_uuid()} not found")
                return []

            # 5. Send notifications to each recipient
            notification_logs = []

            # Get client name from template if available
            client_name = None
            if proyecto.template:
                client_name = proyecto.template.proyecto

            for recipient_user in recipients:
                # Skip if recipient doesn't have Teams ID configured
                if not recipient_user.teams_user_id:
                    logging.warning(
                        f"User {recipient_user.email} has no teams_user_id configured, skipping notification"
                    )
                    # Still log it as skipped
                    log_entry = self._create_notification_log(
                        db, proyecto, old_status, new_status,
                        changed_by_user.get_uuid(), recipient_user,
                        status_change_id, {}, None,
                        status="skipped",
                        error_message="No teams_user_id configured"
                    )
                    notification_logs.append(log_entry)
                    continue

                # Build Adaptive Card
                card = self.card_builder.build_status_change_card(
                    project_name=proyecto.name,
                    project_id=proyecto.id,
                    old_status=old_status,
                    new_status=new_status,
                    changed_by_name=f"{changed_by_full.first_name} {changed_by_full.last_name}",
                    changed_by_email=changed_by_full.email,
                    recipient_teams_id=recipient_user.teams_user_id,
                    timestamp=datetime.now(timezone.utc),
                    template_key=rule.message_template_key,
                    project_url=project_url,
                    changed_by_teams_id=changed_by_full.teams_user_id,
                    client_name=client_name,
                    recipient_name=f"{recipient_user.first_name} {recipient_user.last_name}"
                )

                # Send to Teams
                success, error_msg, duration_ms = self.teams_client.send_card(card)

                # Log the notification attempt
                log_entry = self._create_notification_log(
                    db, proyecto, old_status, new_status,
                    changed_by_user.get_uuid(), recipient_user,
                    status_change_id, card, self.teams_webhook_url,
                    status="sent" if success else "failed",
                    error_message=error_msg,
                    sent_at=datetime.now(timezone.utc) if success else None,
                    duration_ms=duration_ms
                )

                notification_logs.append(log_entry)

            db.commit()
            logging.info(
                f"✓ Sent {len(notification_logs)} notifications for proyecto {proyecto.id} "
                f"status change {old_status} -> {new_status}"
            )

            return notification_logs

        except Exception as e:
            logging.error(f"✗ Failed to send notifications: {e}", exc_info=True)
            db.rollback()
            return []

    def _resolve_recipients(
        self,
        db: Session,
        proyecto: Proyecto,
        changed_by_user: TokenData,
        recipient_types: List[NotificationRecipientType]
    ) -> List[User]:
        """
        Resolve recipient types to actual User objects.

        Args:
            db: Database session
            proyecto: Project being changed
            changed_by_user: User making the change (excluded from notifications)
            recipient_types: List of recipient types to resolve

        Returns:
            List of unique User objects to notify
        """
        recipients = []

        for recipient_type in recipient_types:
            if recipient_type == NotificationRecipientType.CREATOR:
                creator = db.query(User).filter(User.id == proyecto.created_by).first()
                if creator and creator.id != changed_by_user.get_uuid():
                    recipients.append(creator)

            elif recipient_type == NotificationRecipientType.ASSIGNEE:
                if proyecto.assigned_to:
                    assignee = db.query(User).filter(User.id == proyecto.assigned_to).first()
                    if assignee and assignee.id != changed_by_user.get_uuid():
                        recipients.append(assignee)

            elif recipient_type == NotificationRecipientType.ADMIN_GROUP:
                admin_ids = [UUID(admin_id) for admin_id in settings.ADMIN_USER_IDS]
                admins = db.query(User).filter(User.id.in_(admin_ids)).all()
                for admin in admins:
                    if admin.id != changed_by_user.get_uuid():
                        recipients.append(admin)

        # Remove duplicates (keep only unique users)
        unique_recipients = list({user.id: user for user in recipients}.values())
        return unique_recipients

    def _log_status_change(
        self,
        db: Session,
        proyecto: Proyecto,
        old_status: str,
        new_status: str,
        changed_by_user: TokenData,
        status_change_id: UUID
    ):
        """
        Log status change to audit trail.

        Args:
            db: Database session
            proyecto: Project being changed
            old_status: Previous status
            new_status: New status
            changed_by_user: User making the change
            status_change_id: Unique ID for this status change event
        """
        change_log = ProjectStatusChange(
            id=status_change_id,
            proyecto_id=proyecto.id,
            changed_by_user_id=changed_by_user.get_uuid(),
            old_status=old_status,
            new_status=new_status,
            assigned_to_at_change=proyecto.assigned_to,
            created_by_at_change=proyecto.created_by,
            created_at=datetime.now(timezone.utc)
        )
        db.add(change_log)

    def _create_notification_log(
        self,
        db: Session,
        proyecto: Proyecto,
        old_status: str,
        new_status: str,
        triggered_by_user_id: UUID,
        recipient_user: User,
        status_change_id: UUID,
        message_payload: Dict[str, Any],
        webhook_url: Optional[str],
        status: str,
        error_message: Optional[str] = None,
        sent_at: Optional[datetime] = None,
        duration_ms: Optional[int] = None
    ) -> NotificationLog:
        """
        Create notification log entry.

        Args:
            db: Database session
            proyecto: Project being changed
            old_status: Previous status
            new_status: New status
            triggered_by_user_id: User who triggered the change
            recipient_user: User receiving the notification
            status_change_id: ID linking to status change audit log
            message_payload: Full Adaptive Card JSON
            webhook_url: Teams webhook URL used
            status: Notification status (pending/sent/failed/skipped)
            error_message: Error message if failed
            sent_at: Timestamp when sent
            duration_ms: Delivery duration in milliseconds

        Returns:
            Created NotificationLog entry
        """
        log_entry = NotificationLog(
            proyecto_id=proyecto.id,
            triggered_by_user_id=triggered_by_user_id,
            status_change_id=status_change_id,
            old_status=old_status,
            new_status=new_status,
            notification_type="teams",
            recipient_user_id=recipient_user.id,
            recipient_teams_id=recipient_user.teams_user_id,
            recipient_email=recipient_user.teams_email or recipient_user.email,
            status=status,
            sent_at=sent_at,
            delivery_duration_ms=duration_ms,
            message_payload=message_payload,
            webhook_url=webhook_url,
            error_message=error_message,
            created_at=datetime.now(timezone.utc)
        )

        db.add(log_entry)
        return log_entry
