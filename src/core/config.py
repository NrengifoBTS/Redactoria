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
        '2fd1e540-40be-42cf-9d2b-693b0d3132af'
    ]

    # Notification settings
    TEAMS_WEBHOOK_URL: str = os.getenv("TEAMS_WEBHOOK_URL", "")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    ENABLE_TEAMS_NOTIFICATIONS: bool = os.getenv("ENABLE_TEAMS_NOTIFICATIONS", "true").lower() == "true"

    # Timezone setting (default: America/Bogota for Colombia UTC-5)
    TIMEZONE: str = os.getenv("TIMEZONE", "America/Bogota")

    @classmethod
    def is_admin_user(cls, user_id: UUID | str | None) -> bool:
        """
        Check if a user ID belongs to an admin/supervisor.

        Args:
            user_id: UUID or string representation of user ID, can be None

        Returns:
            True if user is admin, False otherwise
        """
        if user_id is None:
            return False

        # Convert to string for comparison
        user_str = str(user_id)
        return user_str in cls.ADMIN_USER_IDS


# Singleton instance
settings = Settings()
