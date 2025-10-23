import re
import json
import requests
import spacy
from bs4 import BeautifulSoup, Tag
from collections import Counter
from typing import Generator, List, Dict, Any, Optional, Union
from datetime import datetime
from . import models 
from pydantic import BaseModel


# --- 1. CLASE AIService: Control y Generación de IA ---

class AIService:
    """
    Gestiona todas las interacciones con el modelo de lenguaje (LLM),
    incluyendo resúmenes de bloques y análisis final.
    """

    #MODEL_URL = "http://192.168.1.11:1234/v1/chat/completions" #<-- Compu Alda
    MODEL_URL = "http://host.docker.internal:1234/v1/chat/completions" 
    MODEL_NAME = "openai/gpt-oss-20b"
    DEFAULT_SYSTEM_MESSAGE = "Eres un analista SEO profesional y experimentado. Tu única tarea es generar el contenido solicitado de manera concisa y directa, sin añadir explicaciones ni texto adicional."

    def __init__(self):
        pass


    def _llm_generate(self, prompt: str, system_message: str = DEFAULT_SYSTEM_MESSAGE, temperature: float = 0.4) -> str:
        """Función auxiliar para llamar al LLM."""
        data = {
            "model": self.MODEL_NAME,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "stream": False
        }
        try:
            response = requests.post(self.MODEL_URL, headers={"Content-Type": "application/json"}, json=data)
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            return f"[Error: {e}]"


    def _parse_json_result(self, json_string: str) -> Dict[str, Any]:
        """Aísla y parsea un objeto JSON de una respuesta de la IA de manera robusta."""
        clean_json = re.sub(r'```json\s*|```', '', json_string, flags=re.IGNORECASE).strip()
        try:
            return json.loads(clean_json)
        except json.JSONDecodeError:
            start_index = clean_json.find('{')
            end_index = clean_json.rfind('}')
            if start_index != -1 and end_index != -1:
                # Intento de parseo forzado
                return json.loads(clean_json[start_index:end_index + 1])
            raise


    # --- Funciones de IA de Fase 3 (Análisis por Bloque) ---

    def generate_chunk_summary(self, chunk: str, media_info: List[Dict[str, str]], query: str, heading: str) -> str:
        """Genera un resumen conciso para un bloque de contenido."""
        media_text = ""
        if media_info:
            media_descriptions = [f"- {m['type']} (Descripción: {m.get('description') or m.get('alt') or m.get('caption')})" for m in media_info]
            media_text = "\n\nElementos Multimedia Asociados (Primeros 5 de la URL):\n" + "\n".join(media_descriptions[:5]) + ("\n..." if len(media_descriptions) > 5 else "")

        prompt = f"Basándote en el ARTÍCULO CONSOLIDADO, el cual contiene MÚLTIPLES SECCIONES ESTRUCTURADAS, bajo el título '{heading}' y relacionado con el tema '{query}':\n---\n{chunk}\n{media_text}\n---\n\n"
        
        prompt += f"Analiza todas las secciones. Identifica los **puntos clave principales y el propósito general del artículo**. Menciona la relevancia de la multimedia en el artículo (si aplica). Devuelve un resumen conciso y directo de 3 a 5 oraciones."
        
        system_msg = "Eres un analista de texto que procesa la estructura completa de un artículo. Devuelve **solo** el resumen conciso."
        return self._llm_generate(prompt, system_msg)

    
    # --- Funciones de IA de Fase 4 (Análisis Final - MODIFICADAS) ---

    def generate_full_contextual_structure(self, 
                                          consolidated_text: str, 
                                          query: str, 
                                          title_base: str, 
                                          main_keyword: str, 
                                          principal_keywords: List[str],
                                          categoria: str,
                                          idioma: str,
                                          tecnica: str,
                                          acento: str,
                                          tono: str
                                         ) -> Dict[str, Any]:
        """
        Genera la estructura final de blog, intención, introducción y conclusión, 
        utilizando los parámetros de entrada (SIN GENERAR TÍTULOS NI KEYWORDS).
        """
        
        keywords_str = ', '.join([main_keyword] + principal_keywords)
        
        system_message = f"""
        Eres un Estratega SEO de Marketing de alto nivel y un excelente redactor en el idioma '{idioma}' con acento '{acento}'.
        Tu objetivo es generar la INTENCIÓN DE BÚSQUEDA y la ESTRUCTURA DE BLOG, adaptándote a:
        - Tono de Voz: '{tono}'
        - Acento Cultural: '{acento}'
        - Técnica de Redacción: '{tecnica}'
        - Idioma: {idioma}
        Tu única respuesta debe ser el objeto JSON solicitado, sin explicaciones ni texto adicional.
        """
        
        prompt = f"""
        --- MANDATOS SEO Y ESTRUCTURA OBLIGATORIOS ---
        
        **1. TEMA CENTRAL/TÍTULO PROPORCIONADO (BASE):** '{title_base}'.
        **2. Estructura Base:** '{categoria}'.
        
        **3. Keywords de ENTRADA (Obligatorias):** '{keywords_str}'. Estas DEBEN ser integradas en la estructura de subtítulos.
        
        ---
        
        **CONSIGNA:** Basándote **únicamente** en el CONTEXTO CONSOLIDADO (de scraping):
        {consolidated_text}
        
        1. Define la **Intención de Búsqueda Única**.
        2. Genera una **Introducción** y una **Conclusión con CTA** (máximo 4 oraciones c/u), usando el tono y acento proporcionados.
        3. Genera la **Estructura detallada del cuerpo del blog** en formato Markdown (## para H2 y ### para H3). DEBES usar el 'Título Base Deseado' y las 'Keywords de ENTRADA' como guía obligatoria.

        ---
        
        **FORMATO DE SALIDA (JSON ESTRICTO REQUERIDO):**
        {{
            "search_intent": "Intención de búsqueda única (máx 15 palabras).",
            "introduction": "Texto de la introducción.",
            "structure_markdown": "Estructura Markdown de H2/H3.",
            "conclusion_cta": "Texto de la conclusión con CTA."
        }}
        """
        
        response_json_str = self._llm_generate(prompt, system_message=system_message, temperature=0.4) 
        
        try:
            return self._parse_json_result(response_json_str)
        except Exception as e:
            # Manejo de error para la estructura final
            return {
                "search_intent": "ERROR: JSON Inválido",
                "introduction": "Error de IA al generar introducción",
                "structure_markdown": f"[ERROR DE PARSEO CRÍTICO: {e}]",
                "conclusion_cta": "Error de IA al generar conclusión"
            }
  
    # --- LÓGICA DE REGENERACIÓN ÚNICA (FASE 5 - MODIFICADA) ---

    def generate_single_intent(self, 
                               consolidated_text: str, 
                               query: str, 
                               previous_content: Optional[List[str]] = None,
                               idioma: str = "es", 
                               acento: str = "neutral",
                               tono: str = "profesional", 
                               **kwargs
                              ) -> str:
        """Define solo la intención de búsqueda, adaptada a los parámetros de estilo."""
        
        exclusion_instruction = ""
        if previous_content and isinstance(previous_content, list) and len(previous_content) > 0:
            previous_str = "; ".join([item for item in previous_content if item])
            if previous_str:
                exclusion_instruction = f"***INSTRUCCIÓN DE UNICIDAD: NO DEBES generar NINGUNA de estas intenciones de búsqueda históricas: {previous_str}. Genera un resultado completamente diferente y nuevo.***\n"
            
        prompt = f"{exclusion_instruction}Analiza el siguiente CONTEXTO CONSOLIDADO:\n---\n{consolidated_text}\n---\n\nBasándote en el contenido consolidado para la query '{query}' y justifícala brevemente. Devuelve solo una breve descripcion de la intencion de busqueda."
        system_msg = f'Eres un estratega SEO en idioma "{idioma}" con tono "{tono}". Devuelve **solo** la descripción breve y la justificación solicitada.'
        return self._llm_generate(prompt, system_msg)

    def generate_single_introduction(self, 
                                    consolidated_text: str, 
                                    query: str, 
                                    previous_content: List[str] = None,
                                    idioma: str = "es", 
                                    acento: str = "neutral",
                                    tono: str = "profesional", 
                                    **kwargs
                                   ) -> str:
        """Genera una nueva introducción, adaptada a los parámetros de estilo."""
        
        history_prompt = ""
        if previous_content and previous_content[-1] != 'Error de IA al generar introducción':
            history_prompt = f"VERSIÓN ANTERIOR:\n{previous_content[-1]}\n"

        prompt = (
            f"Basándote en el CONTEXTO CONSOLIDADO (de 3 páginas) y el tema:\n"
            f"---"
            f"TEMA DEL BLOG: '{query}'\n"
            f"{history_prompt}"
            f"CONTEXTO: {consolidated_text}\n"
            f"---"
            f"Genera una **nueva, única y mejorada Introducción** para el artículo. Debe ser concisa (máximo 4 oraciones) y muy atractiva, resumiendo el tema.\n"
            f"Devuelve **SOLO** el texto de la Introducción, sin etiquetas, comillas, ni texto adicional."
        )

        system_msg = f'Eres un redactor SEO experto. Tu única tarea es generar el texto de la Introducción solicitado, utilizando un **Tono {tono}** y **Acento {acento}** en idioma "{idioma}".'
        return self._llm_generate(prompt, system_msg, temperature=0.7) 

    # --- LOGICA PARA REGENERAR SOLAMENTE UNA UNICA PARTE DE LA ESTRUCTURA --- 

    def regenerate_structure_section(self, 
                                     consolidated_text: str, 
                                     full_structure_markdown: str,
                                     section_to_regenerate: str,
                                     new_prompt: Optional[str] = None,
                                     idioma: str = "es", 
                                     acento: str = "neutral",
                                     tono: str = "profesional", 
                                     **kwargs
                                    ) -> str:
        """
        Regenera UN ÚNICO título o subtítulo de la estructura del blog, usando el contexto completo.
        Devuelve SOLO el nuevo texto del título/subtítulo.
        """
        user_prompt_instruction = f"Instrucción de Edición/Regeneración Adicional: {new_prompt}\n" if new_prompt else ""
        
        prompt = f"""
        --- CONTEXTO COMPLETO DE REFERENCIA ---
        TEMA BASE: '{kwargs.get('query')}'
        CONTENIDO DE SCRAPING CONSOLIDADO: {consolidated_text[:2500]}... (Primeros 2500 caracteres como referencia de contexto)
        
        ESTRUCTURA ACTUAL COMPLETA DEL BLOG (Para mantener el contexto y evitar redundancia):
        ---
        {full_structure_markdown}
        ---

        --- TÍTULO/SUBTÍTULO A REGENERAR ---
        TÍTULO ACTUAL: '{section_to_regenerate}'
        
        --- INSTRUCCIONES CLAVE ---
        1. **Regeneración de Un Único Elemento:** Tu única tarea es generar una **nueva y mejorada versión** para el título/subtítulo: '{section_to_regenerate}'. 
        2. **Coherencia y Contexto:** El nuevo título/subtítulo DEBE encajar perfectamente en la 'Estructura Actual Completa' y ser relevante al 'Contenido de Scraping Consolidado'.
        3. **Unicidad:** El nuevo título/subtítulo NO debe ser redundante con ningún otro título en la estructura.
        4. **Formato Estricto:** Devuelve **SOLO** el nuevo texto del título/subtítulo (sin el ## o ### Markdown, sin comillas, sin texto adicional).

        {user_prompt_instruction}
        """
        
        system_msg = f'Eres un Estratega SEO y Redactor Creativo. Tu única tarea es regenerar **un único título o subtítulo**, utilizando un **Tono {tono}** y **Acento {acento}** en idioma "{idioma}".'
        return self._llm_generate(prompt, system_msg, temperature=0.7)


    def run_final_ai_analysis(self, req: models.AIAnalysisRequest) -> Dict[str, Any]:
        """Punto de entrada para el análisis final de IA (Servicio de IA), incluyendo regeneración de secciones."""
        consolidated_text = req.consolidated_content
        query = req.query
        
        # Se asume que estos campos existen en el modelo AIAnalysisRequest para la nueva lógica
        # Aunque no estaban en el archivo original, son necesarios para el nuevo flujo
        title_base = getattr(req, 'title_base', query)
        main_keyword = getattr(req, 'main_keyword', req.keywords[0] if req.keywords else query)
        principal_keywords = getattr(req, 'principal_keywords', req.keywords[1:] if req.keywords and len(req.keywords) > 1 else [])
        categoria = getattr(req, 'categoria', 'blog')
        idioma = getattr(req, 'idioma', 'es')
        tecnica = getattr(req, 'tecnica', 'SEO')
        acento = getattr(req, 'acento', 'neutral')
        tono = getattr(req, 'tono', 'profesional')
        
        
        # LÓGICA DE REGENERACIÓN (FASE 5)
        if req.section_type:
            content = None
            previous_history = req.previous_content 
            
            if not isinstance(previous_history, list):
                previous_history = [previous_history] if previous_history else None

            # --- MANEJO DE SECCIONES PROHIBIDAS ---
            if req.section_type in ['keywords', 'titles']:
                # Se devuelve un error o se ignora si se intenta regenerar una sección prohibida.
                raise ValueError(f"La regeneración de '{req.section_type}' está deshabilitada ya que se usan los datos proporcionados por el dashboard.")

            # --- REGENERACIÓN DE INTENCIÓN ---
            if req.section_type == 'search_intent': # Se asume 'search_intent' es el nuevo nombre
                content = self.generate_single_intent(
                    consolidated_text, 
                    query, 
                    previous_content=previous_history,
                    idioma=idioma,
                    acento=acento,
                    tono=tono
                )

            # --- REGENERACIÓN DE INTRODUCCIÓN ---
            elif req.section_type == 'introduction': 
                content = self.generate_single_introduction(
                    consolidated_text, 
                    query, 
                    previous_content=previous_history,
                    idioma=idioma,
                    acento=acento,
                    tono=tono
                )
            
            # --- NUEVA REGENERACIÓN DE SECCIÓN DE ESTRUCTURA  ---
            elif req.section_type == 'structure_section': 
                # Verifica que se hayan enviado los datos necesarios desde el frontend
                if not req.regenerate_data or 'section_text' not in req.regenerate_data or 'full_structure_markdown' not in req.regenerate_data:
                    raise ValueError("Faltan datos requeridos para la regeneración de la sección de estructura: section_text y full_structure_markdown.")

                # Llama al nuevo método que usa la estructura completa como contexto
                content = self.regenerate_structure_section(
                    consolidated_text=consolidated_text,
                    full_structure_markdown=req.regenerate_data['full_structure_markdown'], # Contexto completo
                    section_to_regenerate=req.regenerate_data['section_text'], # Título a reemplazar
                    new_prompt=req.regenerate_data.get('new_prompt'), # Prompt de edición/regeneración
                    idioma=idioma,
                    acento=acento,
                    tono=tono,
                    query=query
                )
            
            # --- REGENERACIÓN DE OTRAS SECCIONES PERMITIDAS (Ej. conclusion_cta) ---
            # elif req.section_type == 'conclusion_cta':
            #    content = self.generate_single_conclusion_cta(consolidated_text, query, previous_content=previous_history)
            
            
            if content is not None:
                # =========================================================
                # >>> LIMPIEZA DEL CONTENIDO REGENERADO (REGENERACIÓN) <<<
                # =========================================================
                content = content.replace('\r\n', '\n').replace('\r', '\n')
                content = re.sub(r'[^\S\n]+', ' ', content)
                content = '\n'.join([line.strip() for line in content.split('\n') if line.strip()])
                content = content.strip()
                # =========================================================
                
                # El frontend espera 'regenerated_content'
                return {"regenerated_content": content, "section_type": req.section_type}
            else:
                # Si llega aquí y no es prohibida, es inválida.
                raise ValueError(f"Tipo de sección de regeneración no válido: {req.section_type}")

        # Flujo inicial de Análisis de Estructura COMPLETA (FASE 4)
        analysis_result = self.generate_full_contextual_structure(
            consolidated_text=consolidated_text,
            query=query,
            title_base=title_base,
            main_keyword=main_keyword,
            principal_keywords=principal_keywords,
            categoria=categoria,
            idioma=idioma,
            tecnica=tecnica,
            acento=acento,
            tono=tono
        )

        # =========================================================
        # >>> FIX CRÍTICO: LIMPIEZA Y NORMALIZACIÓN DE LA ESTRUCTURA COMPLETA <<<
        # (Esto aplica al flujo inicial de generación de estructura)
        # =========================================================
        MARKDOWN_KEY = 'full_structure_markdown' # Asumiendo esta es la clave con el texto Markdown. ¡Ajusta si es diferente!

        if MARKDOWN_KEY in analysis_result and isinstance(analysis_result[MARKDOWN_KEY], str):
            markdown_to_clean = analysis_result[MARKDOWN_KEY]

            # 1. Normalizar saltos de línea (\r\n y \r a \n)
            markdown_to_clean = markdown_to_clean.replace('\r\n', '\n').replace('\r', '\n')

            # 2. Reemplazar caracteres de espacio no estándar (tabs, espacios unicode) y múltiples espacios por un espacio simple.
            # [^\S\n] = Cualquier espacio excepto el salto de línea.
            markdown_to_clean = re.sub(r'[^\S\n]+', ' ', markdown_to_clean) 

            # 3. Eliminar líneas completamente vacías y limpiar espacios al inicio/fin del bloque
            markdown_to_clean = '\n'.join([line.strip() for line in markdown_to_clean.split('\n') if line.strip()])
            
            # 4. Limpiar el string final.
            markdown_to_clean = markdown_to_clean.strip()
            
            # 5. Guardar el resultado limpio en el diccionario
            analysis_result[MARKDOWN_KEY] = markdown_to_clean
        # =========================================================
        
        # Consolidar el resultado final, usando las keywords de entrada (req.keywords).
        final_keywords_list = [main_keyword] + principal_keywords
        
        return {
            "search_intent": analysis_result.get("search_intent"),
            "final_keywords": final_keywords_list,
            "final_structure_json": analysis_result,
        }
    
