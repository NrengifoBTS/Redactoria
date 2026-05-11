import requests
import logging
import os
import time
from typing import Optional

log = logging.getLogger("llm_client")

LM_STUDIO_URL = os.getenv("LM_STUDIO_URL", "http://host.docker.internal:1234")
LM_MODEL = os.getenv("LM_MODEL", "openai/gpt-oss-20b")

# Temperaturas por tipo de tarea
TEMP_CREATIVE = 0.75     # quicksearch, rentacar, fav_city — contenido expresivo
TEMP_BALANCED = 0.55     # bloques estándar
TEMP_PRECISE = 0.3       # fleet (beneficios exactos), faq answers, estructurado
TEMP_SUPERVISOR = 0.2    # supervisores SEO (corrección consistente)
TEMP_TRANSLATE = 0.2     # traducción


class LLMClient:
    """Transporte HTTP hacia LM Studio. Solo sabe hacer llamadas al modelo."""

    def __init__(
        self,
        base_url: str = LM_STUDIO_URL,
        model: str = LM_MODEL,
        temperature: float = TEMP_BALANCED,
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.temperature = temperature
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.connect_timeout = float(os.getenv("LM_STUDIO_CONNECT_TIMEOUT", "3"))
        self.read_timeout = float(os.getenv("LM_STUDIO_READ_TIMEOUT", "600"))
        self.cooldown_sec = int(os.getenv("LM_STUDIO_DOWN_COOLDOWN_SEC", "20"))
        self._down_until = 0.0
        self.last_call_success = False
        self.last_error = ""
        self.last_success_url = ""
        self.success_count = 0
        self.failure_count = 0
        raw_fallbacks = os.getenv("LM_STUDIO_FALLBACK_URLS", "").strip()
        fallback_urls = [u.strip().rstrip("/") for u in raw_fallbacks.split(",") if u.strip()]
        # Si LM_STUDIO_URL está configurado explícitamente, no agregamos fallbacks implícitos
        # para evitar intentos a localhost que generan ruido y latencia innecesaria.
        configured_base_url = os.getenv("LM_STUDIO_URL", "").strip()
        defaults = []
        if not configured_base_url:
            # Defaults útiles para desarrollo local + Docker Desktop.
            defaults = ["http://host.docker.internal:1234", "http://127.0.0.1:1234", "http://localhost:1234"]
        self.base_urls = []
        for url in [self.base_url, *fallback_urls, *defaults]:
            if url and url not in self.base_urls:
                self.base_urls.append(url)

    def generate(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: int = 6000,
    ) -> str:
        """
        Llama al modelo y devuelve el texto generado.

        Args:
            prompt: Mensaje del usuario.
            system_message: Contexto del sistema.
            temperature: Sobreescribe la temperatura por defecto si se pasa.
            max_tokens: Límite de tokens en la respuesta.

        Returns:
            Texto generado por el modelo, o cadena vacía si falla.
        """
        temp = temperature if temperature is not None else self.temperature
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_message or ""},
                {"role": "user", "content": prompt},
            ],
            "temperature": temp,
            "max_tokens": max_tokens,
            "stream": False,
        }
        now = time.time()
        if now < self._down_until:
            remaining = int(self._down_until - now)
            log.warning("LLM temporalmente no disponible. Reintentar en %ss", remaining)
            self.last_call_success = False
            self.last_error = f"cooldown_active:{remaining}s"
            self.failure_count += 1
            return ""

        last_error = None
        for base_url in self.base_urls:
            try:
                response = self.session.post(
                    f"{base_url}/v1/chat/completions",
                    json=payload,
                    timeout=(self.connect_timeout, self.read_timeout),
                )
                response.raise_for_status()
                data = response.json()
                choice = (data.get("choices") or [{}])[0]
                message = choice.get("message") or {}
                content = (message.get("content") or "").strip()
                if content:
                    self._down_until = 0.0
                    self.last_call_success = True
                    self.last_error = ""
                    self.last_success_url = base_url
                    self.success_count += 1
                    if base_url != self.base_url:
                        log.warning("LLMClient usó URL alternativa: %s", base_url)
                    return content
                finish_reason = choice.get("finish_reason")
                last_error = RuntimeError(
                    f"empty_content_from_llm(url={base_url}, finish_reason={finish_reason})"
                )
                log.warning(
                    "Respuesta vacía del LLM en %s (finish_reason=%s)",
                    base_url,
                    finish_reason,
                )
            except Exception as e:
                last_error = e
                log.warning("Fallo LLM en %s: %s", base_url, e)

        self._down_until = time.time() + self.cooldown_sec
        self.last_call_success = False
        self.last_error = str(last_error) if last_error else "unknown_error"
        self.failure_count += 1
        log.error("Error llamando al modelo en todas las URLs configuradas: %s", last_error)
        return ""

    def ping(self) -> list:
        """Devuelve los modelos disponibles en el servidor."""
        last_error = None
        for base_url in self.base_urls:
            try:
                resp = self.session.get(f"{base_url}/v1/models", timeout=10)
                resp.raise_for_status()
                return [m["id"] for m in resp.json().get("data", [])]
            except Exception as e:
                last_error = e
                log.warning("Ping LLM falló en %s: %s", base_url, e)
        raise RuntimeError(f"No se pudo conectar a LM Studio: {last_error}")

    def health(self) -> dict:
        """Estado de conectividad del LLM para UI/monitoring."""
        ok = False
        reachable_url = ""
        error = ""
        for base_url in self.base_urls:
            try:
                resp = self.session.get(f"{base_url}/v1/models", timeout=(self.connect_timeout, 5))
                resp.raise_for_status()
                ok = True
                reachable_url = base_url
                break
            except Exception as e:
                error = str(e)
        return {
            "ok": ok,
            "configured_urls": self.base_urls,
            "reachable_url": reachable_url,
            "last_success_url": self.last_success_url,
            "last_call_success": self.last_call_success,
            "last_error": self.last_error or error,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
        }
