"""
#redactoria/src/blog/review_service.py - Revisión ortográfica de blogs con IA.

La IA NO reescribe el contenido. Solo detecta errores
ortográficos y devuelve una lista de hallazgos. El frontend se encarga de
resaltarlos en amarillo (<mark>) sobre el contenido existente para no conlfictuar.
"""
import json
import logging
import re
from typing import List, Dict, Any
from uuid import UUID

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from src.entities.blog import Blog
from src.api_llm.openai_client import OpenAIClient

log = logging.getLogger("blog_review")

_SYSTEM_SPELLCHECK = (
    "Eres un revisor ortográfico profesional de textos en español neutro "
    "latinoamericano. Tu única tarea es detectar errores ortográficos, de "
    "tildes y de puntuación crítica en el texto que recibes.\n\n"
    "REGLAS:\n"
    "1. NO reescribas el texto. Solo identifica errores.\n"
    "2. Reporta cada error como un objeto con: 'wrong' (palabra exacta tal "
    "como aparece en el texto, respetando mayúsculas/acentos), 'correct' "
    "(forma correcta) y 'reason' (motivo breve: tilde, ortografía, "
    "concordancia).\n"
    "3. Ignora marcas de estructura del tipo [H1 - 0.0], [H2 - 1.0], "
    "[CONTENIDO], [MULTIMEDIA: ...]. No las reportes como errores.\n"
    "4. Ignora nombres propios, marcas y topónimos válidos (Cancún, "
    "Viajemos, Miles Car Rental, etc.).\n"
    "5. Si una palabra mal escrita aparece varias veces, repórtala una sola "
    "vez (la primera ocurrencia).\n"
    "6. Si no encuentras errores, devuelve una lista vacía.\n\n"
    "FORMATO DE SALIDA OBLIGATORIO (JSON):\n"
    '{"errors": [{"wrong": "...", "correct": "...", "reason": "..."}]}'
)


# Caracteres que delimitan una "palabra" para que el frontend pueda hacer
# match exacto con \b en regex sin choque de signos de puntuación.
_VALID_WORD_RE = re.compile(r"^[\wÁÉÍÓÚÜÑáéíóúüñ\-']+$", re.UNICODE)


def _strip_html(text: str) -> str:
    """Elimina etiquetas HTML para enviar texto plano al modelo."""
    return re.sub(r"<[^>]+>", " ", text or "")


def _normalize_errors(raw_errors: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """Filtra errores inválidos (vacíos, sin word boundaries) y de-duplica."""
    seen = set()
    result: List[Dict[str, str]] = []
    for err in raw_errors or []:
        wrong = (err.get("wrong") or "").strip()
        correct = (err.get("correct") or "").strip()
        reason = (err.get("reason") or "").strip()
        if not wrong or not correct or wrong == correct:
            continue
        if not _VALID_WORD_RE.match(wrong):
            # Frases con espacios o signos: las dejamos pasar igual,
            # el frontend las matcheará como string literal.
            pass
        key = wrong.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append({"wrong": wrong, "correct": correct, "reason": reason})
    return result


def review_blog_spelling(db: Session, blog_id: UUID) -> Dict[str, Any]:
    """
    Ejecuta la revisión ortográfica del blog y devuelve la lista de hallazgos.
    No modifica el blog en BD; solo retorna los errores para que el frontend
    los pinte y, una vez aplicados, marque el estado como 'reviewed_ai'.
    """
    blog = db.query(Blog).filter(Blog.id == blog_id).first()
    if not blog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Blog no encontrado."
        )

    estructura = blog.estructura_blog_json
    if not estructura:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El blog aún no tiene contenido generado para revisar.",
        )

    # estructura_blog_json puede venir como string Markdown o como dict
    # serializado. Lo normalizamos a texto plano.
    if isinstance(estructura, (dict, list)):
        try:
            text_to_review = json.dumps(estructura, ensure_ascii=False)
        except Exception:
            text_to_review = str(estructura)
    else:
        text_to_review = str(estructura)

    plain_text = _strip_html(text_to_review)
    if len(plain_text.strip()) < 20:
        return {
            "blog_id": str(blog_id),
            "errors": [],
            "checked_chars": len(plain_text),
        }

    client = OpenAIClient()
    user_prompt = (
        f"Revisa la ortografía del siguiente texto y reporta los errores "
        f"en el formato JSON solicitado.\n\n---\n{plain_text}\n---"
    )

    try:
        data = client.chat_json(
            system_message=_SYSTEM_SPELLCHECK,
            user_prompt=user_prompt,
            temperature=0.1,
        )
    except Exception as e:
        log.error("Error llamando a OpenAI para revisión: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al consultar el servicio de revisión: {e}",
        )

    raw_errors = data.get("errors") if isinstance(data, dict) else []
    errors = _normalize_errors(raw_errors or [])

    log.info(
        "Revisión ortográfica blog %s: %d errores detectados (%d caracteres)",
        blog_id,
        len(errors),
        len(plain_text),
    )

    return {
        "blog_id": str(blog_id),
        "errors": errors,
        "checked_chars": len(plain_text),
    }
