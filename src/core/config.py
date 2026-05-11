#redactoria-test/src/core/config.py

"""
Core configuration settings.

Centralizes configuration that was previously duplicated across services.
"""
import os
from uuid import UUID
from typing import List


class Settings:
    """
    Centralized settings for the application.

    Admin User IDs: List of user UUIDs that have admin/supervisor privileges.
    These users can make edits that are attributed to the original content creator.
    """

    ADMIN_USER_IDS: List[str] = [
        '65cd97a4-c3b9-4bfd-b014-55457ae847e3',
        'f49cda9b-2138-435e-a497-fda85be87e63',
        'c7c17838-074d-44fa-9248-8dc87c15edd5',
        '152c46be-e2f4-48da-86b1-592af570624a',
        'b43f1d04-f339-4cf9-8e4e-4f127f12af5a',
    ]


    # Users excluded from analytics (logs are kept but not counted in metrics)
    EXCLUDED_FROM_ANALYTICS_USER_IDS: List[str] = [
        'b43f1d04-f339-4cf9-8e4e-4f127f12af5a',  # camilac@redactoria.com
    ]

    # Notification settings
    # 1. Leemos el Webhook (en test puede estar vacío en el .env.test)
    TEAMS_WEBHOOK_URL: str = os.getenv("TEAMS_WEBHOOK_URL", "")
    
    # 2. IMPORTANTE: El valor por defecto en test será sobreescrito por el .env.test (http://192.168.1.129:3001)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3001")
    
    # 3. Notificaciones: os.getenv devolverá lo que diga tu .env.test
    ENABLE_TEAMS_NOTIFICATIONS: bool = os.getenv("ENABLE_TEAMS_NOTIFICATIONS", "true").lower() == "true"
    
    # 4. Nombre del Bot: Cámbialo en el .env.test para saber qué instancia te escribe
    TEAMS_BOT_NAME: str = os.getenv("TEAMS_BOT_NAME", "Sistema de Notificaciones")

    TIMEZONE: str = os.getenv("TIMEZONE", "America/Bogota")

    @classmethod
    def is_admin_user(cls, user_id: UUID | str | None) -> bool:
        if user_id is None:
            return False
        user_str = str(user_id)
        return user_str in cls.ADMIN_USER_IDS

# Singleton instance
settings = Settings()