/**
 * colorUtils.js — Aplica colores inline (HTML spans) al contenido de celdas
 * siguiendo las mismas reglas de marca que rich_text_formatter.py del cargue masivo.
 *
 * MCR (Miles Car Rental):
 *   Rojo   #e6484b Bold : "Miles Car Rental", porcentajes de descuento
 *   Verde  #00eba7 Bold : "Seguro de Viaje Gratis", precios "USD $X"
 *   Morado #9900ff Sin Bold: contenido IP que difiere del LATAM base
 *
 * VJM (Viajemos):
 *   Azul   #0583ff Bold : "Viajemos", precios, porcentajes
 *   Verde  #00eba7 Bold : "Seguro de Viaje Gratis"
 *   Morado #8154ef Bold : contenido IP que difiere del LATAM base
 */

// ── Colores por marca ────────────────────────────────────────────────────────
const MCR_RED    = '#e6484b';
const MCR_GREEN  = '#00eba7';
const MCR_PURPLE = '#9900ff';

const VJM_BLUE   = '#0583ff';
const VJM_GREEN  = '#00eba7';
const VJM_PURPLE = '#8154ef';

// ── Beneficios exactos (sincronizados con content_generator.py) ──────────────
const BENEFICIOS_LATAM = 'Seguro de Viaje Gratis para extranjeros, Kilómetros Ilimitados, Asistencia Básica en Carretera, Modificaciones Flexibles';
const BENEFICIOS_USA   = 'Kilómetros Ilimitados, Conductor Adicional sin Costo extra, Asistencia Básica en Carretera, Modificaciones Flexibles';
const BENEFICIOS_BRA   = 'Seguro de Viaje Gratis para extranjeros, Kilómetros Ilimitados, Asistencia Básica en Carretera, Modificaciones Flexibles, Beneficio en Cobertura del IOF';

// Beneficios alternativos que puede generar el LLM para MCR IP_USA
const BENEFICIOS_USA_MCR = 'Kilómetros Ilimitados, Asistencia Básica en Carretera, Modificaciones sin cargos administrativos';
// Beneficios VJM IP_USA (cargue masivo): incluye Conductor Adicional sin Costo extra
const BENEFICIOS_USA_VJM = 'Kilómetros Ilimitados, Conductor Adicional sin Costo extra, Asistencia Básica en Carretera, Modificaciones sin cargos administrativos';

// ── Patrones de colorización ─────────────────────────────────────────────────

const MCR_PATTERNS = [
  { pattern: /Miles Car Rental/g,                                            color: MCR_RED,   bold: true },
  { pattern: /\d+\s*%\s*(?:OFF|de\s+descuento)/gi,                          color: MCR_RED,   bold: true },
  { pattern: /descuentos?\s+(?:hasta\s+)?(?:del?\s+)?\d+\s*%/gi,            color: MCR_RED,   bold: true },
  { pattern: /Seguro de Viaje (?:Gratis|GRATIS)(?:\s+(?:para\s+extranjeros|v[aá]lido\s+para\s+extranjeros))?/gi, color: MCR_GREEN, bold: true },
  { pattern: /Cobertura de Viaje Gratis/gi,                                  color: MCR_GREEN, bold: true },
  { pattern: /USD\s*\$\s*\d+(?:\s*(?:al|por)\s+d[ií]a)?/gi,                 color: MCR_GREEN, bold: true },
  { pattern: /desde\s+(?:los\s+)?USD\s*\$\s*\d+/gi,                         color: MCR_GREEN, bold: true },
];

