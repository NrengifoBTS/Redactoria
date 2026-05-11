"""
content_reviewer.py — Auto-revisión de contenido generado antes de enviarlo al frontend.

Pasadas deterministas (sin LLM, velocidad instantánea):
  1. Encoding        → artefactos '??' que reemplazan caracteres UTF-8 acentuados (¿, á, é…)
  2. ALL CAPS        → "LOS ANGELES" → "Los Angeles", "MIAMI" → "Miami" (siglas conocidas intactas)
  3. Congruencia     → pipes residuales, markdown, <think>, frases truncadas ("Incluye:")
  4. Normalizaciones → SUVs→SUV, furgonetas→vans, automóvil→auto, frases prohibidas
  5. Tipografía      → espacio antes de signos, porcentajes, dobles espacios
  6. Tildes          → palabras comunes sin tilde (solo campos de cuerpo largo)

Se aplica sobre `structured_content` completo justo antes de devolver al frontend.
"""
import re
import logging
from typing import Dict, Any

log = logging.getLogger("content_reviewer")

# ── Clasificación de campos ────────────────────────────────────────────────────
# Campos de TÍTULO corto (se aplica ALL CAPS + todas las pasadas, sin tildes de cuerpo)
_TITLE_FIELD_PATTERN = re.compile(
    r"^(tit|tit_\d+|titulo|h2|q_\d+)$"
)
# Campos de CUERPO largo (se aplican todas las pasadas incluidas las tildes)
_BODY_FIELD_PATTERN = re.compile(
    r"^(desc|desc_h\d|ip_usa|ip_bra|faq_\d+|desc_\d+|h2_desc)$"
)
# Todos los campos de texto relevantes
_ALL_TEXT_FIELDS = re.compile(
    r"^(tit|tit_\d+|titulo|desc|desc_h\d|desc_\d+|ip_usa|ip_bra|faq_\d+|q_\d+|h2|h2_desc)$"
)

# ── Siglas/acrónimos que NUNCA se tocan en el paso ALL CAPS ────────────────────
_KEEP_CAPS = {
    "SUV", "KM", "KMS", "GPS", "VIP", "CDW", "LDW", "SLI", "PAI",
    "IOF", "USA", "IVA", "AV", "AL",
    # Siglas de estados/ciudades cortas (2 chars) ya no llegan aquí porque el
    # regex exige ≥3 chars de largo para dispararse.
}

