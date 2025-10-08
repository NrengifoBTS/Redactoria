import re
import json
import requests
import spacy
from bs4 import BeautifulSoup, Tag
from collections import Counter
from typing import Generator, List, Dict, Any
from datetime import datetime
from . import models 

# --- Configuración de Control de Datos (Mantenida) ---

MODEL_URL = "http://192.168.1.11:1234/v1/chat/completions"
MODEL_NAME = "openai/gpt-oss-20b"
DEFAULT_SYSTEM_MESSAGE = "Eres un analista SEO profesional y experimentado. Tu única tarea es generar el contenido solicitado de manera concisa y directa, sin añadir explicaciones ni texto adicional."


# --- Funciones Auxiliares de IA (Mantenidas) ---

def _llm_generate(prompt: str, system_message: str = DEFAULT_SYSTEM_MESSAGE) -> str:
    data = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.4,
        "stream": False
    }
    try:
        response = requests.post(MODEL_URL, headers={"Content-Type": "application/json"}, json=data)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"[Error: {e}]"

def generate_ai_chunk_summary(chunk: str, media_info: List[Dict[str, str]], query: str, heading: str) -> str:
    media_text = ""
    if media_info:
        media_descriptions = [f"- {m['type']} (Descripción: {m.get('description') or m.get('alt') or m.get('caption')})" for m in media_info]
        media_text = "\n\nElementos Multimedia Asociados:\n" + "\n".join(media_descriptions)

    prompt = f"Basándote en el BLOQUE DE TEXTO bajo el título '{heading}' relacionado con el tema '{query}':\n---\n{chunk}\n{media_text}\n---\n\n"
    prompt += f"Identifica los puntos clave y el propósito de esta sección. Menciona la relevancia de los elementos multimedia (si existen) en el resumen. Devuelve un resumen conciso y directo de 3 a 5 oraciones."
    
    system_msg = "Eres un analista de texto. Devuelve **solo** el resumen conciso."
    return _llm_generate(prompt, system_msg)

def generate_ai_titles(query: str, keywords: List[str], context: str) -> List[str]:
    prompt = f"Basándote en el siguiente CONTEXTO de la web scrapeada:\n---\n{context}\n---\n\n"
    prompt += f"Genera 3 títulos SEO persuasivos para el tema: '{query}' usando estas keywords: {', '.join(keywords)}. Asegúrate de que los títulos reflejen el contenido del contexto."
    system_msg = "Eres un experto en SEO. Devuelve **solo** los 3 títulos en formato de lista (uno por línea), sin numeración ni guiones."
    response_text = _llm_generate(prompt, system_msg)
    return [t.strip() for t in response_text.split('\n') if t.strip() and "error" not in t.lower()]

def generate_ai_subtitles(query: str, keywords: List[str], context: str) -> List[str]:
    prompt = f"Basándote en el siguiente CONTEXTO de la web scrapeada:\n---\n{context}\n---\n\n"
    prompt += f"Genera una lista de subtítulos H2/H3 para un artículo sobre: '{query}' que organicen el contenido presente en el contexto. Usa estas keywords: {', '.join(keywords)}."
    system_msg = "Eres un experto en estructuración de contenido. Devuelve **solo** los subtítulos en formato de lista (uno por línea), sin numeración ni guiones."
    response_text = _llm_generate(prompt, system_msg)
    # Corrección de error de variable 't' no definida en la lógica de subtítulos
    return [s.strip() for s in response_text.split('\n') if s.strip() and "error" not in s.lower()]

def generate_ai_intent(query: str, keywords: List[str], context: str) -> str:
    prompt = f"Analizando la query: '{query}', las keywords: {', '.join(keywords)}, y el CONTEXTO proporcionado (que es el contenido actual de la página) Define la intención de búsqueda (Informativa, Transaccional, Navegacional, Comercial). Justifica brevemente."
    system_msg = "Eres un estratega de contenido. Devuelve **solo** la intención de búsqueda definida y su justificación en un solo párrafo."
    return _llm_generate(prompt, system_msg)

def generate_ai_introduction(query: str, keywords: List[str], context: str) -> str:
    prompt = f"Basándote en el siguiente CONTEXTO de la web scrapeada:\n---\n{context}\n---\n\n"
    prompt += f"Genera un texto introductorio engaging (máximo 4 oraciones) para un artículo sobre: '{query}' usando estas keywords: {', '.join(keywords)}. El texto debe resumir o introducir el contenido del contexto."
    system_msg = "Eres un copywriter. Devuelve **solo** el texto introductorio."
    return _llm_generate(prompt, system_msg)

def generate_ai_conclusion(query: str, keywords: List[str], context: str) -> str:
    prompt = f"Basándote en el siguiente CONTEXTO de la web scrapeada:\n---\n{context}\n---\n\n"
    prompt += f"Genera una conclusión final y un call-to-action (máximo 4 oraciones) para un artículo sobre: '{query}' usando estas keywords: {', '.join(keywords)}. La conclusión debe cerrar el tema tratado en el contexto."
    system_msg = "Eres un experto en conversión. Devuelve **solo** la conclusión final."
    return _llm_generate(prompt, system_msg)

