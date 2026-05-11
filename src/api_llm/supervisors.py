"""
supervisors.py — Supervisores de calidad para contenido generado por LLM.

Dos pasadas:
  1. supervisor_seo   → corrección lingüística via LLM (homologaciones, KWs, ortografía)
  2. supervisor_structure → limpieza de formato via regex (sin LLM, rápido)
"""
import re
import logging
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .llm_client import LLMClient

log = logging.getLogger("supervisors")

# ── Constantes de corrección ──────────────────────────────────────────────────

_SYSTEM_SUPERVISOR_SEO = (
    "Eres un supervisor SEO y editor experto en español neutro latinoamericano. "
    "Tu tarea es revisar y corregir el texto manteniendo el sentido original "
    "y el conteo aproximado de palabras.\n\n"
    "REGLAS CRÍTICAS:\n"
    "1. SINÓNIMOS OBLIGATORIOS: 'auto/autos' 70% de menciones, "
    "'carro/carros' 29%, 'vehículo/vehículos' máximo 1 vez por texto. "
    "'SUVs' (con s) → siempre 'SUV' sin s. "
    "'autos tipo SUV' o 'autos tipo Van' → eliminar 'tipo', usar directamente 'SUV' o 'Van'.\n"
    "2. PALABRAS ABSOLUTAMENTE PROHIBIDAS — sustituir o eliminar:\n"
    "   - Automóvil, Flota\n"
    "   - 'cargos ocultos', 'gastos ocultos', 'pagos ocultos', 'costos ocultos', 'sin sorpresas'\n"
    "   - 'Descuentos relámpago'\n"
    "   - 'furgonetas' → usar 'vans'\n"
    "3. DENSIDAD DE KW: no pueden aparecer 2 keywords principales "
    "(alquiler de autos, renta de carros, etc.) en menos de 50 palabras "
    "en el mismo párrafo. Si están muy juntas, reformula una sin perder el sentido.\n"
    "4. PALABRAS SOBREUSADAS — máximo 1 vez por texto: "
    "'Descubre', 'Encuentra', 'Aprovecha', 'Disfruta'. "
    "Variantes: 'Explora', 'Vive', 'Prueba', 'Reserva', 'Conoce', 'Siente', 'Recorre'.\n"
    "5. ORTOGRAFÍA EXHAUSTIVA: verificar TODAS las tildes "
    "(vehículo, económico, kilómetro, también, más, además, fácil, aquí, así, "
    "selección, información, tendrás, podrás, compañía, categoría, garantía). "
    "Concordancia género/número. Sin espacios antes de signos de puntuación. "
    "Porcentajes SIN espacio: '35%' nunca '35 %'.\n"
    "6. NO agregues contenido nuevo. Solo corrige lo existente.\n"
    "7. Responde SOLO con el texto corregido, sin comentarios ni etiquetas extra."
)

_BANNED_PHRASES = [
    "cargos ocultos",
    "gastos ocultos",
    "pagos ocultos",
    "costos ocultos",
    "sin sorpresas",
    "descuentos relámpago",
    "descuentos relampago",
    "automóvil",
    "automovil",
    "furgoneta",
    "furgonetas",
    "flota de",
    "nuestra flota",
    "la flota",
    "su flota",
]


# ── Helpers internos ──────────────────────────────────────────────────────────

def _strip_banned(text: str) -> str:
    """Elimina o sustituye frases prohibidas conocidas sin llamar al LLM."""
    result = text
    replacements = {
        "furgonetas": "vans",
        "furgoneta": "van",
        "automóvil": "auto",
        "automovil": "auto",
    }
    for banned, replacement in replacements.items():
        result = re.sub(re.escape(banned), replacement, result, flags=re.IGNORECASE)

    # Frases que se eliminan directamente
    phrases_to_remove = [
        r"sin\s+sorpresas",
        r"cargos\s+ocultos",
        r"gastos\s+ocultos",
        r"pagos\s+ocultos",
        r"costos\s+ocultos",
        r"descuentos\s+rel[aá]mpago",
    ]
    for phrase in phrases_to_remove:
        result = re.sub(phrase, "", result, flags=re.IGNORECASE)

    return result


# ── Supervisor SEO (con LLM) ──────────────────────────────────────────────────