# --- 2. CLASE ContentExtractor: Lógica de Scraping y Fallback ---

class ContentExtractor:
    """
    Clase encargada de la descarga, limpieza, extracción estructurada (Plan A/B)
    y la gestión de la lógica de fallback de scraping.
    """
    # --- Constantes y Patrones de Ruido ---
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
        r'\s*Lo\s+mejor\s*:\s*'
        r'\s{2,}|\n|\t|[\xa0\ufeff]+', 
        re.UNICODE | re.I | re.M 
    )


    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7",
            "Connection": "keep-alive", 
            "Upgrade-Insecure-Requests": "1" 
        })
    

    @staticmethod
    def is_relevant_src(src: str | None) -> bool:
        """Función anti ruido para la extraccion de elementos multmedia."""
        if not src or len(src) < 10 or src.startswith('data:image') or src.startswith('#'):
            return False
        if any(s in src.lower() for s in ['adserve', 'sponsors', 'tracker', 'g-recaptcha', 'pixel', 'comments-area']):
            return False
        return True


    @staticmethod
    def clean_text(text: str) -> str:
        """ELIMINA O RECORTA LOS ESPACIOS SOBREANTES Y EL RUIDO PATRONIZADO."""
        if not text: return ""
        return ContentExtractor.NOISE_PATTERNS.sub(' ', text).strip()


    @staticmethod
    def _get_media_info(tag: Tag) -> Dict[str, str] | None:
        """Extrae la información multimedia, manejando lazy loading y etiquetas contenedoras."""
        # Lógica para encontrar la URL de origen relevante y la descripción (alt/caption) del elemento multimedia.
        PRIMARY_MEDIA_TAGS = ['img', 'picture', 'iframe', 'video', 'figure', 'source'] 
        if not tag.name in PRIMARY_MEDIA_TAGS and not tag.has_attr('class'): return None
        src = tag.get('src')
        
        if not src and tag.name in ['img', 'picture', 'video', 'iframe', 'source']:
            LAZY_ATTRIBUTES = ['data-src', 'data-original', 'data-url', 'data-lazy-src', 'data-image-src', 
                            'srcset', 'data-srcset', 'data-iframe-src', 'data-lazyload', 'data-large-file']
            for attr in LAZY_ATTRIBUTES:
                # Lógica para manejar atributos de carga perezosa (lazy loading)
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

        if src and ContentExtractor.is_relevant_src(src):
            # Formateo de la información multimedia
            media_type = 'Imagen'; alt_text = tag.get('alt', '')
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
            return {'type': media_type, 'url': src, 'description': source_text, 'alt': alt_text, 'caption': caption_text} 
        return None


    @staticmethod
    def get_article_main_heading(soup: BeautifulSoup) -> str:
        """Busca el título principal del artículo, priorizando H1 y etiquetas de título comunes."""
        
        h1_tag = soup.find('h1', class_=lambda c: c is None or 'logo' not in c.lower() and 'brand' not in c.lower() and 'site-title' not in c.lower())
        if h1_tag and h1_tag.get_text(strip=True) and len(h1_tag.get_text(strip=True)) > 10:
            return h1_tag.get_text(strip=True)
        
        # Búsqueda basada en clases comunes de título
        title_classes = re.compile(r'main-title|article-title|entry-title|post-title|headline-text', re.I)
        main_div = soup.find(['div', 'span'], class_=title_classes)
        if main_div and main_div.get_text(strip=True) and len(main_div.get_text(strip=True)) > 10:
            return main_div.get_text(strip=True)
            
        title_tag = soup.find("title")
        return title_tag.get_text(strip=True) if title_tag else "Contenido Principal del Artículo"


    @staticmethod
    def _get_content_area(soup: BeautifulSoup, mode: str) -> Tag | BeautifulSoup:
        """Aísla el área de contenido principal basándose en el modo de extracción ('simple' o 'robust')."""
        
        temp_content_area = None
        
        if mode == 'simple':
            # Intento de encontrar contenedores de alta confianza (article, main) y heurística de densidad.
            high_confidence_selectors = ['article', 'main', 'div[itemprop*="articleBody"]']
            content_selectors = ['.entry-content', '.td-post-content', '.post-content', '.content-body', 'div[itemprop*="articleBody"]', '#content'] 
            # ... Lógica de búsqueda de área de contenido 'simple' ...
            for selector in high_confidence_selectors:
                area = soup.select_one(selector)
                if area:
                    refined_area = area.select_one(', '.join(content_selectors))
                    temp_content_area = refined_area if refined_area else area
                    break 
            if not temp_content_area:
                for selector in content_selectors:
                    area = soup.select_one(selector)
                    if area:
                        temp_content_area = area
                        break
            # Heurística de Densidad como último recurso en modo simple
            if not temp_content_area:
                potential_content_areas = soup.find_all(['div', 'section'], recursive=True)
                best_area = None; max_density = 0
                for area in potential_content_areas:
                    # Lógica de cálculo de densidad para encontrar el contenedor más probable.
                    area_class_str = " ".join(area.get('class', []))
                    if area.name == 'div' and area.get('id') in ['comments', 'sidebar', 'footer', 'header', 'nav', 'ad', 'sponsor']: continue
                    if 'sidebar' in area_class_str or 'navigation' in area_class_str or 'menu' in area_class_str: continue
                    p_count = len(area.find_all(['p', 'ul', 'ol', 'h3', 'h4'], limit=20))
                    area_text_len = len(area.get_text(strip=True)); a_count = len(area.find_all('a', limit=10)) 
                    link_density_penalty = 1.0
                    if area_text_len < 400 and a_count > 5: link_density_penalty = 0.1 
                    current_density = (p_count * area_text_len) * link_density_penalty 
                    if current_density > max_density and p_count >= 2 and area_text_len >= 100: 
                        best_area = area; max_density = current_density
                
                if best_area: temp_content_area = best_area
                
        else: # mode == 'robust' (Plan B: Aislamiento rápido y directo)
            # Prioriza selectores comunes en blogs con contenido sustancial
            article_container_selectors = ['#content', '#primary', '#main-content', '.post-wrapper', '.site-main','article','#main',
                                       '.entry-content','.article-content','.post-content','.td-post-content','.article-body',]
            for selector in article_container_selectors:
                area = soup.select_one(selector)
                if area and len(area.get_text(strip=True)) > 300 and len(area.find_all('p', limit=6)) >= 4:
                    temp_content_area = area
                    break
            
            if not temp_content_area: temp_content_area = soup.find(class_='entry-content') 
            if not temp_content_area: temp_content_area = soup.find('main', class_=lambda c: c and 'content' in c.split())
            if not temp_content_area: temp_content_area = soup.find('article', class_=lambda c: c and 'post-' in c)

        return temp_content_area or soup.find('body') or soup


    @staticmethod
    def group_content_by_headings(soup: BeautifulSoup, mode: str) -> List[Dict[str, Any]]: 
        """Agrupa el contenido del artículo por encabezados (H2/H3) o tags de encabezado detectados."""
        blocks = []
        current_heading: Optional[str] = None 
        current_content: List[str] = []
        current_media: List[Dict[str, str]] = [] 
        
        content_area = ContentExtractor._get_content_area(soup, mode)
        article_title = ContentExtractor.get_article_main_heading(soup)

        def save_current_block():
            heading_to_save = current_heading if current_heading is not None else "Introducción/Pre-H2"
            if current_content or current_media:
                safe_content = [str(c) for c in current_content if c is not None]
                cleaned_content = ContentExtractor.clean_text(" ".join(safe_content))
                deduplicated_media = {item.get('url'): item for item in current_media if item.get('url')} 
                if cleaned_content or deduplicated_media:
                    blocks.append({
                        "heading": heading_to_save,
                        "content": cleaned_content,
                        "media_elements": list(deduplicated_media.values())
                    })
        
        # Tags a buscar para la división y el contenido
        elements_to_find = ['h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'blockquote', 'div', 'section', 'img', 'figure', 'iframe', 'video', 'picture', 'span']
        elements = content_area.find_all(elements_to_find, recursive=True)
        
        HEADING_CLASSES = re.compile(r'title|subtitle|headline|subhead|h-?[234]|h[234]-?style', re.I)
        LOW_CONFIDENCE_CLASSES = re.compile(r'caption|credit|footer|ad|widget|photo|image|media-title|social-share|figure-title|byline|author|metadata', re.I)
        
        for tag in elements:
            # Lógica para identificar si el elemento es un divisor de encabezado (H2/H3/Div con clase de título)
            tag_name = tag.name.lower()
            text_content = tag.get_text(strip=True, separator=' ')
            
            if tag.get('aria-hidden') == 'true' or tag.get('role') == 'presentation' or (not text_content and tag_name not in ['img', 'figure', 'picture', 'iframe']):
                continue

            is_heading_divisor = False
            
            # 1. Identificación del Divisor (H1, H2, H3/H4 bajo ciertas condiciones, y divs/spans con clases de encabezado)
            if tag_name in ['img', 'figure', 'picture', 'iframe', 'video']: is_heading_divisor = False
            elif tag_name in ['h1', 'h2']: is_heading_divisor = True
            elif tag_name in ['h3', 'h4']:
                if len(" ".join(current_content)) > 2000 or current_heading is None: is_heading_divisor = True
            elif tag_name in ['div', 'span', 'section']:
                if tag.get('role') == 'heading' and tag.get('aria-level') in ['1', '2', '3', '4']: is_heading_divisor = True
                elif tag.has_attr('class'):
                    class_str = " ".join(tag.get('class', []))
                    class_match = HEADING_CLASSES.search(class_str)
                    if class_match and len(text_content) > 10:
                        low_conf_match = LOW_CONFIDENCE_CLASSES.search(class_str)
                        if not low_conf_match:
                            has_media_child = tag.find(['img', 'figure', 'video', 'iframe'])
                            if not has_media_child or len(tag.contents) > 2: is_heading_divisor = True
            
            # 2. Manejo de Encabezado: Guarda el bloque anterior e inicia uno nuevo
            if is_heading_divisor:
                if len(text_content) < 5 or any(exc in text_content.lower() for exc in ['pie de foto', 'foto:', 'imagen de', 'ver galeria', 'crédito']): continue
                if current_heading is None or text_content.strip() != current_heading.strip():
                    save_current_block()
                    current_heading = text_content; current_content = []; current_media = []
                
            # 3. Manejo de Contenido Multimedia
            media_info = ContentExtractor._get_media_info(tag) 
            if media_info: current_media.append(media_info) 
                
            # 4. Manejo de Contenido Textual
            is_content_tag = tag_name in ['p', 'ul', 'ol', 'blockquote']
            if tag_name == 'span' and not is_heading_divisor and len(text_content) > 100: is_content_tag = True
            
            if is_content_tag and text_content and len(text_content) > 10: 
                if not is_heading_divisor: current_content.append(text_content)
                    
        save_current_block()
        
        if blocks and blocks[0]['heading'] == "Introducción/Pre-H2":
            blocks[0]['heading'] = article_title 
        
        # --- FASE 3: FILTRADO FINAL (Aplicar filtros de longitud y ruido) ---
        final_blocks = []
        MIN_TEXT_LENGTH_CHARS = 50 
        for block in blocks:
            heading_lower = block['heading'].lower().strip()
            is_irrelevant_heading = any(exc in heading_lower for exc in ContentExtractor.EXCLUDED_HEADINGS)
            if is_irrelevant_heading: continue
            content_len = len(block['content']); has_media = bool(block['media_elements'])
            is_substantial = (content_len >= MIN_TEXT_LENGTH_CHARS) or (content_len > 0 and has_media) 
            if is_substantial: final_blocks.append(block)
                
        return final_blocks


    def fetch_webpage(self, url: str) -> tuple[str, str, BeautifulSoup]:
        """Descarga la página web y realiza la limpieza inicial (remoción de scripts, estilos, banners)."""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, "html.parser")
            
            # Limpieza de etiquetas y selectores irrelevantes (ruido de navegación, publicidad, etc.)
            for tag in soup(["script", "style", "form", "iframe"]): tag.decompose()
            irrelevant_selectors = [ 
                '.c-cookie-banner', '.c-site-footer', '.SocialShare', '#site-footer',
                '.article-meta', '.byline', '.metadata', '.author-info', '.date-info', 
                '.paywall-meter', '.g-ui-layer', '.loading-bar', 
                '.article__meta-container', '#article-tools', '.c-article-media-switcher', 
                '.article-comments', 
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
                '[class*="stk-block-columns"]',   
                '[class*="ct-share-box"]',        
                '[data-block*="hook"]',           
                '[id^="ezoic-"]',                 
                '.ct-breadcrumbs',                
                '.hero-section',                  
                'nav.wp-block-stackable-table-of-contents', 
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


    def _scrape_with_fallback(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """
        Ejecuta el Plan A (simple/flexible) y si el resultado es insuficiente, 
        pasa automáticamente al Plan B (robust/agresivo).
        """
        MIN_CONTENT_CHARS = 300  
        MIN_BLOCKS = 5           
        
        # 1. Intento Sencillo (Plan A)
        blocks_simple = ContentExtractor.group_content_by_headings(soup, mode='simple') 
        
        # Evaluación del Plan A
        total_content_len_simple = sum(len(b.get('content', '')) for b in blocks_simple)
        is_simple_successful = total_content_len_simple >= MIN_CONTENT_CHARS and len(blocks_simple) >= MIN_BLOCKS
        
        if is_simple_successful:
            return blocks_simple
            
        # 2. Fallback Robusto (Plan B)
        blocks_robust = ContentExtractor.group_content_by_headings(soup, mode='robust')
        
        return blocks_robust

# --- 3. CLASE AnalysisOrchestrator: Coordinación del Flujo ---

class AnalysisOrchestrator:
    """
    Clase que coordina la extracción, el análisis de keywords y las llamadas a la IA.
    Contiene la lógica del flujo de 'execute_scraping'.
    """

    def __init__(self, ai_service: AIService, extractor: ContentExtractor):
        self.ai_service = ai_service
        self.extractor = extractor
        try:
            self.nlp = spacy.load("es_core_news_sm")
        except Exception:
            self.nlp = None

    def extract_keywords(self, text, top_n=20) -> List[str]:
        """Extrae keywords utilizando Spacy."""
        if not self.nlp:
            return ["spacy-error-keyword"]
        doc = self.nlp(text.lower())
        candidates = [chunk.text.strip() for chunk in doc.noun_chunks if 3 <= len(chunk.text.split()) <= 5]
        counter = Counter(candidates)
        return [kw for kw, _ in counter.most_common(top_n)]

    def _aggressive_text_fallback(self, soup: BeautifulSoup, article_heading: str) -> List[Dict[str, Any]]:
        """
        Plan C: Intento de extracción de texto agresiva cuando la división estructural falla.
        Devuelve el contenido en un solo bloque.
        """
        
        content_area: Tag | BeautifulSoup = ContentExtractor._get_content_area(soup, mode='robust') 
        
        text_elements = content_area.find_all(['p', 'h2', 'h3', 'li', 'p','h4', 'h5', 'h6','strong'])
        
        aggressive_text = []
        for elem in text_elements:
            text = ContentExtractor.clean_text(elem.get_text(strip=True))
            if len(text) >= 3: 
                text_lower = text.lower()
                if 'skip to' not in text_lower and 'search' not in text_lower:
                    aggressive_text.append(text)

        fallback_text = "\n\n".join(aggressive_text)

        if len(fallback_text) < 5:
            try:
                # Fallback ultra-agresivo (todo el texto del cuerpo)
                content_to_extract = soup.body if soup.body else soup
                raw_text_ultra = content_to_extract.get_text(separator=' ', strip=True) 
                fallback_text = ContentExtractor.clean_text(raw_text_ultra)
                if len(fallback_text) == 0: raise ValueError("Contenido del documento es CERO.")
            except Exception:
                return [] 

        return [{"heading": article_heading, "content": fallback_text, "media_elements": []}]

    def execute_scraping(self, req: models.ScrapeRequest) -> Generator[str, None, None]:
        """
        Ejecuta el flujo completo de scraping, análisis y generación de resúmenes IA (FASE 1 a 3),
        devolviendo el resultado final como un generador de eventos (SSE).
        """
        query = req.query
        urls = [u.strip() for u in query.split(",") if u.strip()][:req.num_results]

        all_results = []
        log = [f"Iniciando scraping de URLs a las {datetime.now().strftime('%H:%M:%S')}"]
        
        MIN_BLOCKS = 1 
        MIN_CONTENT_CHARS = 300

        yield f"data: Iniciando scraping de {len(urls)} URLs...\n\n"

        for i, url in enumerate(urls, 1):
            yield f"data: Procesando URL {i} de {len(urls)}: {url}\n\n"

            # 1. Scraping y Limpieza de página
            title, full_text, soup = self.extractor.fetch_webpage(url) 
            
            if not full_text:
                msg = f"Contenido nulo o error de conexión en {url} (Título: {title}), se descarta."
                yield f"data: {msg}\n\n"; log.append(msg); continue
                
            keywords = self.extract_keywords(full_text)
            
            # 2. FASE 2: ADAPTABILIDAD ESTRUCTURAL (Plan A -> Plan B -> Plan C)
            structured_chunks = self.extractor._scrape_with_fallback(soup)
            
            total_content_len = sum(len(b.get('content', '')) for b in structured_chunks)
            is_structured_successful = total_content_len >= MIN_CONTENT_CHARS and len(structured_chunks) >= MIN_BLOCKS

            if is_structured_successful:
                yield f"data: [PLAN A/B - ÉXITO] Extracción Estructurada exitosa ({len(structured_chunks)} bloques).\n\n"
            elif structured_chunks:
                yield f"data: [PLAN A/B - ALERTA] Extracción Estructurada con bajo rendimiento ({len(structured_chunks)} bloques), pero se usará.\n\n"
            else:
                # Plan C: Fallback Ultra Robusto
                yield "data: La división estructural falló COMPLETAMENTE. Intentando usar texto plano y simplificado con extracción agresiva (Plan C - Ultra Robusto).\n\n"
                structured_chunks = self._aggressive_text_fallback(soup, title)

                if not structured_chunks:
                    msg = f"Contenido insuficiente en {url} (fallo en Plan A, B y C), se descarta."
                    yield f"data: {msg}\n\n"; log.append(msg); continue
                
                yield f"data: Éxito! Se recuperó texto forzado (Plan C revisado) en un solo bloque.\n\n"
            
            ai_analysis_result = " ".join([c['content'] for c in structured_chunks]) 
            context_data = ai_analysis_result
            
            # 3. FASE 3: Iteración sobre Bloques (Análisis de IA por Chunk)
            summaries = []
            
            url_consolidated_content = "\n\n".join([
                f"--- SECCIÓN {j+1}: {chunk_data['heading']} ---\nCONTENIDO:\n{chunk_data['content']}" 
                for j, chunk_data in enumerate(structured_chunks)
            ])
            
            # El texto consolidado se empaqueta como el ÚNICO 'bloque' para el análisis final
            chunk_data_for_ai = {
                'heading': title,
                'content': url_consolidated_content,
                'media_elements': [
                    media for b in structured_chunks for media in b.get('media_elements', [])
                ]
            }
            
            if url_consolidated_content:
                
                # RE-INTRODUCCIÓN DEL LOGGING DETALLADO PARA EL DEBUG DEL FRONT-END
                yield f"data: Procesando {len(structured_chunks)} secciones estructurales (FASE 3: Extracción Detallada)....\n\n"
                
                # Bucle para SIMULAR el progreso y GENERAR los logs detallados (NO llama a la IA)
                for j, chunk_data in enumerate(structured_chunks, 1):
                    
                    chunk_content = chunk_data['content']
                    chunk_heading = chunk_data['heading']
                    num_media = len(chunk_data.get('media_elements', []))
                    
                    # LOG DE BLOQUE
                    log_msg_block = f"[BLOQUE {j}] Encabezado: '{chunk_heading}' (Multimedia: {num_media} elementos encontrados)"
                    yield f"data: {log_msg_block}\n\n"
                    log.append(log_msg_block)
                    
                    # LOG DE DEBUG de Contenido
                    clean_debug_content = chunk_content[:150].replace('"', "'").strip() 
                    log_msg_debug = f"[DEBUG: CHUNK SCRAPEADO] Contenido: \"{clean_debug_content}...\" (Tamaño: {len(chunk_content)} chars)"
                    yield f"data: {log_msg_debug}\n\n"
                    log.append(log_msg_debug)
                
                # 2. LLAMADA A IA CONSOLIDADA (se ejecuta solo UNA vez)
                yield f"data: Análisis de IA en curso sobre el contenido CONSOLIDADO de la URL...\n\n"
                
                chunk_content = chunk_data_for_ai['content'] # Contenido consolidado
                chunk_heading = chunk_data_for_ai['heading'] # Título principal
                chunk_media = chunk_data_for_ai['media_elements'] # Media consolidada
                
                # Log del BLOQUE ÚNICO (para el log detallado del backend)
                log_msg_final = f"[BLOQUE ÚNICO URL {i}] Encabezado: '{chunk_heading}' (Multimedia Total: {len(chunk_media)} elementos encontrados)"
                log.append(log_msg_final)
                
                # LÍNEA CORREGIDA CON COMILLAS TRIPLES (Evita el SyntaxError)
                log.append(f"""[DEBUG: CONTENIDO CONSOLIDADO] Inicio: "{chunk_content[:150].replace('"', "'").strip()}..." (Tamaño: {len(chunk_content)} chars)""")

                if req.use_ai:
                    summary = self.ai_service.generate_chunk_summary(chunk_content, chunk_media, query, chunk_heading) 
                    summaries.append(summary)
                    chunk_data_for_ai['ai_chunk_summary'] = summary
                    yield "data: Resumen de IA por URL completado.\n\n"
                else:
                    summaries.append(chunk_content)
                    chunk_data_for_ai['ai_chunk_summary'] = chunk_content
                        
                # Determinación del contexto consolidado
                context_data = " ".join(summaries)
                ai_analysis_result = context_data
                
                # structured_chunks debe contener solo el resultado consolidado para la FASE 4
                structured_chunks = [chunk_data_for_ai] 
                
            else: # Fallback si el contenido estructurado está vacío
                context_data = full_text 
                ai_analysis_result = context_data
                structured_chunks = [{"heading": title, "content": full_text, "media_elements": [], "ai_chunk_summary": context_data}]
                yield "data: Alerta: Contenido estructurado vacío, se usó texto plano para el resumen.\n\n"


            # Preparación del resultado del scrapeo para consolidación
            result = models.ScrapeResult(
                url=url,
                title=title,
                keywords=keywords,
                ai_titles=[],
                subtitles=[],
                ai_intent="",
                text_content=context_data,
                conclusion="",
                headers={"main_heading": [structured_chunks[0]['heading']] if structured_chunks else [title], "count": [str(len(structured_chunks))]},
                ai_analysis=ai_analysis_result,
                title_suggestions=[], 
                search_intent=None,
                final_structure="",
                article_blocks=structured_chunks, 
                status='OK' 
            )
            all_results.append(result)

        # 4. FASE 4: Preparación para Análisis Manual (Omisión de LLAMADAS IA FINALES)
        valid_results = [r for r in all_results if r.status == 'OK'] 
        consolidated_text = ""
        unique_keywords = []

        if valid_results and req.use_ai: 
            # Consolidación del texto para la FASE 4 (Análisis Final)
            structured_context_parts = []
            block_counter = 0 
            for r in valid_results: 
                structured_context_parts.append(f"\n\n--- INICIO DE ANÁLISIS DE URL: {r.url} ---")
                blocks_to_process = getattr(r, 'article_blocks', []) 
                if blocks_to_process:
                    for b in blocks_to_process:
                        heading = b.get('heading')
                        analysis = b.get('ai_chunk_summary') 
                        if analysis and heading:
                            block_counter += 1
                            structured_context_parts.append(f"### [SECCIÓN {block_counter}] {heading}")
                            structured_context_parts.append(f"CONTENIDO CLAVE SINTETIZADO:\n{analysis}")
                            
            consolidated_text = "\n\n".join(structured_context_parts)
            all_keywords_lists = [r.keywords for r in valid_results if r.keywords]
            unique_keywords = list(set([kw for sublist in all_keywords_lists for kw in sublist]))
            
            final_intent = "Análisis IA Pendiente. Ejecutar 'Generar Análisis IA'."
            final_keywords_list = unique_keywords
            final_structure_text = "Contenido consolidado listo para análisis IA."

            yield "data: [FASE 4: Análisis IA omitido. Contenido consolidado listo para generación manual.]\n\n"
            
        elif not valid_results:
            final_intent = "No se pudo analizar ninguna página."
            final_structure_text = "No se pudo generar la estructura final debido a fallos de scraping."
            final_keywords_list = []
        else: # not req.use_ai:
            final_intent = "Análisis IA desactivado."
            final_structure_text = "Análisis IA desactivado."
            all_keywords_lists = [r.keywords for r in valid_results if r.keywords]
            final_keywords_list = list(set([kw for sublist in all_keywords_lists for kw in sublist]))


        # 5. FASE 5: PREPARACIÓN DE RESPUESTA FINAL
        final_response = models.ScrapeResponse(
            query=query,
            count=len(valid_results),
            results=all_results, 
            final_structure=final_structure_text, 
            search_intent=final_intent,
            final_keywords=final_keywords_list, 
            log=log,
            consolidated_content=consolidated_text 
        )

        yield "event: final_data\n"
        yield f"data: {final_response.model_dump_json()}\n\n"



def execute_scraping(req: models.ScrapeRequest) -> Generator[str, None, None]:
    """Punto de entrada para la ejecución del scraping (Orquestador)."""
    ai_service = AIService()
    extractor = ContentExtractor()
    orchestrator = AnalysisOrchestrator(ai_service, extractor)
    return orchestrator.execute_scraping(req)

def run_final_ai_analysis(req: models.AIAnalysisRequest) -> Dict[str, Any]:
    """Punto de entrada para el análisis final de IA (Servicio de IA), incluyendo regeneración de secciones."""
    ai_service = AIService()
    return ai_service.run_final_ai_analysis(req)