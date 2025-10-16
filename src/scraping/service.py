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
import urllib3


urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
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

    # LLAMADA A LM STUDIO
    def _llm_generate(self, prompt: str, system_message: str = DEFAULT_SYSTEM_MESSAGE, temperature: float = 0.4) -> str:
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

    # PARSEO DE FORMATO JSON DE LA RESPUESTA IA 
    def limpieza_extraccion_json(self, json_string: str) -> Dict[str, Any]:
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


    # --- ANALISIS DE BLOQUES CON IA ---
    def analizar_bloque_contenido(self, chunk: str, media_info: List[Dict[str, str]], query: str, heading: str) -> str:
        """
        Realiza un análisis profundo de un bloque de contenido para extraer
        puntos clave y elementos estructurales, en lugar de un resumen conciso.
        """
        media_text = ""
        if media_info:
            media_descriptions = [f"- {m['type']} (Descripción: {m.get('description') or m.get('alt') or m.get('caption')})" for m in media_info]
            media_text = "\n\nElementos Multimedia Asociados (Primeros 5 de la URL):\n" + "\n".join(media_descriptions[:5]) + ("\n..." if len(media_descriptions) > 5 else "")

        # Mantenemos la estructura de contexto del prompt
        prompt = f"Basándote en el ARTÍCULO CONSOLIDADO, el cual contiene MÚLTIPLES SECCIONES ESTRUCTURADAS, bajo el título '{heading}' y relacionado con el tema '{query}':\n---\n{chunk}\n{media_text}\n---\n\n"
        
        # NUEVAS INSTRUCCIONES: Más abiertas y orientadas a la estructura
        prompt += f"Realiza un **ANÁLISIS ESTRUCTURAL EXHAUSTIVO** del bloque de contenido anterior. Tu tarea es **extraer todos los puntos clave, datos únicos y subtítulos implícitos** que contribuyan a una estructura de blog de alta calidad para el tema '{query}'. No obvies información crucial. Analiza también la relevancia de la multimedia (si aplica). **Devuelve el análisis en forma de lista de puntos clave detallados.**"
        
        # NUEVO SYSTEM_MSG: Cambia el rol a un consultor de estructura.
        system_msg = "Eres un consultor de contenido y analista estructural experto. Tu única tarea es analizar la información proporcionada y devolver **únicamente** una lista detallada y estructurada (usando markdown, puntos o numeración) con los puntos clave y elementos estructurales extraídos. No generes una introducción, conclusión o resumen. Sé exhaustivo y mantén la calidad informativa. Incluendo menciona en donde debe ir algun tipo de contenido multimedia analizando las paginas"
        
        return self._llm_generate(prompt, system_msg)

    
    # --- GENERA EL ESQUEMA COMPLETO DEL BLOG

    def generar_estructura_seo_final(self, 
                                          consolidated_text: str, 
                                          query: str, 
                                          title_base: str, 
                                          categoria: str,
                                          idioma: str,
                                          tecnica: str,
                                          acento: str,
                                          tono: str
                                         ) -> Dict[str, Any]:
        """
        Genera la estructura final de blog, intención, introducción y conclusión, 
        utilizando los parámetros de entrada.
        """
        
        keywords_str = ', '.join([query])
        
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
        **CONSIGNA:** Basándote **únicamente y de forma exhaustiva** en el CONTEXTO CONSOLIDADO (de scraping, que contiene contenido de **MÚLTIPLES PÁGINAS ANALIZADAS**):
        {consolidated_text}
        1. Genera la **ESTRUCTURA COMPLETA Y DETALLADA del cuerpo del blog** en una lista línea por línea. La estructura debe ser:
            - **Extremadamente detallada y exhaustiva** (Skyscraper Content).
            - **Altamente jerárquica**, con un **MÍNIMO de 5 encabezados H2** bien diferenciados.
            - **OBLIGATORIO** incluir encabezados H3 (subtítulos) para dar profundidad a la mayoría de los H2, demostrando un análisis completo del contexto consolidado.
            - Integrar todos los puntos de datos, estadísticas, listas y las ideas únicas obtenidas de las MÚLTIPLES FUENTES.
        2. Utiliza el siguiente formato estricto: **[H{{N}} - X.Y] Título del Encabezado**.
           - **{{N}}** debe ser el nivel de encabezado HTML (ej. **2** para H2, **3** para H3).
           - **X.Y** debe ser la numeración decimal jerárquica (ej. 1.0, 1.1, 2.0, 2.1, 3.0, 3.1, 3.1.1, etc.).
           - **ESTRICTAMENTE NO UTILICES** la sintaxis Markdown (##, ###, *) ni otros símbolos.
        2. REGLA CLAVE MULTIMEDIA: Basado en el análisis SEO del contexto consolidado, si un encabezado requiere o se beneficia de un elemento multimedia, DEBES incluir el marcador **[MULTIMEDIA: TIPO]** al final de la línea.
            - TIPO debe ser uno de los siguientes: **VIDEO, FOTO, MAPA, GRAFICO**.
            - Si no se requiere multimedia, la línea termina después del título.
        ---
        **REGLAS DE FORMATO ESTRICTAS Y PROHIBICIONES:**
        - **PROHIBIDO** incluir secciones, títulos o subtítulos que contengan las palabras "Resumen" o "Conclusión" (o sus variantes en cualquier idioma).
        -**PROHIBIDO** utilizar emojis, símbolos especiales o caracteres no alfanuméricos en los títulos de la estructura. Utiliza solo texto simple.
        -**PROHIBIDO** Mencionar de cualquier manera las urls de donde se extrajo la informacion por ninigun motivo.
        

        **FORMATO DE SALIDA (JSON ESTRICTO REQUERIDO):**
        {{
            "structure_markdown": "Estructura detallada con formato [H{{N}} - X.Y] Título.",
        }}
        """
        
        # CAMBIO CRÍTICO: Aumento de temperatura para mayor creatividad y detalle.
        response_json_str = self._llm_generate(prompt, system_message=system_message, temperature=0.8) 
        
        try:
            return self.limpieza_extraccion_json(response_json_str)
        except Exception as e:
            # Manejo de error para la estructura final
            return {
                "structure_markdown": f"[ERROR DE PARSEO CRÍTICO: {e}]"
            }

    # --- LOGICA PARA REGENERAR SOLAMENTE UNA UNICA PARTE DE LA ESTRUCTURA EN ESTE CASO TITULOS Y SUBTITULOS--- 
    def regenerar_titulos(self, 
                                     consolidated_text: str, 
                                     full_structure_markdown: str,
                                     section_to_regenerate: str,
                                     new_prompt: Optional[str] = None,
                                     idioma: str = "es", 
                                     acento: str = "neutral",
                                     tono: str = "profesional", 
                                     **kwargs
                                    ) -> List[str]:
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
        1. **Regeneración de Múltiples Elementos:** Tu única tarea es generar **EXACTAMENTE 3 nuevas y mejoradas versiones** para el título/subtítulo: '{section_to_regenerate}'. 
        2. **Coherencia y Contexto:** Los nuevos títulos/subtítulos DEBEN encajar perfectamente en la 'Estructura Actual Completa'.
        3. **Formato Estricto:** Devuelve **SOLO** un array JSON de 3 strings. NO incluyas el nivel jerárquico ([H2 - X.Y]) ni texto adicional.
        
        EJEMPLO DE SALIDA: ["Nueva Opción A", "Nueva Opción B", "Nueva Opción C"]
        
        {user_prompt_instruction}
        """
        
        system_msg = f'Eres un Estratega SEO y Redactor Creativo. Tu única tarea es generar un array JSON de 3 opciones, utilizando un **Tono {tono}** y **Acento {acento}** en idioma "{idioma}".'
        raw_response = self._llm_generate(prompt, system_msg, temperature=0.7)

        try:
            suggestions = self.limpieza_extraccion_json(raw_response)
            if isinstance(suggestions, list) and all(isinstance(s, str) for s in suggestions):
                # Devolver la lista parseada
                return suggestions 
            else:
                 # Si el formato no es List[str], devolver un fallback de texto crudo
                return [raw_response.strip()]
        except:
             # Si el parseo JSON falla (ej. si el modelo no genera JSON), devolver el texto crudo como una lista de 1.
            return [raw_response.strip()]
        
    # --- AQUI SE DECIDE Y SE REALIZA LA GENERACION COMPLETA O REGENERACION DE UNA SOLA SECCION 
    def analisis_final_ia(self, req: models.AIAnalysisRequest) -> Dict[str, Any]:
        """Punto de entrada para el análisis final de IA, incluyendo regeneración de secciones."""

        consolidated_text = req.consolidated_content
        query = req.query
        title_base = getattr(req, 'title_base', query)
        categoria = getattr(req, 'categoria', 'blog')
        idioma = getattr(req, 'idioma', 'es')
        tecnica = getattr(req, 'tecnica', 'SEO')
        acento = getattr(req, 'acento', 'neutral')
        tono = getattr(req, 'tono', 'profesional')
        
        # LÓGICA DE REGENERACIÓN 
        if req.section_type:
            content = None
            previous_history = req.previous_content 
            
            if not isinstance(previous_history, list):
                previous_history = [previous_history] if previous_history else None

            # --- MANEJO DE SECCIONES PROHIBIDAS ---
            if req.section_type in ['keywords', 'titles']:
                # Se devuelve un error o se ignora si se intenta regenerar una sección prohibida.
                raise ValueError(f"La regeneración de '{req.section_type}' está deshabilitada ya que se usan los datos proporcionados por el dashboard.")
            
            # --- NUEVA REGENERACIÓN DE SECCIÓN DE ESTRUCTURA (Devuelve List[str]) ---
            elif req.section_type == 'structure_section': 
                # Verifica que se hayan enviado los datos necesarios desde el frontend
                if not req.regenerate_data or 'section_text' not in req.regenerate_data or 'full_structure_markdown' not in req.regenerate_data:
                    raise ValueError("Faltan datos requeridos para la regeneración de la sección de estructura: section_text y full_structure_markdown.")

                # Llama al método regenerar_titulos, que ahora devuelve List[str]
                # Nota: 'content' es una lista de strings (las sugerencias)
                content: List[str] = self.regenerar_titulos(
                    consolidated_text=consolidated_text,
                    full_structure_markdown=req.regenerate_data['full_structure_markdown'],
                    section_to_regenerate=req.regenerate_data['section_text'],
                    new_prompt=req.regenerate_data.get('new_prompt'),
                    idioma=idioma,
                    acento=acento,
                    tono=tono,
                    query=query
                )
            
            # --- BLOQUE DE RETORNO DE REGENERACIÓN (MODIFICADO) ---
            if content is not None:
                
                # ** CAMBIO CRÍTICO **
                # Si 'content' es una lista, se asume que son las sugerencias y se retornan inmediatamente.
                if req.section_type == 'structure_section' and isinstance(content, list):
                    # La clave es 'regenerated_suggestions', que el frontend espera.
                    return {"regenerated_suggestions": content, "section_type": req.section_type}
                
                # LÓGICA DE LIMPIEZA DE CONTENIDO SIMPLE (Si 'content' fuera un string)
                # Esto mantiene la compatibilidad con otras secciones que regeneran un solo string.
                if isinstance(content, str):
                    content = content.replace('\r\n', '\n').replace('\r', '\n')
                    content = re.sub(r'[^\S\n]+', ' ', content)
                    content = '\n'.join([line.strip() for line in content.split('\n') if line.strip()])
                    content = content.strip()
                    
                # Retorno de contenido simple (si no es structure_section o si la función devolvió un string de fallback)
                return {"regenerated_content": content, "section_type": req.section_type}
            
            else:
                raise ValueError(f"No se pudo generar contenido para el tipo de sección: {req.section_type}")

        # --- LÓGICA DE GENERACIÓN INICIAL DE ESTRUCTURA COMPLETA ---
        analysis_result = self.generar_estructura_seo_final(
            consolidated_text=consolidated_text,
            query=query,
            title_base=title_base,
            categoria=categoria,
            idioma=idioma,
            tecnica=tecnica,
            acento=acento,
            tono=tono
        )

        # LIMPIEZA Y NORMALIZACIÓN DE LA ESTRUCTURA COMPLETA (Se mantiene sin cambios)
        MARKDOWN_KEY = 'full_structure_markdown' 

        if MARKDOWN_KEY in analysis_result and isinstance(analysis_result[MARKDOWN_KEY], str):
            markdown_to_clean = analysis_result[MARKDOWN_KEY]

            # 1. Normalizar saltos de línea (\r\n y \r a \n)
            markdown_to_clean = markdown_to_clean.replace('\r\n', '\n').replace('\r', '\n')

            # 2. Reemplazar caracteres de espacio no estándar y múltiples espacios
            markdown_to_clean = re.sub(r'[^\S\n]+', ' ', markdown_to_clean) 

            # 3. Eliminar líneas completamente vacías y limpiar espacios
            markdown_to_clean = '\n'.join([line.strip() for line in markdown_to_clean.split('\n') if line.strip()])
            
            # 4. Limpiar el string final.
            markdown_to_clean = markdown_to_clean.strip()
            
            # 5. Guardar el resultado limpio en el diccionario
            analysis_result[MARKDOWN_KEY] = markdown_to_clean
            
        return {
            "final_structure_json": analysis_result,
        }
    

# --- 2. CLASE ContentExtractor: Lógica de Scraping y Fallback ---
class ContentExtractor:
    """
    Clase encargada de la descarga, limpieza, extracción estructurada (Plan A/B)
    y la gestión de la lógica de fallback de scraping.
    """
    # --- CONSTANTES Y PATRONES DE RUIDO ---
    EXCLUDED_HEADINGS = [
        'contenido relacionado', 'principales noticias', 'no te lo pierdas', 
        'lecturas más populares', 'más información', 'comentarios', 
        'temas relacionados', 'navegación', 'créditos', 'síguenos', 
        'te puede interesar', 'leer más', 'share', 'siguiente', 'anterior', 
        'ver también', 'suscríbete', 'regístrate', 'cierra sesión', 'publicidad', 
        'productos recomendados', 'Contenido relacionado', 'Temas relacionados',
        'Lecturas más populares', 'patrocinado','opinión', 'redes sociales', 'directorio', 'aviso de privacidad', 
        'términos y condiciones', 'nuestras redes', 'miembro del grupo de diarios de américa',
        'código de ética', 'consultas', 'newsletters', 'juegos', 'podcast', 
        'videos', 'publicidad', 'newsletter', 'lo más visto', 'lo más leído',
        'contacto', 'acerca de', 'autor','te recomendamos', 'también te puede interesar', 'otras noticias', 
        'más sobre este tema', 'otras historias', 'otras noticias de', 
        'historias relacionadas', 'otras historias de', 'lo que te podría interesar',
        'noticias de america latina', 'noticias internacional', 'lo más visto',
    ]

    # ---PATRONES A EXCLUIR ---
    NOISE_PATTERNS = re.compile(
        r'Fuente\s+de\s+la\s+imagen[,\s]+(Getty\s+Images|Alamy)\s*|'
        r'Información\s+del\s+artículo\s+Autor[,\s]+Redacción\s+Título\s+del\s+autor[,\s]+BBC\s+Travel\s+[\d\s\w]+\s*|'
        r'Getty\s+Images\.?\s*|'
        r'Agencia\s+EFE\s*|'
        r'\s*Lo\s+mejor\s*:\s*'
        r'\s{2,}|\n|\t|[\xa0\ufeff]+', 
        re.UNICODE | re.I | re.M 
    )

    # --- PETICION AL NAVEGADOR SIMULANDO UNA PETICION ---
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7",
            "Connection": "keep-alive", 
            "Upgrade-Insecure-Requests": "1" 
        })
    

    @staticmethod
    def is_relevant_src(src: str | None) -> bool:
        """Verifica si una URL de fuente multimedia (src) es relevante, excluyendo URLs cortas, data URIs, rastreadores y publicidad."""
        if not src or len(src) < 10 or src.startswith('data:image') or src.startswith('#'):
            return False
        if any(s in src.lower() for s in ['adserve', 'sponsors', 'tracker', 'g-recaptcha', 'pixel', 'comments-area']):
            return False
        return True


    @staticmethod
    def clean_text(text: str) -> str:
        """Elimina el ruido patronizado (ej. créditos de imagen) y recorta los espacios extra del texto extraído."""
        if not text: return ""
        return ContentExtractor.NOISE_PATTERNS.sub(' ', text).strip()


    @staticmethod
    def _get_media_info(tag: Tag) -> Dict[str, str] | None: # <<-- CORRECCIÓN APLICADA AQUÍ
        """Extrae la URL de origen y el texto descriptivo (alt/caption) de un elemento multimedia, manejando atributos de carga perezosa (lazy loading)."""

        PRIMARY_MEDIA_TAGS = ['img', 'picture', 'iframe', 'video', 'figure', 'source'] 
        
        if not tag.name in PRIMARY_MEDIA_TAGS and not tag.has_attr('class'): return None
        
        src = tag.get('src')
        
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
        """Busca y retorna el título principal del artículo, priorizando la etiqueta H1 y selectores comunes de titular."""
        
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
    def _get_content_area(soup: BeautifulSoup, mode: str) -> Union[Tag, BeautifulSoup]:
        """
        Identifica el área principal del contenido usando selectores simples (Plan A) 
        y luego heurística de densidad (Plan B/Modo Robusto). 
        Aplica limpieza fina interna para eliminar ruido anidado.
        """
        temp_content_area = None
        
        # ----------------------------------------------------------------------
        # A. DETECCIÓN SIMPLE (Plan A: Primer intento rápido y eficiente)
        # ----------------------------------------------------------------------
        if mode == 'simple':
            # Selectores de muy alta confianza
            simple_selectors = ['div[itemprop*="articleBody"]', '.entry-content', 'article.post-content', 'article', 'main']
            
            for selector in simple_selectors:
                area = soup.select_one(selector)
                # Debe tener suficiente texto para ser un artículo real
                if area and len(area.get_text(strip=True)) > 500:
                    temp_content_area = area
                    break

        # ----------------------------------------------------------------------
        # B. DETECCIÓN ROBUSTA (Plan B: Heurística de Densidad y Selectores Agresivos)
        # Se ejecuta si el modo es 'robust' O si el Plan A falló.
        # ----------------------------------------------------------------------
        
        if mode == 'robust' or (mode == 'simple' and not temp_content_area):
            
            # Selectores de contenedores de artículo (LISTA AMPLIADA y AGRESIVA para alta cobertura)
            article_container_selectors = [
                'div[itemprop*="articleBody"]', '.entry-content', '.post-content', 
                '.article-body', '.post-body', '.article-main-content', '.td-post-content', 
                '.post-inner', '.content-wrap', '.single-post-content', 
                
                # Selectores Agresivos (para casos como Japonpedia):
                '[class*="content"]', '[class*="single"]', '.post', '.article',
                '.main-content', '#main-content-area', '.main-area',
                
                'article', 'main', '#content', '#primary', '#main-content', 
            ]
            
            best_area = temp_content_area
            max_p_count = 0
            
            # Si venimos de un fallo en el modo simple, reiniciamos max_p_count
            if not best_area:
                 max_p_count = 0

            # Iteramos sobre todos los candidatos para encontrar el mejor por DENSIDAD
            for selector in article_container_selectors:
                for area in soup.select(selector): 
                    # Contamos párrafos (el marcador clave de contenido principal)
                    p_count = len(area.find_all('p', limit=10)) 
                    text_len = len(area.get_text(strip=True))
                    
                    # Criterio de Selección: Debe ser grande, tener al menos 3 párrafos y más que el candidato actual.
                    if text_len > 300 and p_count >= 3:
                         if p_count > max_p_count:
                            max_p_count = p_count
                            best_area = area
            
            temp_content_area = best_area
        
        # ----------------------------------------------------------------------
        # C. LÓGICA DE LIMPIEZA INTERNA (LISTA BLANCA + EXCLUSIÓN DE RUIDO)
        # ----------------------------------------------------------------------

        if temp_content_area:
            # Lista de etiquetas esenciales que SI deben sobrevivir (Lista Blanca)
            essential_tags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'li', 'a', 'strong', 'em', 'blockquote', 'img', 'figure', 'ul', 'ol', 'video', 'table', 'span', 'br']
            
            for element in temp_content_area.find_all(True):
                is_noise = False
                
                # Criterio C.1: Eliminación por Lista Blanca y Vacío (Protege el contenido esencial)
                if element.name not in essential_tags:
                    # Si no es un tag esencial y NO tiene texto significativo
                    if len(element.get_text(strip=True)) < 50: 
                        is_noise = True

                # Criterio C.2: Heurística de Contenedor de Ruido (Clases y Densidad de Enlaces)
                if element.name in ['div', 'section', 'aside']:
                    # 1. Clases de ruido conocidas (Filtro AMPLIO)
                    if any(c in element.get('class', []) for c in [
                        'widget', 'promo-box', 'related-posts', 'guide-links', 
                        'reviews-section', 'author-box', 'social-media', 'share-bar', 
                        'elementor-widget', 'ad-container', 'post-nav', 'links-list', 
                        'more-stories', 'paywall-block', 'sub-header', 'footer-content', 'byline-item'
                    ]):
                         is_noise = True
                         
                    # 2. Heurísticas de densidad de enlaces (Detecta listados de links/publicidad)
                    num_p = len(element.find_all('p', recursive=False))
                    num_a = len(element.find_all('a'))
                    text_len = len(element.get_text(strip=True))

                    # Regla: Si tiene muy pocos párrafos, muchos enlaces y poco texto total.
                    if num_p < 3 and num_a > 3 and num_a / (len(element.find_all(True)) or 1) > 0.3 and text_len < 500:
                        is_noise = True
                        
                # Criterio C.3: HEURÍSTICA DE CÓDIGO JS Y BOTONES DE ACCIÓN
                element_text = element.get_text(strip=True)
                
                # Detecta tags de form, input o placeholders de JS/React
                if element.name in ['input', 'textarea', 'select', 'form'] or '{{' in element_text or '}}' in element_text: 
                     is_noise = True
                
                # Detecta botones o links de acción
                elif element.name in ['button', 'a'] and any(keyword in element_text for keyword in ['Borrar', 'Selecciona', 'Reservar', 'Comprar', 'Agregar', 'Idioma', 'Moneda', 'Opciones', 'Destino', 'Ver más', 'Buscar', 'Suscribir', 'Newsletter', 'Publicidad']):
                    is_noise = True
                
                if is_noise:
                    element.decompose() # Elimina el elemento
            
            # 4. Heurística Final para eliminar bloques de Related Posts/Links al final
            for last_tag in temp_content_area.find_all(recursive=False)[-3:]:
                if last_tag.name in ['div', 'section'] and (
                    len(last_tag.get_text(strip=True)) < 500 and len(last_tag.find_all('a')) > 5
                ):
                    last_tag.decompose()

        # ----------------------------------------------------------------------
        # D. FALLBACK FINAL
        # ----------------------------------------------------------------------
        return temp_content_area or soup.find('body') or soup

    @staticmethod
    def group_content_by_headings(soup: BeautifulSoup, mode: str) -> List[Dict[str, Any]]: 
        """Procesa el HTML de la página, agrupando texto y elementos multimedia bajo los encabezados (H2/H3) detectados para crear bloques estructurados de contenido."""
        blocks = []
        current_heading: Optional[str] = None 
        current_content: List[str] = []
        current_media: List[Dict[str, str]] = [] 
        
        content_area = ContentExtractor._get_content_area(soup, mode)
        article_title = ContentExtractor.get_article_main_heading(soup)

        # Función auxiliar interna para guardar el bloque actual
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
                is_heading_divisor = True
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
                
                # FILTRO 1: Títulos muy cortos o conocidos como ruido visual
                if len(text_content) < 5 or any(exc in text_content.lower() for exc in ['pie de foto', 'foto:', 'imagen de', 'ver galeria', 'crédito']): continue
                
                # <<< INICIO DE FILTROS UNIVERSALES CONTRA EL RUIDO >>>
                
                # 1. Chequeo de calidad del bloque ANTERIOR antes de guardarlo.
                if current_heading is not None and current_content:
                    
                    texto_consolidado = " ".join(current_content)
                    len_texto = len(texto_consolidado)
                    heading_strip = current_heading.strip()
                    
                    # *** FILTRO 1: DUPLICACIÓN HEADER-CONTENIDO EXTENDIDA (Arregla BBC Bloques 17, 18, 19, 20, 21) ***
                    # Si el contenido es de longitud media o corta (< 1500 chars) y comienza con el encabezado.
                    if len_texto < 1500 and texto_consolidado.startswith(heading_strip): 
                        # self.log_debug(f"[FILTRO DUPLICACIÓN] Descartando bloque por duplicación Header/Contenido: '{current_heading[:30]}...'")
                        current_heading = text_content
                        current_content = []
                        current_media = []
                        continue 

                    # *** FILTRO 2: DENSIDAD DE ENLACES ADAPTATIVA MÁS AGRESIVA (Arreglo Genérico de Widgets de Enlaces) ***
                    link_count = texto_consolidado.lower().count('http') + texto_consolidado.lower().count('www.')
                    
                    # Si el bloque es PEQUEÑO (< 500 chars) Y DENSO EN ENLACES (>= 3), es ruido.
                    if len_texto < 500 and link_count >= 3: # <<-- CAMBIO CLAVE: Umbral reducido a 3
                        # self.log_debug(f"[FILTRO DENSIDAD] Descartando bloque por alta densidad de enlaces: '{current_heading[:30]}...'")
                        current_heading = text_content
                        current_content = []
                        current_media = []
                        continue 
                        
                # <<< FIN DE FILTROS UNIVERSALES CONTRA EL RUIDO >>>

                if current_heading is None or text_content.strip() != current_heading.strip():
                    save_current_block()
                    current_heading = text_content; current_content = []; current_media = []
                
            # 3. Manejo de Contenido Multimedia
            media_info = ContentExtractor._get_media_info(tag) 
            if media_info: current_media.append(media_info) 
                
            # 4. Manejo de Contenido Textual
            is_content_tag = tag_name in ['p', 'ul', 'ol', 'blockquote']
            
            # *** AÑADIDO: INCLUSIÓN DE DIV/SECTION COMO CONTENIDO (Arregla Vogue/GQ) ***
            # Si no es un encabezado y tiene texto sustancial, es contenido.
            if tag_name in ['div', 'section'] and not is_heading_divisor and len(text_content) > 50:
                is_content_tag = True
                
            if tag_name == 'span' and not is_heading_divisor and len(text_content) > 100: is_content_tag = True
            
            if is_content_tag and text_content and len(text_content) > 10: 
                if not is_heading_divisor: current_content.append(text_content)
                    
        save_current_block()
        
        if blocks and blocks[0]['heading'] == "Introducción/Pre-H2":
            blocks[0]['heading'] = article_title 
        
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
        """Descarga la página web, elimina etiquetas no deseadas (scripts, estilos) y selectores de ruido (publicidad, navegación) y devuelve el título, el texto limpio y el objeto BeautifulSoup."""
        try:
            response = self.session.get(url, timeout=10, verify=False) 
            response.raise_for_status()
            soup = BeautifulSoup(response.content, "html.parser")
            
            # Limpieza de etiquetas y selectores irrelevantes (ruido de navegación, publicidad, etc.)
            for tag in soup(["script", "style", "form", "iframe"]): tag.decompose()

            irrelevant_selectors = [ 
                # === 1. ESTRUCTURAS GLOBALES Y NAVEGACIÓN ===
                'header', 'footer', 'nav', 'aside', '[role*="complementary"]', 
                '#sidebar', '#footer', '#header', '#top-menu', '[data-testid*="footer"]', 
                '.hero-section', '#skip-link', 'a[href="#main-content"]', 
                
                # === 2. PUBLICIDAD / PROMOS / COOKIES / PAYWALLS ===
                '[class*="ad-"]', '[id*="ad-"]', '[class*="advert"]', '[class*="sponsor"]', 
                '[id^="ezoic-"]', '#newsletter-form', '[class*="paywall"]', 
                '[class*="cookie"]', '[id*="consent"]', '[id*="onetrust"]', 
                '.c-cookie-banner', '.paywall-meter', '.g-ui-layer', 
                
                # === 3. METADATOS, REDES Y COMENTARIOS ===
                '[class*="related"]', '[class*="suggested"]', '[class*="recommend"]', 
                '[class*="next-story"]', 
                '.article-meta', '.byline', '.metadata', '.author-info', '.date-info', 
                '[class*="author-box"]', '[class*="share-bar"]', '[class*="social-media"]', 
                '#comments', '.article-comments', '.SocialShare',
                
                # === 4. WIDGETS Y FORMULARIOS ===
                '.reviews-section', '.guide-links', '.related-cities', 
                '.language-selector', '.currency-selector', 
                '[class*="selector"]', '[class*="options"]',
                'input', 'form', 'button', 'iframe', 'script', # Etiquetas de formulario/código/media externa
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
        Ejecuta la extracción de contenido usando el modo 'simple' (Plan A). Si el resultado 
        es insuficiente (por debajo de umbrales mínimos de contenido o bloques), utiliza el modo 'robust' (Plan B) como fallback.
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
                
                # Bucle para SIMULAR el progreso y GENERAR los logs detallados 
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
                
                # 2. LLAMADA A IA CONSOLIDADA 
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
                    summary = self.ai_service.analizar_bloque_contenido(chunk_content, chunk_media, query, chunk_heading) 
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
                ai_titles=[],
                subtitles=[],
                text_content=context_data,
                headers={"main_heading": [structured_chunks[0]['heading']] if structured_chunks else [title], "count": [str(len(structured_chunks))]},
                ai_analysis=ai_analysis_result,
                title_suggestions=[], 
                final_structure="",
                article_blocks=structured_chunks, 
                status='OK' 
            )
            all_results.append(result)

        # 4. FASE 4: Preparación para Análisis Manual (Omisión de LLAMADAS IA FINALES)
        valid_results = [r for r in all_results if r.status == 'OK'] 
        consolidated_text = ""

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
            
            
            final_structure_text = "Contenido consolidado listo para análisis IA."

            yield "data: [FASE 4: Análisis IA omitido. Contenido consolidado listo para generación manual.]\n\n"
            
        elif not valid_results:
            final_structure_text = "No se pudo generar la estructura final debido a fallos de scraping."
        else: # not req.use_ai:
            final_structure_text = "Análisis IA desactivado."


        # 5. FASE 5: PREPARACIÓN DE RESPUESTA FINAL
        final_response = models.ScrapeResponse(
            query=query,
            count=len(valid_results),
            results=all_results, 
            final_structure=final_structure_text, 
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

def analisis_final_ia(req: models.AIAnalysisRequest) -> Dict[str, Any]:
    """Punto de entrada para el análisis final de IA (Servicio de IA), incluyendo regeneración de secciones."""
    ai_service = AIService()
    return ai_service.analisis_final_ia(req)