# ── Corrección de artefactos de encoding (?? → ¿ / á / é / …) ─────────────────
# Cuando el contenido fue generado o transferido con encoding erróneo, los
# caracteres multi-byte del español (¿ á é í ó ú ñ etc.) aparecen como "??".
# Nota: el patrón "?? antes de mayúscula → ¿" se procesa por separado con _QQ_OPENER
# (no puede estar en _QQ_FIXES porque usa backreference que no funciona con sub+lambda)
_QQ_FIXES: list = [
    # ── Palabras interrogativas (con ?? incrustado) ──────────────────────────
    (re.compile(r"\bcu\?\?les\b", re.I), "cuáles"),
    (re.compile(r"\bcu\?\?l\b",   re.I), "cuál"),
    (re.compile(r"\bc\?\?mo\b",   re.I), "cómo"),
    (re.compile(r"\bd\?\?nde\b",  re.I), "dónde"),
    (re.compile(r"\bcu\?\?ndo\b", re.I), "cuándo"),
    (re.compile(r"\bcu\?\?ntos?\b", re.I), "cuántos"),
    (re.compile(r"\bcu\?\?ntas?\b", re.I), "cuántas"),
    (re.compile(r"\bqu\?\?\b",    re.I), "qué"),
    (re.compile(r"\bpor\s+qu\?\?\b", re.I), "por qué"),
    # ── Palabras más comunes con vocal acentuada corrompida ──────────────────
    (re.compile(r"\bm\?\?s\b",          re.I), "más"),
    (re.compile(r"\badem\?\?s\b",       re.I), "además"),
    (re.compile(r"\btambi\?\?n\b",      re.I), "también"),
    (re.compile(r"\baqu\?\?\b",         re.I), "aquí"),
    (re.compile(r"\bas\?\?\b",          re.I), "así"),
    (re.compile(r"\bd\?\?a\b",          re.I), "día"),
    (re.compile(r"\bd\?\?as\b",         re.I), "días"),
    (re.compile(r"\bpr\?\?ximo\b",      re.I), "próximo"),
    (re.compile(r"\bpr\?\?ximos?\b",    re.I), "próximos"),
    (re.compile(r"\bpr\?\?xima\b",      re.I), "próxima"),
    (re.compile(r"\bp\?\?gina\b",       re.I), "página"),
    (re.compile(r"\bp\?\?ginas\b",      re.I), "páginas"),
    (re.compile(r"\btel\?\?fono\b",     re.I), "teléfono"),
    (re.compile(r"\bv\?\?a\b",          re.I), "vía"),
    (re.compile(r"\bf\?\?cil\b",        re.I), "fácil"),
    (re.compile(r"\bf\?\?cilmente\b",   re.I), "fácilmente"),
    (re.compile(r"\bcr\?\?dito\b",      re.I), "crédito"),
    (re.compile(r"\bd\?\?bito\b",       re.I), "débito"),
    (re.compile(r"\br\?\?pido\b",       re.I), "rápido"),
    (re.compile(r"\br\?\?pida\b",       re.I), "rápida"),
    (re.compile(r"\bm\?\?ximo\b",       re.I), "máximo"),
    (re.compile(r"\bm\?\?xima\b",       re.I), "máxima"),
    (re.compile(r"\b\?\?ltimo\b",       re.I), "último"),
    (re.compile(r"\b\?\?ltima\b",       re.I), "última"),
    (re.compile(r"\bn\?\?mero\b",       re.I), "número"),
    (re.compile(r"\bn\?\?meros\b",      re.I), "números"),
    (re.compile(r"\b\?\?nico\b",        re.I), "único"),
    (re.compile(r"\b\?\?nica\b",        re.I), "única"),
    (re.compile(r"\bp\?\?blico\b",      re.I), "público"),
    (re.compile(r"\b\?\?til\b",         re.I), "útil"),
    (re.compile(r"\b\?\?tiles\b",       re.I), "útiles"),
    # ── Sustantivos de dominio (renta de autos) ───────────────────────────────
    (re.compile(r"\bveh\?\?culo\b",     re.I), "vehículo"),
    (re.compile(r"\bveh\?\?culos\b",    re.I), "vehículos"),
    (re.compile(r"\btar\?\?fa\b",       re.I), "tarifa"),
    (re.compile(r"\btar\?\?fas\b",      re.I), "tarifas"),
    (re.compile(r"\bkil\?\?metro\b",    re.I), "kilómetro"),
    (re.compile(r"\bkil\?\?metros\b",   re.I), "kilómetros"),
    (re.compile(r"\becon\?\?micos\b",   re.I), "económicos"),
    (re.compile(r"\becon\?\?mica\b",    re.I), "económica"),
    (re.compile(r"\becon\?\?mico\b",    re.I), "económico"),
    (re.compile(r"\beconom\?\?a\b",     re.I), "economía"),
    # ── Formas verbales frecuentes ────────────────────────────────────────────
    (re.compile(r"\bestar\?\?\b",       re.I), "estará"),
    (re.compile(r"\btendr\?\?\b",       re.I), "tendrá"),
    (re.compile(r"\bpodr\?\?s\b",       re.I), "podrás"),
    (re.compile(r"\bpodr\?\?\b",        re.I), "podrá"),
    (re.compile(r"\bser\?\?\b",         re.I), "será"),
    (re.compile(r"\bhabr\?\?\b",        re.I), "habrá"),
    (re.compile(r"\bver\?\?s\b",        re.I), "verás"),
    (re.compile(r"\bencontrar\?\?s\b",  re.I), "encontrarás"),
    (re.compile(r"\best\?\?\b",         re.I), "está"),
    # ── Sustantivos de flujo (formas con acento en sust. -ción/-ía) ───────────
    (re.compile(r"\binformaci\?\?n\b",  re.I), "información"),
    (re.compile(r"\bopci\?\?n\b",       re.I), "opción"),
    (re.compile(r"\bopciones\b",        re.I), "opciones"),
    (re.compile(r"\bselecci\?\?n\b",    re.I), "selección"),
    (re.compile(r"\batensi\?\?n\b",     re.I), "atención"),
    (re.compile(r"\bdirecci\?\?n\b",    re.I), "dirección"),
    (re.compile(r"\bduraci\?\?n\b",     re.I), "duración"),
    (re.compile(r"\breservaci\?\?n\b",  re.I), "reservación"),
    (re.compile(r"\bsituaci\?\?n\b",    re.I), "situación"),
    (re.compile(r"\bcategor\?\?a\b",    re.I), "categoría"),
    (re.compile(r"\bcategor\?\?as\b",   re.I), "categorías"),
    (re.compile(r"\bcompa\?\?\?\?a\b",  re.I), "compañía"),   # ñ es 2-byte → ????
    (re.compile(r"\bgarant\?\?a\b",     re.I), "garantía"),
    (re.compile(r"\bgarant\?\?as\b",    re.I), "garantías"),
    # Patrón de cierre: si quedan ?? aislados entre letras, log pero no modificar
]

