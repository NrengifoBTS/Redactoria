import requests
import logging
from typing import Dict, Any, Optional, Tuple
import time


class TeamsWebhookClient:
    """
    Client for sending Adaptive Cards to Microsoft Teams via webhook.
    Handles retry logic and error handling.
    """

    def __init__(self, webhook_url: str, timeout: int = 10, max_retries: int = 3):
        """
        Initialize Teams webhook client.

        Args:
            webhook_url: Microsoft Teams incoming webhook URL
            timeout: Request timeout in seconds (default: 10)
            max_retries: Maximum number of retry attempts (default: 3)
        """
        self.webhook_url = webhook_url
        self.timeout = timeout
        self.max_retries = max_retries
        self.headers = {"Content-Type": "application/json"}

    def send_card(self, adaptive_card: Dict[str, Any]) -> Tuple[bool, Optional[str], int]:
        """
        Send an Adaptive Card to Teams webhook.

        Args:
            adaptive_card: Full Adaptive Card JSON payload

        Returns:
            Tuple of (success: bool, error_message: Optional[str], duration_ms: int)
        """
        start_time = time.time()

        for attempt in range(self.max_retries):
            try:
                response = requests.post(
                    self.webhook_url,
                    json=adaptive_card,
                    headers=self.headers,
                    timeout=self.timeout
                )

                duration_ms = int((time.time() - start_time) * 1000)

                # Teams webhook returns 200 or 202 (Accepted) on success
                if response.status_code in [200, 202]:
                    logging.info(f"✓ Teams notification sent successfully (status {response.status_code}) in {duration_ms}ms")
                    return (True, None, duration_ms)
                else:
                    error_msg = f"Teams API returned {response.status_code}: {response.text}"
                    logging.warning(f"✗ Teams notification failed (attempt {attempt + 1}/{self.max_retries}): {error_msg}")

                    # Don't retry on 4xx errors (client errors)
                    if 400 <= response.status_code < 500:
                        return (False, error_msg, duration_ms)

                    # Retry on 5xx errors (server errors)
                    if attempt < self.max_retries - 1:
                        time.sleep(2 ** attempt)  # Exponential backoff
                        continue

                    return (False, error_msg, duration_ms)

            except requests.exceptions.Timeout:
                error_msg = f"Timeout after {self.timeout}s"
                logging.warning(f"✗ Teams notification timeout (attempt {attempt + 1}/{self.max_retries})")
                if attempt < self.max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
                duration_ms = int((time.time() - start_time) * 1000)
                return (False, error_msg, duration_ms)

            except Exception as e:
                error_msg = f"Exception: {str(e)}"
                logging.error(f"✗ Teams notification error (attempt {attempt + 1}/{self.max_retries}): {error_msg}", exc_info=True)
                if attempt < self.max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
                duration_ms = int((time.time() - start_time) * 1000)
                return (False, error_msg, duration_ms)

        # Should never reach here
        duration_ms = int((time.time() - start_time) * 1000)
        return (False, "Max retries exceeded", duration_ms)
