import re
import logging
import random
import time
from typing import List, Optional

from src.api_llm.llm_client import LLMClient, TEMP_CREATIVE, TEMP_BALANCED, TEMP_PRECISE
from src.api_llm.supervisors import parse_fields, supervisor_seo, supervisor_structure

log = logging.getLogger("content_generator")

# ── System message blocks ──────────────────────────────────────────────────────

_RESTRICCIONES = (
    "Restricciones de estructura:\n"
    "- Nunca usarás emojis.\n"
    "- Evita repetir la ciudad/estado constantemente.\n"
    "- PROHIBIDO empezar con 'Descubre' o 'Descubrir'.\n"
    "- PALABRAS SOBREUSADAS (máximo 1 vez por texto): 'Descubre', 'Encuentra', "
    "'Disfruta', 'Aprovecha'. Varía con: 'Explora', 'Vive', 'Reserva', 'Conoce', "
    "'Siente', 'Accede', 'Recorre', preguntas directas, etc.\n"
    "- Nunca usarás doble ** para negrita.\n"
    "- Mantén el número de palabras indicado.\n"
    "- Solo usa | al inicio y final de cada bloque, NUNCA dentro del contenido.\n\n"
    "ORTOGRAFÍA ESTRICTA:\n"
    "- TODAS las tildes: vehículo, económico, kilómetro, también, más, además, "
    "fácil, aquí, así, tendrás, podrás, selección, información.\n"
    "- Concordancia género/número correcta.\n"
    "- Sin espacios antes de signos de puntuación.\n"
    "- Porcentajes SIN espacio: '35%' nunca '35 %'.\n"
    "- Capitalización normal (no ALL CAPS excepto siglas).\n"
)

_SEMANTICA = (
    "\nDISTRIBUCIÓN DE SINÓNIMOS (obligatoria en TODO el texto):\n"
    "- 'auto/autos': 70% de las menciones (keyword principal).\n"
    "- 'carro/carros': 29% de las menciones.\n"
    "- 'vehículo/vehículos': máximo 1 vez por texto.\n"
    "Verbos: Alquiler / Renta (alternar libremente).\n\n"
    "KEYWORD OBLIGATORIA EN TODO TEXTO GENERADO:\n"
    "Cada texto debe incluir al menos una vez alguna de estas palabras clave: "
    "'alquiler', 'alquila', 'alquilar', 'renta', 'rentar'. Sin excepción.\n\n"
    "Palabras y frases ABSOLUTAMENTE PROHIBIDAS:\n"
    "- Automóvil, Flota.\n"
    "- 'cargos ocultos', 'gastos ocultos', 'pagos ocultos', 'costos ocultos', 'sin sorpresas'.\n"
    "- 'Descuentos relámpago'.\n"
    "- 'furgonetas' (usa 'vans').\n"
    "- 'SUVs' (con s) → siempre 'SUV' sin s.\n"
    "- 'autos tipo SUV', 'autos tipo Van' (suena artificial).\n\n"
    "DENSIDAD DE KW:\n"
    "No pueden aparecer 2 keywords principales (alquiler de autos, renta de carros, etc.) "
    "en menos de 50 palabras de distancia dentro del mismo párrafo.\n\n"
    "FORMATO: porcentajes SIN espacio: '35%' nunca '35 %'.\n"
)

_ESTILO_MCR = (
    "\nESTILO DE MARCA - Miles Car Rental:\n"
    "- Miles Car Rental es un COMPARADOR de tarifas de renta de autos que trabaja con "
    "múltiples agencias aliadas (Alamo, Avis, Hertz, Budget, Dollar, Enterprise, etc.). "
    "Conecta al usuario con las mejores tarifas.\n"
    "- Tono: SERIO, profesional, confiable. Enfatiza trayectoria ('más de 15 años'), "
    "alianzas con agencias prestigiosas y beneficios incluidos.\n"
    "- Público: viajeros adultos/corporativos que buscan confiabilidad.\n"
    "- Frases cortas y directas. Sin rodeos. Datos concretos.\n"
    "- Máximo 1 exclamación por párrafo.\n"
    "- Sin preguntas retóricas en el cuerpo (solo en títulos FAQ).\n"
    "- Usa: 'Miles Car Rental te conecta con las mejores agencias', "
    "'compara y reserva', 'reserva online', 'más de 15 años'.\n"
    "- BENEFICIOS EXACTOS (SOLO estos, no inventar):\n"
    "   * LATAM: Seguro de Viaje Gratis (para extranjeros), Kilómetros Ilimitados, "
    "Asistencia Básica en Carretera, Modificaciones Flexibles.\n"
    "   * IP USA: Kilómetros Ilimitados, Asistencia Básica en Carretera, "
    "Modificaciones sin cargos administrativos.\n"
    "   * IP BRA: Seguro de Viaje Gratis, Kilómetros Ilimitados, "
    "Modificaciones Flexibles, Beneficio en Cobertura del IOF.\n"
)

_ESTILO_VJM = (
    "\nESTILO DE MARCA - Viajemos:\n"
    "- Viajemos es un COMPARADOR de tarifas de renta de autos que trabaja con "
    "múltiples agencias aliadas (Alamo, Avis, Hertz, Budget, Dollar, Enterprise, etc.). "
    "Conecta al usuario con las mejores tarifas.\n"
    "- Tono: JOVIAL, fresco, cercano, entusiasta. Vocabulario dinámico, "
    "exclamaciones, apelación directa al viajero.\n"
    "- Público: viajeros jóvenes, turistas, grupos de amigos/familia.\n"
    "- Usa '¡Compara ahora!', '¡Encuentra la mejor tarifa!', '¡Anímate!', "
    "'¡Listo para tu próxima aventura!', 'Con Viajemos'.\n"
    "- Enfatiza: variedad de agencias, ahorro al comparar, libertad de viaje, diversión.\n"
    "- NO uses 'nuestra flota', 'nuestros autos' (Viajemos no tiene autos propios). "
    "SÍ usa 'los mejores precios', 'las mejores agencias'.\n"
)

_BASE_INTRO = (
    "Vas a pensar en español, recibirás instrucciones en español y deberás "
    "responder en español (español neutro latinoamericano).\n"
    "Eres un redactor experto en marketing digital SEO, especializado en "
    "contenidos para una agencia comparadora de renta de autos.\n\n"
)

SYSTEM_MCR = _BASE_INTRO + _RESTRICCIONES + _SEMANTICA + _ESTILO_MCR
SYSTEM_VJM = _BASE_INTRO + _RESTRICCIONES + _SEMANTICA + _ESTILO_VJM

_BRAND_SYSTEMS = {
    "mcr": SYSTEM_MCR,
    "viajemos": SYSTEM_VJM,
    "vjm": SYSTEM_VJM,
}

# ── Beneficios estándar por audiencia ──────────────────────────────────────────

_BENEFICIOS_LATAM = (
    "Seguro de Viaje Gratis para extranjeros, Kilómetros Ilimitados, "
    "Asistencia Básica en Carretera, Modificaciones Flexibles"
)
_BENEFICIOS_USA = (
    "Kilómetros Ilimitados, Conductor Adicional sin Costo extra, "
    "Asistencia Básica en Carretera, Modificaciones Flexibles"
)
# MCR IP USA: sin "Conductor Adicional" — igual que colorUtils.js BENEFICIOS_USA_MCR
_BENEFICIOS_USA_MCR = (
    "Kilómetros Ilimitados, Asistencia Básica en Carretera, "
    "Modificaciones sin cargos administrativos"
)
_BENEFICIOS_BRA = (
    "Seguro de Viaje Gratis para extranjeros, Kilómetros Ilimitados, "
    "Asistencia Básica en Carretera, Modificaciones Flexibles, "
    "Beneficio en Cobertura del IOF"
)

# Beneficios exclusivos Viajemos (incluyen Salas VIP y Promociones Exclusivas)
_BENEFICIOS_LATAM_VJM = (
    "Seguro de Viaje Gratis para extranjeros, Kilómetros Ilimitados, "
    "Asistencia Básica en Carretera, Modificaciones Flexibles, "
    "Acceso a Salas VIP, Reservas con Promociones Exclusivas hasta el 35%"
)
_BENEFICIOS_USA_VJM = (
    "Kilómetros Ilimitados, Conductor Adicional sin Costo extra, "
    "Asistencia Básica en Carretera, Modificaciones Flexibles, "
    "Acceso a Salas VIP, Reservas con Promociones Exclusivas hasta el 35%"
)
_BENEFICIOS_BRA_VJM = (
    "Seguro de Viaje Gratis para extranjeros, Kilómetros Ilimitados, "
    "Asistencia Básica en Carretera, Modificaciones Flexibles, "
    "Beneficio en Cobertura del IOF, "
    "Acceso a Salas VIP, Reservas con Promociones Exclusivas hasta el 35%"
)

# Favorite Cities: fallback determinista para evitar celdas vacias cuando el LLM no
# respeta el formato pipe en bloques largos.
_FAV_CITY_DEFAULTS = [
    ("Miami", "Alquiler de autos en Miami", "¡Miami te espera! Recorre South Beach, Wynwood y Downtown con total libertad al volante. Compara tarifas y reserva en minutos."),
    ("Orlando", "Renta de autos en Orlando", "Parques tematicos, compras y escapadas cercanas. Con renta de autos en Orlando viajas a tu ritmo y sin depender de horarios."),
    ("Las Vegas", "Alquiler de autos en Las Vegas", "Del Strip al desierto, cada ruta se disfruta mejor con auto propio. Encuentra ofertas y reserva tu carro ideal en segundos."),
    ("Nueva York", "Renta de autos en Nueva York", "Aprovecha tu viaje para explorar mas alla de Manhattan. Renta un auto y conecta barrios, outlets y rutas panoramicas con comodidad."),
    ("Los Angeles", "Alquiler de autos en Los Angeles", "Playas, estudios y carreteras iconicas te esperan. Compara precios de alquiler de autos y elige la opcion ideal para tu aventura."),
    ("Houston", "Renta de autos en Houston", "Recorre Houston con libertad total: museos, gastronomia y zonas comerciales. Reserva con tarifa competitiva y disponibilidad inmediata."),
    ("Chicago", "Alquiler de autos en Chicago", "Explora arquitectura, parques y barrios emblematicos sin limites. Alquila un auto y organiza tu itinerario con total autonomia."),
    ("Fort Lauderdale", "Renta de autos en Fort Lauderdale", "Sol, canales y playas inolvidables. Con renta de autos en Fort Lauderdale disfrutas cada trayecto con mayor comodidad."),
    ("San Diego", "Alquiler de autos en San Diego", "Disfruta la costa, La Jolla y Gaslamp Quarter a tu propio ritmo. Compara tarifas y reserva tu auto con facilidad."),
    ("Dallas", "Renta de autos en Dallas", "Negocios, cultura y entretenimiento en una sola ciudad. Renta un auto en Dallas y mueve tu viaje con eficiencia."),
    ("Phoenix", "Alquiler de autos en Phoenix", "Ideal para rutas por el desierto y escapadas cercanas. Alquila un auto en Phoenix y viaja con independencia total."),
    ("Tampa", "Renta de autos en Tampa", "Desde Tampa Bay hasta Clearwater, cada plan mejora con movilidad propia. Encuentra la mejor tarifa y reserva hoy."),
    ("San Francisco", "Alquiler de autos en San Francisco", "Golden Gate, miradores y escapadas a Napa. Con alquiler de autos en San Francisco llegas a todo sin complicaciones."),
    ("Atlanta", "Renta de autos en Atlanta", "Historia, negocios y vida urbana en movimiento. Renta un auto en Atlanta y optimiza cada trayecto de tu viaje."),
    ("Denver", "Alquiler de autos en Denver", "Montanas, naturaleza y ciudad en un mismo destino. Alquila un auto en Denver y disfruta rutas panoramicas inolvidables."),
    ("Austin", "Renta de autos en Austin", "Musica en vivo, gastronomia y plan al aire libre. Renta de autos en Austin para descubrir la ciudad sin limites."),
    ("CBX", "Alquiler de autos en CBX", "Cruza con facilidad y continua tu viaje en carretera. Compara opciones de alquiler de autos en CBX y reserva al mejor precio."),
]

