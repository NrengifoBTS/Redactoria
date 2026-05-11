"""
#redactoria/src/api_llm/openai_client.py — Cliente OpenAI dedicado a tareas de revisión.
Se mantiene separado del LLMClient de LM Studio (llm_client.py) para evitar
choques de nombres y porque las tareas de revisión SEO/ortografía se prefieren
con un modelo gestionado (gpt-4o-mini) por estabilidad y precio.
"""
import os
import json
import logging
from typing import Optional
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

log = logging.getLogger("openai_client")

DEFAULT_REVIEW_MODEL = os.getenv("OPENAI_REVIEW_MODEL", "gpt-4o-mini")


class OpenAIClient:
    """Cliente para tareas de revisión (ortografía, SEO) usando la API de OpenAI."""

    def __init__(
        self,
        model_name: str = DEFAULT_REVIEW_MODEL,
        temperature: float = 0.2,
    ):
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("API_KEY")
        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY no configurada. Defínela en el archivo .env."
            )
        self.client = OpenAI(api_key=api_key)
        self.model_name = model_name
        self.temperature = temperature

    def chat(
        self,
        system_message: str,
        user_prompt: str,
        temperature: Optional[float] = None,
        json_mode: bool = False,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Llamada genérica al chat completions endpoint."""
        kwargs = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature if temperature is not None else self.temperature,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens

        response = self.client.chat.completions.create(**kwargs)
        return response.choices[0].message.content or ""

    def chat_json(
        self,
        system_message: str,
        user_prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> dict:
        """Helper que fuerza json_object y parsea la respuesta a dict."""
        raw = self.chat(
            system_message=system_message,
            user_prompt=user_prompt,
            temperature=temperature,
            json_mode=True,
            max_tokens=max_tokens,
        )
        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            log.error("OpenAI devolvió JSON inválido: %s | raw=%r", e, raw[:500])
            raise
