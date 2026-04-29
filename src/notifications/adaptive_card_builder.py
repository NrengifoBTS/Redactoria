from typing import Dict, Any, Optional
from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo
from src.core.config import settings


class AdaptiveCardBuilder:
    """
    Builds Microsoft Teams Adaptive Cards for project status notifications.
    Follows Adaptive Card Schema 1.5
    """

    # Message templates for different status transitions
    MESSAGE_TEMPLATES = {
        "review": {
            "title": "📋 Proyecto Listo para Revisión",
            "subtitle": "Un proyecto requiere tu atención",
            "color": "Attention"
        },
        "pending_review": {
            "title": "👀 Proyecto Pendiente de Revisión",
            "subtitle": "Proyecto completado necesita revisión del equipo",
            "color": "Warning"
        },
        "approved": {
            "title": "✅ Proyecto Aprobado!",
            "subtitle": "Felicitaciones! El proyecto ha sido aprobado",
            "color": "Good"
        }
    }

    # Display names for status codes
    STATUS_DISPLAY = {
        "draft": "Borrador",
        "review": "Revisión",
        "in_progress": "En Progreso",
        "pen_review": "Pendiente de Revisión",
        "pen_ajuste": "Pendiente de Ajuste",
        "ajuste_aplicado": "Ajuste Aplicado",
        "approved": "Aprobado",
        "rev_kws": "Revisión de Keywords",
        "cargue": "Cargue",
        "test": "Testing",
        "published": "Publicado"
    }

    @staticmethod
    def build_status_change_card(
        project_name: str,
        project_id: UUID,
        old_status: str,
        new_status: str,
        changed_by_name: str,
        changed_by_email: str,
        recipient_teams_id: Optional[str],
        timestamp: datetime,
        template_key: str,
        project_url: Optional[str] = None,
        changed_by_teams_id: Optional[str] = None,
        client_name: Optional[str] = None,
        recipient_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Build an Adaptive Card for project status change notification.

        Args:
            project_name: Name of the project
            project_id: Project UUID
            old_status: Previous status
            new_status: Current status
            changed_by_name: Full name of person who made the change
            changed_by_email: Email of person who made the change
            recipient_teams_id: Microsoft Teams user ID for @mention of recipient
            timestamp: When the change occurred
            template_key: Key for message template
            project_url: Optional URL to view the project
            changed_by_teams_id: Optional Microsoft Teams user ID for @mention of person who made the change
            client_name: Optional client name (MCR, Viajemos, etc.) from template

        Returns:
            Dict containing the complete Adaptive Card JSON
        """

        template = AdaptiveCardBuilder.MESSAGE_TEMPLATES.get(
            template_key,
            {
                "title": "📊 Estado de Proyecto Actualizado",
                "subtitle": "Un proyecto ha cambiado de estado",
                "color": "Accent"
            }
        )

        # Format status for display
        old_status_display = AdaptiveCardBuilder.STATUS_DISPLAY.get(old_status, old_status)
        new_status_display = AdaptiveCardBuilder.STATUS_DISPLAY.get(new_status, new_status)

        # Build the card body
        card_body = []

        # Add title
        card_body.append({
            "type": "TextBlock",
            "text": template["title"],
            "weight": "Bolder",
            "size": "Large",
            "wrap": True
        })

        # Add subtitle with @mention of recipient right after
        subtitle_text = template["subtitle"]
        if recipient_teams_id:
            subtitle_text += f" <at>{recipient_teams_id}</at>"

        card_body.append({
            "type": "TextBlock",
            "text": subtitle_text,
            "isSubtle": True,
            "wrap": True,
            "spacing": "None"
        })

        # Build LP value showing client if available
        lp_value = project_name
        if client_name:
            lp_value = f"{client_name} - {project_name}"

        # Add facts (first part - before "Realizado por")
        card_body.append({
            "type": "FactSet",
            "facts": [
                {
                    "title": "Landing Page:",
                    "value": lp_value
                },
                {
                    "title": "Cambio de Estado:",
                    "value": f"{old_status_display} → {new_status_display}"
                }
            ],
            "separator": True
        })

        # Add "Realizado por" with @mention using ColumnSet for alignment (mentions don't work in FactSet)
        changed_by_mention = f"{changed_by_name} ({changed_by_email})"
        if changed_by_teams_id:
            changed_by_mention = f"<at>{changed_by_teams_id}</at> ({changed_by_email})"

        card_body.append({
            "type": "ColumnSet",
            "spacing": "None",
            "columns": [
                {
                    "type": "Column",
                    "width": "122px",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": "Realizado por:",
                            "weight": "Bolder",
                            "wrap": True
                        }
                    ]
                },
                {
                    "type": "Column",
                    "width": "stretch",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": changed_by_mention,
                            "wrap": True
                        }
                    ]
                }
            ]
        })

        # Add Fecha using ColumnSet for alignment
        card_body.append({
            "type": "ColumnSet",
            "spacing": "None",
            "columns": [
                {
                    "type": "Column",
                    "width": "122px",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": "Fecha:",
                            "weight": "Bolder",
                            "wrap": True
                        }
                    ]
                },
                {
                    "type": "Column",
                    "width": "stretch",
                    "items": [
                        {
                            "type": "TextBlock",
                            "text": AdaptiveCardBuilder._format_timestamp(timestamp),
                            "wrap": True
                        }
                    ]
                }
            ]
        })

        # Build mention entities for Incoming Webhook
        # Note: For webhooks, mentions require user's UPN (email) as the id
        mentions = []
        if recipient_teams_id:
            mentions.append({
                "type": "mention",
                "text": f"<at>{recipient_teams_id}</at>",
                "mentioned": {
                    "id": recipient_teams_id,
                    "name": recipient_name or "Usuario"
                }
            })

        if changed_by_teams_id:
            mentions.append({
                "type": "mention",
                "text": f"<at>{changed_by_teams_id}</at>",
                "mentioned": {
                    "id": changed_by_teams_id,
                    "name": changed_by_name
                }
            })

        # Add action buttons
        actions = []
        if project_url:
            actions.append({
                "type": "Action.OpenUrl",
                "title": "Ver Proyecto",
                "url": project_url
            })

        # Build the full Adaptive Card
        adaptive_card = {
            "type": "message",
            "summary": f"Notificación: {template['title']}", # Text shown in notifications
            "attachments": [
                {
                    "contentType": "application/vnd.microsoft.card.adaptive",
                    "content": {
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "version": "1.5",
                        "body": card_body,
                        "msteams": {
                            "width": "Full"
                        }
                    }
                }
            ]
        }

        # Add actions if any
        if actions:
            adaptive_card["attachments"][0]["content"]["actions"] = actions

        # Add mentions if any
        if mentions:
            adaptive_card["attachments"][0]["content"]["msteams"]["entities"] = mentions

        return adaptive_card

    @staticmethod
    def _format_timestamp(timestamp: datetime) -> str:
        """
        Convert UTC timestamp to local timezone and format for display.

        Args:
            timestamp: UTC datetime object

        Returns:
            Formatted string with local time
        """
        try:
            # Get timezone from settings
            local_tz = ZoneInfo(settings.TIMEZONE)

            # Ensure timestamp is timezone-aware (UTC)
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=ZoneInfo("UTC"))

            # Convert to local timezone
            local_time = timestamp.astimezone(local_tz)

            # Format as: YYYY-MM-DD HH:MM:SS (America/Bogota)
            return local_time.strftime(f"%Y-%m-%d %H:%M:%S ({settings.TIMEZONE})")
        except Exception as e:
            # Fallback to UTC if timezone conversion fails
            return timestamp.strftime("%Y-%m-%d %H:%M:%S UTC")