# ── Normalización ALL CAPS ─────────────────────────────────────────────────────
_ALL_CAPS_WORD_RE = re.compile(r"\b([A-ZÁÉÍÓÚÑ]{2,})\b")
# Palabras cortas del español que SIEMPRE deben quedar en minúscula (artículos/prep)
_SHORT_COMMON_LOWER = {
    "TU", "MI", "SU", "EN", "DE", "LA", "EL", "AL", "UN", "SE",
    "TE", "ME", "LO", "NO", "SI", "YA",
}


def _title_case_word(word: str) -> str:
    """Convierte una palabra ALL CAPS a Title Case, respetando siglas conocidas."""
    if word in _KEEP_CAPS:
        return word
    # Artículos y preposiciones cortas del español → minúscula
    if word in _SHORT_COMMON_LOWER:
        return word.lower()
    # Siglas de 2 letras que no son palabras comunes → mantener (FL, NY, TX, CA…)
    if len(word) <= 2:
        return word
    return word.capitalize()


def _fix_all_caps(text: str) -> str:
    """
    Normaliza palabras en ALL CAPS que no son siglas conocidas.
    'LOS ANGELES' → 'Los Angeles', 'MIAMI' → 'Miami'
    Siglas como SUV, GPS, VIP se preservan intactas.
    """
    return _ALL_CAPS_WORD_RE.sub(lambda m: _title_case_word(m.group(1)), text)


# Patrón separado para ?? antes de mayúscula → ¿ + mayúscula
# (no puede ir en _QQ_FIXES porque pattern.sub con lambda no procesa backreferences)
_QQ_OPENER = re.compile(r"\?\?([A-ZÁÉÍÓÚÑ])")


# ── Corrección de encoding ─────────────────────────────────────────────────────

def _fix_encoding_artifacts(text: str) -> str:
    """
    Reemplaza artefactos '??' que corresponden a caracteres UTF-8 del español.
    - Pasada A: ?? + mayúscula → ¿ + mayúscula  (signo de apertura de pregunta)
    - Pasada B: palabras específicas con ?? incrustado → vocal acentuada correcta
    """
    # Pasada A: signo de apertura corrompido ("??Cu" → "¿Cu")
    text = _QQ_OPENER.sub(lambda m: "¿" + m.group(1), text)
    # Pasada B: palabras con ?? → vocal acentuada, preservando mayúscula inicial
    for pattern, replacement in _QQ_FIXES:
        def _repl(m, r=replacement):
            original = m.group(0)
            first_alpha = next((c for c in original if c.isalpha()), None)
            if first_alpha and first_alpha.isupper() and r and r[0].isalpha():
                return r[0].upper() + r[1:]
            return r
        text = pattern.sub(_repl, text)
    # Registro de ?? residual entre letras para debug
    residual = re.search(r"[a-záéíóúñA-ZÁÉÍÓÚÑ]\?\?[a-záéíóúñA-ZÁÉÍÓÚÑ]", text)
    if residual:
        log.debug("Artefacto '??' no resuelto: '…%s…'", text[max(0, residual.start()-10):residual.end()+10])
    return text

# ── Reemplazos de palabras prohibidas ─────────────────────────────────────────
_BANNED_REPLACEMENTS = [
    # Prohibidas → eliminar (quedan vacías + limpieza posterior de doble espacio)
    (re.compile(r"\bcargos?\s+ocultos?\b", re.I), ""),
    (re.compile(r"\bgastos?\s+ocultos?\b", re.I), ""),
    (re.compile(r"\bpagos?\s+ocultos?\b", re.I), ""),
    (re.compile(r"\bcostos?\s+ocultos?\b", re.I), ""),
    (re.compile(r"\bsin\s+sorpresas\b", re.I), ""),
    (re.compile(r"\bdescuentos?\s+rel[aá]mpago\b", re.I), ""),
    # Prohibidas → sinónimo directo
    (re.compile(r"\bfurgonetas\b", re.I), "vans"),
    (re.compile(r"\bfurgoneta\b", re.I), "van"),
    (re.compile(r"\bautomóviles\b", re.I), "autos"),
    (re.compile(r"\bautomóvil\b", re.I), "auto"),
    (re.compile(r"\bautomoviles\b", re.I), "autos"),
    (re.compile(r"\bautomovil\b", re.I), "auto"),
    # SUVs (con s) → SUV
    (re.compile(r"\bSUVs\b"), "SUV"),
    # "autos tipo SUV" / "autos tipo Van" → SUV / Van
    (re.compile(r"\bautos?\s+tipo\s+SUV\b", re.I), "SUV"),
    (re.compile(r"\bautos?\s+tipo\s+[Vv]an\b"), "Van"),
    # nuestra flota / la flota → (eliminar artículo + flota → "nuestros autos"/"los autos")
    (re.compile(r"\bnuestra\s+flota\b", re.I), "nuestros autos"),
    (re.compile(r"\bla\s+flota\b", re.I), "los autos"),
    (re.compile(r"\bsu\s+flota\b", re.I), "sus autos"),
    (re.compile(r"\bflota\s+de\b", re.I), "selección de"),
]