def generate_final_intent_and_keywords(consolidated_text: str, query: str) -> Dict[str, Any]:
    prompt = f"Analiza el siguiente CONTEXTO CONSOLIDADO (de 3 páginas web):\n---\n{consolidated_text}\n---\n\n"
    prompt += f"Basándote en el contenido consolidado para la query '{query}':\n"
    prompt += "1. Define la **Intención de Búsqueda Única** (Informativa, Transaccional, etc.) y justifícala brevemente.\n"
    prompt += "2. Identifica y sugiere una lista de **10 Keywords Principales** que deben usarse en el blog, basadas en la redundancia y relevancia de los 3 textos.\n"
    
    system_msg = "Eres un estratega SEO. Devuelve tu respuesta en el siguiente formato JSON estricto: `{'final_intent': 'Intención definida con justificación', 'final_keywords': ['kw1', 'kw2', ...]}`. No incluyas explicaciones adicionales ni código."
    
    response_text = _llm_generate(prompt, system_msg)
    
    try:
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_text)
    except json.JSONDecodeError as e:
        print(f"Error parseando JSON de intención/keywords final: {e}")
        return {'final_intent': f'[Error de IA: {e}]', 'final_keywords': []}

def generate_final_blog_structure(consolidated_text: str, query: str, keywords: List[str]) -> str:
    keywords_str = ', '.join(keywords)
    
    prompt = f"Basándote en el CONTEXTO CONSOLIDADO (de 3 páginas) y las keywords:\n---\nCONTEXTO: {consolidated_text}\n---\nKEYWORDS PRINCIPALES: {keywords_str}\n\n"
    prompt += f"Genera la **Estructura de Blog FINAL y ÚNICA** para el tema '{query}'. Tu respuesta debe incluir:\n"
    prompt += "1. **3 Opciones de Título** (SEO optimizado).\n"
    prompt += "2. **Introducción** (Máximo 4 oraciones).\n"
    
    prompt += "3. **Estructura Detallada (H2/H3)** que aborde todos los puntos clave redundantes encontrados en el contexto.\n"
    prompt += "4. **Conclusión y CTA** (Máximo 4 oraciones).\n"
    
    system_msg = "Eres un planificador de contenido de alto nivel. Formatea tu respuesta con títulos en negrita y estructura clara, apta para ser presentada directamente al usuario final como la sugerencia final del blog."
    
    return _llm_generate(prompt, system_msg)

# --- Funciones Auxiliares de Scraping Necesarias (Mantenidas) ---

EXCLUDED_HEADINGS = [
    'contenido relacionado', 'principales noticias', 'no te lo pierdas', 
    'lecturas más populares', 'más información', 'comentarios', 
    'temas relacionados', 'navegación', 'créditos', 'síguenos', 
    'te puede interesar', 'leer más', 'share', 'siguiente', 'anterior', 
    'ver también', 'suscríbete', 'regístrate', 'cierra sesión', 'publicidad', 
    'productos recomendados', 'Contenido relacionado', 'Temas relacionados',
    'Lecturas más populares', 'patrocinado' 
]
NOISE_PATTERNS = re.compile(
    r'Fuente\s+de\s+la\s+imagen[,\s]+(Getty\s+Images|Alamy)\s*|'
    r'Información\s+del\s+artículo\s+Autor[,\s]+Redacción\s+Título\s+del\s+autor[,\s]+BBC\s+Travel\s+[\d\s\w]+\s*|'
    r'Getty\s+Images\.?\s*|'
    r'Agencia\s+EFE\s*|'
    r'\s*Lo\s+mejor\s*:\s*',
    re.I | re.M
)


def is_relevant_src(src: str | None) -> bool:
    """Funcion anti ruido para la extraccion de elementos multmedia, evita paginas de publicidad o elementos de seguimiento"""
    if not src or len(src) < 10 or src.startswith('data:image') or src.startswith('#'):
        return False
    
    if any(s in src.lower() for s in ['adserve', 'sponsors', 'tracker', 'g-recaptcha', 'pixel', 'comments-area']):
        return False
    return True

def clean_text(text: str) -> str:
    """ELIMINA O RECORTA LOS  ESPACIOS SOBREANTES EN EL HTML EXTRAIDO"""
    if not text: return ""
    return NOISE_PATTERNS.sub(' ', text).strip()
 
def _get_media_info(tag: Tag) -> Dict[str, str] | None:
    """Extrae la información multimedia, manejando lazy loading y etiquetas contenedoras."""
    PRIMARY_MEDIA_TAGS = ['img', 'picture', 'iframe', 'video', 'figure', 'source'] 
    IS_PRIMARY_MEDIA_TAG = tag.name in PRIMARY_MEDIA_TAGS
    
    if not IS_PRIMARY_MEDIA_TAG and not tag.has_attr('class'):
        return None

    src = tag.get('src')
    
    # 1. Búsqueda exhaustiva de 'src' en atributos de lazy loading
    if not src and tag.name in ['img', 'picture', 'video', 'iframe', 'source']:
        LAZY_ATTRIBUTES = ['data-src', 'data-original', 'data-url', 'data-lazy-src', 'data-image-src', 
                           'srcset', 'data-srcset', 'data-iframe-src', 'data-lazyload', 'data-large-file']
        
        for attr in LAZY_ATTRIBUTES:
            if tag.get(attr):
                src_value = tag.get(attr)
                
                if attr in ['srcset', 'data-srcset'] and src_value:
                    try:
                        last_pair = src_value.split(',')[-1].strip()
                        src = last_pair.split(' ')[0]
                    except:
                        src = None
                else: 
                    src = src_value
                
                if src: break

    # 2. Manejo de etiquetas contenedoras (<picture>, <figure>)
    if not src and tag.name in ['figure', 'picture']:
        img_tag = tag.find('img') or tag.find('source')
        if img_tag:
            return _get_media_info(img_tag)

    # 3. Procesamiento final si se encontró una fuente relevante
    if src and is_relevant_src(src):
        media_type = 'Imagen'
        alt_text = tag.get('alt', '')
        
        if tag.name in ['iframe']: media_type = 'Video/Mapa'
        if tag.name in ['video']: media_type = 'Video'
        
        caption_text = ''
        search_scope = tag if tag.name == 'figure' else tag.find_parent('figure')
        
        if search_scope:
             caption_tag = search_scope.find(
                 ['figcaption', 'span', 'p'], 
                 class_=re.compile(r'caption|pie-de-foto|fig-caption|description|credit', re.I)
             ) 
             caption_text = caption_tag.get_text(strip=True) if caption_tag else ''

        source_text = caption_text if caption_text else alt_text if alt_text else f"Multimedia de tipo {media_type}"

        return {
            'type': media_type, 
            'url': src, 
            'description': source_text,
            'alt': alt_text, 
            'caption': caption_text
        } 

    return None