class ContentGenerator:

    @staticmethod
    def _normalize_brand(brand: str) -> str:
        b = (brand or "mcr").strip().lower()
        if b in {"mcr", "miles", "miles car rental", "milescarrental", "miles_car_rental"}:
            return "mcr"
        if b in {"vjm", "viajemos", "viajemos.com", "viajemos autos"}:
            return "vjm"
        return b

    def __init__(self, llm_client: Optional[LLMClient] = None, brand: str = "mcr"):
        self.brand = self._normalize_brand(brand)
        self.llm = llm_client or LLMClient()
        self.system_message = _BRAND_SYSTEMS.get(self.brand, SYSTEM_MCR)

    @property
    def brand_name(self) -> str:
        return "Viajemos" if self.brand in ("vjm", "viajemos") else "Miles Car Rental"

    _VEHICLE_KW_MAP = {
        "camioneta": ("camionetas", "camioneta"),
        "pick-up": ("pick-up", "pick-up"),
        "minivan": ("minivans", "minivan"),
        "van": ("vans", "van"),
        "suv": ("SUV", "SUV"),
        "convertible": ("convertibles", "convertible"),
        "compacto": ("compactos", "compacto"),
        "eléctrico": ("eléctricos", "eléctrico"),
    }

    def _extract_vehicle_keyword(self, tit_seo: str) -> str:
        """Extrae el tipo de vehículo del título SEO; devuelve '' si es genérico (autos/carros)."""
        t = (tit_seo or "").lower()
        checks = [
            (r"\bcamionetas?\b", "camioneta"),
            (r"\bpick-?ups?\b", "pick-up"),
            (r"\bminivans?\b", "minivan"),
            (r"\bvans?\b", "van"),
            (r"\bsuv\b", "suv"),
            (r"\bconvertibles?\b", "convertible"),
            (r"\bcompactos?\b", "compacto"),
            (r"\beléctricos?\b", "eléctrico"),
            (r"\belectricos?\b", "eléctrico"),
        ]
        for pattern, kw in checks:
            if re.search(pattern, t):
                return kw
        return ""

    def _apply_vehicle_kw(self, title: str, vehicle_kw: str) -> str:
        """Reemplaza 'autos'/'carros' por el keyword de vehículo en un título."""
        if not vehicle_kw or not title:
            return title
        plural, singular = self._VEHICLE_KW_MAP.get(vehicle_kw, (vehicle_kw + "s", vehicle_kw))
        result = re.sub(r"\bautos\b", plural, title, flags=re.IGNORECASE)
        result = re.sub(r"\bcarros\b", plural, result, flags=re.IGNORECASE)
        result = re.sub(r"\bauto\b", singular, result, flags=re.IGNORECASE)
        result = re.sub(r"\bcarro\b", singular, result, flags=re.IGNORECASE)
        return result

    def _fix_tit_vehicle_kw(self, pipe_output: str, vehicle_kw: str) -> str:
        """Aplica keyword de vehículo a todos los campos tit* en el output pipe. Solo títulos."""
        if not vehicle_kw or not pipe_output:
            return pipe_output
        def replacer(m):
            return m.group(1) + self._apply_vehicle_kw(m.group(2), vehicle_kw) + "|"
        return re.sub(r"(\|tit(?:_\w+)?\s*:\s*)([^|]+)(\|)", replacer, pipe_output)

    def sanitize_city_name(self, raw_city: str) -> str:
        """Normaliza etiquetas de ciudad para evitar frases SEO largas como títulos H3."""
        c = (raw_city or "").strip()
        if not c:
            return ""

        known_city_names = [item[0] for item in _FAV_CITY_DEFAULTS]
        for kc in sorted(known_city_names, key=len, reverse=True):
            if re.search(rf"\b{re.escape(kc)}\b", c, flags=re.IGNORECASE):
                return kc

        c = re.sub(
            r"(?i)^(alquiler de autos en|renta de autos en|renta de carros en|"
            r"alquiler de carros en|rentar un auto en|reservar un auto en|"
            r"mejores ciudades para renta de autos(?: de lujo)? en|"
            r"destinos imperdibles para alquilar un auto desde|"
            r"ciudades populares para rentar un auto cerca de)\s*",
            "",
            c,
        ).strip(" .,-:;")

        c = re.split(r"(?i)\b(y|con|para|sin|desde)\b", c)[0].strip(" .,-:;")
        c = re.sub(r"[^A-Za-zÁÉÍÓÚáéíóúÑñ\s-]", "", c)
        c = re.sub(r"\s+", " ", c).strip()

        token_count = len(c.split())
        if token_count == 0 or token_count > 4:
            return ""

        bad_terms = {
            "alquiler", "renta", "autos", "carros", "carro", "auto", "lujo",
            "recorre", "costa", "limites", "mejores", "ciudades", "destinos",
        }
        if any(tok.lower() in bad_terms for tok in c.split()):
            return ""

        return c

    def _has_rental_keyword(self, text: str) -> bool:
        return bool(re.search(r"\b(?:alquil\w*|rent\w*)\b", text or "", flags=re.IGNORECASE))

    def _fav_city_desc_signature(self, desc: str) -> str:
        base = re.sub(r"[^a-záéíóúñ0-9\s]", "", (desc or "").lower())
        return re.sub(r"\s+", " ", base).strip()

    def _fav_city_desc_opening(self, desc: str, words: int = 4) -> str:
        tokens = re.findall(r"[a-záéíóúñ0-9]+", (desc or "").lower())
        return " ".join(tokens[:words])

    def _is_valid_fav_city_desc(self, desc: str) -> bool:
        clean_desc = re.sub(r"\s+", " ", (desc or "").strip())
        word_count = len(clean_desc.split()) if clean_desc else 0
        return 25 <= word_count <= 30 and self._has_rental_keyword(clean_desc)

    def _generate_single_fav_city_desc(self, nuevo_tema: str, city: str, highlight: str,
                                       used_descs: List[str], used_openings: List[str]) -> str:
        used_descs_text = " / ".join(used_descs[-6:]) if used_descs else "ninguna todavía"
        used_openings_text = " / ".join(used_openings[-6:]) if used_openings else "ninguna todavía"
        city_lower = city.lower()
        _banned_opener = re.compile(
            r"^(en\s+\w|explora\b|descubre\b|descubrir\b|visita\b|conoce\b)",
            re.IGNORECASE,
        )
        _brand_tokens = {"viajemos", "miles", "mcr", "milestours"}

        def _is_fresh(c: str) -> bool:
            cl = c.lower()
            if cl.startswith(city_lower):
                return False
            if _banned_opener.match(c):
                return False
            if any(b in cl for b in _brand_tokens):
                return False
            return True

        prompt = (
            f"Tema: {nuevo_tema}\n"
            f"Ciudad: {city}\n"
            f"Referencia local: {highlight}\n"
            "Genera SOLO una descripción para esta ciudad en formato |desc: ...|.\n"
            "REGLAS OBLIGATORIAS:\n"
            "- EXACTAMENTE 25 a 30 palabras.\n"
            "- Menciona la ciudad una sola vez. NUNCA la uses como primera palabra.\n"
            "- PROHIBIDO empezar con: el nombre de la ciudad, 'En [ciudad]', 'Explora', 'Descubre', 'Visita', 'Conoce'.\n"
            "- PROHIBIDO mencionar marcas comerciales (Viajemos, Miles, MCR ni similares).\n"
            "- Incluye una keyword de alquiler o renta de forma orgánica.\n"
            "- PROHIBIDO repetir apertura ya usada.\n"
            f"- Aperturas ya usadas: {used_openings_text}.\n"
            f"- Descripciones ya usadas: {used_descs_text}.\n"
            "- Varía la estructura: usa perspectivas, sensaciones, rutas, actividades o atractivos del lugar.\n"
            "EJEMPLOS de aperturas creativas (no copies literalmente, úsalos de guía):\n"
            "  'Sus calles combinan historia y modernidad...'\n"
            "  'Recorrer sus playas con un auto rentado...'\n"
            "  'La vida nocturna y las rutas costeras de...'\n"
            "  'Cada kilómetro desde su centro histórico...'\n"
            "  'Con un carro de alquiler, llegar a sus miradores...'\n"
            "  'Ideal para recorridos urbanos y escapadas cercanas...'\n"
            "  'Un destino donde las rutas panorámicas...'\n"
            "  'Moverse por su zona costera con un auto rentado...'\n"
            "Salida obligatoria:\n"
            "|desc: redacción|"
        )
        best_candidate = ""
        for _ in range(5):
            raw = self._call(prompt, temperature=TEMP_CREATIVE)
            candidate = (parse_fields(raw).get("desc") or "").strip()
            if not candidate:
                candidate = re.sub(r"<think>.*?</think>", "", raw or "", flags=re.DOTALL).strip()
                candidate = re.sub(r"^\|?\s*desc\s*:\s*", "", candidate, flags=re.IGNORECASE)
                candidate = candidate.replace("|", " ").strip()
                candidate = re.sub(r"\s+", " ", candidate)
            if candidate and not best_candidate:
                best_candidate = candidate
            if not self._is_valid_fav_city_desc(candidate) or not _is_fresh(candidate):
                continue
            signature = self._fav_city_desc_signature(candidate)
            opening = self._fav_city_desc_opening(candidate)
            if signature in used_descs or opening in used_openings:
                continue
            return candidate

        relaxed_prompt = (
            f"Tema: {nuevo_tema}\n"
            f"Ciudad: {city}\n"
            f"Referencia local: {highlight}\n"
            "Escribe una sola oración en español neutro latinoamericano.\n"
            "REGLAS:\n"
            "- Entre 25 y 30 palabras.\n"
            "- Menciona la ciudad una sola vez. NUNCA la uses como primera palabra.\n"
            "- NO empieces con 'En [ciudad]', 'Explora', 'Descubre', 'Visita' ni con el nombre de la ciudad.\n"
            "- NO menciones marcas comerciales.\n"
            "- Incluye una keyword de alquiler o renta de forma orgánica.\n"
            "- No repitas aperturas ni ideas ya usadas.\n"
            f"- Aperturas usadas: {used_openings_text}.\n"
            f"- Descripciones usadas: {used_descs_text}.\n"
            "- No uses formato pipe ni etiquetas. Devuelve solo la oración final."
        )
        for _ in range(2):
            raw = self._call(relaxed_prompt, temperature=TEMP_CREATIVE)
            candidate = re.sub(r"<think>.*?</think>", "", raw or "", flags=re.DOTALL).strip()
            candidate = candidate.replace("|", " ").strip()
            candidate = re.sub(r"\s+", " ", candidate)
            if candidate and not best_candidate:
                best_candidate = candidate
            if not self._is_valid_fav_city_desc(candidate) or not _is_fresh(candidate):
                continue
            signature = self._fav_city_desc_signature(candidate)
            opening = self._fav_city_desc_opening(candidate)
            if signature in used_descs or opening in used_openings:
                continue
            return candidate
        return best_candidate

    def _generate_batch_fav_city_descs(self, nuevo_tema: str, batch_items: List[tuple],
                                       used_descs: List[str], used_openings: List[str]) -> dict:
        if not batch_items:
            return {}
        used_descs_text = " / ".join(used_descs[-8:]) if used_descs else "ninguna todavía"
        used_openings_text = " / ".join(used_openings[-8:]) if used_openings else "ninguna todavía"
        items_text = "\n".join(
            [f"- desc_{idx} para {city} (contexto: {highlight})" for idx, city, highlight in batch_items]
        )
        expected = "\n".join([f"|desc_{idx}: redacción|" for idx, _, _ in batch_items])
        prompt = (
            f"Tema: {nuevo_tema}\n"
            "Genera SOLO descripciones faltantes para ciudades, en formato pipe exacto.\n"
            "REGLAS:\n"
            "- Cada desc_i: 25 a 30 palabras.\n"
            "- Cada desc_i debe contener una keyword general de alquiler o renta de forma orgánica.\n"
            "- No repitas ideas entre ciudades ni arranques iguales.\n"
            f"- Aperturas usadas: {used_openings_text}.\n"
            f"- Descripciones usadas: {used_descs_text}.\n"
            f"Bloques a generar:\n{items_text}\n"
            "Salida obligatoria sin texto extra:\n"
            f"{expected}"
        )
        raw = self._call(prompt, temperature=TEMP_CREATIVE)
        return parse_fields(raw) or {}

    # ── Utilidades internas ────────────────────────────────────────────────────

    def _call(self, prompt: str, temperature: float = TEMP_BALANCED,
              retries: int = 2) -> str:
        """Llama al modelo con reintentos. Devuelve raw para parseo posterior."""
        for attempt in range(retries + 1):
            wait = self.llm._down_until - time.time()
            if wait > 0:
                log.info("LLM en cooldown, esperando %.0fs (intento %d/%d)...", wait, attempt + 1, retries + 1)
                time.sleep(wait + 0.5)
            raw = self.llm.generate(prompt, self.system_message, temperature=temperature)
            if raw and raw.strip():
                return raw
            if attempt < retries:
                log.warning("Respuesta vacía, intento %d/%d...", attempt + 1, retries + 1)
        log.error("El modelo devolvió vacío tras %d intentos", retries + 1)
        return ""

    def _parse_and_supervise(self, raw: str, tit_default: str = "") -> str:
        """
        Pipeline 3-pass adaptado del Cargue Masivo (supervise_fields):
          1. Parsea campos |key: value| del raw LLM
          2. Fallback: si falta 'tit', usa tit_default
          3. supervisor_seo   → corrige KWs, homologaciones, ortografía (LLM)
          4. supervisor_structure → limpia formato (regex)
          5. Reconstruye y devuelve formato pipe

        El campo 'tit' no se supervisa (demasiado corto para el supervisor SEO).
        Si el parseo no produce campos, devuelve raw intacto.
        """
        fields = parse_fields(raw)

        if tit_default and not fields.get("tit"):
            fields["tit"] = tit_default

        if not fields:
            clean = re.sub(r"<think>.*?</think>", "", raw or "", flags=re.DOTALL).strip()
            clean = re.sub(r"^\|\s*\w+\s*:\s*", "", clean)
            clean = clean.replace("|", " ").strip()
            clean = re.sub(r"\s+", " ", clean)
            if tit_default and clean:
                return f"|tit: {tit_default}|\n|desc: {clean}|"
            if tit_default:
                return f"|tit: {tit_default}|"
            return raw

        supervised = {}
        for key, value in fields.items():
            if not value or key == "tit" or len(value.split()) < 5:
                supervised[key] = value
                continue
            value = supervisor_seo(value, self.llm, key) or value
            value = supervisor_structure(value) or value
            supervised[key] = value

        return "\n".join(f"|{k}: {v}|" for k, v in supervised.items())

    # ── Bloques de generación ──────────────────────────────────────────────────

    def generate_quicksearch(self, tit_seo: str, nuevo_tema: str) -> str:
        """B1 — Hero: título H1 + descripción corta (15-20 palabras)."""
        if self.brand == "mcr":
            examples = (
                "Ejemplos de referencia:\n"
                "Ejemplo 1: tit: Alquiler de Autos en Miami, FL, "
                "desc: Tu próximo viaje por Miami empieza con la flota correcta. Miles Car Rental, más de 15 años conectando viajeros.\n"
                "Ejemplo 2: tit: Renta de Autos en Orlando, FL, "
                "desc: En Orlando cada destino está más cerca con un auto rentado. Elige tu categoría y reserva en minutos con Miles Car Rental.\n"
                "Ejemplo 3: tit: Alquiler de Autos en Las Vegas, NV, "
                "desc: Recorre Las Vegas y sus alrededores a tu ritmo. Miles Car Rental te ofrece las mejores opciones con respaldo garantizado.\n\n"
            )
        else:
            examples = (
                "Ejemplos de referencia:\n"
                "Ejemplo 1: tit: Alquiler de Autos en Miami, FL, "
                "desc: ¡Priorizamos tu ahorro y garantizamos más beneficios! "
                "Encuentra aquí el mejor precio en renta de carros en Miami, Florida.\n"
                "Ejemplo 2: tit: Renta de Autos en Orlando, FL, "
                "desc: Compara tarifas, elige tu auto y reserva en minutos. "
                "Los mejores precios en alquiler de carros en Orlando te esperan.\n\n"
            )
        if self.brand == "mcr":
            rules = (
                "REGLAS:\n"
                "- El H1 puede ser el título base o una variante SEO levemente mejorada.\n"
                "- La descripción: EXACTAMENTE 15 a 20 palabras.\n"
                "- Tono profesional y confiable, sin exclamaciones.\n"
                "- La descripción habla del destino o de la experiencia de viaje, NO de agencias específicas ni beneficios técnicos.\n"
                "- PROHIBIDO en la descripción: nombres de agencias (Alamo, Dollar, Avis, Budget, etc.), "
                "kilómetros ilimitados, asistencia en carretera, depósito, o cualquier beneficio técnico.\n"
                "- Usa 'alquiler de autos' o 'renta de autos/carros' de forma orgánica en la descripción.\n"
            )
        else:
            rules = (
                "REGLAS:\n"
                "- El H1 puede ser el título base o una variante SEO levemente mejorada.\n"
                "- La descripción: EXACTAMENTE 15 a 20 palabras.\n"
                "- Tono cercano y dinámico.\n"
                "- Usa 'alquiler de autos' o 'renta de carros/autos' de forma orgánica en la descripción.\n"
            )
        prompt = (
            f"{examples}"
            f"Nuevo tema: {nuevo_tema}, TÍTULO SEO base: {tit_seo}\n"
            f"{rules}"
            "Genera con un ángulo diferente a los ejemplos:\n"
            "|tit: H1 SEO|\n"
            "|desc: redacción de 15 a 20 palabras|"
        )
        raw = self._call(prompt, temperature=TEMP_CREATIVE)
        result = self._parse_and_supervise(raw, tit_default=tit_seo)
        fields = parse_fields(result)
        if not fields.get("desc"):
            location = self._extract_location_from_title(nuevo_tema)
            if self.brand == "mcr":
                _qs_fallbacks = [
                    f"Tu próximo viaje por {location} empieza con la flota correcta. {self.brand_name}, más de 15 años conectando viajeros.",
                    f"En {location} cada destino está más cerca con un auto rentado. Elige tu categoría y reserva con {self.brand_name}.",
                    f"Recorre {location} y sus alrededores a tu ritmo. {self.brand_name} te ofrece las mejores opciones con respaldo garantizado.",
                ]
                import hashlib as _hqs
                _fi = int(_hqs.md5(nuevo_tema.encode()).hexdigest(), 16) % len(_qs_fallbacks)
                fields["desc"] = _qs_fallbacks[_fi]
            else:
                _qs_fallbacks_vjm = [
                    f"Mueve tu plan por {location} con más libertad. Compara opciones y elige la tarifa que mejor se ajusta a tu viaje.",
                    f"¿Listo para recorrer {location} a tu ritmo? Compara precios de alquiler y encuentra una opción ideal para tu aventura.",
                    f"En {location}, tu viaje mejora cuando decides tus horarios. Revisa tarifas, elige categoría y comienza a disfrutar el camino.",
                    f"Explorar {location} es más fácil con movilidad propia. Compara alternativas y encuentra un auto que encaje con tu itinerario.",
                ]
                fields["desc"] = random.choice(_qs_fallbacks_vjm)
        return "\n".join(f"|{k}: {v}|" for k, v in fields.items())

    def generate_fleet(self, tit_seo: str, nuevo_tema: str) -> str:
        """B2 — Fleet: descripción principal + variantes ip_usa e ip_bra (80-130 palabras)."""
        vehicle_kw = self._extract_vehicle_keyword(tit_seo)
        location = self._extract_location_from_title(nuevo_tema)
        tit = self._apply_vehicle_kw(f"Variedad de autos en {location}", vehicle_kw)
        import hashlib as _hfleet
        _fleet_angles = [
            "prioriza practicidad para viajes con agenda intensa",
            "enfatiza comodidad para recorridos largos y rutas mixtas",
            "resalta equilibrio entre presupuesto y categoria",
            "destaca libertad para combinar ciudad y alrededores",
        ]
        _angle_idx = int(_hfleet.md5(nuevo_tema.encode()).hexdigest(), 16) % len(_fleet_angles)
        angle = _fleet_angles[_angle_idx]

        # Selección de beneficios según marca
        is_vjm = self.brand in ("vjm", "viajemos")
        _ben_latam = _BENEFICIOS_LATAM_VJM if is_vjm else _BENEFICIOS_LATAM
        _ben_bra = _BENEFICIOS_BRA_VJM if is_vjm else _BENEFICIOS_BRA
        ip_usa_benefits = (
            _BENEFICIOS_USA_VJM if is_vjm else (
                _BENEFICIOS_USA_MCR if self.brand == "mcr" else _BENEFICIOS_USA
            )
        )

        prompt = (
            "Redacta un texto de 125 a 130 palabras para la sección fleet de una landing SEO.\n"
            f"Contexto: {nuevo_tema}.\n"
            f"Titulo de sección: {tit}.\n\n"
            "Reglas:\n"
            "- Tono comercial, claro y confiable.\n"
            "- Menciona variedad de autos: compactos, SUV, vans, convertibles y lujo.\n"
            f"- Angulo de redaccion: {angle}.\n"
            "- Cierre con llamado a comparar y reservar.\n"
            f"- Debe incluir EXACTAMENTE esta frase de beneficios: {_ben_latam} y mucho más.\n"
            "- Usa orgánicamente 'alquiler de autos' o 'renta de autos/carros' al menos una vez en el texto.\n"
            "- Devuelve SOLO: |desc: ...|"
        )

        raw = self._call(prompt, temperature=TEMP_PRECISE)
        fields = parse_fields(raw)
        desc = (fields.get("desc") or "").strip()

        if not desc or len(desc.split()) < 40:
            _fleet_desc_templates = [
                (
                    f"Compara tarifas de alquiler de autos en {location} y elige entre compactos, SUV, "
                    "vans, convertibles y autos de lujo para cada tipo de viaje. "
                    f"Incluye: {_ben_latam} y mucho más. "
                    "Con opciones flexibles, proceso de reserva simple y aliados reconocidos, "
                    "puedes asegurar la mejor alternativa para tu itinerario. "
                    "Reserva online y recorre tu destino con comodidad y respaldo."
                ),
                (
                    f"Si tu plan en {location} combina traslados urbanos y rutas mas largas, "
                    "te conviene revisar categorias con distintos niveles de espacio y confort. "
                    f"Incluye: {_ben_latam} y mucho más. "
                    "Compara opciones, valida condiciones y reserva una alternativa alineada "
                    "con tu agenda para viajar con mayor eficiencia y tranquilidad."
                ),
                (
                    f"Para moverte por {location} con mejor control del tiempo, "
                    "elige entre autos compactos, SUV, vans, convertibles y lujo segun tu itinerario. "
                    f"Incluye: {_ben_latam} y mucho más. "
                    "Con una reserva clara y categorias bien definidas, encuentras una opcion "
                    "equilibrada entre presupuesto, comodidad y funcionalidad."
                ),
                (
                    f"En {location} puedes ajustar tu experiencia de viaje con categorias para distintos escenarios: "
                    "trayectos cortos, planes familiares o rutas de mayor distancia. "
                    f"Incluye: {_ben_latam} y mucho más. "
                    "Compara alternativas, confirma disponibilidad y reserva online con una propuesta "
                    "practica para viajar con respaldo y flexibilidad."
                ),
            ]
            desc = _fleet_desc_templates[_angle_idx % len(_fleet_desc_templates)]

        if _ben_latam not in desc:
            desc = (
                f"{desc.strip()} Incluye: {_ben_latam} y mucho más."
            )

        ip_usa = desc.replace(_ben_latam, ip_usa_benefits)
        ip_bra = desc.replace(_ben_latam, _ben_bra)

        if ip_usa == desc:
            _ip_usa_templates = [
                (
                    f"Compara tarifas de alquiler de autos en {location} y elige entre compactos, SUV, "
                    "vans, convertibles y autos de lujo para cada plan de viaje. "
                    f"Incluye: {ip_usa_benefits} y mucho más. "
                    "Con reserva simple y opciones flexibles, encuentras una alternativa ideal "
                    "para moverte con comodidad y buen precio."
                ),
                (
                    f"Organiza mejor tus traslados en {location} comparando categorias segun tipo de ruta y cantidad de pasajeros. "
                    f"Incluye: {ip_usa_benefits} y mucho más. "
                    "Con un proceso claro de seleccion y reserva, puedes asegurar una opcion funcional "
                    "para tu agenda de viaje."
                ),
            ]
            ip_usa = _ip_usa_templates[_angle_idx % len(_ip_usa_templates)]

        if ip_bra == desc:
            _ip_bra_templates = [
                (
                    f"Compara tarifas de alquiler de autos en {location} y elige entre compactos, SUV, "
                    "vans, convertibles y autos de lujo para cada tipo de itinerario. "
                    f"Incluye: {_BENEFICIOS_BRA} y mucho más. "
                    "Con proceso de reserva rápido y respaldo de agencias reconocidas, "
                    "puedes asegurar una experiencia cómoda y eficiente."
                ),
                (
                    f"Para viajes en {location} con diferentes ritmos de movilidad, conviene evaluar categorias por espacio, confort y uso previsto. "
                    f"Incluye: {_BENEFICIOS_BRA} y mucho más. "
                    "Compara alternativas disponibles y confirma una reserva acorde a tu plan "
                    "con mayor flexibilidad operativa."
                ),
            ]
            ip_bra = _ip_bra_templates[_angle_idx % len(_ip_bra_templates)]

        desc = supervisor_structure(supervisor_seo(desc, self.llm, "desc") or desc) or desc
        ip_usa = supervisor_structure(supervisor_seo(ip_usa, self.llm, "ip_usa") or ip_usa) or ip_usa
        ip_bra = supervisor_structure(supervisor_seo(ip_bra, self.llm, "ip_bra") or ip_bra) or ip_bra

        return "\n".join([
            f"|tit: {tit}|",
            f"|desc: {desc}|",
            f"|ip_usa: {ip_usa}|",
            f"|ip_bra: {ip_bra}|",
        ])

    def generate_reviews(self, tit_seo: str, nuevo_tema: str) -> str:
        """Reviews / Rent companies — H2 propio + descripción (35-40 palabras)."""
        vehicle_kw = self._extract_vehicle_keyword(tit_seo)
        brand_name = self.brand_name
        if self.brand == "mcr":
            example = (
                "tit: Reseñas de renta de autos en Miami, "
                "desc_h2: Más de 15 años conectando viajeros con las mejores tarifas. "
                "Nuestros clientes destacan la facilidad del proceso, el respaldo de las agencias aliadas "
                "y la atención recibida antes y después de cada reserva."
            )
            tono = f"tono confiable y profesional, menciona {brand_name} o la trayectoria de 15 años"
        else:
            example = (
                "tit: Reseñas de renta de autos en Miami, "
                "desc_h2: ¡Miles de viajeros ya eligieron sus autos con nosotros! "
                "Compara, reserva y viaja con la confianza de quienes ya conocen la mejor forma "
                "de alquilar un auto al mejor precio."
            )
            tono = "tono cercano y entusiasta, menciona la comunidad de viajeros satisfechos"
        vehicle_plural = self._VEHICLE_KW_MAP.get(vehicle_kw, (vehicle_kw + "s", vehicle_kw))[0] if vehicle_kw else ""
        kw_rule = f"- En el campo tit usa '{vehicle_plural}' en lugar de 'autos'/'carros'.\n" if vehicle_kw else ""
        prompt = (
            f"Ejemplo de referencia:\n{example}\n\n"
            f"Nuevo tema: {nuevo_tema}, contexto LP: {tit_seo}\n"
            "REGLAS:\n"
            "- tit: H2 específico para la sección de reseñas/opiniones de clientes. "
            "Ejemplos válidos: 'Opiniones sobre alquiler de autos en Miami' / "
            "'Reseñas de clientes que rentaron en Orlando, FL'.\n"
            f"{kw_rule}"
            f"- desc_h2: 35 a 40 palabras. {tono.capitalize()}.\n"
            "- Usa 'alquiler' o 'renta' de forma orgánica en el desc_h2.\n"
            "Genera:\n"
            "<think>aquí tus pensamientos</think>\n"
            "|tit: H2 para sección de reseñas|\n"
            "|desc_h2: redacción|"
        )
        raw = self._call(prompt, temperature=TEMP_BALANCED)
        tit_default = self._apply_vehicle_kw(f"Opiniones sobre alquiler de autos — {nuevo_tema}", vehicle_kw)
        return self._fix_tit_vehicle_kw(self._parse_and_supervise(raw, tit_default=tit_default), vehicle_kw)

    def generate_agencies(self, tit_seo: str, nuevo_tema: str) -> str:
        """B3 — Agencias: H2 propio (50-65 palabras) + H3 (20-35 palabras)."""
        vehicle_kw = self._extract_vehicle_keyword(tit_seo)
        brand_name = self.brand_name
        location = self._extract_location_from_title(nuevo_tema)

        if self.brand == "mcr":
            examples = (
                "Ejemplos de referencia (desc_h2 y desc_h3: copy persuasivo que convence al cliente de rentar con Miles Car Rental):\n\n"
                "Ejemplo 1:\n"
                "tit: Agencias de alquiler de autos en Miami\n"
                "desc_h2: Reserva tu alquiler de autos en Miami con Miles Car Rental y accede en un solo lugar a Avis, Hertz, Alamo, Budget y más. "
                "Compara tarifas, elige tu vehículo y confirma tu reserva en minutos. "
                "Más de 15 años respaldan cada servicio para que viajes con total tranquilidad.\n"
                "desc_h3: ¿Te preocupa elegir bien? Con más de 15 años en el mercado, Miles Car Rental conecta tu reserva con las agencias más confiables. Renta hoy y viaja sin dudas.\n\n"
                "Ejemplo 2:\n"
                "tit: Las mejores compañías de alquiler de autos en Orlando\n"
                "desc_h2: No pierdas tiempo buscando: con Miles Car Rental tienes en un solo lugar las agencias de renta más reconocidas de Orlando. "
                "Hertz, Enterprise, National, Alamo y más te esperan. "
                "Elige con confianza y reserva hoy con el respaldo de 15 años en el mercado.\n"
                "desc_h3: Tu próxima aventura en Orlando empieza con una buena decisión. Reserva tu alquiler de autos con Miles Car Rental y maneja con la tranquilidad de estar en buenas manos.\n\n"
                "Ejemplo 3:\n"
                "tit: Compañías de renta de carros en Colombia\n"
                "desc_h2: Renta tu auto en Colombia a través de Miles Car Rental y asegura el mejor precio con Avis, Hertz, Budget y otras agencias líderes. "
                "Todo desde un mismo sitio, sin complicaciones. Elige, reserva y viaja con seguridad.\n"
                "desc_h3: No busques más opciones: con Miles Car Rental tienes el respaldo de las mejores agencias en un solo clic. Reserva ahora y viaja sin complicaciones.\n\n"
            )
            rules = (
                "REGLAS ESTRICTAS:\n"
                "- tit: H2 específico para sección de agencias. Varía entre: "
                "'Agencias de alquiler de autos en X' / 'Las mejores compañías de renta en X' / "
                "'Compañías de renta de carros en X' / 'Agencias líderes de alquiler de autos en X'.\n"
                f"- desc_h2: 50 a 65 palabras. Copy PERSUASIVO cuyo objetivo es convencer al cliente de rentar a través de {brand_name}. "
                "Menciona agencias disponibles (Avis, Budget, Hertz, Alamo, Enterprise, National, etc.) como argumento de valor. "
                f"Máximo 1 mención de {brand_name}. "
                "PROHIBIDO listar beneficios o describir características: el texto debe invitar a la acción y cerrar la decisión del cliente. "
                "Tono serio y confiable. Sin exclamaciones.\n"
                f"- desc_h3: 20 a 35 palabras. Copy PROMOCIONAL con gancho emocional o pregunta retórica que invite a reservar con {brand_name}. "
                "PROHIBIDO listar beneficios o indicaciones (kilómetros ilimitados, coberturas, etc.). "
                "Debe convencer, no informar. Tono profesional. Sin exclamaciones.\n"
                "- El desc_h2 debe contener 'alquiler de autos' o 'renta de autos/carros' de forma orgánica.\n"
            )
        else:
            examples = (
                "Ejemplos de referencia (desc_h2 y desc_h3: copy persuasivo que convence al cliente de rentar con Viajemos):\n\n"
                "Ejemplo 1:\n"
                "tit: Agencias de renta de autos en Miami\n"
                "desc_h2: Reserva tu alquiler de autos en Miami con Viajemos y elige entre las mejores agencias del mercado: Avis, Budget, Hertz y Alamo. "
                "Compara tarifas en segundos, sin comisiones ocultas, y asegura tu vehículo al mejor precio. "
                "El próximo movimiento es tuyo: reserva hoy.\n"
                "desc_h3: ¿Te preocupa elegir bien? En Viajemos tienes las mejores agencias en un solo lugar. Renta un auto en Miami con nosotros y empieza tu viaje con total confianza.\n\n"
                "Ejemplo 2:\n"
                "tit: Las mejores compañías de alquiler de autos en Orlando\n"
                "desc_h2: No sigas buscando: en Viajemos tienes acceso a las agencias de renta más reconocidas de Orlando, "
                "como Hertz, Enterprise, National y Alamo. Compara, decide con confianza y reserva en minutos. "
                "Aquí está tu mejor opción de alquiler de autos.\n"
                "desc_h3: ¡Vive tu aventura en Orlando como se debe! Reserva tu alquiler de autos con Viajemos y súbete al volante con precios imbatibles y total tranquilidad.\n\n"
                "Ejemplo 3:\n"
                "tit: Compañías de renta de carros en Colombia\n"
                "desc_h2: Con Viajemos encuentras al instante las agencias de renta más importantes del país: Avis, Hertz, Budget y más. "
                "Sin vueltas, sin sorpresas. Elige tu auto, confirma tu reserva y viaja con la seguridad de haber tomado la mejor decisión.\n"
                "desc_h3: Tu ruta en Colombia es más fácil con Viajemos. Elige el carro ideal, confirma en minutos y lleva tu viaje al siguiente nivel. ¡Reserva ahora!\n\n"
            )
            rules = (
                "REGLAS ESTRICTAS:\n"
                "- tit: H2 específico para sección de agencias. Varía entre: "
                "'Agencias de renta de autos en X' / 'Las mejores compañías de alquiler en X' / "
                "'Compañías de renta de carros en X' / 'Agencias líderes de alquiler de autos en X'.\n"
                f"- desc_h2: 50 a 65 palabras. Copy PERSUASIVO cuyo objetivo es convencer al cliente de rentar a través de {brand_name}. "
                "Menciona agencias disponibles (Avis, Budget, Hertz, Alamo, Enterprise, National, etc.) como argumento de valor. "
                f"Máximo 1 mención de {brand_name}. "
                f"PROHIBIDO comentar beneficios o describir características: el texto debe invitar a la acción y cerrar la decisión del cliente. "
                "Tono dinámico y propositivo. Puede usar imperativos o invitaciones directas.\n"
                f"- desc_h3: 20 a 35 palabras. Copy PROMOCIONAL con gancho emocional, pregunta retórica o llamada a la acción directa que invite a reservar con {brand_name}. "
                "PROHIBIDO listar beneficios o indicaciones (kilómetros ilimitados, coberturas, etc.). "
                "Debe convencer, no informar. Tono dinámico y cercano. Puede usar exclamaciones.\n"
                "- El desc_h2 debe contener 'alquiler de autos' o 'renta de autos/carros' de forma orgánica.\n"
            )

        vehicle_plural = self._VEHICLE_KW_MAP.get(vehicle_kw, (vehicle_kw + "s", vehicle_kw))[0] if vehicle_kw else ""
        kw_rule = f"- En el campo tit usa '{vehicle_plural}' en lugar de 'autos'/'carros'.\n" if vehicle_kw else ""
        prompt = (
            f"{examples}"
            f"Nuevo tema: {nuevo_tema}, contexto LP: {tit_seo}\n\n"
            f"{rules}"
            f"{kw_rule}"
            "- PROHIBIDO repetir literalmente los ejemplos.\n"
            "Genera OBLIGATORIAMENTE los tres campos:\n"
            "<think>aquí tus pensamientos</think>\n"
            "|tit: H2 para sección de agencias|\n"
            "|desc_h2: redacción|\n"
            "|desc_h3: redacción|"
        )
        raw = self._call(prompt, temperature=TEMP_CREATIVE)
        tit_default = self._apply_vehicle_kw(f"Agencias de renta de autos — {nuevo_tema}", vehicle_kw)
        result = self._fix_tit_vehicle_kw(self._parse_and_supervise(raw, tit_default=tit_default), vehicle_kw)
        fields = parse_fields(result)
        if not fields.get("desc_h2"):
            if self.brand == "mcr":
                fields["desc_h2"] = (
                    f"Reserva tu alquiler de autos en {location} con {brand_name} y accede en un solo lugar "
                    "a Avis, Hertz, Alamo, Budget y más agencias líderes. "
                    "Compara tarifas, elige tu vehículo y confirma tu reserva en minutos. "
                    "Más de 15 años respaldan cada servicio para que viajes con total tranquilidad."
                )
            else:
                fields["desc_h2"] = (
                    f"No sigas buscando: en {brand_name} tienes acceso a las agencias de renta más reconocidas de {location}, "
                    "como Avis, Hertz, Budget y Alamo. "
                    "Compara, decide con confianza y reserva en minutos. "
                    "Aquí está tu mejor opción de alquiler de autos."
                )
        if not fields.get("desc_h3"):
            if self.brand == "mcr":
                fields["desc_h3"] = (
                    f"¿Te preocupa elegir bien? Con más de 15 años en el mercado, {brand_name} conecta "
                    "tu reserva con las agencias más confiables. Renta hoy y viaja sin dudas."
                )
            else:
                fields["desc_h3"] = (
                    f"¡Vive la experiencia de rentar sin complicaciones! En {brand_name} encuentras "
                    "el auto ideal al mejor precio. Reserva hoy y empieza tu viaje con total confianza."
                )
        return "\n".join(f"|{k}: {v}|" for k, v in fields.items())

    def generate_rentcompanies(self, tit_seo: str, nuevo_tema: str) -> str:
        """MCR rentcompanies — H2 de agencias de alquiler + descripción (80-85 palabras)."""
        vehicle_kw = self._extract_vehicle_keyword(tit_seo)
        brand_name = self.brand_name
        location = self._extract_location_from_title(nuevo_tema)
        if self.brand == "mcr":
            example = (
                "tit: Agencias de renta de autos en Miami, FL, "
                "desc: Con Miles Car Rental compara en segundos las tarifas de Alamo, Budget, "
                "Hertz, Dollar y más agencias líderes en Miami. "
                "Más de 15 años conectando viajeros con las mejores ofertas y el respaldo "
                "de las marcas más reconocidas del mercado."
            )
            tono = f"posicionar {brand_name} como comparador con más de 15 años; mencionar agencias aliadas (Alamo, Budget, Hertz, Dollar, etc.)"
        else:
            example = (
                "tit: Agencias de alquiler de autos en Miami, FL, "
                "desc: En Viajemos comparas en segundos tarifas de Alamo, Budget, Hertz y más. "
                "Elige la mejor agencia para tu viaje a Miami y reserva al instante "
                "con el respaldo de las marcas más confiables del mercado."
            )
            tono = f"posicionar {brand_name} como la mejor plataforma de comparación; mencionar agencias aliadas"
        vehicle_plural = self._VEHICLE_KW_MAP.get(vehicle_kw, (vehicle_kw + "s", vehicle_kw))[0] if vehicle_kw else ""
        kw_rule = f"- En el campo tit usa '{vehicle_plural}' en lugar de 'autos'/'carros'.\n" if vehicle_kw else ""
        prompt = (
            f"Ejemplo de referencia:\n{example}\n\n"
            f"Nuevo tema: {nuevo_tema}, contexto LP: {tit_seo}\n"
            "REGLAS:\n"
            "- tit: H2 específico para sección de agencias de renta. "
            "Ejemplos: 'Agencias de renta de autos en X' / 'Compañías de alquiler de autos en X'.\n"
            f"{kw_rule}"
            f"- desc: 80 a 85 palabras. {tono.capitalize()}.\n"
            "- Usa 'alquiler de autos' o 'renta de autos/carros' de forma orgánica en el desc.\n"
            "Genera:\n"
            "<think>aquí tus pensamientos</think>\n"
            "|tit: H2 para sección de agencias|\n"
            "|desc: redacción|"
        )
        raw = self._call(prompt, temperature=TEMP_BALANCED)
        tit_default = self._apply_vehicle_kw(f"Agencias de alquiler de autos — {nuevo_tema}", vehicle_kw)
        result = self._fix_tit_vehicle_kw(self._parse_and_supervise(raw, tit_default=tit_default), vehicle_kw)
        fields = parse_fields(result)
        if not fields.get("desc"):
            if self.brand == "mcr":
                fields["desc"] = (
                    f"Con {brand_name} comparas en segundos las tarifas de Alamo, Budget, Hertz, Dollar "
                    f"y más agencias líderes en {location}. Más de 15 años conectando viajeros "
                    "con las mejores ofertas y el respaldo de las marcas más reconocidas."
                )
            else:
                fields["desc"] = (
                    f"En {brand_name} comparas en segundos las tarifas de Alamo, Budget, Hertz "
                    f"y más agencias líderes en {location}. Elige la mejor opción y reserva "
                    "al instante con el respaldo de las marcas más confiables."
                )
        return "\n".join(f"|{k}: {v}|" for k, v in fields.items())

    def generate_faq(self, tit_seo: str, nuevo_tema: str) -> str:
        """B4 — FAQs header: descripción introductoria H2 (40-60 palabras)."""
        vehicle_kw = self._extract_vehicle_keyword(tit_seo)
        location = self._extract_location_from_title(nuevo_tema)
        _tit_variants_faq = [
            self._apply_vehicle_kw(f"Preguntas frecuentes sobre renta de autos en {location}", vehicle_kw),
            self._apply_vehicle_kw(f"Todo lo que debes saber sobre el alquiler de autos en {location}", vehicle_kw),
            self._apply_vehicle_kw(f"Resolvemos tus dudas sobre rentar un auto en {location}", vehicle_kw),
        ]
        tit_default = _tit_variants_faq[0]
        import hashlib as _hs
        tit_seo_clean = _hs.md5(nuevo_tema.encode()).hexdigest()
        tit_suggested = _tit_variants_faq[int(tit_seo_clean, 16) % len(_tit_variants_faq)]
        vehicle_plural = self._VEHICLE_KW_MAP.get(vehicle_kw, (vehicle_kw + "s", vehicle_kw))[0] if vehicle_kw else ""
        kw_rule = f"Usa '{vehicle_plural}' en lugar de 'autos'/'carros' en el tit. " if vehicle_kw else ""
        prompt = (
            "Ejemplo de referencia:\n"
            "tit: Preguntas frecuentes sobre renta de autos en Orlando, "
            "desc: ¿Tienes dudas sobre el alquiler de autos en este destino? "
            "Aquí respondemos las preguntas más frecuentes para que llegues preparado: "
            "desde requisitos y costos hasta las mejores agencias disponibles.\n\n"
            f"Nuevo tema: {nuevo_tema}\n"
            f"REGLA: genera tit + desc. {kw_rule}El tit debe ser claro y orientado al usuario, NO incluir 'Landing Page' ni guiones. desc de 40 a 45 palabras. Usa 'alquiler de autos' o 'renta de autos/carros' de forma orgánica en el desc.\n"
            f"Título sugerido para tit: {tit_suggested}\n"
            "Genera:\n"
            "<think>aquí tus pensamientos</think>\n"
            "|tit: título H2|\n"
            "|desc: redacción|"
        )
        raw = self._call(prompt, temperature=TEMP_BALANCED)
        return self._fix_tit_vehicle_kw(self._parse_and_supervise(raw, tit_default=tit_default), vehicle_kw)

    @staticmethod
    def _get_respuesta_requisitos_renta(location: str) -> str:
        return (
            f"Los requisitos generales para alquilar un auto en {location} son:\n\n"
            "**\n\n"
            "- Ser mayor de 25 años.*\n"
            "- Licencia de conducción de tu país de origen vigente, con antigüedad mayor a un año y fecha de vencimiento impresa.\n"
            "- Tarjeta de crédito a nombre del titular de la reserva con cupo disponible para cubrir el depósito de alquiler.\n"
            "- Depósito de Garantía.\n"
            "- Pasaporte vigente.\n"
            "- Tiquetes aéreos (ida y vuelta).\n\n"
            "**\n\n"
            "*Algunas agencias permiten que el titular de la reserva tenga entre 21 y 24 años, por un pequeño precio adicional. "
            "Es necesario que los documentos se presenten en formato físico al momento de retirar el auto de la agencia. "
            "Además, ten presente que los requisitos pueden cambiar de acuerdo con tu país de origen, "
            "te invitamos a consultar todos los detalles con nuestro Chatbot."
        )

    def _es_pregunta_requisitos_renta(self, pregunta: str) -> bool:
        p = pregunta.lower()
        return "qué se necesita para rentar" in p or "que se necesita para rentar" in p

    def generate_faq_respuesta(self, nuevo_tema: str, preguntas: List[str]) -> str:
        """B4 — FAQs respuestas individuales (estilo lm_client: template robusto)."""
        if not preguntas:
            preguntas = self.generate_faq_questions_from_title(nuevo_tema)

        location = self._extract_location_from_title(nuevo_tema)
        precio_dia = "9"
        precio_semana = "63"

        agencias_precios = [
            ("Alamo", precio_dia),
            ("Dollar", str(int(precio_dia) + 1)),
            ("Avis", str(int(precio_dia) + 2)),
        ]
        agencias_lines = "\n".join(f"- {ag}, desde USD ${pr}/día" for ag, pr in agencias_precios)

        import hashlib as _hfaq
        faq_responses = {}
        for i, pregunta in enumerate(preguntas, start=1):
            p = (pregunta or "").lower()
            _seed = int(_hfaq.md5(f"{nuevo_tema}|{pregunta}|{i}".encode()).hexdigest(), 16)

            if self._es_pregunta_requisitos_renta(pregunta):
                faq_responses[f"faq_{i}"] = self._get_respuesta_requisitos_renta(location)
                continue

            if "semana" in p:
                _semana_templates = [
                    (
                        f"Alquilar un carro durante una semana en {location} tiene un costo "
                        f"desde los USD ${precio_semana}.\n\n"
                        "Recuerda que este precio puede cambiar según la temporada, la "
                        "agencia elegida, el tipo de vehículo y los servicios adicionales "
                        "incluidos en la reserva."
                    ),
                    (
                        f"Para una renta semanal en {location}, las tarifas suelen iniciar "
                        f"desde USD ${precio_semana}.\n\n"
                        "El valor final depende de la fecha del viaje, la categoría del auto, "
                        "la disponibilidad y las coberturas que agregues a la reserva."
                    ),
                    (
                        f"Si planeas rentar por siete días en {location}, puedes encontrar "
                        f"opciones desde USD ${precio_semana}.\n\n"
                        "Ese monto puede variar por temporada, políticas de la agencia, tipo "
                        "de carro seleccionado y servicios adicionales contratados."
                    ),
                ]
                faq_responses[f"faq_{i}"] = _semana_templates[_seed % len(_semana_templates)]
                continue

            if "agencia" in p or "barat" in p:
                _agencia_templates = [
                    (
                        f"Las compañías de renta de vehículos con las tarifas más económicas "
                        f"en {location} son:\n"
                        "**\n"
                        f"{agencias_lines}\n"
                        "**\n"
                        "En nuestro portal puedes comparar los precios de estas y otras "
                        "agencias para elegir la opción que mejor se ajuste a tu viaje. "
                        "No olvides que el precio puede cambiar según temporada, categoría del auto "
                        "y servicios adicionales."
                    ),
                    (
                        f"Entre las alternativas con mejor precio en {location} se encuentran:\n"
                        "**\n"
                        f"{agencias_lines}\n"
                        "**\n"
                        "Te recomendamos comparar condiciones, horarios de retiro y coberturas, "
                        "porque las tarifas pueden variar de acuerdo con la temporada y la "
                        "categoría elegida."
                    ),
                    (
                        f"Si buscas opciones económicas de alquiler en {location}, revisa primero:\n"
                        "**\n"
                        f"{agencias_lines}\n"
                        "**\n"
                        "La mejor decisión sale de comparar precio total, tipo de auto y servicios "
                        "incluidos antes de confirmar la reserva."
                    ),
                ]
                faq_responses[f"faq_{i}"] = _agencia_templates[_seed % len(_agencia_templates)]
                continue

            if "zona" in p or "recoger" in p:
                _zona_templates = [
                    (
                        f"En {location}, suele convenir recoger el auto en el aeropuerto o en zonas "
                        "centrales con mayor disponibilidad. La mejor opción depende de tu itinerario, "
                        "horario de llegada y presupuesto. Compara ubicación, tarifa y condiciones "
                        "antes de confirmar la reserva."
                    ),
                    (
                        f"Para {location}, los puntos de retiro más prácticos suelen ser el aeropuerto "
                        "y áreas céntricas. El lugar ideal cambia según tu ruta, hora de llegada y "
                        "costos asociados. Revisa distancia, tarifa y políticas antes de reservar."
                    ),
                    (
                        f"La mejor zona para recoger el carro en {location} depende de dónde iniciarás "
                        "tu recorrido. Aeropuerto y centro suelen ofrecer más disponibilidad, pero conviene "
                        "comparar precio final, tiempos de traslado y condiciones de entrega."
                    ),
                ]
                faq_responses[f"faq_{i}"] = _zona_templates[_seed % len(_zona_templates)]
                continue

            if "anticipaci" in p or "reserva" in p:
                _anticipacion_templates = [
                    (
                        "Sí, reservar con anticipación suele ayudarte a conseguir mejores tarifas y "
                        "más categorías disponibles. En temporadas altas, la diferencia de precio puede "
                        "ser mayor, por eso recomendamos comparar opciones y confirmar tu reserva cuanto antes."
                    ),
                    (
                        "Reservar con tiempo casi siempre mejora tu margen de elección y precio. "
                        "Cuando hay alta demanda, las categorías más buscadas se agotan rápido, "
                        "así que comparar y confirmar antes suele ser una mejor estrategia."
                    ),
                    (
                        "Sí conviene reservar anticipadamente, sobre todo si viajas en fechas de alta "
                        "ocupación. Así puedes acceder a más disponibilidad, revisar condiciones con calma "
                        "y asegurar una tarifa más competitiva."
                    ),
                ]
                faq_responses[f"faq_{i}"] = _anticipacion_templates[_seed % len(_anticipacion_templates)]
                continue

            # Default: costo diario
            _diario_templates = [
                (
                    f"Alquilar un auto en {location} tiene un costo que va desde los "
                    f"USD ${precio_dia} al día, a través de {self.brand_name}.\n\n"
                    "Ten en cuenta que la tarifa puede variar según la categoría del vehículo, "
                    "la agencia de alquiler, la temporada y los servicios adicionales de la reserva."
                ),
                (
                    f"En {location}, el precio diario de renta puede comenzar desde USD ${precio_dia}.\n\n"
                    "El total final depende de la categoría elegida, la fecha de viaje, la agencia "
                    "seleccionada y las coberturas añadidas en la reserva."
                ),
                (
                    f"Puedes encontrar alquiler de autos en {location} desde USD ${precio_dia} por día.\n\n"
                    "Para una referencia más precisa, conviene comparar según temporada, tipo de carro "
                    "y condiciones incluidas en cada opción disponible."
                ),
            ]
            faq_responses[f"faq_{i}"] = _diario_templates[_seed % len(_diario_templates)]

        return "\n".join(f"|{k}: {v}|" for k, v in faq_responses.items())

    _CAR_RENTAL_TITULOS = [
        "Alquila el auto ideal para tu viaje por {loc}",
        "Categorías de autos para rentar en {loc}",
        "Renta el vehículo que mejor se adapta a tu ruta en {loc}",
        "Tipos de autos en alquiler para recorrer {loc}",
        "El auto correcto para alquilar en {loc}",
        "Opciones de alquiler de autos para tu estancia en {loc}",
    ]

    def generate_car_rental(self, tit_seo: str, nuevo_tema: str) -> str:
        """B5 — Car Rental header: descripción introductoria (60-85 palabras)."""
        vehicle_kw = self._extract_vehicle_keyword(tit_seo)
        location = self._extract_location_from_title(nuevo_tema)
        idx = sum(ord(c) for c in location) % len(self._CAR_RENTAL_TITULOS)
        tit_sugerido = self._apply_vehicle_kw(self._CAR_RENTAL_TITULOS[idx].format(loc=location), vehicle_kw)

        if self.brand == "mcr":
            example = ""
            tone_rule = (
                "Tono profesional y confiable. Sin exclamaciones ni lenguaje informal. "
                "PROHIBIDO: referencias a la empresa, años de experiencia o premios."
            )
            desc_rule = (
                "- desc: 80 a 85 palabras. Es una introducción breve a la sección de vehículos. "
                "NO menciones tipos de autos, NO los enumeres, NO los describas. "
                "Solo contextualiza al usuario sobre la variedad disponible en el destino "
                "e invítalo a explorar. PROHIBIDO: mencionar precios, marcas o llamados a reservar.\n"
            )
        else:
            example = (
                "Ejemplo de referencia:\n"
                "tit: Elige el auto ideal para tu viaje por Miami, "
                "desc: En Miami hay categorías para todos: autos compactos para moverse rápido, "
                "SUVs para la familia, vans para grupos y opciones de lujo para quienes quieren "
                "más confort. Mira las opciones disponibles y escoge la que mejor se adapte "
                "a tu itinerario y presupuesto.\n\n"
            )
            tone_rule = (
                "Tono cercano y dinámico, propio de Viajemos. Puede ser directo y entusiasta."
            )
            desc_rule = (
                "- desc: 80 a 85 palabras. Es una introducción a la sección de autos. "
                "NO definas ni describas categorías específicas aquí, NO enumere tipos de autos. "
                "Debe preparar al usuario para explorar las opciones en los bloques siguientes. "
                "PROHIBIDO: mencionar precios, marcas o llamados directos a reservar.\n"
            )

        prompt = (
            f"{example}"
            f"Destino: {location}\n"
            "REGLAS:\n"
            f"- Tono: {tone_rule}\n"
            "- tit: título H2 concreto. OBLIGATORIO incluir 'alquila' o 'renta' de forma orgánica y creativa. Máximo 10 palabras.\n"
            f"{desc_rule}"
            "Genera:\n"
            "<think>aquí tus pensamientos</think>\n"
            f"|tit: {tit_sugerido}|\n"
            "|desc: redacción|\n"
            "IMPORTANTE: Solo usa | al inicio y final, NUNCA dentro del contenido."
        )
        raw = self._call(prompt, temperature=TEMP_CREATIVE)
        return self._fix_tit_vehicle_kw(self._parse_and_supervise(raw, tit_default=tit_sugerido), vehicle_kw)

    def _generate_single_car_type_desc(self, tipo: str, location: str, nuevo_tema: str,
                                        word_range: tuple, used_descs: List[str],
                                        used_openings: List[str]) -> str:
        min_w, max_w = word_range
        _car_highlights = {
            "económico": "bajo consumo de combustible y fácil estacionamiento",
            "camioneta": "capacidad de carga y tracción en distintos terrenos",
            "camionetas": "capacidad de carga y tracción en distintos terrenos",
            "convertible": "conducción al aire libre y rutas panorámicas",
            "convertibles": "conducción al aire libre y rutas panorámicas",
            "lujo": "acabados premium y mayor confort en cada trayecto",
            "van": "espacio para grupos y equipaje abundante",
            "eléctrico": "cero emisiones y conducción silenciosa",
            "eléctricos": "cero emisiones y conducción silenciosa",
            "suv": "altura, amplitud y versatilidad para distintas rutas",
            "compacto": "agilidad urbana y fácil manejo en la ciudad",
            "intermedio": "equilibrio entre espacio y maniobrabilidad",
        }
        tipo_lower = tipo.lower()
        highlight = next(
            (v for k, v in _car_highlights.items() if k in tipo_lower),
            "características específicas de este segmento",
        )
        _brand_tokens = {"viajemos", "miles", "mcr", "milestours"}
        used_descs_text = " / ".join(used_descs[-6:]) if used_descs else "ninguna todavía"
        used_openings_text = " / ".join(used_openings[-6:]) if used_openings else "ninguna todavía"

        def _is_valid(c: str) -> bool:
            words = c.split()
            if not (min_w <= len(words) <= max_w):
                return False
            cl = c.lower()
            if any(b in cl for b in _brand_tokens):
                return False
            return self._has_rental_keyword(c)

        prompt = (
            f"Tema: {nuevo_tema}\n"
            f"Destino: {location}\n"
            f"Tipo de auto: {tipo}\n"
            f"Característica clave: {highlight}\n"
            f"Genera SOLO una descripción de {min_w} a {max_w} palabras para este tipo de auto en formato |desc: ...|.\n"
            "REGLAS OBLIGATORIAS:\n"
            f"- EXACTAMENTE entre {min_w} y {max_w} palabras. La oración debe terminar con sentido completo.\n"
            f"- NUNCA empieces con el nombre del tipo '{tipo}'.\n"
            "- PROHIBIDO mencionar marcas comerciales (Viajemos, Miles, MCR ni similares).\n"
            "- PROHIBIDO repetir apertura ya usada.\n"
            "- La descripción debe hablar de algo concreto y exclusivo de este tipo, no intercambiable con otro.\n"
            "- Menciona el destino de forma natural dentro de la oración.\n"
            f"- Aperturas ya usadas: {used_openings_text}.\n"
            f"- Descripciones ya usadas: {used_descs_text}.\n"
            "EJEMPLOS de aperturas variadas (no copies literalmente, úsalos de guía):\n"
            "  'Para viajes cortos por la ciudad,...'\n"
            "  'Cuando necesitas moverte sin complicaciones,...'\n"
            "  'Si el plan incluye varias paradas,...'\n"
            "  'Con capacidad para grupos y equipaje,...'\n"
            "  'Ideal para quien prioriza comodidad,...'\n"
            "  'Su diseño lo convierte en la opción perfecta...'\n"
            "  'Perfecto para quienes buscan estilo y rendimiento,...'\n"
            "  'Recorrer las rutas de [ciudad] con este auto...'\n"
            "Salida obligatoria:\n"
            "|desc: redacción|"
        )
        best_candidate = ""
        for _ in range(5):
            raw = self._call(prompt, temperature=TEMP_CREATIVE)
            candidate = (parse_fields(raw).get("desc") or "").strip()
            if not candidate:
                candidate = re.sub(r"<think>.*?</think>", "", raw or "", flags=re.DOTALL).strip()
                candidate = re.sub(r"^\|?\s*desc\s*:\s*", "", candidate, flags=re.IGNORECASE)
                candidate = candidate.replace("|", " ").strip()
                candidate = re.sub(r"\s+", " ", candidate)
            if candidate and not best_candidate:
                best_candidate = candidate
            if not _is_valid(candidate):
                continue
            opening = self._fav_city_desc_opening(candidate)
            if opening in used_openings:
                continue
            return candidate

        relaxed_prompt = (
            f"Tema: {nuevo_tema}\n"
            f"Destino: {location}\n"
            f"Tipo de auto: {tipo}\n"
            f"Escribe una sola oración en español neutro latinoamericano de {min_w} a {max_w} palabras.\n"
            "REGLAS:\n"
            f"- Entre {min_w} y {max_w} palabras.\n"
            f"- NUNCA empieces con '{tipo}'.\n"
            "- NO menciones marcas comerciales.\n"
            "- No repitas aperturas ya usadas.\n"
            f"- Aperturas usadas: {used_openings_text}.\n"
            "- No uses formato pipe ni etiquetas. Devuelve solo la oración final."
        )
        for _ in range(2):
            raw = self._call(relaxed_prompt, temperature=TEMP_CREATIVE)
            candidate = re.sub(r"<think>.*?</think>", "", raw or "", flags=re.DOTALL).strip()
            candidate = candidate.replace("|", " ").strip()
            candidate = re.sub(r"\s+", " ", candidate)
            if candidate and not best_candidate:
                best_candidate = candidate
            if not _is_valid(candidate):
                continue
            opening = self._fav_city_desc_opening(candidate)
            if opening in used_openings:
                continue
            return candidate
        return best_candidate

    def generate_car_type(self, titulos_autos: List[str], nuevo_tema: str) -> str:
        """B5 — Car Rental: títulos estándar + descripciones LLM individuales por tipo de auto."""
        location = self._extract_location_from_title(nuevo_tema)
        word_range = (19, 29)

        out = {}
        used_descs: List[str] = []
        used_openings: List[str] = []

        for i, tipo in enumerate(titulos_autos, start=1):
            desc_v = self._generate_single_car_type_desc(
                tipo, location, nuevo_tema, word_range, used_descs, used_openings
            )
            out[f"tit_{i}"] = tipo
            out[f"desc_{i}"] = desc_v
            if desc_v:
                sig = self._fav_city_desc_signature(desc_v)
                op = self._fav_city_desc_opening(desc_v)
                if sig:
                    used_descs.append(sig)
                if op:
                    used_openings.append(op)

        return "\n".join(f"|{k}: {v}|" for k, v in out.items())

    def generate_fav_city(self, tit_seo: str, nuevo_tema: str) -> str:
        """B6 — Favorite Cities/Locations header: título + descripción estandarizados."""
        vehicle_kw = self._extract_vehicle_keyword(tit_seo)
        brand_name = self.brand_name

        vehicle_singular = self._VEHICLE_KW_MAP.get(vehicle_kw, ("autos", "auto"))[1] if vehicle_kw else "auto"
        vehicle_plural = self._VEHICLE_KW_MAP.get(vehicle_kw, ("autos", "auto"))[0] if vehicle_kw else "autos"

        import hashlib
        _tit_variants = [
            f"Renta un {vehicle_singular} en otras ciudades de Estados Unidos",
            f"Alquiler de {vehicle_plural} en otras ciudades de Estados Unidos",
            f"Explora otras ciudades de Estados Unidos con {vehicle_plural} en renta",
        ]
        idx = int(hashlib.md5(nuevo_tema.encode()).hexdigest(), 16) % len(_tit_variants)
        tit = self._apply_vehicle_kw(_tit_variants[idx], vehicle_kw)

        if self.brand == "mcr":
            desc = (
                f"Renta un {vehicle_singular} en otras ciudades de Estados Unidos y adapta tu experiencia de conducción a distintos escenarios. "
                "Desde rutas costeras hasta recorridos urbanos, encuentra opciones en destinos como Nueva York, Miami y Los Ángeles. "
                f"Compara ubicaciones, elige según tu itinerario y reserva con {brand_name} para viajar con mayor libertad."
            )
        else:
            desc = (
                f"Renta un {vehicle_singular} en otras ciudades de Estados Unidos y adapta tu experiencia de conducción a distintos escenarios. "
                "Desde rutas costeras hasta recorridos urbanos, encuentra opciones en destinos como Nueva York, Miami y Los Ángeles. "
                "Compara ubicaciones, elige según tu itinerario y viaja con Viajemos para aprovechar cada trayecto."
            )

        return f"|tit: {tit}|\n|desc: {desc}|"

    def generate_fav_city_respuesta(self, nuevo_tema: str, ciudades: List[str]) -> str:
        """B6 — Favorite Cities descripciones individuales por ciudad (25-30 palabras c/u)."""
        # Normalizar ciudades y fallback defensivo
        incoming = [c.strip() for c in (ciudades or []) if c and c.strip()]
        if not incoming:
            incoming = [c[0] for c in _FAV_CITY_DEFAULTS[:10]]

        # Limpiar prefijos de keyword que a veces vienen en la lista de ciudades
        _city_prefixes = re.compile(
            r"(?i)^(alquiler de autos en|renta de autos en|renta de carros en|"
            r"alquiler de carros en|rentar un auto en|reservar un auto en)\s*"
        )

        # Evitar duplicados manteniendo orden
        normalized = []
        seen = set()
        for c in incoming:
            c = _city_prefixes.sub("", c).strip()
            c = self.sanitize_city_name(c)
            if not c:
                continue
            ck = c.lower()
            if ck in seen:
                continue
            seen.add(ck)
            normalized.append(c)

        _city_highlights = {
            "miami": "playas y arte urbano",
            "orlando": "parques y compras",
            "las vegas": "el Strip y el desierto",
            "nueva york": "barrios y recorridos urbanos",
            "los angeles": "playas y carreteras panorámicas",
            "houston": "museos y zonas comerciales",
            "chicago": "arquitectura y parques",
            "fort lauderdale": "canales y playa",
            "san diego": "costa y miradores",
            "dallas": "negocios y entretenimiento",
            "phoenix": "rutas desérticas y escapadas",
            "tampa": "bahía y playas cercanas",
            "san francisco": "miradores y puentes",
            "atlanta": "historia y vida urbana",
            "denver": "montañas y rutas panorámicas",
            "austin": "música y gastronomía",
            "cbx": "cruces ágiles y carretera",
        }

        out = {}
        used_descs: List[str] = []
        used_openings: List[str] = []

        for i, city in enumerate(normalized, start=1):
            highlight = _city_highlights.get(city.lower(), "sus zonas más visitadas y rutas recomendadas")
            desc_v = self._generate_single_fav_city_desc(nuevo_tema, city, highlight, used_descs, used_openings)
            out[f"desc_{i}"] = desc_v
            if desc_v:
                sig = self._fav_city_desc_signature(desc_v)
                op = self._fav_city_desc_opening(desc_v)
                if sig:
                    used_descs.append(sig)
                if op:
                    used_openings.append(op)

        return "\n".join(f"|{k}: {v}|" for k, v in out.items())

    def generate_rentacar(self, tit_seo: str, nuevo_tema: str) -> str:
        """Rentacar — mini-blogs: H2 intro + 2 H3 (actividades y agencias/autos)."""
        vehicle_kw = self._extract_vehicle_keyword(tit_seo)
        location = self._extract_location_from_title(nuevo_tema)
        tit_default = self._apply_vehicle_kw(f"Qué hacer en {location} con un auto rentado", vehicle_kw)

        # ── Llamada 1: tit + desc (introducción H2, 70-90p) ──
        p1 = (
            f"Nuevo tema: {nuevo_tema}, contexto LP: {tit_seo}\n"
            "Eres un redactor de guías de viaje dinámico y cercano.\n"
            "REGLAS:\n"
            "- tit: H2 atractivo para sección de actividades en el destino con auto rentado. "
            "Ejemplo: '¡Descubre Miami con un auto rentado!' / "
            "'Todo lo que puedes hacer en Colombia con un carro alquilado'.\n"
            "- desc: 70 a 90 palabras. Introducción sobre el destino y por qué vale la pena "
            "recorrerlo en auto rentado. Menciona brevemente tipos de autos disponibles "
            "(económicos, SUV, camionetas) y agencias reconocidas (Avis, Budget, Hertz, Enterprise). "
            "Tono dinámico y entusiasta.\n"
            "- Usa 'alquiler de autos' o 'renta de autos/carros' de forma orgánica en el tit o desc.\n"
            "Genera:\n"
            "<think>aquí tus pensamientos</think>\n"
            "|tit: H2 para la sección|\n"
            "|desc: redacción|\n"
            "IMPORTANTE: Solo usa | al inicio y final, NUNCA dentro del contenido."
        )
        raw1 = self._call(p1, temperature=TEMP_CREATIVE)
        fields = parse_fields(raw1)
        if not fields.get("tit"):
            fields["tit"] = tit_default
        else:
            fields["tit"] = self._apply_vehicle_kw(fields["tit"], vehicle_kw)
        if not fields.get("desc"):
            clean = re.sub(r"<think>.*?</think>", "", raw1, flags=re.DOTALL)
            clean = re.sub(r"\|[^|]+:", "", clean).replace("|", "").strip()
            if clean:
                fields["desc"] = clean

        # ── Llamada 2: tit_1 + desc_1 (mini-blog actividades, 220-250p) ──
        p2 = (
            f"Nuevo tema: {nuevo_tema}\n"
            "Eres un redactor de guías de viaje dinámico y cercano.\n"
            "Escribe un mini-blog sobre las mejores actividades, rutas y atracciones del destino "
            "con un auto rentado. Menciona qué tipos de autos son ideales para cada actividad "
            "(ej. SUV para rutas de montaña, económico para ciudad).\n"
            "REGLAS:\n"
            "- tit_1: H3 atractivo para el mini-blog de actividades. "
            "Ejemplo: 'Las mejores rutas para explorar Miami en auto' / "
            "'Planes imperdibles con tu carro rentado en Colombia'.\n"
            "- desc_1: 220 a 250 palabras. Mini-blog con atracciones, rutas recomendadas, "
            "consejos de recorrido y qué tipo de vehículo conviene para cada plan. "
            "Tono de guía de viaje entusiasta. Para listas usa ** arriba y abajo, - por ítem.\n"
            "- Usa 'alquiler de autos' o 'renta de autos/carros' de forma orgánica al menos una vez.\n"
            "Genera:\n"
            "<think>aquí tus pensamientos</think>\n"
            "|tit_1: H3 del mini-blog|\n"
            "|desc_1: redacción|\n"
            "IMPORTANTE: Solo usa | al inicio y final, NUNCA dentro del contenido."
        )
        raw2 = self._call(p2, temperature=TEMP_CREATIVE)
        fields2 = parse_fields(raw2)
        tit_1 = fields2.get("tit_1", "").strip()
        desc_1 = fields2.get("desc_1", "").strip()
        if not tit_1:
            tit_1 = f"Las mejores rutas para explorar {location} en auto"
        if not desc_1:
            clean = re.sub(r"<think>.*?</think>", "", raw2, flags=re.DOTALL)
            clean = re.sub(r"\|[^|]+:", "", clean).replace("|", "").strip()
            desc_1 = clean
        fields["tit_1"] = tit_1
        fields["desc_1"] = desc_1

        # ── Llamada 3: tit_2 + desc_2 (mini-blog agencias y autos, 220-250p) ──
        p3 = (
            f"Nuevo tema: {nuevo_tema}\n"
            "Eres un redactor de guías de viaje dinámico y cercano.\n"
            "Escribe un mini-blog sobre las agencias de renta de autos disponibles en el destino "
            "y las categorías de vehículos que ofrecen.\n"
            "REGLAS:\n"
            "- tit_2: H3 atractivo para el mini-blog de agencias. "
            "Ejemplo: '¿Qué agencia de autos elegir en Miami?' / "
            "'Las mejores agencias para rentar tu carro en Colombia'.\n"
            "- desc_2: 220 a 250 palabras. Mini-blog mencionando agencias reconocidas como "
            "Avis, Budget, Hertz, Enterprise, National, Alamo, Dollar, Thrifty. "
            "Describe las categorías de autos disponibles (económico, SUV, camioneta, "
            "convertible, lujo, eléctrico) y consejos para elegir. "
            "Tono de guía práctica. Para listas usa ** arriba y abajo, - por ítem.\n"
            "- Usa 'alquiler de autos' o 'renta de autos/carros' de forma orgánica al menos una vez.\n"
            "Genera:\n"
            "<think>aquí tus pensamientos</think>\n"
            "|tit_2: H3 del mini-blog|\n"
            "|desc_2: redacción|\n"
            "IMPORTANTE: Solo usa | al inicio y final, NUNCA dentro del contenido."
        )
        raw3 = self._call(p3, temperature=TEMP_CREATIVE)
        fields3 = parse_fields(raw3)
        tit_2 = self._apply_vehicle_kw(fields3.get("tit_2", "").strip(), vehicle_kw)
        desc_2 = fields3.get("desc_2", "").strip()
        if not tit_2:
            tit_2 = self._apply_vehicle_kw(f"Agencias de autos disponibles en {location}", vehicle_kw)
        if not desc_2:
            clean = re.sub(r"<think>.*?</think>", "", raw3, flags=re.DOTALL)
            clean = re.sub(r"\|[^|]+:", "", clean).replace("|", "").strip()
            desc_2 = clean
        fields["tit_2"] = tit_2
        fields["desc_2"] = desc_2

        return "\n".join(f"|{k}: {v}|" for k, v in fields.items() if v)

    def generate_advicestipocarrusel(self, titulo_limpio: str, nuevo_tema: str) -> str:
        """Consejos — H2 propio + desc introductoria."""
        vehicle_kw = self._extract_vehicle_keyword(titulo_limpio)
        vehicle_plural = self._VEHICLE_KW_MAP.get(vehicle_kw, (vehicle_kw + "s", vehicle_kw))[0] if vehicle_kw else ""
        kw_rule = f"- En el campo tit usa '{vehicle_plural}' en lugar de 'autos'/'carros'.\n" if vehicle_kw else ""
        prompt = (
            f"Nuevo tema: {nuevo_tema}, contexto LP: {titulo_limpio}\n"
            "Genera una introducción corta para una sección de consejos de viaje.\n"
            "REGLAS:\n"
            "- tit: H2 específico para sección de consejos. "
            "Ejemplos: 'Consejos para rentar un auto en Miami' / "
            "'Tips para alquilar un carro en Colombia'.\n"
            f"{kw_rule}"
            "- desc: 60 a 65 palabras. Usa 'alquiler de autos' o 'renta de autos/carros' de forma orgánica.\n"
            "Genera:\n"
            "<think>aquí tus pensamientos</think>\n"
            "|tit: H2 para sección de consejos|\n"
            "|desc: redacción|"
        )
        raw = self._call(prompt, temperature=TEMP_BALANCED)
        tit_default = self._apply_vehicle_kw(f"Consejos para rentar un auto — {nuevo_tema}", vehicle_kw)
        return self._fix_tit_vehicle_kw(self._parse_and_supervise(raw, tit_default=tit_default), vehicle_kw)

    def generate_faq_questions_from_title(self, titulo: str) -> List[str]:
        """
        Genera las preguntas FAQ estándar a partir del título del LP.
        Patrón fijo sin LLM — igual al enfoque del Cargue Masivo.
        """
        t = self._extract_location_from_title(titulo)
        return [
            f"¿Cuánto cuesta rentar un auto en {t}?",
            f"¿Qué se necesita para rentar un auto en {t}?",
            f"¿Cuál es la agencia de alquiler de autos con los precios más baratos en {t}?",
            f"¿Cuánto cuesta rentar un carro por una semana en {t}?",
            f"¿Cuál es la mejor zona para recoger un auto de alquiler en {t}?",
            f"¿Conviene reservar con anticipación el alquiler de autos en {t}?",
        ]

    def _extract_location_from_title(self, titulo: str) -> str:
        """Extrae ubicación legible desde títulos SEO ruidosos.

        Ejemplo: 'Landing Page - Dollar Orlando' -> 'Orlando'
        """
        if not titulo:
            return "el destino"

        t = re.sub(r"<[^>]+>", " ", titulo)
        t = re.sub(r"\s+", " ", t).strip()

        # 1) Intentar detectar ciudades conocidas primero (multi-word primero)
        known = sorted([c[0] for c in _FAV_CITY_DEFAULTS], key=len, reverse=True)
        for city in known:
            if re.search(rf"\b{re.escape(city)}\b", t, flags=re.IGNORECASE):
                return city

        # 2) Limpiar prefijos comunes
        cleaned = t
        cleaned = re.sub(r"(?i)^landing\s*page\s*[-:]*\s*", "", cleaned)
        cleaned = re.sub(r"(?i)alquiler\s+de\s+autos\s+en\s+", "", cleaned)
        cleaned = re.sub(r"(?i)renta\s+de\s+autos\s+en\s+", "", cleaned)
        cleaned = re.sub(r"(?i)agencias\s+de\s+renta\s+de\s+autos\s+en\s+", "", cleaned)
        cleaned = re.sub(r"\s+[-–|]\s+", " ", cleaned).strip()

        # 3) Última palabra(s) con inicial mayúscula
        tokens = [tok for tok in cleaned.split() if tok]
        if not tokens:
            return "el destino"

        # Si termina en dos palabras capitalizadas (ej: New York), conservar ambas
        if len(tokens) >= 2 and tokens[-1][:1].isupper() and tokens[-2][:1].isupper():
            return f"{tokens[-2]} {tokens[-1]}"
        return tokens[-1]

    def generate_fav_cities_from_title(self, titulo: str) -> List[str]:
        """
        Genera la lista de ciudades/destinos populares para el contexto del LP vía LLM.
        Se usa cuando el frontend no aporta ciudades (LP nuevo sin template content).
        """
        prompt = (
            f"Título de landing page: '{titulo}'\n"
            "Lista los 10 destinos o ciudades más visitados para rentar un auto "
            "en el contexto de este título.\n"
            "Responde SOLO con los nombres separados por comas, sin numeración "
            "ni explicaciones adicionales.\n"
            "Ejemplo: Miami, Orlando, Nueva York, Las Vegas, Los Ángeles, "
            "Chicago, Houston, San Francisco, Dallas, Atlanta"
        )
        raw = self._call(prompt, temperature=TEMP_PRECISE)
        raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()

        # Intento 1: separado por comas
        cities = [c.strip() for c in raw.split(",") if c.strip() and len(c.strip()) > 1]

        # Intento 2: lineas (cuando responde en lista)
        if len(cities) < 3:
            line_candidates = []
            for line in raw.splitlines():
                cleaned = re.sub(r"^[-*\d\.)\s]+", "", line).strip()
                if cleaned and len(cleaned) > 1:
                    line_candidates.append(cleaned)
            if len(line_candidates) >= len(cities):
                cities = line_candidates

        # Limpieza final de ruido comun
        cleaned_out = []
        for city in cities:
            c = re.sub(r"\s+", " ", city).strip(" .;:-")
            if c and len(c) > 1 and c.lower() not in {"ciudades", "destinos"}:
                cleaned_out.append(c)

        if not cleaned_out:
            cleaned_out = [c[0] for c in _FAV_CITY_DEFAULTS]

        return cleaned_out[:17]

    def generate_advice_type(self, advice_types: List[str], nuevo_tema: str) -> str:
        """Consejos — descripciones individuales por tipo de consejo."""
        consejos_texto = "\n".join(
            [f"Consejo {i+1}: {c}" for i, c in enumerate(advice_types)]
        )
        prompt = (
            f"Tema: {nuevo_tema}\n"
            f"Genera una descripción (30 a 80 palabras) para cada consejo de viaje.\n"
            "Al menos una descripción del conjunto debe usar 'alquiler de autos' o 'renta de autos/carros' de forma orgánica.\n\n"
            f"{consejos_texto}\n\n"
            "Formato: |desc_1: texto| |desc_2: texto| etc."
        )
        raw = self._call(prompt, temperature=TEMP_BALANCED)
        return self._parse_and_supervise(raw)

    def generate_bloquehistoria(self, tit_seo: str, nuevo_tema: str) -> str:
        """Bloque historia (MCR agencia) — H2 + descripción breve."""
        vehicle_kw = self._extract_vehicle_keyword(tit_seo)
        location = self._extract_location_from_title(nuevo_tema)
        tit_default = f"Tu historia de viaje comienza en {location}"
        if self.brand == "mcr":
            tone = "serio y confiable"
            desc_default = (
                f"En {location}, comparar opciones de renta de autos te permite planear cada trayecto con mayor claridad. "
                "Elige la alternativa que mejor se ajusta a tu ruta y avanza con un itinerario eficiente, "
                "cómodo y alineado con tus tiempos de viaje."
            )
        else:
            tone = "cercano y dinámico"
            desc_default = (
                f"Recorrer {location} con movilidad propia te da libertad para improvisar y aprovechar cada plan. "
                "Compara opciones, organiza tus tiempos y arma una experiencia de viaje más flexible "
                "desde el primer día."
            )

        vehicle_plural = self._VEHICLE_KW_MAP.get(vehicle_kw, (vehicle_kw + "s", vehicle_kw))[0] if vehicle_kw else ""
        kw_rule = f"- En el campo tit usa '{vehicle_plural}' en lugar de 'autos'/'carros'.\n" if vehicle_kw else ""
        prompt = (
            f"Tema: {nuevo_tema}, contexto LP: {tit_seo}\n"
            "Genera contenido para un bloque narrativo corto de landing page.\n"
            "REGLAS:\n"
            "- tit: H2 breve y natural. OBLIGATORIO incluir 'alquiler' o 'renta' de forma orgánica. "
            "Ejemplos válidos: 'Renta un auto y descubre [destino] a tu ritmo' / "
            "'Alquila un auto en [destino] y vive la experiencia' / "
            "'Tu viaje en [destino] comienza con el alquiler correcto'.\n"
            f"{kw_rule}"
            f"- desc: 55 a 60 palabras, tono {tone}.\n"
            "- No uses listas ni markdown.\n"
            "Salida obligatoria:\n"
            "|tit: ...|\n"
            "|desc: ...|"
        )
        raw = self._call(prompt, temperature=TEMP_BALANCED)
        result = self._fix_tit_vehicle_kw(self._parse_and_supervise(raw, tit_default=tit_default), vehicle_kw)
        fields = parse_fields(result)
        if not fields.get("desc"):
            fields["desc"] = desc_default
        return "\n".join(f"|{k}: {v}|" for k, v in fields.items())
 

# Alias for compatibility
ViajemosGenerator = ContentGenerator