# ── Tildes comunes omitidas (solo palabras aisladas, seguro de aplicar) ────────
_ACCENT_FIXES = [
    # Sustantivos/adjetivos sin ambigüedad de significado al tildar
    (re.compile(r"\bvehiculo\b", re.I), "vehículo"),
    (re.compile(r"\bvehiculos\b", re.I), "vehículos"),
    (re.compile(r"\beconomico\b", re.I), "económico"),
    (re.compile(r"\beconomicos\b", re.I), "económicos"),
    (re.compile(r"\beconomica\b", re.I), "económica"),
    (re.compile(r"\bkilometro\b", re.I), "kilómetro"),
    (re.compile(r"\bkilometros\b", re.I), "kilómetros"),
    (re.compile(r"\btambien\b", re.I), "también"),
    (re.compile(r"\bfacil\b", re.I), "fácil"),
    (re.compile(r"\bfacilmente\b", re.I), "fácilmente"),
    (re.compile(r"\bcategoria\b", re.I), "categoría"),
    (re.compile(r"\bcategorias\b", re.I), "categorías"),
    (re.compile(r"\bopcion\b", re.I), "opción"),
    (re.compile(r"\bopciones\b", re.I), "opciones"),
    (re.compile(r"\bseleccion\b", re.I), "selección"),
    (re.compile(r"\binformacion\b", re.I), "información"),
    (re.compile(r"\batencion\b", re.I), "atención"),
    (re.compile(r"\bsituacion\b", re.I), "situación"),
    (re.compile(r"\breservacion\b", re.I), "reservación"),
    (re.compile(r"\bcompania\b", re.I), "compañía"),
    (re.compile(r"\bcompanias\b", re.I), "compañías"),
    (re.compile(r"\bgarantia\b", re.I), "garantía"),
    (re.compile(r"\bgarantias\b", re.I), "garantías"),
    (re.compile(r"\bdireccion\b", re.I), "dirección"),
    (re.compile(r"\bduracion\b", re.I), "duración"),
    (re.compile(r"\bdestino\b", re.I), "destino"),   # already correct, skip
    # Verbos comunes
    (re.compile(r"\bpodras\b", re.I), "podrás"),
    (re.compile(r"\btendras\b", re.I), "tendrás"),
    (re.compile(r"\bpodran\b", re.I), "podrán"),
    (re.compile(r"\bseran\b", re.I), "serán"),
    (re.compile(r"\bestaran\b", re.I), "estarán"),
    (re.compile(r"\bvendran\b", re.I), "vendrán"),
    (re.compile(r"\bquerras\b", re.I), "querrás"),
    # Adverbios / conectores frecuentes
    (re.compile(r"\bademas\b", re.I), "además"),
    (re.compile(r"\btambien\b", re.I), "también"),
    (re.compile(r"\btravés\b", re.I), "través"),   # already correct
    (re.compile(r"\btraves\b", re.I), "través"),
    (re.compile(r"\baquí\b", re.I), "aquí"),       # already correct
    (re.compile(r"\baqui\b", re.I), "aquí"),
    (re.compile(r"\basi\b", re.I), "así"),
    (re.compile(r"\bmas\s", re.I), "más "),        # "mas " → "más " (con espacio siguiente para evitar falsos)
]

# ── Tipografía: puntuación, espacios, formato ────────────────────────────────

# Frases de cierre que quedan colgadas sin contenido (el LLM escribió la cabecera
# pero no rellenó la lista). Se eliminan si aparecen al final del texto.
_TRAILING_INCOMPLETE = re.compile(
    r"\s*(Incluye\s*:|Entre\s+ellos\s*:|Como\s+por\s+ejemplo\s*:|Entre\s+estos\s*:"
    r"|Algunos\s+de\s+ellos\s*:|Tales\s+como\s*:|Destacan\s*:|Por\s+ejemplo\s*:)"
    r"\s*$",
    re.I | re.MULTILINE,
)