def supervisor_seo(text: str, llm_client: "LLMClient", field_name: str = "") -> str:
    """
    Pasada 2: corrige homologaciones, palabras prohibidas, densidad de KW y ortografía.
    Usa el LLM con temperatura baja para correcciones consistentes.
    Si el LLM falla, devuelve el texto original sin modificar.
    """
    if not text or len(text.split()) < 5:
        return text

    from .llm_client import TEMP_SUPERVISOR

    prompt = f"Texto a revisar (campo '{field_name}'):\n\n{text}\n\nTexto corregido:"
    try:
        corrected = llm_client.generate(
            prompt,
            system_message=_SYSTEM_SUPERVISOR_SEO,
            temperature=TEMP_SUPERVISOR,
            max_tokens=3000,
        )
        corrected = corrected.strip()
        # Remover pipes o etiquetas que el supervisor haya podido añadir
        corrected = re.sub(r'^\|?\s*\w+\s*:\s*', '', corrected)
        corrected = re.sub(r'\s*\|\s*$', '', corrected)
        corrected = re.sub(r'<think>.*?</think>', '', corrected, flags=re.DOTALL).strip()

        # Validar que el resultado no sea demasiado corto respecto al original
        if corrected and len(corrected.split()) >= max(5, len(text.split()) // 2):
            return corrected
    except Exception as e:
        log.warning("supervisor_seo falló para '%s': %s", field_name, e)

    return text


# ── Supervisor de estructura (solo regex, sin LLM) ────────────────────────────

def supervisor_structure(text: str) -> str:
    """
    Pasada 3: limpieza de formato via regex. No hace llamadas al LLM.

    Corrige:
    - Pipes internos sueltos
    - Listas sin saltos de línea
    - Etiquetas markdown no usadas (##, ###)
    - Tags <think> residuales
    - Espacios múltiples y caracteres raros
    - Frases prohibidas conocidas
    """
    if not text or len(text.split()) < 3:
        return text

    cleaned = text

    # Remover tags <think> residuales
    cleaned = re.sub(r'<think>.*?</think>', '', cleaned, flags=re.DOTALL).strip()

    # Remover pipes internos (los que no están al inicio/fin de un bloque)
    cleaned = re.sub(r'(?<!^)\|(?!\s*$)', '', cleaned)

    # Normalizar listas: si hay "texto. - item - item" sin saltos, inyectar \n
    if ' - ' in cleaned and '\n- ' not in cleaned:
        if cleaned.count(' - ') >= 2:
            cleaned = re.sub(r'(?<=[\.\:\!])\s+-\s+', '\n- ', cleaned)
            cleaned = re.sub(r'(?<=[a-záéíóúñ\.])\s+-\s+(?=[A-ZÁ])', '\n- ', cleaned)

    # Asegurar que ** esté en línea propia si abre/cierra una lista
    cleaned = re.sub(r'([^\n])\*\*(\s*\n)', r'\1\n**\2', cleaned)
    cleaned = re.sub(r'(\n\s*)\*\*(?!\n)([^\n])', r'\1**\n\2', cleaned)

    # Remover encabezados markdown (##, ###, etc.)
    cleaned = re.sub(r'^#{1,6}\s*', '', cleaned, flags=re.MULTILINE)

    # Normalizar saltos de línea (máximo 2 seguidos)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)

    # Caracteres especiales de espacio
    cleaned = cleaned.replace(' ', ' ').replace(' ', ' ')

    # Espacios múltiples
    cleaned = re.sub(r'  +', ' ', cleaned)

    # Aplicar sustituciones de frases prohibidas conocidas
    cleaned = _strip_banned(cleaned)

    return cleaned.strip() if cleaned.strip() else text


# ── Parser de campos ──────────────────────────────────────────────────────────

def parse_fields(text: str) -> dict:
    """
    Extrae campos con formato |key: value| del texto generado.
    Devuelve un dict {key: value}.
    """
    fields = {}
    # Delimita cada campo hasta el siguiente bloque |key: ...| o fin de texto.
    # Soporta tanto bloques en líneas separadas como en una sola línea.
    pattern = r'\|\s*([\w_]+)\s*:\s*(.*?)\s*\|(?=\s*\|\s*[\w_]+\s*:|\s*$)'
    for match in re.finditer(pattern, text, re.DOTALL):
        key = match.group(1).strip()
        value = match.group(2).strip()
        # Remover tags <think> dentro del valor si quedaron
        value = re.sub(r'<think>.*?</think>', '', value, flags=re.DOTALL).strip()
        if key and value:
            fields[key] = value
    return fields


# ── Pipeline completo ─────────────────────────────────────────────────────────

def supervise(
    text: str,
    llm_client: "LLMClient",
    field_name: str = "",
    skip_seo: bool = False,
) -> str:
    """
    Aplica las dos pasadas de supervisión en orden:
      1. supervisor_seo (LLM) — opcional, se puede omitir con skip_seo=True
      2. supervisor_structure (regex) — siempre se aplica

    Args:
        text: Texto a supervisar.
        llm_client: Instancia del cliente LLM para la pasada SEO.
        field_name: Nombre del campo (para logs).
        skip_seo: Si True, omite la pasada LLM y solo aplica la limpieza regex.
    """
    if not text:
        return text

    result = text
    if not skip_seo:
        result = supervisor_seo(result, llm_client, field_name)
    result = supervisor_structure(result)
    return result