def get_article_main_heading(soup: BeautifulSoup) -> str:
    """Busca el título principal del artículo, priorizando H1 y etiquetas de título comunes."""
    h1_tag = soup.find('h1', class_=lambda c: c is None or 'logo' not in c.lower() and 'brand' not in c.lower() and 'site-title' not in c.lower())
    if h1_tag and h1_tag.get_text(strip=True) and len(h1_tag.get_text(strip=True)) > 10:
        return h1_tag.get_text(strip=True)
    
    title_classes = re.compile(r'main-title|article-title|entry-title|post-title|headline-text', re.I)
    main_div = soup.find(['div', 'span'], class_=title_classes)
    if main_div and main_div.get_text(strip=True) and len(main_div.get_text(strip=True)) > 10:
        return main_div.get_text(strip=True)
        
    title_tag = soup.find("title")
    return title_tag.get_text(strip=True) if title_tag else "Contenido Principal del Artículo"


# --- Lógica de Scraping Robusta  ---
def group_content_by_headings_robust(soup: BeautifulSoup) -> List[Dict[str, Any]]: 
    
    #-- INICIALIZACION DONDE ALMACENA BLOQUES DE CONTENIDO TEXTO, CONTENIDO MULTIMEDIA Y GUARDA EL CONTENEDOR HTML
    blocks = []
    current_heading = None 
    current_content: List[str] = []
    current_media: List[Dict[str, str]] = [] 
    content_area = None
    
    #--Función auxiliar que finaliza el bloque actual y lo añade a 'blocks'.
    def save_current_block():
        heading_to_save = current_heading if current_heading is not None else "Introducción/Pre-H2"
        if current_content or current_media:
        
            # Convierte cada elemento a string y filtra los None antes de hacer 'join'.
            safe_content = [str(c) for c in current_content if c is not None]
            
            # Usa la lista saneada (safe_content)
            cleaned_content = clean_text(" ".join(safe_content))
            
            # Elimina URLs multimedia duplicadas
            deduplicated_media = {item.get('url'): item for item in current_media if item.get('url')} 
            if cleaned_content or deduplicated_media:
                blocks.append({
                    "heading": heading_to_save,
                    "content": cleaned_content,
                    "media_elements": list(deduplicated_media.values())
                })

    
    # --- FASE 1: AISLAMIENTO RÁPIDO Y DIRECTO ---
    
    # 1. Contenedores de Raíz Específicos
    article_container_selectors = ['#content', '#primary', '#main-content', '.post-wrapper', '.site-main']
    for selector in article_container_selectors:
        area = soup.select_one(selector)
        if area and len(area.get_text(strip=True)) > 300 and len(area.find_all('p', limit=6)) >= 4:
            content_area = area
            break
    
    # 2. Refuerzo WP/Común (entry-content, main, article)
    if not content_area:
        content_area = soup.find(class_='entry-content') 
    if not content_area:
        content_area = soup.find('main', class_=lambda c: c and 'content' in c.split())
    if not content_area:
        content_area = soup.find('article', class_=lambda c: c and 'post-' in c)
    
    # 3. FALLBACK SIMPLE (EL SCRAPING SENCILLO): Usar el BODY completo.
    # Evita Pasos 2 y 3 complejos.
    if not content_area:
        content_area = soup.find('body') or soup
        
    # --- FASE 2: AGRUPACIÓN POR ENCABEZADOS (El "scrapping sencillo") ---
    
    article_title = get_article_main_heading(soup)
        
    elements_to_find = ['h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'blockquote', 'div', 'section', 'img', 'figure', 'iframe', 'video', 'picture', 'span']
    elements = content_area.find_all(elements_to_find, recursive=True)
    
    HEADING_CLASSES = re.compile(r'title|subtitle|headline|subhead|h-?[234]|h[234]-?style', re.I)
    LOW_CONFIDENCE_CLASSES = re.compile(r'caption|credit|footer|ad|widget|photo|image|media-title|social-share|figure-title|byline|author|metadata', re.I)
    
    for tag in elements:
        tag_name = tag.name.lower()
        text_content = tag.get_text(strip=True, separator=' ')
        
        if tag.get('aria-hidden') == 'true' or tag.get('role') == 'presentation' or (not text_content and tag_name not in ['img', 'figure', 'picture', 'iframe']):
            continue

        is_heading_divisor = False
        
        # 1. Identificación del Divisor
        if tag_name in ['img', 'figure', 'picture', 'iframe', 'video']:
            is_heading_divisor = False
            
        elif tag_name in ['h1', 'h2']:
            is_heading_divisor = True
            
        elif tag_name in ['h3', 'h4']:
            if len(" ".join(current_content)) > 2000 or current_heading is None:
                is_heading_divisor = True
        
        elif tag_name in ['div', 'span', 'section']:
            if tag.get('role') == 'heading' and tag.get('aria-level') in ['1', '2', '3', '4']:
                is_heading_divisor = True
            elif tag.has_attr('class'):
                class_str = " ".join(tag.get('class', []))
                class_match = HEADING_CLASSES.search(class_str)
                
                if class_match and len(text_content) > 10:
                    low_conf_match = LOW_CONFIDENCE_CLASSES.search(class_str)
                    
                    if not low_conf_match:
                        has_media_child = tag.find(['img', 'figure', 'video', 'iframe'])
                        
                        if not has_media_child or len(tag.contents) > 2:
                            is_heading_divisor = True
        
        # 2. Manejo de Encabezado (Separación)
        if is_heading_divisor:
            if len(text_content) < 5 or any(exc in text_content.lower() for exc in ['pie de foto', 'foto:', 'imagen de', 'ver galeria', 'crédito']):
                continue

            if current_heading is None or text_content.strip() != current_heading.strip():
                save_current_block()
                current_heading = text_content
                current_content = []
                current_media = []
            
        # 3. Manejo de Contenido Multimedia
        media_info = _get_media_info(tag) 
        if media_info:
            current_media.append(media_info) 
            
        # 4. Manejo de Contenido Textual
        is_content_tag = tag_name in ['p', 'ul', 'ol', 'blockquote']
        if tag_name == 'span' and not is_heading_divisor and len(text_content) > 100:
            is_content_tag = True
        
        if is_content_tag and text_content and len(text_content) > 10: 
            if not is_heading_divisor:
                current_content.append(text_content)
                
    save_current_block()
    
    if blocks and blocks[0]['heading'] == "Introducción/Pre-H2":
        blocks[0]['heading'] = article_title 
    
    # --- FASE 3: FILTRADO FINAL ---
    final_blocks = []
    MIN_TEXT_LENGTH_CHARS = 50 
    
    for block in blocks:
        heading_lower = block['heading'].lower().strip()
        is_irrelevant_heading = any(exc in heading_lower for exc in EXCLUDED_HEADINGS)
        if is_irrelevant_heading: continue
            
        content_len = len(block['content'])
        has_media = bool(block['media_elements'])
        is_substantial = (content_len >= MIN_TEXT_LENGTH_CHARS) or (content_len > 0 and has_media) 
        
        if is_substantial:
            final_blocks.append(block)
            
    return final_blocks


# --- Lógica de Scraping Sencilla ---

def group_content_by_headings_simple(soup: BeautifulSoup) -> List[Dict[str, Any]]: 
    
    blocks = []
    current_heading = None 
    current_content: List[str] = []
    current_media: List[Dict[str, str]] = [] 
    
    content_area = None
    
    def save_current_block():
        heading_to_save = current_heading if current_heading is not None else "Introducción/Pre-H2"
        if current_content or current_media:
            
            # 🛑 CORRECCIÓN CRÍTICA: Sanea current_content. 
            # Convierte cada elemento a string y filtra los None antes de hacer 'join'.
            safe_content = [str(c) for c in current_content if c is not None]
            
            # Usa la lista saneada (safe_content)
            cleaned_content = clean_text(" ".join(safe_content))
            
            deduplicated_media = {item.get('url'): item for item in current_media if item.get('url')} 
            if cleaned_content or deduplicated_media:
                blocks.append({
                    "heading": heading_to_save,
                    "content": cleaned_content,
                    "media_elements": list(deduplicated_media.values())
                })
    
    
    # --- BÚSQUEDA DE ÁREA DE CONTENIDO (UNIVERSAL MEJORADA V.12 - Refinamiento) ---
    high_confidence_selectors = ['article', 'main', 'div[itemprop*="articleBody"]']
    # --- Comunes en wordpress --
    content_selectors = ['.entry-content', '.td-post-content', '.post-content', '.content-body', 'div[itemprop*="articleBody"]'] 


    for selector in high_confidence_selectors:
        area = soup.select_one(selector)
        if area:
            # **PASO DE REFINAMIENTO**
            # Si encontramos un contenedor de alta confianza, buscamos el contenedor de contenido real dentro.
            refined_area = area.select_one(', '.join(content_selectors))
            
            # Si encontramos el contenedor refinado (el que solo tiene el texto del post), lo usamos.
            if refined_area and len(refined_area.get_text(strip=True)) > 50: # Pequeño filtro para evitar divs vacíos
                content_area = refined_area
                break 
            
            # Si no se encuentra un contenedor refinado, pero el contenedor principal (article/main) tiene suficiente texto, lo usamos como Plan B para este paso.
            elif len(area.get_text(strip=True)) > 100: 
                content_area = area
                break

    if not content_area:
        potential_content_areas = soup.find_all(['div', 'section'], recursive=True)
        best_area = None
        max_density = 0
        
        for area in potential_content_areas:
            area_class_str = " ".join(area.get('class', []))
            if area.name == 'div' and area.get('id') in ['comments', 'sidebar', 'footer', 'header', 'nav', 'ad', 'sponsor']:
                continue
            if 'sidebar' in area_class_str or 'navigation' in area_class_str or 'menu' in area_class_str:
                continue
            
            p_count = len(area.find_all(['p', 'ul', 'ol', 'h3', 'h4'], limit=20))
            area_text_len = len(area.get_text(strip=True))
            
            # Penalización dinámica por alta densidad de enlaces 
            a_count = len(area.find_all('a', limit=10)) 
            link_density_penalty = 1.0
            if area_text_len < 400 and a_count > 5:
                 link_density_penalty = 0.1 

            current_density = (p_count * area_text_len) * link_density_penalty 

            if current_density > max_density and p_count >= 4 and area_text_len >= 200: 
                best_area = area
                max_density = current_density

        if best_area:
            content_area = best_area
        else:
            content_area = soup.find('body') or soup 
            
    if not content_area: content_area = soup.find('body') or soup
        
    # --- Extracción del Título Principal ---
    article_title = get_article_main_heading(soup)
        
    elements_to_find = ['h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'blockquote', 'div', 'section', 'img', 'figure', 'iframe', 'video', 'picture', 'span']
    elements = content_area.find_all(elements_to_find, recursive=True)
    
    HEADING_CLASSES = re.compile(r'title|subtitle|headline|subhead|h-?[234]|h[234]-?style', re.I)
    LOW_CONFIDENCE_CLASSES = re.compile(r'caption|credit|footer|ad|widget|photo|image|media-title|social-share|figure-title|byline|author|metadata', re.I)
    
    # --- BUCLE PRINCIPAL DE ITERACIÓN ---
    
    for tag in elements:
        tag_name = tag.name.lower()
        text_content = tag.get_text(strip=True, separator=' ')
        
        if tag.get('aria-hidden') == 'true' or tag.get('role') == 'presentation' or (not text_content and tag_name not in ['img', 'figure', 'picture', 'iframe']):
            continue

        is_heading_divisor = False
        
        # 1. Identificación del Divisor
        
        if tag_name in ['img', 'figure', 'picture', 'iframe', 'video']:
            is_heading_divisor = False
            
        elif tag_name in ['h1', 'h2']:
            is_heading_divisor = True
            
        elif tag_name in ['h3', 'h4']:
            if len(" ".join(current_content)) > 2000 or current_heading is None:
                 is_heading_divisor = True
        
        elif tag_name in ['div', 'span', 'section']:
            if tag.get('role') == 'heading' and tag.get('aria-level') in ['1', '2', '3', '4']:
                is_heading_divisor = True
            elif tag.has_attr('class'):
                class_str = " ".join(tag.get('class', []))
                class_match = HEADING_CLASSES.search(class_str)
                
                if class_match and len(text_content) > 10:
                    low_conf_match = LOW_CONFIDENCE_CLASSES.search(class_str)
                    
                    if not low_conf_match:
                        has_media_child = tag.find(['img', 'figure', 'video', 'iframe'])
                        
                        if not has_media_child or len(tag.contents) > 2:
                            is_heading_divisor = True
        
        # 2. Manejo de Encabezado (¡Fuerza la Separación!)
        if is_heading_divisor:
            if len(text_content) < 5 or any(exc in text_content.lower() for exc in ['pie de foto', 'foto:', 'imagen de', 'ver galeria', 'crédito']):
                 continue

            if current_heading is None or text_content.strip() != current_heading.strip():
                save_current_block()
                current_heading = text_content
                current_content = []
                current_media = []
            
        # 3. Manejo de Contenido Multimedia
        media_info = _get_media_info(tag) 
        if media_info:
            current_media.append(media_info) 
            
        # 4. Manejo de Contenido Textual (RESTRICTIVO)
        is_content_tag = tag_name in ['p', 'ul', 'ol', 'blockquote']
        if tag_name == 'span' and not is_heading_divisor and len(text_content) > 100:
             is_content_tag = True
        
        if is_content_tag and text_content and len(text_content) > 10: 
            if not is_heading_divisor:
                current_content.append(text_content)
                
    save_current_block()
    
    if blocks and blocks[0]['heading'] == "Introducción/Pre-H2":
        blocks[0]['heading'] = article_title 
    
    # --- FILTRADO FINAL DE BLOQUES ---
    final_blocks = []
    MIN_TEXT_LENGTH_CHARS = 50 
    
    for block in blocks:
        heading_lower = block['heading'].lower().strip()
        is_irrelevant_heading = any(exc in heading_lower for exc in EXCLUDED_HEADINGS)
        if is_irrelevant_heading: continue
            
        content_len = len(block['content'])
        has_media = bool(block['media_elements'])
        is_substantial = (content_len >= MIN_TEXT_LENGTH_CHARS) or (content_len > 0 and has_media) 
        
        if is_substantial:
            final_blocks.append(block)
            
    return final_blocks

class WebScraperAnalyzer:
    """
    Clase encargada de la extracción de contenido y análisis por página,
    implementando la lógica de fallback de scraping.
    """
    def __init__(self):
        # Inicialización y configuración
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"})
        try:
            # Asume que spacy se carga si es necesario para NLP/Keywords
            self.nlp = spacy.load("es_core_news_sm")
        except Exception:
            self.nlp = None

    def fetch_webpage(self, url: str) -> tuple[str, str, BeautifulSoup]:
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, "html.parser")
            
            for tag in soup(["script", "style", "nav", "header", "aside", "form", "footer", "iframe"]):
                tag.decompose()
                
            irrelevant_selectors = [
                '.c-cookie-banner', '.c-site-footer', '.SocialShare', '#site-footer',
                
                # REFUERZO CLAVE para sitios de noticias 
                '.article-meta', '.byline', '.metadata', '.author-info', '.date-info', 
                '.paywall-meter', '.g-ui-layer', '.loading-bar', 
                '.article__meta-container', '#article-tools', '.c-article-media-switcher', 
                '.article-comments', 
                
                # Selectores ruido genérico
                '.css-1qxt0m5', '.e1pby31a0', '.e1pby31a1', 
                '[data-testid="expanded-footer"]', 
                '[data-testid*="paywall"]',
                '[class*="paywall"]', 
                '[class*="meter-bar"]',
                '[class*="ad-"]', 
                '#newsletter-form',
                '#site-navigation',
                '.StoryHeader__byline',
                '.article-section-header', 
                '.css-g2jrl', '.e1pby31a3', '.e1pby31a4',
                
                # === BLOQUES COMUNES DE RUIDO ===
                '[class*="stk-block-columns"]',   
                '[class*="ct-share-box"]',        
                '[data-block*="hook"]',           # Bloques de publicidad/widgets inyectados (Ezoic, etc.)
                '[id^="ezoic-"]',                 # Publicidad Ezoic
                '.ct-breadcrumbs',                # Migas de pan
                '.hero-section',                  # Sección de cabecera con imagen y título
                'nav.wp-block-stackable-table-of-contents', # Índice de contenidos
            ]
            
            for selector in irrelevant_selectors:
                for element in soup.select(selector):
                    try: element.decompose()
                    except Exception: pass 
            

            title = soup.find("title")
            title_text = title.get_text().strip() if title else "Sin título"
            text = re.sub(r"\s+", " ", soup.get_text()).strip()

            return title_text, text, soup
        except Exception as e:
            print(f"Error en {url}: {e}")
            return "Error de Scrapeo", "", BeautifulSoup("", "html.parser")

    def extract_keywords(self, text, top_n=20) -> List[str]:
        if not self.nlp:
            return ["spacy-error-keyword"]
        doc = self.nlp(text.lower())
        candidates = [chunk.text.strip() for chunk in doc.noun_chunks if 3 <= len(chunk.text.split()) <= 5]
        counter = Counter(candidates)
        return [kw for kw, _ in counter.most_common(top_n)]

    # --- MÉTODO PRIVADO PARA LA LÓGICA DE FALLBACK ---
    def _scrape_with_fallback(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """
        Ejecuta el Plan A (simple) y si el resultado es insuficiente, 
        pasa automáticamente al Plan B (robusto).
        """

        # Parámetros de Umbral de Éxito
        MIN_CONTENT_CHARS = 300  # Mínimo de caracteres 
        MIN_BLOCKS = 5           # Mínimo de bloques de contenido
        
        # 1. Intento Sencillo (Plan A)
        blocks_simple = group_content_by_headings_simple(soup) 
        
        # Evaluar el éxito del Plan A
        total_content_len_simple = sum(len(b.get('content', '')) for b in blocks_simple)
        is_simple_successful = total_content_len_simple >= MIN_CONTENT_CHARS and len(blocks_simple) >= MIN_BLOCKS
        
        if is_simple_successful:
            return blocks_simple
            
        # 2. Fallback Robusto (Plan B)
        # Si el Plan Simple falla , usamos el Plan Robusto (Plan B)
        blocks_robust = group_content_by_headings_robust(soup)
        
        return blocks_robust
    
    
    # --- MÉTODO PRINCIPAL DE ANÁLISIS  ---
    def analyze(self, url: str, query: str) -> models.ScrapeResult:
        """
        Busca, analiza, extrae contenido (con fallback) y genera resúmenes IA para una URL.
        """
        # Suponiendo que self.fetch_webpage devuelve (status, html_content, soup)
        status, html_content, soup = self.fetch_webpage(url) 
        
        if status != 200:
            return models.ScrapeResult(
                url=url, 
                query=query, 
                error=f"Error al conectar ({status})", 
                status=status
            )
        
        # 1. Extracción de Contenido: Aquí se usa la lógica adaptativa
        blocks = self._scrape_with_fallback(soup)
        
        if not blocks:
            return models.ScrapeResult(
                url=url, 
                query=query, 
                error="No se pudo extraer contenido sustancial con Plan A ni Plan B.", 
                status=status
            )

        # 2. Consolidación de Texto para IA
        consolidated_text_chunks = [b['content'] for b in blocks if len(b['content']) > 50]
        context_text = " ".join(consolidated_text_chunks)
        
        # 3. Análisis de IA (Usando las funciones generate_ai_* y extract_keywords)
        ai_analysis_parts = []
        for block in blocks:
            summary = generate_ai_chunk_summary(block['content'], block['media_elements'], query, block['heading'])
            ai_analysis_parts.append(f"## {block['heading']}\n{summary}")

        ai_analysis = "\n\n".join(ai_analysis_parts)
        
        keywords = self.extract_keywords(context_text) 
        titles = generate_ai_titles(query, keywords, context_text)
        
        # Devolución del resultado
        return models.ScrapeResult(
            url=url,
            query=query,
            status=status,
            titles=titles,
            keywords=keywords,
            article_blocks=blocks,
            ai_analysis=ai_analysis
        )


def execute_scraping(req: models.ScrapeRequest) -> Generator[str, None, None]:
    query = req.query
    # Lógica original para obtener URLs del campo 'query'
    urls = [u.strip() for u in query.split(",") if u.strip()][:req.num_results]

    analyzer = WebScraperAnalyzer()
    all_results = []
    log = [f"Iniciando scraping de URLs a las {datetime.now().strftime('%H:%M:%S')}"]
    
    # Variables de Umbral de Éxito
    MIN_BLOCKS = 5
    MIN_CONTENT_CHARS = 300

    yield f"data: Iniciando scraping de {len(urls)} URLs...\n\n"

    for i, url in enumerate(urls, 1):
        yield f"data: Procesando URL {i} de {len(urls)}: {url}\n\n"

        # Asumiendo que analyzer.fetch_webpage retorna status, full_text, soup
        title, full_text, soup = analyzer.fetch_webpage(url) 

        keywords = analyzer.extract_keywords(full_text)
        
        # --- FASE 2: ADAPTABILIDAD ESTRUCTURAL (Plan A -> Plan B) ---
        structured_chunks = []
        
        # 1. Intento Sencillo (Plan A)
        yield "data: [PLAN A] Intentando extracción con Scraper Simple (Contenedor Flexible).\n\n"
        structured_chunks = group_content_by_headings_simple(soup) 

        # Evaluar el éxito del Plan A
        total_content_len = sum(len(b.get('content', '')) for b in structured_chunks)
        is_simple_successful = total_content_len >= MIN_CONTENT_CHARS and len(structured_chunks) >= MIN_BLOCKS

        if is_simple_successful:
            yield f"data: [PLAN A - ÉXITO] Extracción Simple exitosa ({len(structured_chunks)} bloques).\n\n"
        else:
            # 2. Fallback Robusto de Estructura (Plan B)
            yield "data: [PLAN A - FALLO] No se alcanzó el umbral. Ejecutando Scraper Robusto (Extracción Agresiva de Etiquetas).\n\n"
            # NOTA: Asegúrese de que esta función también usa la corrección del TypeError en save_current_block().
            structured_chunks = group_content_by_headings_robust(soup)
            
            # Reevaluar el resultado del Plan B
            if not structured_chunks:
                yield "data: [PLAN B - FALLO] Extracción Robusta falló o arrojó 0 resultados.\n\n"
        
       
        content_area = None

        if not structured_chunks:
            
            # ESTE ES SU CÓDIGO ORIGINAL DEL FALLBACK ULTRA ROBUSO
            yield "data: La división estructural falló COMPLETAMENTE. Intentando usar texto plano y simplificado con extracción agresiva (Plan C - Ultra Robusto).\n\n"
            
            article_heading = get_article_main_heading(soup)  

            # Recuperación del content_area para el Fallback
            content_area = soup.find('body') or soup
            high_confidence_selectors = ['article', 'main', 'div[itemprop*="articleBody"]']
            for selector in high_confidence_selectors:
                area = soup.select_one(selector)
                if area: content_area = area; break

            # 2. Extracción agresiva (Plan B/C original): buscar elementos de texto comunes en el cuerpo del HTML.
            text_elements = content_area.find_all(['p', 'h2', 'h3', 'li'])
            
            aggressive_text = []
            
            for elem in text_elements:
                text = clean_text(elem.get_text(strip=True))
                
                # *** Umbral de 30 a 10 caracteres ***
                if len(text) > 10: 
                    text_lower = text.lower()
                    if ('subscribe' not in text_lower 
                        and 'skip to' not in text_lower 
                        and 'log in' not in text_lower
                        and 'search' not in text_lower
                        and 'opinión' not in text_lower
                        and 'section navigation' not in text_lower): 
                        
                        aggressive_text.append(text)

            fallback_text = "\n\n".join(aggressive_text)

            # 3. FILTRO MÍNIMO + AJUSTE ULTRA AGRESIVO (Plan C - REVISADO)
            if len(fallback_text) < 5:
                
                yield "data: Alerta! Fallback agresivo inicial falló. Activando Extracción Ultra Agresiva por Densidad Pura (Plan C revisado).\n\n"
                
                final_aggressive_text = []
                # <-- AJUSTE CLAVE: Buscar divs/sections, p, ul, ol grandes para mayor agresividad
                final_elements = content_area.find_all(['div', 'section', 'p', 'ul', 'ol']) 
                
                # Ordenamos por longitud de texto (descendente) para tomar los más grandes
                sorted_elements = sorted(final_elements, key=lambda x: len(clean_text(x.get_text(strip=True))), reverse=True)
                
                # Tomamos los 5 bloques más grandes si superan un umbral
                for elem in sorted_elements:
                    text = clean_text(elem.get_text(strip=True))
                    # Umbral más relajado para Plan C: 100 caracteres
                    if len(text) > 100 and 'copyright' not in text.lower() and 'all rights reserved' not in text.lower():
                        final_aggressive_text.append(text)
                        
                    if len(final_aggressive_text) >= 5: 
                        break 
                    
                fallback_text = "\n\n".join(final_aggressive_text)

                if len(fallback_text) < 5:
                    msg = f"Contenido insuficiente en {url} (menos de 5 caracteres después de limpieza agresiva y relajada), se descarta."
                    yield f"data: {msg}\n\n"
                    log.append(msg)
                    continue # Salta a la siguiente URL
                    
                yield "data: Éxito! Se recuperó texto por su densidad (Plan C revisado).\n\n"
                
            # Si se recuperó texto, se empaqueta en un solo chunk
            structured_chunks = [{"heading": article_heading, "content": fallback_text, "media_elements": []}]
            
        
        ai_titles, ai_subtitles, ai_intent, ai_intro, ai_conclusion = [], [], "", "", ""
        ai_summary_by_chunk = "" 
        
        ai_analysis_result = " ".join([c['content'] for c in structured_chunks]) 

        # --- FASE 3: Iteración sobre Bloques (Scraping y/o Análisis de IA) ---
        summaries = []
        yield f"data: Iterando sobre {len(structured_chunks)} secciones estructurales (FASE 3 - Scrapping por Bloques)....\n\n"
        
        for j, chunk_data in enumerate(structured_chunks, 1):
            chunk_content = chunk_data['content']
            chunk_heading = chunk_data['heading']
            
            chunk_media = chunk_data.get('media_elements', [])
            
            # Fallback para Extracción de multimedia agresiva 
            
            if len(structured_chunks) == 1 and not chunk_media:
                
                if content_area:
                    
                    for img_tag in content_area.find_all('img'):
                        src = img_tag.get('src')
                        
                        # Búsqueda súper ampliada de Lazy Loading
                        if not src:
                            LAZY_FALLBACK = ['data-src', 'data-original', 'data-lazy-src', 'data-srcset', 'data-url', 'data-image', 'data-large-file', 'data-hero-img']
                            for attr in LAZY_FALLBACK:
                                temp_src = img_tag.get(attr)
                                if temp_src:
                                    if attr in ['data-srcset', 'srcset']:
                                        try:
                                            src = temp_src.split(',')[-1].strip().split(' ')[0]
                                        except:
                                            src = temp_src
                                    else:
                                        src = temp_src
                                    break
                                    
                        if src and is_relevant_src(src):
                            alt = img_tag.get('alt', 'Sin descripción agresiva')
                            
                            parent_figure = img_tag.find_parent('figure')
                            caption = ''
                            if parent_figure:
                                caption_tag = parent_figure.find(['figcaption', 'span', 'p'], class_=re.compile(r'caption|pie-de-foto', re.I))
                                if caption_tag:
                                    caption = caption_tag.get_text(strip=True)

                            chunk_media.append({
                                'type': 'Imagen Agresiva',
                                'url': src,
                                'description': caption if caption else alt,
                                'alt': alt,
                                'caption': caption
                            })
                            
            num_media = len(chunk_media)
            
            yield f"data: [BLOQUE {j}] Encabezado: '{chunk_heading}' (Multimedia: {num_media} elementos encontrados)\n\n"
            yield f"data: CHUNK_CONTENT: {chunk_content}\n\n"
            
            if req.use_ai:
                summary = generate_ai_chunk_summary(chunk_content, chunk_media, query, chunk_heading)
                summaries.append(summary)

        if req.use_ai and summaries:
            ai_summary_by_chunk = " ".join(summaries)
            context_data = ai_summary_by_chunk
            
            ai_titles = generate_ai_titles(query, keywords, context_data)
            ai_subtitles = generate_ai_subtitles(query, keywords, context_data)
            ai_intent = generate_ai_intent(query, keywords, context_data)
            ai_intro = generate_ai_introduction(query, keywords, context_data)
            ai_conclusion = generate_ai_conclusion(query, keywords, context_data)
            yield "data: Análisis de IA individual completado.\n\n"
            
            ai_analysis_result = ai_summary_by_chunk 
        
        result = models.ScrapeResult(
            url=url,
            title=title,
            keywords=keywords,
            ai_titles=ai_titles,
            subtitles=ai_subtitles,
            ai_intent=ai_intent,
            text_content=ai_analysis_result,
            conclusion=ai_conclusion,
            headers={},
            ai_analysis=ai_analysis_result,
            title_suggestions=[],
            search_intent=None,
            final_structure="",
            status='OK' 
        )
        all_results.append(result)

    # --- FASE 4: ANÁLISIS FINAL CONSOLIDADO  ---
    final_intent = ""
    final_structure_text = ""
    final_keywords_list = []
    
    valid_results = [r for r in all_results if r.status == 'OK'] # Filtramos solo los resultados exitosos
    
    if valid_results and req.use_ai: 
        yield "data: Iniciando FASE 4: Análisis final consolidado de todas las páginas...\n\n"
        
        consolidated_text = " ".join([r.ai_analysis for r in valid_results if r.ai_analysis])
        
        all_keywords_lists = [r.keywords for r in valid_results if r.keywords]
        unique_keywords = list(set([kw for sublist in all_keywords_lists for kw in sublist]))
        
        # Asumiendo que estas funciones existen:
        final_ai_data = generate_final_intent_and_keywords(consolidated_text, query)
        final_intent = final_ai_data.get('final_intent', '[Error en intención final]')
        final_keywords_list = final_ai_data.get('final_keywords', unique_keywords) 
        
        final_structure_text = generate_final_blog_structure(consolidated_text, query, final_keywords_list)
        
        yield "data: Análisis y estructura final generados.\n\n"
    elif not valid_results:
        final_intent = "No se pudo analizar ninguna página."
        final_structure_text = "No se pudo generar la estructura final debido a fallos de scraping."
    elif not req.use_ai:
        final_intent = "Análisis IA desactivado."
        final_structure_text = "Análisis IA desactivado."

    # --- FASE 5: PREPARACIÓN DE RESPUESTA FINAL ---
    final_response = models.ScrapeResponse(
        query=query,
        count=len(valid_results),
        results=all_results, 
        final_structure=final_structure_text, 
        search_intent=final_intent,
        final_keywords=final_keywords_list, 
        log=log
    )

    yield "event: final_data\n"
    yield f"data: {final_response.model_dump_json()}\n\n"










