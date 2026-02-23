from enum import Enum
from dataclasses import dataclass
from typing import List, Optional
from src.proyectos.models import EstadoProyecto


class NotificationRecipientType(str, Enum):
    """Who receives the notification"""
    CREATOR = "creator"
    ASSIGNEE = "assignee"
    ADMIN_GROUP = "admin_group"


@dataclass
class StatusTransitionRule:
    """Defines notification behavior for a status transition"""
    to_status: EstadoProyecto
    enabled: bool
    recipients: List[NotificationRecipientType]
    message_template_key: str
    priority: str = "normal"


# NOTIFICATION ROUTING RULES
# Solo 3 estados generan notificaciones según los requisitos del usuario
NOTIFICATION_RULES = [
    # Estado REVIEW: Notifica al asignado (revisor)
    StatusTransitionRule(
        to_status=EstadoProyecto.REVIEW,
        enabled=True,
        recipients=[NotificationRecipientType.ASSIGNEE],
        message_template_key="review",
        priority="normal"
    ),

    # Estado PEN_REVIEW: Notifica a admins (equipo de QA/revisión)
    StatusTransitionRule(
        to_status=EstadoProyecto.PEN_REVIEW,
        enabled=True,
        recipients=[NotificationRecipientType.ADMIN_GROUP],
        message_template_key="pending_review",
        priority="high"
    ),

    # Estado APPROVED: Notifica a asignado, creador y admins
    StatusTransitionRule(
        to_status=EstadoProyecto.APPROVED,
        enabled=True,
        recipients=[
            NotificationRecipientType.ASSIGNEE,
            NotificationRecipientType.CREATOR,
            NotificationRecipientType.ADMIN_GROUP
        ],
        message_template_key="approved",
        priority="high"
    ),
]


def get_notification_rule(new_status: str) -> Optional[StatusTransitionRule]:
    """
    Obtener regla de notificación para un estado destino.

    Args:
        new_status: Estado destino (ej: "review", "pen_review", "approved")

    Returns:
        StatusTransitionRule si existe una regla habilitada para ese estado, None si no
    """
    for rule in NOTIFICATION_RULES:
        if rule.enabled and rule.to_status.value == new_status:
            return rule
    return None