def _fix_typography(text: str) -> str:
    """Corrige espacios antes de signos, porcentajes, frases truncadas y líneas vacías."""
    # Espacio ANTES de coma/punto/punto y coma/dos puntos/admiración/interrogación
    text = re.sub(r" +([.,;:!?¿¡])", r"\1", text)
    # Porcentajes sin espacio: "35 %" → "35%"
    text = re.sub(r"(\d+)\s+%", r"\1%", text)
    # Frases truncadas al final (quedan colgadas sin su contenido)
    text = _TRAILING_INCOMPLETE.sub("", text)
    # Saltos de línea excesivos (3+) → máximo 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Doble espacio (limpieza general)
    text = re.sub(r"  +", " ", text)
    return text.strip()


def _fix_accents(text: str) -> str:
    """Corrige tildes faltantes en palabras comunes de uso frecuente."""
    for pattern, replacement in _ACCENT_FIXES:
        text = pattern.sub(replacement, text)
    return text


def _normalize(text: str) -> str:
    """Aplica sustituciones de palabras prohibidas y normalizaciones de keyword."""
    for pattern, replacement in _BANNED_REPLACEMENTS:
        text = pattern.sub(replacement, text)
    # Limpiar dobles espacios que puedan quedar tras eliminaciones
    text = re.sub(r"  +", " ", text)
    # Limpiar puntos/comas duplicados que queden tras eliminar frases
    text = re.sub(r"([.,;:])\s*([.,;:])", r"\1", text)
    return text.strip()


def _fix_congruence(text: str, brand: str = "mcr") -> str:
    """
    Corrige inconsistencias de marca y pipes residuales del formato LLM.
    """
    # Pipes sueltos que no fueron parseados
    text = re.sub(r"\|[a-z_]+:\s*", "", text)
    text = text.replace("|", "")
    # Etiquetas <think> residuales
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    # Tags markdown no deseados (## H2, ### H3, ** negrita **)
    text = re.sub(r"#{1,6}\s+", "", text)
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"\*(.*?)\*", r"\1", text)
    # Dobles espacios residuales
    text = re.sub(r"  +", " ", text)
    return text.strip()


# ── Función principal ──────────────────────────────────────────────────────────

def review_structured_content(
    structured_content: Dict[str, Any],
    brand: str = "mcr",
) -> Dict[str, Any]:
    """
    Aplica todas las pasadas de auto-revisión a los campos de texto de
    structured_content. Campos no-string se devuelven intactos.

    Orden de pasadas:
      1. Encoding        — artefactos ?? (UTF-8 corrupto) → caracteres correctos
      2. ALL CAPS        — "LOS ANGELES" → "Los Angeles" (solo campos de título)
      3. Congruencia     — pipes, markdown, <think>, frases truncadas
      4. Normalizaciones — palabras prohibidas, SUVs, furgonetas
      5. Tipografía      — signos, porcentajes, líneas vacías excesivas
      6. Tildes          — palabras comunes sin tilde (solo campos de cuerpo)
    """
    if not structured_content:
        return structured_content

    reviewed: Dict[str, Any] = {}
    fixed_count = 0

    for key, value in structured_content.items():
        if not isinstance(value, str) or not value.strip():
            reviewed[key] = value
            continue

        is_known = _ALL_TEXT_FIELDS.match(key) or _BODY_FIELD_PATTERN.match(key)

        if not is_known:
            # Campos desconocidos: solo limpiar residuos de formato LLM
            reviewed[key] = _fix_congruence(value, brand)
            continue

        original = value
        text = value
        is_title = bool(_TITLE_FIELD_PATTERN.match(key))
        is_body  = bool(_BODY_FIELD_PATTERN.match(key))

        # Pasada 1: artefactos de encoding (?? → chars correctos)
        text = _fix_encoding_artifacts(text)

        # Pasada 2: ALL CAPS en todos los campos de texto
        text = _fix_all_caps(text)

        # Pasada 3: congruencia (pipes, markdown, think tags)
        text = _fix_congruence(text, brand)

        # Pasada 4: normalizaciones (palabras prohibidas, etc.)
        text = _normalize(text)

        # Pasada 5: tipografía (signos, porcentajes, frases truncadas)
        text = _fix_typography(text)

        # Pasada 6: tildes faltantes (solo campos de cuerpo largo)
        if is_body:
            text = _fix_accents(text)

        if text != original:
            fixed_count += 1
            log.debug("Campo '%s' corregido por reviewer", key)

        reviewed[key] = text

    if fixed_count:
        log.info("content_reviewer: %d campo(s) corregido(s)", fixed_count)

    return reviewed