const VJM_PATTERNS = [
  { pattern: /Viajemos/g,                                                    color: VJM_BLUE,  bold: true },
  { pattern: /\d+\s*%\s*(?:OFF|de\s+descuento)/gi,                          color: VJM_BLUE,  bold: true },
  { pattern: /descuentos?\s+(?:hasta\s+)?(?:del?\s+)?\d+\s*%/gi,            color: VJM_BLUE,  bold: true },
  { pattern: /Seguro de Viaje (?:Gratis|GRATIS)(?:\s+(?:para\s+extranjeros|v[aá]lido\s+para\s+extranjeros))?/gi, color: VJM_GREEN, bold: true },
  { pattern: /Cobertura de Viaje Gratis/gi,                                  color: VJM_GREEN, bold: true },
  { pattern: /USD\s*\$\s*\d+(?:\s*(?:al|por)\s+d[ií]a)?/gi,                 color: VJM_BLUE,  bold: true },
  { pattern: /desde\s+(?:los\s+)?USD\s*\$\s*\d+/gi,                         color: VJM_BLUE,  bold: true },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Envuelve una coincidencia en un span con color inline.
 * Escapa el texto para prevenir inyección de HTML.
 */
function spanWrap(match, color, bold) {
  const escaped = match.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const style = `color:${color};font-weight:${bold ? 'bold' : 'normal'}`;
  return `<span style="${style}">${escaped}</span>`;
}

function spanWrapUnderline(match, color, bold) {
  const escaped = match.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const style = `color:${color};font-weight:${bold ? 'bold' : 'normal'};text-decoration:underline`;
  return `<span style="${style}">${escaped}</span>`;
}

/**
 * Aplica una lista de patrones a un texto que puede ya contener spans HTML.
 * Trabaja sobre los nodos de texto (fuera de etiquetas HTML) para no romper spans existentes.
 */
function applyPatterns(text, patterns) {
  if (!text) return text;

  // Split en fragmentos: etiquetas HTML vs texto plano
  const parts = text.split(/(<[^>]+>)/);
  return parts.map((part) => {
    if (part.startsWith('<')) return part; // etiqueta HTML — no tocar
    let result = part;
    for (const { pattern, color, bold } of patterns) {
      result = result.replace(pattern, (match) => spanWrap(match, color, bold));
    }
    return result;
  }).join('');
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Coloriza texto de cualquier campo según la marca.
 * Aplica los patrones de marca (nombres, precios, descuentos, seguro).
 *
 * @param {string} text   - Texto plano de entrada
 * @param {string} brand  - "mcr" | "vjm" | "viajemos"
 * @returns {string} HTML con spans coloreados inline
 */
export function colorizeText(text, brand) {
  if (!text) return text || '';
  const patterns = (brand === 'mcr') ? MCR_PATTERNS : VJM_PATTERNS;
  return applyPatterns(text, patterns);
}

/**
 * Coloriza un campo IP (ip_usa / ip_bra) usando la lógica del cargue masivo:
 * 1. Detecta la frase de beneficios específica del IP y la coloriza en morado
 * 2. Luego aplica los patrones normales de marca sobre el resto
 *
 * @param {string} ipText   - Texto del campo IP (ip_usa o ip_bra)
 * @param {string} baseText - Texto base LATAM (desc) para comparar diferencias
 * @param {string} brand    - "mcr" | "vjm" | "viajemos"
 * @returns {string} HTML con spans coloreados inline
 */
export function colorizeFleetIp(ipText, baseText, brand) {
  if (!ipText) return '';
  const purpleColor = (brand === 'mcr') ? MCR_PURPLE : VJM_PURPLE;
  const purpleBold  = (brand !== 'mcr'); // MCR: sin bold en morado, VJM: con bold

  let result = ipText;

  if (brand === 'mcr') {
    // MCR: colorizar el bloque completo de beneficios IP en morado
    if (result.includes(BENEFICIOS_USA)) {
      result = result.replace(BENEFICIOS_USA, (m) => spanWrap(m, purpleColor, purpleBold));
    } else if (result.includes(BENEFICIOS_USA_VJM)) {
      result = result.replace(BENEFICIOS_USA_VJM, (m) => spanWrap(m, purpleColor, purpleBold));
    } else if (result.includes(BENEFICIOS_USA_MCR)) {
      result = result.replace(BENEFICIOS_USA_MCR, (m) => spanWrap(m, purpleColor, purpleBold));
    }
  } else {
    // VJM: colorizar solo los beneficios exclusivos de Viajemos
    // "Conductor Adicional sin Costo extra" → morado (exclusivo vs MCR IP USA y LATAM)
    result = result.replace(
      /Conductor Adicional sin Costo extra/gi,
      (m) => spanWrap(m, VJM_PURPLE, true),
    );
    // "Promociones Exclusivas hasta el X%" → azul con subrayado (exclusivo de Viajemos)
    result = result.replace(
      /Promociones?\s+Exclusivas?\s+hasta\s+el\s+\d+%/gi,
      (m) => spanWrapUnderline(m, VJM_BLUE, true),
    );
  }

  // Colorizar el extra del BRA: "Beneficio en Cobertura del IOF"
  if (result.includes('Beneficio en Cobertura del IOF')) {
    result = result.replace(
      /Beneficio en Cobertura del IOF/g,
      (m) => spanWrap(m, purpleColor, purpleBold),
    );
  }

  // Ahora aplicar los patrones normales de marca (sobre texto ya con spans)
  return applyPatterns(result, (brand === 'mcr') ? MCR_PATTERNS : VJM_PATTERNS);
}

/**
 * Detecta si un texto ya fue coloreado (contiene spans inline de color).
 */
export function isColorized(text) {
  return typeof text === 'string' && /<span\s+style="color:/i.test(text);
}

/**
 * Coloriza un valor de campo según su nombre de campo y la marca.
 * Delega a colorizeFleetIp para ip_usa/ip_bra, y colorizeText para el resto.
 *
 * @param {string} fieldName  - Nombre del campo: "desc", "ip_usa", "ip_bra", "tit", etc.
 * @param {string} value      - Valor del campo
 * @param {string} brand      - "mcr" | "vjm" | "viajemos"
 * @param {string} [baseDesc] - Texto base LATAM (solo necesario para ip_usa/ip_bra)
 * @returns {string} HTML coloreado
 */
export function colorizeField(fieldName, value, brand, baseDesc = '') {
  if (!value) return value || '';

  // Títulos cortos — no colorizar (demasiado cortos para que el patrón aplique bien)
  if (fieldName === 'tit' || fieldName === 'titulo') {
    return value;
  }

  if (fieldName === 'ip_usa' || fieldName === 'ip_bra') {
    return colorizeFleetIp(value, baseDesc, brand);
  }

  return colorizeText(value, brand);
}
