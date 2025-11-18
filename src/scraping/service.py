#redactoria/src/scraping/service.py
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
from fastapi import HTTPException
from .models import PeticionGeneracionContenido


urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
# --- 1. CLASE AIService: Control y Generación de IA ---

class AIService:
    """
    Gestiona todas las interacciones con el modelo de lenguaje (LLM),
    incluyendo resúmenes de bloques y análisis final.
    """

    MODEL_URL = "http://192.168.1.11:1234/v1/chat/completions" #<-- Compu Alda
    #MODEL_URL = "http://host.docker.internal:1234/v1/chat/completions" 
    MODEL_NAME = "openai/gpt-oss-20b"
    DEFAULT_SYSTEM_MESSAGE = (
        "Eres un Redactor SEO, Copywriter y Editor Web de ÉLITE. "
        "Tu única tarea es generar el artículo de blog **COMPLETO** en formato Markdown. "
        "INSTRUCCIÓN CRÍTICA: NO UTILICES NINGÚN TIPO DE FORMATO EN EL TEXTO generado (es decir, NO uses negritas como **, cursivas como * o subrayados). Solo texto plano y encabezados (H2, H3). "
        "Tu mayor prioridad es la **CONCISIÓN** y el cumplimiento **ESTRICTO** de la longitud solicitada. "
        "El contenido debe ser informativo, autoritario, y persuasivo. "
        "Asegúrate de que el texto sea altamente 'escaneable' (usa listas y párrafos muy cortos)."
    )

    def __init__(self):
        pass

    # LLAMADA A LM STUDIO
    def _llm_generate(self, 
                      prompt: str, 
                      system_message: str = DEFAULT_SYSTEM_MESSAGE, 
                      temperature: float = 0.4, 
                      max_tokens: Optional[int] = None 
                      ) -> str:
        
        data = {
            "model": self.MODEL_NAME,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            "temperature":temperature ,
            "stream": False
        }
        
        UNIVERSAL_MAX_TOKENS = 10000 

        data["max_tokens"] = UNIVERSAL_MAX_TOKENS
        try:
            response = requests.post(self.MODEL_URL, headers={"Content-Type": "application/json"}, json=data)
            response.raise_for_status() 
            return response.json()["choices"][0]["message"]["content"].strip()
        
        except requests.exceptions.RequestException as e:
            error_message = f"[FALLO LLM - {response.status_code if 'response' in locals() else 'Red'}: {type(e).__name__} - {str(e)}]"
            return error_message 
        except Exception as e:
            return f"[Error interno inesperado: {e}]"


    # PARSEO DE FORMATO JSON DE LA RESPUESTA IA 
    def limpieza_extraccion_json(self, json_string: str) -> Dict[str, Any]:
    
        # ------------------------------------------------------------------
        # FUNCIÓN ANIDADA: Saneamiento agresivo de caracteres que rompen JSON
        # ------------------------------------------------------------------
        def sanitize_content_for_json(data: Dict[str, Any]) -> Dict[str, Any]:
            """
            Itera sobre el diccionario y aplica un saneamiento doble a las cadenas de texto:
            1. Escapa backslashes ( \ -> \\\\ ).
            2. Elimina caracteres de control ilegales en JSON.
            """
            sanitized_data = {}
            
            for key, value in data.items():
                if isinstance(value, str):
                    safe_value = value.replace('\\', '\\\\')

                    control_char_pattern = r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]' 
                    safe_value = re.sub(control_char_pattern, '', safe_value)
                    
                    sanitized_data[key] = safe_value
                else:
                    sanitized_data[key] = value
            return sanitized_data
        # ------------------------------------------------------------------


        # 1. Limpieza inicial para remover etiquetas Markdown (```json)
        clean_json = re.sub(r'```json\s*|```', '', json_string, flags=re.IGNORECASE).strip()
    
        try:
            # 2. Intento de parseo estándar
            parsed_data = json.loads(clean_json)
            
            # 3. Saneamiento agresivo y retorno del resultado válido
            return sanitize_content_for_json(parsed_data)
            
        except json.JSONDecodeError as e:
            # Reemplazar comillas simples por dobles 
            temp_clean_json = clean_json.replace("'", '"')
            temp_clean_json = re.sub(r'"\s*\n\s*"', '",\n"', temp_clean_json)
            temp_clean_json = re.sub(r'\}\s*\"', '},\n\"', temp_clean_json)
            temp_clean_json = re.sub(r',\s*\}', '}', temp_clean_json)
            temp_clean_json = re.sub(r',\s*\]', ']', temp_clean_json)
            temp_clean_json = re.sub(r'(\s*[\}\]])\s*(\s*[\{\[])', r'\1,\2', temp_clean_json)
            start_index = temp_clean_json.find('{')
            end_index = temp_clean_json.rfind('}')
            
            if start_index != -1 and end_index != -1:
                try:
                    # 1. Parseo forzado sobre la cadena saneada y delimitada
                    forced_data = json.loads(temp_clean_json[start_index:end_index + 1])
                    
                    # 2. Saneamiento de Backslashes y retorno
                    return sanitize_content_for_json(forced_data)
                    
                except json.JSONDecodeError as nested_e:
                    # 3. Si falla incluso el parseo forzado con corrección de sintaxis, es irrecuperable.
                    raise ValueError(
                        f"Fallo de parseo JSON irrecuperable. El LLM no devolvió JSON válido. "
                        f"Error final: {nested_e}"
                    ) from nested_e
            
            # Si no se encontró la estructura { ... } después del fallo inicial.
            raise ValueError(
                f"El LLM devolvió contenido sin estructura JSON ({{...}}). "
                f"Inicio del output: {clean_json[:200]}..."
            ) from e


    #SE ENCARGA DE FORMATEAR LA INFORMACION EXTRAIDA Y UTILIZARLA POR EL LLM 
    def _build_media_text(self, media_info: List[Dict[str, Any]]) -> str:
        if not media_info:
            return "No se encontró contenido multimedia relevante para este bloque."

        media_list = [
            f"- Tipo: {item.get('type', 'Imagen')}, Descripción: {item.get('alt', 'No proporcionada')}"
            for item in media_info
        ]

        media_text = "\n".join(media_list)
        return f"\n--- REFERENCIA DE CONTENIDO MULTIMEDIA (USAR SOLO COMO CONTEXTO) ---\n{media_text}\n---\n"


    # --- ANALISIS DE BLOQUES CON IA ---
    def analizar_bloque_contenido(self, chunk: str, media_info: List[Dict[str, str]], query: str, heading: str) -> str:
        """
        Analiza un bloque de contenido para extraer puntos clave y elementos estructurales.
        """
        media_text = self._build_media_text(media_info)

        prompt = f"Basándote en el ARTÍCULO CONSOLIDADO, el cual contiene MÚLTIPLES SECCIONES ESTRUCTURADAS, bajo el título '{heading}' y relacionado con el tema '{query}':\n---\n{chunk}\n{media_text}\n---\n\n"
        
        # INSTRUCCIÓN CLAVE CORREGIDA: Pedimos extracción completa, pero formato denso.
        prompt += f"""Realiza un **ANÁLISIS ESTRUCTURAL Y TEMÁTICO COMPLETO**. Tu tarea es analizar el bloque anterior y devolver **TODOS los conceptos clave, nombres de subtemas y datos esenciales** que contribuyan a un blog de alta calidad para el tema '{query}'. **NO OMITAS NINGÚN PUNTO CLAVE.**

        **Formato de Salida Obligatorio:**
        1.  **Título de la Página Fuente:** Comienza con una línea que diga: **[FUENTE: {heading}]**
        2.  **Lista Atómica:** Luego, genera una lista de puntos usando guiones (`-`). Cada punto debe ser un **CONCEPTO ÚNICO**, un **TÍTULO DE SUBTEMA**, o un **HECHO AISLADO**.
        3.  **Prohibición de Descripción:** Los puntos de la lista **NO DEBEN SER PÁRRAFOS EXPLICATIVOS NI RESÚMENES LARGOS**. Deben ser frases muy cortas y densas que identifiquen el tema o concepto.

        **Ejemplo de formato denso (Correcto):**
        [FUENTE: Título de la página]
        - Prohibición legal: Ley 1333/2009.
        - Animales no aptos: Primates y Aves Silvestres.
        - Riesgo de zoonosis.
        - Sanciones económicas por tráfico.
        
        Devuelve el análisis ÚNICAMENTE con el formato solicitado, sin NINGUNA INTRODUCCIÓN, EXPLICACIÓN O COMENTARIO ADICIONAL.
        """
        
        # 2. NUEVO SYSTEM_MSG
        # La IA no debe generar NADA que no sea la lista de puntos.
        system_msg = "Eres un Analista de Contenido Completo y Denso. Tu ÚNICA TAREA es analizar la información proporcionada de manera exhaustiva y devolver SOLAMENTE una lista de conceptos estructurales y temáticos atómicos. No generes introducciones, conclusiones, resúmenes, explicaciones, o cualquier texto que no sea el análisis solicitado."        
        
        return self._llm_generate(prompt, system_msg, temperature=0.5)
    

    # --- GENERA EL ESQUEMA COMPLETO DEL BLOG (CORREGIDO PARA DENSIDAD Y NO REDUNDANCIA)
    def generar_estructura_seo_final(self, 
                                 consolidated_text: str, 
                                 query: str, 
                                 title_base: str, 
                                 categoria: str,
                                 idioma: str,
                                 tecnica: str,
                                 acento: str,
                                 tono: str,
                                 longitudes_competencia_str: str = 'N/A'
                                 ) -> Dict[str, Any]:
    
        keywords_str = ', '.join([query])
        
        # -- SYSTEM MESSAGE: contexto base del modelo --
        system_message = f"""
            Eres un Estratega SEO Senior y Arquitecto de Contenidos Competitivo y Estratégico experto en planificación estructural.

            Tu tarea es **diseñar estructuras jerárquicas SEO completas, naturales y competitivas** para artículos de turismo familiar y cultural.

            Debes trabajar en el idioma '{idioma}', con el acento cultural '{acento}' y aplicando el tono de voz '{tono}'.

            Tu salida debe ser **únicamente un objeto JSON limpio y válido**, sin texto adicional antes o después.
            No uses frases como 'Aquí está el JSON', ni incluyas bloques como ```json.
            No devuelvas explicaciones, conclusiones ni texto fuera del JSON.
            """
        
        # -- PROMPT PRINCIPAL: instrucciones completas --
        prompt = f"""
        --- CONTEXTO Y OBJETIVO ---
        Eres un estratega SEO experto especializado en blogs turísticos competitivos.
        Tu misión es diseñar una **estructura jerárquica completa, coherente y optimizada para SEO**, del artículo titulado:
        '{title_base}' (tema principal: '{title_base}').

        El objetivo es **superar a la competencia** en cobertura temática, coherencia semántica y relevancia, con una estructura clara y rica en contenido útil.

        --- REFERENCIA DE COMPETENCIA ---
        Longitudes de la Competencia (Palabras): {longitudes_competencia_str}

        Texto consolidado de referencia:
        ---
        {consolidated_text}
        ---

        --- MANDATOS DE ESTRUCTURA ---

        1. **TÍTULO PRINCIPAL (MANDATO ABSOLUTO):**
        - Debe comenzar con un encabezado H1 (1.0) que contenga **exactamente el query original ('{title_base}')**, sin modificarlo.
        - Ejemplo:
            [H1 - 1.0] Qué ver en Dubái 2025

        2. **OBJETIVO PRINCIPAL:**
        - Crear una estructura **altamente optimizada para SEO**, superior a la competencia.
        - Prioriza **profundidad temática y claridad jerárquica** sobre cantidad de palabras.

        3. **NIVELES JERÁRQUICOS:**
        - Usa H2, H3 y H4 según la profundidad requerida.
        - Cada H2 representa una sección sólida.
        - Cada H3 o H4 expande el tema con enfoque específico (actividad, lugar, consejo, historia, etc.).
        - Los títulos deben ser **únicos, naturales y semánticamente distintos.**

        4. **CONTROL DE LONGITUD:**
        - Estima el total de palabras (`estimated_word_count`) según el promedio competitivo.
        - La estimación debe ser un 10%-25% superior al promedio.
        - Nunca superes el 85% del máximo teórico.
        - Ejemplo: si la competencia promedio es 1400 palabras → genera una estimación entre 1500-1600.

        5. **INTEGRACIÓN MULTIMEDIA (REGLA SEO CRÍTICA):**
        - Después de **cada encabezado H2 o H3**, incluye una línea **obligatoria** con el formato:
            [MULTIMEDIA: TIPO | Descripción SEO detallada para Alt Text]
        - **TIPO** puede ser: FOTO, VIDEO, MAPA o GRAFICO.
        - La descripción debe ser rica en palabras clave, natural y específica del encabezado anterior.
        - Ejemplo correcto:
            [H2 - 2.0] Miradores y vistas panorámicas de Dubái
            [MULTIMEDIA: FOTO | Vista aérea del skyline de Dubái al atardecer desde el Burj Khalifa]
            [H3 - 2.1] Sky Views Observatory
            [MULTIMEDIA: FOTO | Turistas disfrutando la vista desde el observatorio en el Downtown de Dubái]

        - Si un encabezado no requiere multimedia, puedes omitir esa línea, pero **al menos el 60% de los H2/H3 deben incluir una.**

        6. **FORMATO DE SALIDA (OBLIGATORIO):**
        - Cada línea representa un encabezado o una línea multimedia.
        - Formato exacto:
            [H{{N}} - X.Y] Título del Encabezado
        - Donde:
            - {{N}} = nivel del encabezado (1, 2, 3 o 4)
            - X.Y = jerarquía decimal (ej. 1.0, 2.1, 2.1.1)
        - No uses Markdown (##, ###, *) ni símbolos decorativos.
        - No repitas temas ni uses encabezados vacíos.

        7. **PROHIBICIONES:**
        - No incluyas secciones de "Resumen", "Conclusión", "Formulario" o "FAQ".
        - No incluyas URLs ni menciones de fuentes.
        - No repitas temas ni uses títulos genéricos.
        - No uses puntuación innecesaria (como “:”, “–”, “…” al final del título).

        8. **AMPLIACIÓN CONTEXTUAL:**
        - Cubre los temas clave del texto consolidado: historia, cultura, gastronomía, transporte, actividades familiares, seguridad, eventos, horarios, etc.
        - Incorpora enfoques naturales: experiencial, educativo, logístico e inspiracional.
        - Los encabezados deben sonar periodísticos y atractivos (no técnicos ni mecánicos).

        --- FORMATO FINAL EXCLUSIVO ---
        Devuelve únicamente el siguiente objeto JSON, sin texto adicional:
        {{
        "structure_markdown": "Estructura detallada con formato [H{{N}} - X.Y] Título.\\n[MULTIMEDIA: TIPO | Descripción SEO]",
        "estimated_word_count": "Número entero con el total estimado (ej. 1500)"
        }}
        """

        # -- Llamada al modelo --
        response_json_str = self._llm_generate(
            prompt,
            system_message=system_message,
            temperature=0.4
        )

        print (response_json_str)

        # -- Limpieza y manejo de errores --
        try:
            return self.limpieza_extraccion_json(response_json_str)
        except Exception as e:
            return {
                "structure_markdown": f"[ERROR DE PARSEO CRÍTICO: {e} - Respuesta IA: {response_json_str[:200]}...]",
                "estimated_word_count": 0
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
        raw_response = self._llm_generate(prompt, system_msg, temperature=0.4)

        # 1. Limpieza de etiquetas Markdown (```json) y extracción del contenido crudo.
        clean_json_str = re.sub(r'```json\s*|```', '', raw_response, flags=re.IGNORECASE).strip()

        # 2. **Paso Clave:** Extraer SOLO el array JSON.
        array_match = re.search(r'(\[[\s\S]*?\])', clean_json_str, re.DOTALL)
        
        if array_match:
            json_to_parse = array_match.group(1).strip()
        else:
            print("ADVERTENCIA: No se encontró la estructura de array JSON ([...]) en la respuesta de la IA.")
            return [] 
            
        try:
            suggestions = json.loads(json_to_parse)
            if isinstance(suggestions, list) and all(isinstance(s, str) for s in suggestions):
                return suggestions 
            else:
                print("ADVERTENCIA: Parseo exitoso, pero el resultado no es List[str].")
                return [] 
                
        except json.JSONDecodeError as e:
            try:
                corrected_json = json_to_parse.replace("'", '"')
                suggestions = json.loads(corrected_json)
                if isinstance(suggestions, list) and all(isinstance(s, str) for s in suggestions):
                    return suggestions
                else:
                    raise ValueError("Formato de lista incorrecto después de corrección.")
            except (json.JSONDecodeError, ValueError):
                print(f"ERROR: Fallo de parseo JSON irrecuperable después de corrección: {e}")
                return [] 
        except Exception as e:
            print(f"ERROR: Excepción inesperada durante el parseo de títulos: {e}")
            return [] 


    #Regeneracion o generacion principal para los contenidos de los H 
    def generar_contenido_seccion (self, req: models.AIAnalysisRequest) -> Dict[str,Any]:
        """
        Logica para la regeneracion o generacion de contenido de una seccion especifica 
        """

        # 1. Validacion de datos
        if not req.regenerate_data:
            raise HTTPException(status_code=400, detail="regenerate_data es requerido para la generacion de contenido.")
        
        try: 
            #Campos base requeridos desde el frontes(Blog_generacion)
            section_title = req.regenerate_data['section_title']
            section_level = req.regenerate_data['section_level']
            full_structure_markdown = req.regenerate_data['full_structure_markdown']
            required_keywords: List[str] = req.regenerate_data.get('required_keywords', [])
            content_type: str = req.regenerate_data.get('content_type', 'parrafo_marrativo')
            context_data: Optional[str] = req.regenerate_data.get('context_data', None)


        except KeyError as e:
            raise HTTPException(status_code=400, detail=f"Falta el campo requerido en regenerate_data:{e}")
        

        # 2 Construccion de intrucciones dinamicas para el prompt

        keyword_instruction = ""
        if required_keywords and isinstance(required_keywords, list):
            keywords_str = ', '.join(required_keywords)
            keyword_instruction = f"""
            INSTRUCCIÓN CLAVE DE SEO: Debes incluir las siguientes palabras clave en el texto: **{keywords_str}**.
            Es FUNDAMENTAL que te enfoques **únicamente** en el contexto de la sección '{section_title}' ({section_level}),
            evitando estrictamente temas y palabras clave que pertenezcan a otros H2/H3 de la estructura general para evitar la redundancia y el canibalismo semántico.
            """

        context_instruction = ""
        if context_data:
            context_instruction = (
                f"\n--- INSTRUCCIÓN CLAVE PARA PREVENCIÓN DE CANIBALISMO ---\n"
                f"La siguiente información describe temas que **YA ESTÁN CUBIERTOS** en otras partes del blog. "
                f"Asegúrate de que tu contenido **NO REPITA** o **REDUNDE** en las ideas listadas abajo, "
                f"sino que las complemente o las aborde desde un ángulo diferente.\n"
                f"{context_data}\n"
                f"--- FIN INSTRUCCIÓN CLAVE ---\n"
            )

    
        format_instruction = ""
        
        if content_type == "lista_pasos":
            format_instruction = "El contenido debe ser una **lista numerada detallada** (1., 2., 3...) de pasos o instrucciones. Cada paso debe ser conciso, claro y estar en una línea separada."
        elif content_type == "lista_caracteristicas":
            format_instruction = "El contenido debe presentarse como una **lista con viñetas** (usando `*` o `-`) que enumere y describa brevemente ventajas, desventajas, características o elementos clave."
        elif content_type == "resumen_conciso":
            format_instruction = "El contenido debe ser un **párrafo único y conciso** (no más de 4-5 frases) que sirva como un resumen ejecutivo, una conclusión o un punto clave, con un lenguaje directo y persuasivo."
        elif content_type == "definicion_detallada":
            format_instruction = "El contenido debe iniciar con el término o frase, seguido de una definición clara y párrafos explicativos que profundicen en el concepto, su historia o su relevancia."        
        elif content_type == "casos_texto":
            format_instruction = "El contenido debe enfocarse en proporcionar múltiples ejemplos o casos de uso prácticos que ilustren el tema. Cada ejemplo debe estar claramente separado, con su título en texto plano y su descripción en un párrafo."
        elif content_type == "comparacion_corta":
            format_instruction = "El contenido debe ser una comparación punto por punto entre 2 o 3 elementos clave (ej. Producto A vs. Producto B). Usa texto plano para los nombres de los elementos y viñetas para contrastar sus características de manera clara."
        elif content_type == "analisis_critico":
            format_instruction = "El contenido debe ser un **análisis estructurado en párrafos** con una introducción clara del problema o tema, un desarrollo del argumento central y una proyección o recomendación clara al final. Debe ser objetivo, sintético y basado en hechos."
        elif content_type == "pro_y_contra":
            format_instruction = "El contenido debe estar dividido en dos secciones claras: Pros (Ventajas) y Contras (Desventajas). Cada sección debe usar una lista con viñetas para enumerar y describir brevemente cada punto de manera equilibrada y separada. No uses negritas para los títulos de las secciones ni para los puntos."
        elif content_type == "datos_estadisticos":
            format_instruction = "El contenido debe enfocarse en presentar datos, cifras y estadísticas relevantes. Cada dato debe ser presentado en una línea separada, comenzando por el valor numérico, seguido de su explicación o contexto. No uses tablas, solo texto y listas."
        elif content_type == "mito_vs_realidad":
            format_instruction = "El contenido debe usar un formato de Mito vs. Realidad para desmentir conceptos erróneos. Cada punto debe tener una línea para el Mito y la siguiente línea para la Realidad (en formato de párrafo explicativo)."
        elif content_type == "linea_tiempo":
            format_instruction = "El contenido debe ser una línea de tiempo cronológica. Utiliza una lista numerada donde cada punto represente un hito o evento en la secuencia temporal, incluyendo el año o la fecha al inicio de cada punto."
        else: 
            format_instruction = (
                "Tu tarea es generar el contenido utilizando el formato que consideres más apropiado (párrafos y listas con viñetas) para el tema de la sección. "
                "PROHIBIDO: No utilices negritas, cursivas o subrayados. Solo texto plano."
            )

        # 3. Construcción del Prompt Principal (Inyectando las instrucciones)
        prompt = f"""
            Eres un escritor experto en SEO y un especialista en el tema '{req.query}'.
            Tu tarea es generar el contenido detallado para la sección con el título: '{section_title}',
            que pertenece al nivel de encabezado '{section_level}'.
            
            SOLO DEVUELVE EL TEXTO DEL CONTENIDO DE LA SECCIÓN SOLICITADA, SIN AÑADIR EL TÍTULO DE LA SECCIÓN NI NINGÚN OTRO ENCABEZADO.

            El contenido debe ser en idioma '{req.idioma}' con acento '{req.acento}' y tono '{req.tono}'.

            {context_instruction} 
            
            {keyword_instruction}

            --- INSTRUCCIÓN DE FORMATO EXCLUSIVO ---
            {format_instruction} 
            --- FIN INSTRUCCIÓN DE FORMATO ---

            CONTEXTO DE LA ESTRUCTURA DEL BLOG (usa esto para mantener el flujo):
            {full_structure_markdown}

            REFERENCIA DE CONTENIDO DEL SCRAPING (usa esto como fuente primaria de información y para asegurar la factualidad):
            {req.consolidated_content}

            Asegúrate de que la salida respete estrictamente la INSTRUCCIÓN DE FORMATO provista.
            """


        # 4. Llamada al LLM y Procesamiento
        generated_content = self._llm_generate(
            prompt=prompt,
            system_message="Eres un escritor SEO profesional.",
            temperature=0.6
        )

        return {
            "generated_content": generated_content,
            "success": True,
            "log": "Contenido generado exitosamente."
        }

      
    # -- GENERA EL CONTENIDO DE EL ESQUEMA DEL BLOG
    def generar_contenido_blog_libre(self, req: models.AIAnalysisRequest) -> Dict[str, Any]:   
        # 1. Validación y Extracción de Datos 
        if not req.regenerate_data:
            raise HTTPException(status_code=400, detail="El campo 'regenerate_data' es requerido para la generación completa.")

        try:
            # Uso de .get() con un valor por defecto para claridad y robustez
            data = req.regenerate_data
            section_title = data.get('section_title')
            section_level = data.get('section_level')
            full_structure_markdown = data.get('full_structure_markdown')
            section_to_generate_markdown = data.get('section_text') 
            estimated_word_count = data.get('estimated_word_count', 0)
            content_notes = data.get('content_notes', "")


                
            if not all([section_title, full_structure_markdown, section_to_generate_markdown]):
                # Lanzamos una única excepción si faltan campos CRÍTICOS
                raise ValueError("Faltan campos críticos ('section_text', 'full_structure_markdown', o 'section_title') en regenerate_data.")
            
            main_title = getattr(req, "main_title", None)
            idioma = getattr(req, "idioma", None)
            acento = getattr(req, "acento", None)
            
            if not idioma:
                raise HTTPException(status_code=400, detail="El campo 'idioma' no fue proporcionado en la solicitud.")
            if not acento:
                raise HTTPException(status_code=400, detail="El campo 'acento' no fue proporcionado en la solicitud.")
            
            print("Estructura completa recibida:\n", data.get("full_structure_markdown", "")[:500])

        except (TypeError, ValueError) as e:
            # Captura errores si regenerate_data no es un dict o si la validación de 'all' falla
            raise HTTPException(status_code=400, detail=f"Error en la estructura de regenerate_data: {e}")

        # 2. Preparación de Contexto (Historial) 
        history_text = "No se ha generado contenido previo. Genera de forma cohesiva."
        if isinstance(req.previous_content, list) and req.previous_content:
            # Solo usar el último bloque para ser conservador con el límite de tokens
            history_text = f"Último bloque de contenido generado: \n{req.previous_content[-1]}"
        elif isinstance(req.previous_content, str) and req.previous_content:
            history_text = req.previous_content

        # 3. Lógica de Longitud y Densidad 
        instruccion_longitud = ""
        target_avg_words = 0
        if estimated_word_count > 0:
            num_sections = len([
                line for line in full_structure_markdown.split('\n')
                if re.match(r'^\[H[1-9]\s*-\s*[0-9.]+\]', line.strip())
            ]) or 1

            # Reduce la longitud promedio al 85% para dejar espacio al usuario
            target_avg_words = int((estimated_word_count * 0.85) / num_sections)

            instruccion_longitud = (
                f"### ESTRATEGIA DE LONGITUD Y DENSIDAD (CONTROLADA): \n"
                f"El artículo completo tiene un límite estimado de {estimated_word_count:,} palabras. "
                f"Esta sección debe usar como máximo **{target_avg_words:,} palabras**. "
                f"Deja un margen narrativo (~15%) para edición o aportes adicionales del usuario. "
                f"Prioriza la claridad y la narrativa humana por encima de la extensión."
            )

        # 4. Extracción de Cabeceras para JSON 
        # 1. La primera clave es siempre el título de la sección actual (sin importar el nivel)
        headers_for_json = [section_title] 
        
        # 2. Extraer sub-cabeceras (H3, H4, etc.)
        sub_headers_pattern = r'(\[H[0-9] - [0-9.]+\].*\s*(.+)$)|(^[#]{3,}\s*(.+)$)'
        sub_headers_raw = re.findall(sub_headers_pattern, section_to_generate_markdown, re.MULTILINE)
        
        # Limpiamos y aplanamos la lista de resultados del regex
        sub_headers = [h for match in sub_headers_raw for h in (match[1] or match[3]).strip().split('\n') if h.strip() and h.strip() != section_title]

        # Añadir subtítulos limpios, evitando duplicados y el título principal
        headers_for_json.extend(h for h in sub_headers if h not in headers_for_json)
        
        # Crear esquema de ejemplo (CRÍTICO para la estructura del JSON)
        json_schema_example = {header: f"[CONTENIDO EN MARKDOWN PARA '{header}']" for header in headers_for_json}
        json_schema_example_str = json.dumps(json_schema_example, indent=2, ensure_ascii=False)

        # 5. Construcción del Prompt (El corazón de la simplificación) 
        system_message = f"""
            Eres un redactor experto en SEO narrativo, análisis competitivo y storytelling editorial.
            Tu tarea es generar el contenido completo de la sección actual del blog, asegurando coherencia, valor semántico y desarrollo natural.

            ---
            CONTEXTO EDITORIAL
            - Título principal: {req.main_title}
            - Idioma: {idioma}
            - Acento: {acento}
            - Técnica: {req.tecnica}
            - Tono: {req.tono}

            Escribe con naturalidad humana, fluidez narrativa y precisión informativa. No resumas en exceso ni generes texto plano o genérico.

            ---
            REGLAS CRÍTICAS DE SALIDA:
            - SALIDA (CRÍTICA):** Debes devolver **únicamente un objeto JSON**. No incluyas ningún texto fuera del bloque JSON.
            - CLAVES: El JSON debe tener una clave por cada título/subtítulo. Las claves deben coincidir **exactamente** con los títulos limpios.
            - VALORES: Los valores deben contener el **contenido redactado en formato Markdown plano**, sin encabezados (##, ###) dentro de ellos.
            - ESCAPE (CRÍTICO):** Dentro del JSON, usa **doble barra invertida (\\\\)** para representar una barra literal (\).

            ---
            OBJETIVO
            1. Crear contenido original competitivo que pueda superar a los resultados más relevantes en buscadores.
            2. Mantener coherencia con el contexto global del artículo y con las secciones anteriores.
            3. Integrar las ideas principales y secundarias con un hilo narrativo fluido.

            ---
            ESTRUCTURA Y REDACCIÓN
            - Redacta cada apartado de forma completa, con explicación, desarrollo y cierre natural.
            - No hagas listas a menos que sean necesarias para la claridad del lector.
            - Si el título principal agrupa subtítulos, genera solo una breve introducción narrativa para contextualizar.
            - Mantén proporción entre secciones según la instrucción de longitud.
            - Si el tema es técnico o legal, prioriza precisión y ejemplos reales sobre adornos narrativos.
            - No inventes datos falsos, usa solo información verosímil o neutra.

            ---
            INSTRUCCIÓN DE LONGITUD
            {instruccion_longitud}
            - No sobrepases el límite indicado para la sección.
            - Si el tema lo permite, amplía el contenido dentro del rango estimado con explicaciones o contexto adicional.
            - Si el límite es corto, sintetiza con claridad sin perder coherencia.

            ---
            CALIDAD Y COHESIÓN
            - El texto debe ser claro, natural y sin repeticiones.
            - Integra los términos relevantes solo cuando sean naturales.
            - Mantén continuidad con el historial recibido, sin duplicar ideas.
            - Genera una lectura fluida que aporte valor al lector y cumpla criterios SEO narrativos.
        """

        prompt = f"""
        ## CONTEXTO GLOBAL (MAPA DEL ARTÍCULO)
        {full_structure_markdown}

        ## HISTORIAL DE CONTENIDO (NO REPETIR)
        {history_text}

        ## REFERENCIA DE CONTEXTO (SCRAPING)
        {req.consolidated_content or 'No hay contenido scrapeado disponible.'}

        ##NOTAS DE CONTENIDO PARA ESTA SECCION 
        Estas notas contienen ideas específicas, o incluso texto ya redactado por el usuario, que **DEBES** utilizar si está presente. Si están vacías, ignóralas y genera el contenido.
        {content_notes or 'Notas Vacías. Genera Contenido.'}

        ## ESTRUCTURA DE LA SECCIÓN A GENERAR
        Tu tarea es llenar el contenido de **TODOS** los títulos/subtítulos de esta sección H2.
        **RECUERDA:** Si el título principal solo introduce los subtítulos, su valor de contenido **DEBE SER VACÍO ("")** en el JSON.
        {section_to_generate_markdown}

        ## FORMATO DE SALIDA REQUERIDO (JSON)
        **Claves Requeridas:** {', '.join(headers_for_json)}
        ```json
        {json_schema_example_str}
        ```
        **Instrucción Final:** Genera el JSON que contiene el contenido asociado a CADA título/subtítulo.
        """

        try:
            generated_response = self._llm_generate( 
                prompt=prompt,
                system_message=system_message,
                temperature=0.7, 
                max_tokens=10000 
            )
            
            # Limpieza de json 
            response_corrected = re.sub(
                r'(?<!\\)\\(?![ntrbvf/\\]|u[0-9a-fA-F]{4}|\"|\')', 
                r'\\\\', 
                generated_response
            )
            
            structured_content = self.limpieza_extraccion_json(response_corrected)

            print(structured_content)
            
        except HTTPException as http_e:
            raise http_e
        except Exception as llm_e:
            raise HTTPException(status_code=503, detail=f"Fallo en la comunicación/parseo con el modelo LLM. El modelo devolvió contenido no JSON o no se pudo corregir el error de escape: {str(llm_e)}")

        
        # 6. Respuesta Final devuelve el JSON serializado al frontend
        return {
            "generated_content": json.dumps(structured_content), 
            "success": "True",
            "log": f"Contenido estructurado generado para la sección: {section_title} (Nivel {section_level})."
        }


    # --- AQUI ESTA LA LOGICA DE REGENERACION Y LIMPIEZA DEL JSON QUE DEVUELVE LA IA 
    def analisis_final_ia(self, req: models.AIAnalysisRequest) -> Dict[str, Any]:
        """Punto de entrada para el análisis final de IA, incluyendo regeneración de secciones (Títulos y Contenido)."""

        consolidated_text = req.consolidated_content
        query = req.query
        title_base = getattr(req, 'title_base', query)
        categoria = getattr(req, 'categoria', 'blog')
        idioma = getattr(req, 'idioma', 'es')
        tecnica = getattr(req, 'tecnica', 'SEO')
        acento = getattr(req, 'acento', 'neutral')
        tono = getattr(req, 'tono', 'profesional')
        longitudes_competencia_str = getattr(req, 'longitudes_competencia_str', 'N/A')
        
        # LÓGICA DE REGENERACIÓN 
        if req.section_type:
            content = None
            previous_history = req.previous_content 
            
            if not isinstance(previous_history, list):
                previous_history = [previous_history] if previous_history else None

            # --- MANEJO DE SECCIONES PROHIBIDAS ---
            if req.section_type in ['keywords', 'titles']:
                # Se devuelve un error si se intenta regenerar una sección prohibida.
                raise ValueError(f"La regeneración de '{req.section_type}' está deshabilitada ya que se usan los datos proporcionados por el dashboard.")
            
            # --- 1. REGENERACIÓN DE TÍTULOS (ESTRUCTURA) ---
            elif req.section_type == 'structure_section': 
                
                # Validación de datos para regeneración de estructura
                if not req.regenerate_data or 'section_text' not in req.regenerate_data or 'full_structure_markdown' not in req.regenerate_data:
                    raise ValueError("Faltan datos requeridos para la regeneración de la sección de estructura: section_text y full_structure_markdown.")

                # Llama al método regenerar_titulos, que debe devolver List[str]
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
            # --- 2. GENERACIÓN DE CONTENIDO (CUERPO DE TEXTO) ---
            elif req.section_type == 'content_generation':
    
                # 1. Llama al nuevo método, replicando el patrón de self.
                try:
                    # Llama a la nueva función especializada de la misma clase.
                    content_result = self.generar_contenido_seccion(req)
                    
                    # El método ya retorna el diccionario {"generated_content": ..., "section_type": ...}
                    return content_result 
                
                except HTTPException as e:
                    # Re-lanza excepciones HTTP específicas
                    raise e
                except Exception as e:
                    # Captura cualquier error inesperado
                    raise HTTPException(status_code=500, detail=f"Error en la delegación de generación de contenido: {str(e)}")


            # --- BLOQUE DE RETORNO DE REGENERACIÓN (DESPACHADOR DE RESPUESTAS) ---
            if content is not None:
                
                # Retorno de Títulos (Lista de Strings) 
                if req.section_type == 'structure_section' and isinstance(content, list):
                    # La clave 'regenerated_suggestions' la espera el frontend para las 3 opciones de los titulos.
                    return {"regenerated_suggestions": content, "section_type": req.section_type}
                
                # Retorno de Contenido (String único) 
                elif req.section_type == 'content_generation' and isinstance(content, str):
                    # La clave 'generated_content' la espera el frontend para el cuerpo del texto.
                    return {"generated_content": content, "section_type": req.section_type}
                
                # LÓGICA DE LIMPIEZA Y RETORNO DE FALLBACK (Para contenido simple/otros tipos)
                if isinstance(content, str):
                    content = content.replace('\r\n', '\n').replace('\r', '\n')
                    content = re.sub(r'[^\S\n]+', ' ', content)
                    content = '\n'.join([line.strip() for line in content.split('\n') if line.strip()])
                    content = content.strip()
                    
                return {"regenerated_content": content, "section_type": req.section_type}
                
            else:
                raise ValueError(f"No se pudo generar contenido para el tipo de sección: {req.section_type}")

        # --- LÓGICA DE GENERACIÓN INICIAL DE ESTRUCTURA COMPLETA (Si no hay section_type) ---
        analysis_result = self.generar_estructura_seo_final(
            consolidated_text=consolidated_text,
            query=query,
            title_base=title_base,
            categoria=categoria,
            idioma=idioma,
            tecnica=tecnica,
            acento=acento,
            tono=tono,
            longitudes_competencia_str=longitudes_competencia_str
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
    def _get_media_info(tag: Tag) -> Dict[str, str] | None: 
        """
        Extrae la URL de origen y el texto descriptivo (alt/caption) de un elemento multimedia, 
        manejando atributos de carga perezosa, miniaturas de YouTube y contenedores genéricos.
        """

        PRIMARY_MEDIA_TAGS = ['img', 'picture', 'iframe', 'video', 'figure', 'source']
        
        # Lista ampliada de atributos de Lazy-Loading y URLs de fondo
        LAZY_ATTRIBUTES = [
            'data-src', 'data-original', 'data-url', 'data-lazy-src', 'data-image-src', 
            'srcset', 'data-srcset', 'data-iframe-src', 'data-lazyload', 'data-large-file',
            'data-bg-src', 'data-bg', 'data-srcset-mobile' 
        ]
        
        # --- FILTRO DE ENTRADA PERMISIVO ---
        is_media_tag = tag.name in PRIMARY_MEDIA_TAGS
        # Detección de la miniatura precargada de YouTube (clase específica)
        is_youtube_div = tag.name == 'div' and 'ytp-cued-thumbnail-overlay' in tag.get('class', [])
        # Detección de contenedores genéricos con atributos de carga perezosa
        is_lazy_container = tag.name in ['div', 'span', 'section'] and any(tag.get(attr) for attr in LAZY_ATTRIBUTES)

        if not is_media_tag and not is_youtube_div and not is_lazy_container:
            return None
        
        src = tag.get('src')
        
        # --------------------------------------------------------------------------
        # 1. LÓGICA DE CARGA PEREZOSA (data-*)
        # --------------------------------------------------------------------------
        if not src or (is_lazy_container and not src): 
            for attr in LAZY_ATTRIBUTES:
                if tag.get(attr):
                    src_value = tag.get(attr)
                    
                    # Manejo de srcset/data-srcset
                    if attr in ['srcset', 'data-srcset', 'data-srcset-mobile'] and src_value:
                        try:
                            last_pair = src_value.split(',')[-1].strip()
                            src = last_pair.split(' ')[0]
                        except:
                            src = None
                    else: 
                        src = src_value
                    if src: break
            
        # --------------------------------------------------------------------------
        # 2. DETECCIÓN DE IMÁGENES/VIDEOS EN ATRIBUTO 'STYLE' (Fallo común en blogs)
        # --------------------------------------------------------------------------
        if not src and tag.get('style'):
            style_attr = tag.get('style')
            
            # Búsqueda de background-image: url(...)
            style_match_img = re.search(r'background-image:\s*url\s*\(["\']?(.+?)["\']?\)', style_attr, re.I)
            if style_match_img:
                src = style_match_img.group(1)
            
            # Detección de miniatura de YouTube por estilo si falló la clase
            elif 'ytp-cued-thumbnail-overlay-image' in tag.get('class', []):
                match_url = re.search(r'url\("?(.+?)"?\)', style_attr)
                if match_url:
                    thumb_url = match_url.group(1).replace('"', '')
                    id_match = re.search(r'/vi/([a-zA-Z0-9_-]+)/', thumb_url)
                    if id_match:
                        src = f"https://www.youtube.com/embed/{id_match.group(1)}"


        # --------------------------------------------------------------------------
        # 3. DETECCIÓN POR CLASE YOUTUBE (Si el src aún está vacío y es el div)
        # --------------------------------------------------------------------------
        if is_youtube_div and not src:
            try:
                image_div = tag.find('div', class_='ytp-cued-thumbnail-overlay-image')
                if image_div:
                    style_attr = image_div.get('style', '')
                    match_url = re.search(r'url\("?(.+?)"?\)', style_attr)
                    
                    if match_url:
                        thumb_url = match_url.group(1).replace('"', '')
                        id_match = re.search(r'/vi/([a-zA-Z0-9_-]+)/', thumb_url)
                        if id_match:
                            # Creamos la URL de embed del video
                            src = f"https://www.youtube.com/embed/{id_match.group(1)}"
            except:
                pass 


        # --------------------------------------------------------------------------
        # 4. LÓGICA DE DETECCIÓN FINAL Y CLASIFICACIÓN
        # --------------------------------------------------------------------------
        if src and ContentExtractor.is_relevant_src(src):
            
            media_type = 'Imagen'; alt_text = tag.get('alt', '')
            
            # Clasificación para tags multimedia primarios
            if tag.name in ['iframe'] and any(keyword in src for keyword in ['youtube.com', 'youtu.be', 'vimeo.com', 'maps.google.com']): 
                media_type = 'Video/Mapa' 
                alt_text = tag.get('title') or alt_text
            elif tag.name == 'video' or any(ext in src.lower() for ext in ['.mp4', '.webm', '.ogg']): 
                media_type = 'Video'
            
            # Clasificación para tags contenedores genéricos
            elif tag.name in ['div', 'span', 'section'] or is_lazy_container:
                if any(ext in src.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']):
                    media_type = 'Imagen (Lazy/CSS)'
                elif any(ext in src.lower() for ext in ['youtube.com', 'youtu.be', 'vimeo.com']):
                    media_type = 'Video (Lazy/CSS)'
                else:
                    media_type = 'Otro Multimedia'


            # Intenta obtener el pie de foto (caption)
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
                if area and len(area.get_text(strip=True)) > 500: #<-- En caso de necesitar menos palabras para el scrapping reducirlo
                    temp_content_area = area
                    break

        # ----------------------------------------------------------------------
        # B. DETECCIÓN ROBUSTA (Plan B: Heurística de Densidad y Selectores Agresivos)
        # Se ejecuta si el modo es 'robust' O si el Plan A falló.
        # ----------------------------------------------------------------------
        
        if mode == 'robust' or (mode == 'simple' and not temp_content_area):
            
            # Selectores de contenedores de artículo 
            article_container_selectors = [
                'div[itemprop*="articleBody"]', '.entry-content', '.post-content', 
                '.article-body', '.post-body', '.article-main-content', '.td-post-content', 
                '.post-inner', '.content-wrap', '.single-post-content', 
                
                # Selectores Agresivos
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
            # Lista de etiquetas esenciales que SI deben sobrevivir 
            essential_tags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'li', 'a', 'strong', 'em', 'blockquote', 'img', 'figure', 'ul', 'ol', 'video', 'table', 'span', 'br', 'iframe']
            
            for element in temp_content_area.find_all(True):
                is_noise = False
                
                # Criterio C.1: Eliminación por Lista Blanca y Vacío (Protege el contenido esencial)
                if element.name not in essential_tags:
                    # Busca si el elemento tiene un hijo multimedia 
                    has_media_child = element.find(['img', 'figure', 'iframe', 'video', 'picture'], recursive=False)
                    # Si no es un tag esencial y NO tiene texto significativo
                    if len(element.get_text(strip=True)) < 50 and not has_media_child: 
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
                
                # FILTRO : Títulos muy cortos o conocidos como ruido visual
                if len(text_content) < 5 or any(exc in text_content.lower() for exc in ['pie de foto', 'foto:', 'imagen de', 'ver galeria', 'crédito']): continue
                

                # INICIO DE FILTRO UNIVERSAL CONTRA EL RUIDO DE LAS PAGINAS
                # 1. Chequeo de calidad del bloque ANTERIOR antes de guardarlo.
                if current_heading is not None and current_content:
                    
                    texto_consolidado = " ".join(current_content)
                    len_texto = len(texto_consolidado)
                    heading_strip = current_heading.strip()
                    
                    # FILTRO 1: DUPLICACIÓN HEADER-CONTENIDO EXTENDIDA 
                    if len_texto < 1500 and texto_consolidado.startswith(heading_strip): 
                        current_heading = text_content
                        current_content = []
                        current_media = []
                        continue 

                    # FILTRO 2: DENSIDAD DE ENLACES ADAPTATIVA MÁS AGRESIVA 
                    link_count = texto_consolidado.lower().count('http') + texto_consolidado.lower().count('www.')
                    
                    # Si el bloque es PEQUEÑO (< 500 chars) Y DENSO EN ENLACES (>= 3), es ruido.
                    if len_texto < 500 and link_count >= 3: 
                        current_heading = text_content
                        current_content = []
                        current_media = []
                        continue 
                        
                # FIN DE FILTROS UNIVERSALES CONTRA EL RUIDO EN LAS PAGINAS

                if current_heading is None or text_content.strip() != current_heading.strip():
                    save_current_block()
                    current_heading = text_content; current_content = []; current_media = []
                
            # 3. Manejo de Contenido Multimedia
            media_info = ContentExtractor._get_media_info(tag) 
            if media_info: current_media.append(media_info) 
                
            # 4. Manejo de Contenido Textual
            is_content_tag = tag_name in ['p', 'ul', 'ol', 'blockquote']
            
            # INCULYE LOS DIVS Y SECTION EN EL CONTENIDO DE LAS PAGINAS 
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
            for tag in soup(["script", "style", "form"]): tag.decompose()

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
                'input', 'form', 'button', 'script', # Etiquetas de formulario/código/media externa
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
        else:
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