import logging
import os
import re
from uuid import UUID
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from src.auth.models import TokenData
from src.core.content_generator import ContentGenerator, _FAV_CITY_DEFAULTS  
from src.utils.file_utils import FileHandler
from src.utils.text_utils import TextProcessor  
from . import models
from ..landing_pages import service as lp_service
import traceback

class IAService:
    """Servicio para manejar generación de contenido IA y traducción"""

    _PRIMARY_KW_PATTERN = re.compile(r"\b(?:alquil\w*|rent\w*)\b", re.IGNORECASE)
    _PRIMARY_KW_ALLOWED_FIELDS = re.compile(
        r"^(tit(?:_\d+)?|titulo|h2|h2_desc|desc(?:_h[23])?|desc(?:_\d+)?|faq_\d+|ip_usa|ip_bra)$",
        re.IGNORECASE,
    )
    
    # Mapeo de bloques a métodos del generador
    BLOCK_METHODS = {
        "quicksearch": "generate_quicksearch",
        "fleet": "generate_fleet", 
        "agencies": "generate_agencies",
        "faqs": "generate_faq",
        "car_rental": "generate_car_rental",
        "fav_city": "generate_fav_city",
        "bloquehistoria": "generate_bloquehistoria",
        "favoritecities": "generate_fav_city",
        "carrental": "generate_car_rental",
    }
    
    BLOCK_NAMES = {
        1: "Bloque 1",
        2: "Bloque 2", 
        3: "Bloque 3",
        4: "Bloque 4",
        5: "Bloque 5",
        6: "Bloque 6"
    }

    @staticmethod
    def normalize_block_type(block_type: str) -> str:
        """Homologa aliases de bloque entre frontend, templates y backend."""
        bt = (block_type or "").strip()
        bt_lower = bt.lower()
        alias_map = {
            "favoritecities": "fav_city",
            "favorite_cities": "fav_city",
            "locationscarousel": "locationscarrusel",
            "carrental": "car_rental",
            "car_rental": "car_rental",
            "faq": "faqs",
            "questions": "questions",
        }
        return alias_map.get(bt_lower, bt_lower)

    @staticmethod
    def clean_html_artifacts(text: str) -> str:
        """
        Limpia  HTML/XML no deseados del texto generado por el LLM.
        """
        import re
        
        if not text:
            return text
        
        # Eliminar spans 
        text = re.sub(r'<span[^>]*class="[^"]*SCXW[^"]*"[^>]*>', '', text)
        text = re.sub(r'<span[^>]*data-contrast="[^"]*"[^>]*>', '', text)
        text = re.sub(r'<span[^>]*xml:lang="[^"]*"[^>]*>', '', text)
        text = re.sub(r'<span[^>]*lang="[^"]*"[^>]*>', '', text)
        text = re.sub(r'<span[^>]*style="[^"]*"[^>]*>', '', text)
        text = re.sub(r'<span[^>]*data-ccp-props="[^"]*"[^>]*>', '', text)
        
        # Eliminar cualquier span restante
        text = re.sub(r'</?span[^>]*>', '', text)
        
        # Eliminar entidades HTML comunes
        text = text.replace('&nbsp;', ' ')
        text = text.replace('&amp;', '&')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&quot;', '"')
        
        # Limpiar espacios múltiples (preservar saltos de línea)
        text = re.sub(r'[^\S\n]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)

        # Limpiar espacios al inicio y final
        text = text.strip()
        
        return text

    @staticmethod
    def _preserve_case(replacement: str, original: str) -> str:
        if original.isupper():
            return replacement.upper()
        if original[:1].isupper():
            return replacement.capitalize()
        return replacement

    @staticmethod
    def _limit_primary_keyword_mentions(text: str, max_mentions: int = 1) -> str:
        """Limita menciones de la familia alquila/renta a maximo 1 por campo."""
        if not text or max_mentions < 0:
            return text

        mentions = 0
        replacement_idx = 0
        alternatives = ("reserva", "compara", "elige", "viaja")

        def _replace(match: re.Match) -> str:
            nonlocal mentions, replacement_idx
            mentions += 1
            if mentions <= max_mentions:
                return match.group(0)

            alt = alternatives[replacement_idx % len(alternatives)]
            replacement_idx += 1
            return IAService._preserve_case(alt, match.group(0))

        limited = IAService._PRIMARY_KW_PATTERN.sub(_replace, text)
        return re.sub(r"\s{2,}", " ", limited).strip()

    @staticmethod
    def _enforce_primary_keyword_policy(structured_content: Dict[str, Any]) -> Dict[str, Any]:
        """Aplica politica de keyword principal por seccion para H2/H3 y descripciones."""
        if not structured_content:
            return structured_content

        for key, value in list(structured_content.items()):
            if not isinstance(value, str):
                continue
            if key.startswith("q_"):
                continue
            if IAService._PRIMARY_KW_ALLOWED_FIELDS.match(key):
                structured_content[key] = IAService._limit_primary_keyword_mentions(value, max_mentions=1)

        return structured_content

    @staticmethod
    def process_llm_response(raw_content: str, block_type: str) -> Dict[str, Any]:
        """
        Procesa respuesta del LLM y la estructura en un diccionario.
        """
        try:
            import re
            block_type = IAService.normalize_block_type(block_type)
            
            # Extraer el contenido think si existe
            think_pattern = r'<think>(.*?)</think>'
            think_match = re.search(think_pattern, raw_content, re.DOTALL)
            think_content = think_match.group(1).strip() if think_match else ""
            
            # Remover las etiquetas think del contenido
            content_without_think = TextProcessor.remove_think_tags(raw_content)
            
            # Limpiar contenido HTML/XML no deseado (como los spans de Word)
            content_without_think = IAService.clean_html_artifacts(content_without_think)
            
            # Extraer campos usando el método existente
            extracted_fields = TextProcessor.extract_fields_from_text(content_without_think)
            
            # Limpiar cada campo extraído
            for key, value in extracted_fields.items():
                extracted_fields[key] = IAService.clean_html_artifacts(value)
            
            # Estructura base del resultado
            result = {
                "think": think_content,
                "raw_content": raw_content,
                "processed_fields": extracted_fields,
                "block_type": block_type
            }
            
            def _numeric_suffix(key: str, prefix: str) -> int:
                if not key.startswith(prefix):
                    return -1
                suffix = key[len(prefix):]
                return int(suffix) if suffix.isdigit() else -1

            # Procesamiento específico por tipo de bloque
            if block_type == "quicksearch":
                # Bloque 1: tit, desc
                result["structured_content"] = {
                    "tit": extracted_fields.get("tit", ""),
                    "titulo": extracted_fields.get("tit", ""),
                    "desc": extracted_fields.get("desc", "")
                }
                
            elif block_type == "fleet":
                # Bloque 2: tit, desc, ip_usa, ip_bra
                result["structured_content"] = {
                    "tit": extracted_fields.get("tit", ""),
                    "titulo": extracted_fields.get("tit", ""),
                    "desc": extracted_fields.get("desc", ""),
                    "ip_usa": extracted_fields.get("ip_usa", ""),
                    "ip_bra": extracted_fields.get("ip_bra", "")
                }

            elif block_type == "deals":
                result["structured_content"] = {
                    "tit": extracted_fields.get("tit", ""),
                    "titulo": extracted_fields.get("tit", ""),
                    "desc": extracted_fields.get("desc", ""),
                    "ip_usa": extracted_fields.get("ip_usa", ""),
                    "ip_bra": extracted_fields.get("ip_bra", ""),
                }

            elif block_type == "deals_additional":
                result["structured_content"] = {}
                indexed_keys = sorted(
                    [k for k in extracted_fields.keys() if _numeric_suffix(k, "tit_") > 0 or _numeric_suffix(k, "desc_") > 0],
                    key=lambda k: _numeric_suffix(k, "tit_") if _numeric_suffix(k, "tit_") > 0 else _numeric_suffix(k, "desc_")
                )
                for key in indexed_keys:
                    result["structured_content"][key] = extracted_fields[key]
                
            elif block_type == "rentacar":
                result["structured_content"] = {
                    "tit": extracted_fields.get("tit", ""),
                    "titulo": extracted_fields.get("tit", ""),
                    "desc": extracted_fields.get("desc", ""),
                    "tit_1": extracted_fields.get("tit_1", ""),
                    "desc_1": extracted_fields.get("desc_1", ""),
                    "tit_2": extracted_fields.get("tit_2", ""),
                    "desc_2": extracted_fields.get("desc_2", ""),
                }

            elif block_type == "bloquehistoria":
                result["structured_content"] = {
                    "tit": extracted_fields.get("tit", ""),
                    "titulo": extracted_fields.get("tit", ""),
                    "desc": extracted_fields.get("desc", extracted_fields.get("desc_h2", "")),
                    "desc_h2": extracted_fields.get("desc", extracted_fields.get("desc_h2", "")),
                }
                
            
                
            elif block_type == "reviews" or block_type == "rentcompanies":
                # Bloque reviews/rentcompanies: tit, desc
                result["structured_content"]= {
                    "tit": extracted_fields.get("tit", ""),
                    "titulo": extracted_fields.get("tit", ""),
                    "desc": extracted_fields.get("desc_h2", extracted_fields.get("desc", "")),
                    "desc_h2": extracted_fields.get("desc_h2", extracted_fields.get("desc", ""))
                }

            elif block_type == "agencies":
                # Bloque 3: tit, desc_h2, desc_h3
                result["structured_content"] = {
                    "tit": extracted_fields.get("tit", ""),
                    "titulo": extracted_fields.get("tit", ""),
                    "desc_h2": extracted_fields.get("desc_h2", ""),
                    "desc_h3": extracted_fields.get("desc_h3", "")
                }
                
            elif block_type == "faqs" or block_type == "questions":
                # Bloque 4: desc
                result["structured_content"] = {
                    "tit": extracted_fields.get("tit", ""),
                    "titulo": extracted_fields.get("tit", ""),
                    "desc": extracted_fields.get("desc", "")
                }
                for i in range(1, 8):
                    q_key = f"q_{i}"
                    if q_key in extracted_fields:
                        result["structured_content"][q_key] = extracted_fields[q_key]
                
            elif block_type == "faqs_additional":
                # Procesar respuestas individuales de FAQ
                result["structured_content"] = {}
                for i in range(1, 8):  # faq_1 hasta faq_7
                    faq_key = f"faq_{i}"
                    if faq_key in extracted_fields:
                        result["structured_content"][faq_key] = extracted_fields[faq_key]
                    q_key = f"q_{i}"
                    if q_key in extracted_fields:
                        result["structured_content"][q_key] = extracted_fields[q_key]
                
            elif block_type == "car_rental" or block_type == "fleetcarrusel":
                # Bloque 5: desc
                result["structured_content"] = {
                    "tit": extracted_fields.get("tit", ""),
                    "titulo": extracted_fields.get("tit", ""),
                    "desc": extracted_fields.get("desc", ""),
                    "desc_h2": extracted_fields.get("desc_h2", ""),
                    "desc_h3": extracted_fields.get("desc_h3", "")
                }
                
            elif block_type == "advicestipocarrusel":
                # Bloque: desc
                result["structured_content"] = {
                    "tit": extracted_fields.get("tit", ""),
                    "titulo": extracted_fields.get("tit", ""),
                    "desc": extracted_fields.get("desc", "")
                }
                
            elif block_type == "advicestipocarrusel_additional":
                # Procesar descripciones de consejos
                result["structured_content"] = {}
                desc_keys = sorted(
                    [k for k in extracted_fields.keys() if _numeric_suffix(k, "desc_") > 0],
                    key=lambda k: _numeric_suffix(k, "desc_")
                )
                for desc_key in desc_keys:
                    result["structured_content"][desc_key] = extracted_fields[desc_key]
                
            elif block_type == "car_rental_additional" or block_type == "fleetcarrusel_additional":
                # Procesar descripciones de tipos de autos
                result["structured_content"] = {}
                indexed_keys = sorted(
                    [k for k in extracted_fields.keys() if _numeric_suffix(k, "tit_") > 0 or _numeric_suffix(k, "desc_") > 0],
                    key=lambda k: _numeric_suffix(k, "tit_") if _numeric_suffix(k, "tit_") > 0 else _numeric_suffix(k, "desc_")
                )
                for key in indexed_keys:
                    result["structured_content"][key] = extracted_fields[key]
                
            elif block_type == "fav_city" or block_type == "locationscarrusel":
                # Bloque 6: tit, desc
                result["structured_content"] = {
                    "tit": extracted_fields.get("tit", ""),
                    "titulo": extracted_fields.get("tit", ""),
                    "h2": extracted_fields.get("tit", ""),
                    "desc": extracted_fields.get("desc", ""),
                    "h2_desc": extracted_fields.get("desc", ""),
                }
                
            elif block_type == "fav_city_additional" or block_type == "locationscarrusel_additional":
                # Procesar descripciones de ciudades/ubicaciones
                result["structured_content"] = {}
                indexed_keys = sorted(
                    [k for k in extracted_fields.keys() if _numeric_suffix(k, "tit_") > 0 or _numeric_suffix(k, "desc_") > 0],
                    key=lambda k: _numeric_suffix(k, "tit_") if _numeric_suffix(k, "tit_") > 0 else _numeric_suffix(k, "desc_")
                )
                for key in indexed_keys:
                    result["structured_content"][key] = extracted_fields[key]
            
            # Garantizar que 'titulo' siempre esté en structured_content si el LLM generó 'tit'
            if "structured_content" in result and "tit" in extracted_fields:
                if not result["structured_content"].get("titulo"):
                    result["structured_content"]["titulo"] = extracted_fields["tit"]
                if not result["structured_content"].get("tit"):
                    result["structured_content"]["tit"] = extracted_fields["tit"]

            # Regla global: maximo 1 mención de alquila/renta por campo en secciones.
            if "structured_content" in result:
                result["structured_content"] = IAService._enforce_primary_keyword_policy(
                    result["structured_content"]
                )

            # Agregar información adicional útil para el frontend
            result["frontend_ready"] = {
                "has_think": bool(think_content),
                "available_fields": list(extracted_fields.keys()),
                "field_count": len(extracted_fields),
                "content_preview": {
                    field: value[:100] + "..." if len(value) > 100 else value
                    for field, value in extracted_fields.items()
                }
            }
            return result
            
        except Exception as e:
            logging.error(f"Error procesando respuesta LLM para {block_type}: {str(e)}")
            return {
                "think": "",
                "raw_content": raw_content,
                "processed_fields": {},
                "structured_content": {},
                "block_type": block_type,
                "error": str(e),
                "frontend_ready": {
                    "has_think": False,
                    "available_fields": [],
                    "field_count": 0,
                    "content_preview": {}
                }
            }

    @staticmethod
    def load_ejemplos_from_data_folder(proyecto: str, dominio: str, categoria: str) -> Dict[str, List[Dict[str, Any]]]:
        """
        Carga ejemplos desde la carpeta data según proyecto, dominio y categoría de la landing page
        """
        try:            
            if not proyecto or not dominio or not categoria:
                logging.error(f"Faltan datos para construir ruta: proyecto={proyecto}, dominio={dominio}, categoria={categoria}")
                return {}
            
            # Limpiar dominio (quitar el punto si existe)
            dominio_clean = dominio.lstrip('.')
            
            # Construir ruta basada en la estructura real
            base_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                "data", "input", proyecto, dominio_clean, categoria
            )
            
            if not os.path.exists(base_dir):
                logging.warning(f"Carpeta de ejemplos no encontrada: {base_dir}")
                return {}
            
            # Inicializar diccionario de ejemplos vacío - se llenará dinámicamente
            secciones_ejemplos = {}
            
            # Buscar archivos JSON en todas las subcarpetas de editores
            for editor_folder in os.listdir(base_dir):
                editor_path = os.path.join(base_dir, editor_folder)
                
                if not os.path.isdir(editor_path):
                    continue
                
                # Buscar archivos JSON en la carpeta del editor
                for filename in os.listdir(editor_path):
                    if filename.endswith('.json'):
                        file_path = os.path.join(editor_path, filename)
                        
                        try:
                            # Cargar el archivo JSON
                            template_data = FileHandler.load_json(file_path)
                            secciones = template_data.get("secciones", [])
                            
                            # Extraer ejemplos de cada sección DINÁMICAMENTE
                            for i, seccion in enumerate(secciones):
                                if isinstance(seccion, dict):
                                    for tipo_bloque, contenido in seccion.items():
                                        # Inicializar la lista si no existe
                                        if tipo_bloque not in secciones_ejemplos:
                                            secciones_ejemplos[tipo_bloque] = []
                                        
                                        # Agregar el ejemplo
                                        secciones_ejemplos[tipo_bloque].append(contenido)
                                
                        except Exception as e:
                            logging.warning(f"Error cargando archivo {file_path}: {str(e)}")
                            continue
            
            # Log de cuántos ejemplos se cargaron por tipo
            for seccion, ejemplos in secciones_ejemplos.items():
                logging.info(f"Cargados {len(ejemplos)} ejemplos para {seccion}")
            
            return secciones_ejemplos
            
        except Exception as e:
            logging.error(f"Error cargando ejemplos desde data folder: {str(e)}")
            return {}
    
    @staticmethod
    def generate_block_content(
        current_user: TokenData,
        db: Session,
        landing_page_id: UUID,
        request: models.IAContentRequest
    ) -> models.IAContentResponse:
        try:
            # Verificar acceso
            landing_page = lp_service.get_landing_page_by_id(current_user, db, landing_page_id)
            # LIMPIAR EL TÍTULO
            import re
            titulo_original = request.tit or "Título por defecto"
            titulo_sin_html = re.sub(r'<[^>]+>', '', titulo_original)
            titulo_limpio = titulo_sin_html.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&quot;', '"')
            titulo_limpio = titulo_limpio.strip()
            if len(titulo_limpio) > 100:
                titulo_limpio = titulo_limpio[:100] + "..."

            nuevo_tema = request.tema or "Tema por defecto"
            block_type = IAService.normalize_block_type(request.blockType)
            logging.info(f"Generando bloque '{block_type}' para LP {landing_page_id}")

            brand = (request.brand or "mcr").lower()
            generator = ContentGenerator(brand=brand)
            raw_generated_content = ""
            additional_content = ""
            faq_questions_for_response: List[str] = []
            city_titles_for_response: List[str] = []

            try:
                if block_type == "quicksearch":
                    raw_generated_content = generator.generate_quicksearch(titulo_limpio, nuevo_tema)

                elif block_type == "fleet":
                    raw_generated_content = generator.generate_fleet(titulo_limpio, nuevo_tema)

                elif block_type == "deals":
                    raw_generated_content = generator.generate_deals(titulo_limpio, nuevo_tema)
                    tipos_validos = [t for t in (request.car_types or []) if t and t.strip()]
                    if not tipos_validos:
                        tipos_validos = [
                            "Ofertas de Autos Económicos", "Ofertas de SUV", "Ofertas de Vans",
                            "Ofertas de Autos de Lujo", "Ofertas de Convertibles",
                            "Ofertas de Autos Eléctricos", "Ofertas de Alquiler Semanal",
                        ]
                    additional_content = generator.generate_car_type(tipos_validos, nuevo_tema)

                elif block_type == "agencies":
                    raw_generated_content = generator.generate_agencies(titulo_limpio, nuevo_tema)

                elif block_type == "reviews":
                    raw_generated_content = generator.generate_reviews(titulo_limpio, nuevo_tema)

                elif block_type == "rentcompanies":
                    raw_generated_content = generator.generate_rentcompanies(titulo_limpio, nuevo_tema)

                elif block_type == "bloquehistoria":
                    raw_generated_content = generator.generate_bloquehistoria(titulo_limpio, nuevo_tema)

                elif block_type == "advicestipocarrusel":
                    raw_generated_content = generator.generate_advicestipocarrusel(titulo_limpio, nuevo_tema)
                    tipos_validos = [t for t in (request.car_types or []) if t and t.strip()]
                    if not tipos_validos:
                        tipos_validos = [
                            "Consejo sobre reservas", "Consejo sobre seguros",
                            "Consejo sobre combustible", "Consejo sobre documentación",
                            "Consejo sobre inspección", "Consejo sobre devolución"
                        ]
                    additional_content = generator.generate_advice_type(tipos_validos, nuevo_tema)

                elif block_type == "rentacar":
                    raw_generated_content = generator.generate_rentacar(titulo_limpio, nuevo_tema)

                elif block_type == "faqs" or block_type == "questions":
                    raw_generated_content = generator.generate_faq(titulo_limpio, nuevo_tema)
                    preguntas_validas = [q for q in (request.faq_questions or []) if q and q.strip()]
                    if not preguntas_validas:
                        preguntas_validas = generator.generate_faq_questions_from_title(titulo_limpio)
                        logging.info(f"FAQs: preguntas auto-generadas desde título: {preguntas_validas}")
                    preguntas_validas = preguntas_validas[:4]
                    faq_questions_for_response = preguntas_validas
                    additional_content = generator.generate_faq_respuesta(nuevo_tema, preguntas_validas)

                elif block_type == "car_rental" or block_type == "fleetcarrusel":
                    raw_generated_content = generator.generate_car_rental(titulo_limpio, nuevo_tema)
                    _STANDARD_CAR_TYPES = ["Económico", "Camionetas", "Convertibles", "Lujo", "Van", "Eléctricos"]
                    tipos_validos = [t for t in (request.car_types or []) if t and t.strip()]
                    logging.info(f"CAR_TYPES recibidos: {tipos_validos}")
                    if not tipos_validos:
                        tipos_validos = _STANDARD_CAR_TYPES
                    additional_content = generator.generate_car_type(tipos_validos, nuevo_tema)

                elif block_type == "fav_city" or block_type == "locationscarrusel":
                    raw_generated_content = generator.generate_fav_city(titulo_limpio, nuevo_tema)
                    ciudades_validas = [c for c in (request.fav_city_questions or []) if c and c.strip()]
                    if ciudades_validas:
                        # El usuario ya proveyó su lista — respetarla exactamente.
                        target_city_items = len(ciudades_validas)
                    else:
                        # Sin input del usuario: usar siempre la lista estática.
                        ciudades_validas = [c[0] for c in _FAV_CITY_DEFAULTS]
                        target_city_items = len(ciudades_validas)
                        logging.info("Favorite Cities: usando lista estática por defecto")

                    ciudades_validas = ciudades_validas[:target_city_items]
                    city_titles_for_response = ciudades_validas
                    if ciudades_validas:
                        additional_content = generator.generate_fav_city_respuesta(nuevo_tema, ciudades_validas)
                    else:
                        additional_content = "|error: No se pudieron generar ciudades|"

                else:
                    logging.error(f"Block type '{block_type}' no válido")
                    raw_generated_content = f"|desc: Error - Tipo de bloque {block_type} no válido|"

            except Exception as e:
                logging.error(f"Error en generación de contenido: {str(e)}")
                logging.error(f"Traceback: {traceback.format_exc()}")
                
                # Usar contenido simulado si falla
                raw_generated_content = f"|desc: Error en generación: {str(e)[:100]}|"
            
            # PROCESAMIENTO DE RESPUESTA
            try:
                if not raw_generated_content:
                    raw_generated_content = "|desc: Contenido vacío - usando fallback|"
                processed_response = IAService.process_llm_response(raw_generated_content, block_type)
                
            except Exception as e:
                logging.error(f"Error en process_llm_response: {str(e)}")
                logging.error(f"Traceback: {traceback.format_exc()}")
                
                # Crear respuesta mínima si falla el procesamiento
                processed_response = {
                    "structured_content": {"descripcion": f"Error en procesamiento: {str(e)[:100]}"},
                    "frontend_ready": {"has_think": False, "available_fields": ["desc"], "field_count": 1, "content_preview": {"desc": "Error"}},
                    "block_type": block_type
                }
            
            # PROCESAMIENTO DE CONTENIDO ADICIONAL
            if additional_content:
                try:
                    additional_processed = IAService.process_llm_response(additional_content, f"{block_type}_additional")
                    
                    if additional_processed:
                        # Priorizar structured_content del bloque adicional y usar processed_fields como respaldo.
                        additional_fields = (
                            additional_processed.get("structured_content")
                            or additional_processed.get("processed_fields")
                            or {}
                        )
                        if additional_fields:
                            processed_response["structured_content"].update(additional_fields)

                            available = list(additional_processed.get("frontend_ready", {}).get("available_fields", []))
                            preview = dict(additional_processed.get("frontend_ready", {}).get("content_preview", {}))
                            for key in additional_fields.keys():
                                if key not in available:
                                    available.append(key)
                                if key not in preview:
                                    val = additional_fields.get(key, "")
                                    preview[key] = val[:100] + "..." if isinstance(val, str) and len(val) > 100 else (val or "")

                            merged_available = list(dict.fromkeys(
                                processed_response["frontend_ready"].get("available_fields", []) + available
                            ))
                            processed_response["frontend_ready"]["available_fields"] = merged_available
                            processed_response["frontend_ready"]["field_count"] = len(merged_available)
                            processed_response["frontend_ready"]["content_preview"].update(preview)
                    
                except Exception as e:
                    logging.error(f"Error en proceso adicional: {str(e)}")

            # Asegurar preguntas FAQ en la respuesta final (q_1..q_n)
            if faq_questions_for_response:
                for i, pregunta in enumerate(faq_questions_for_response, start=1):
                    key = f"q_{i}"
                    processed_response["structured_content"][key] = pregunta
                    if key not in processed_response["frontend_ready"]["available_fields"]:
                        processed_response["frontend_ready"]["available_fields"].append(key)
                        processed_response["frontend_ready"]["field_count"] += 1
                    processed_response["frontend_ready"]["content_preview"][key] = (
                        pregunta[:100] + "..." if len(pregunta) > 100 else pregunta
                    )

            # Asegurar títulos de Favorite Cities (tit_1..tit_n)
            if city_titles_for_response:
                import re as _re
                _prefix_pat = _re.compile(
                    r"(?i)^(alquiler de autos en|renta de autos en|renta de carros en|"
                    r"alquiler de carros en|rentar un auto en|reservar un auto en)\s*"
                )
                for i, ciudad in enumerate(city_titles_for_response, start=1):
                    key = f"tit_{i}"
                    # En favoriteCities, h3 debe ser solo ciudad/localidad.
                    ciudad_clean = _prefix_pat.sub("", ciudad).strip()
                    ciudad_clean = generator.sanitize_city_name(ciudad_clean)
                    if ciudad_clean:
                        processed_response["structured_content"][key] = ciudad_clean
                    else:
                        existing = (processed_response["structured_content"].get(key) or "").strip()
                        existing_clean = _prefix_pat.sub("", existing).strip()
                        existing_clean = generator.sanitize_city_name(existing_clean)
                        if existing_clean:
                            processed_response["structured_content"][key] = existing_clean
                    if key not in processed_response["frontend_ready"]["available_fields"]:
                        processed_response["frontend_ready"]["available_fields"].append(key)
                        processed_response["frontend_ready"]["field_count"] += 1
                    processed_response["frontend_ready"]["content_preview"][key] = (
                        processed_response["structured_content"].get(key, "")
                    )

            # Asegurar H2 de Favorite Cities (tit/titulo) cuando el parser no lo traiga.
            if block_type in ("fav_city", "locationscarrusel"):
                tit_val = (processed_response["structured_content"].get("tit") or "").strip()
                if not tit_val:
                    location = generator._extract_location_from_title(nuevo_tema)
                    fallback_h2 = f"Ciudades populares para rentar un auto cerca de {location}"
                    processed_response["structured_content"]["tit"] = fallback_h2
                    processed_response["structured_content"]["h2"] = fallback_h2
                    if "tit" not in processed_response["frontend_ready"]["available_fields"]:
                        processed_response["frontend_ready"]["available_fields"].append("tit")
                        processed_response["frontend_ready"]["field_count"] += 1
                    if "h2" not in processed_response["frontend_ready"]["available_fields"]:
                        processed_response["frontend_ready"]["available_fields"].append("h2")
                        processed_response["frontend_ready"]["field_count"] += 1
                    processed_response["frontend_ready"]["content_preview"]["tit"] = fallback_h2
                    processed_response["frontend_ready"]["content_preview"]["h2"] = fallback_h2

                # Mantener siempre consistencia entre tit y titulo para que UI pinte el H2.
                final_h2 = (processed_response["structured_content"].get("tit") or "").strip()
                if final_h2:
                    processed_response["structured_content"]["titulo"] = final_h2
                    processed_response["structured_content"]["h2"] = final_h2
                    if "titulo" not in processed_response["frontend_ready"]["available_fields"]:
                        processed_response["frontend_ready"]["available_fields"].append("titulo")
                        processed_response["frontend_ready"]["field_count"] += 1
                    if "h2" not in processed_response["frontend_ready"]["available_fields"]:
                        processed_response["frontend_ready"]["available_fields"].append("h2")
                        processed_response["frontend_ready"]["field_count"] += 1
                    processed_response["frontend_ready"]["content_preview"]["titulo"] = final_h2
                    processed_response["frontend_ready"]["content_preview"]["h2"] = final_h2

                final_desc = (processed_response["structured_content"].get("desc") or "").strip()
                if final_desc:
                    processed_response["structured_content"]["h2_desc"] = final_desc
                    if "h2_desc" not in processed_response["frontend_ready"]["available_fields"]:
                        processed_response["frontend_ready"]["available_fields"].append("h2_desc")
                        processed_response["frontend_ready"]["field_count"] += 1
                    processed_response["frontend_ready"]["content_preview"]["h2_desc"] = final_desc
            
            block_names = {1: "Bloque 1", 2: "Bloque 2", 3: "Bloque 3", 4: "Bloque 4", 5: "Bloque 5", 6: "Bloque 6", 7: "Bloque 7"}
            block_name = block_names.get(request.blockNumber, f"Bloque {request.blockNumber}")

            # Meta para UI: permite avisar si se está trabajando en fallback y no con LLM real
            llm_health = generator.llm.health()
            processed_response["llm_status"] = {
                "ok": llm_health.get("ok", False),
                "last_call_success": llm_health.get("last_call_success", False),
                "reachable_url": llm_health.get("reachable_url", ""),
                "last_error": llm_health.get("last_error", ""),
                "fallback_likely": not llm_health.get("ok", False) or not llm_health.get("last_call_success", False),
                "message": (
                    "Generado con LLM activo"
                    if llm_health.get("ok", False) and llm_health.get("last_call_success", False)
                    else "LLM no disponible: se usó contenido de respaldo"
                ),
            }
            
            final_response = models.IAContentResponse(
                generatedContent=processed_response,
                blockName=block_name,
                cellKey=request.cellKey
            )
            return final_response
            
        except Exception as e:
            logging.error(f"Error general: {str(e)}")
            logging.error(f"Traceback: {traceback.format_exc()}")
            
            # Respuesta de error que sabemos que funciona
            return models.IAContentResponse(
                generatedContent={
                    "structured_content": {"desc": f"Error crítico: {str(e)[:100]}"},
                    "frontend_ready": {"has_think": False, "available_fields": [], "field_count": 0, "content_preview": {}},
                    "error": str(e)
                },
                blockName=f"Bloque {request.blockNumber}",
                cellKey=request.cellKey
            )

    @staticmethod
    def translate_content(
        current_user: TokenData,
        db: Session,
        landing_page_id: UUID,
        request: models.TranslationRequest
    ) -> models.TranslationResponse:
        """
        Traducir contenido de español a inglés o portugués con naturalidad comercial
        """
        try:
            # Verificar que el usuario tiene acceso a la landing page
            landing_page = lp_service.get_landing_page_by_id(current_user, db, landing_page_id)
            
            # Validar idioma de destino
            if request.targetLanguage not in ["en", "pt"]:
                raise ValueError("Target language must be 'en' or 'pt'")
            
            # Inicializar el generador para usar el LLM
            generator = ContentGenerator()
            
            # Configuración según idioma
            if request.targetLanguage == "en":
                target_lang_name = "inglés estadounidense"
                specific_instructions = """
                - Usa Mileage para referirte a Kilometraje.
                - Usa el inglés estadounidense (US English).
                """
                system_examples = ""
                
            else:  # pt
                target_lang_name = "portugués brasileño"
                specific_instructions = """
                - Usa el portugués brasileño (Brazilian Portuguese).
                - Nunca uses la palabra 'Tarifas', usa preços, diárias o ofertas.
                - Usa 'locadora' como preferencia principal.
                """
                system_examples = """
                
                Ejemplos de traducción de beneficios al portugués:
                - Seguro de Viaje Gratis: Seguro Viagem Grátis
                - Kilómetros Ilimitados: KM Livre
                - Asistencia Básica en Carretera: Assistência na Estrada
                - Conductor Adicional: Condutor Adicional Grátis
                - Modificaciones sin Cargos Administrativos: Modificações sem Taxas Administrativas
                - Cobertura de Daños al Vehículo: Seguro de Danos ao Veículo
                - Protección de Daños a Terceros: Seguro de Danos a Terceiros
                - Cobertura por Robo: Seguro contra Roubo do Carro
                - Sin Deducibles: Seguros com Franquia Zero
                - Beneficio en Cobertura del IOF: Bônus Adicional pela Taxa de IOF, o pude ser, Bônus Extra pelo IOF
                - Cobertura de Viaje Gratis: Seguro Viagem para 5 Passageiros
                - Millas Ilimitadas: Quilometragem Livre
                - Soporte Básico en Carretera: Serviço de Assistência na Estrada
                - Otro conductor sin costo extra: Condutor Adicional Incluso
                - Modificaciones Flexibles: Modificações Flexíveis
                - Protección Contra Daños al Auto: Seguro Auto
                - Cobertura de Responsabilidad Civil: Proteção de Responsabilidade Civil
                - Seguro Contra Hurto del Vehículo: Proteção contra Roubo do Veículo
                - Sin Responsabilidad Económica: Franquia Zero
                """
            
            # Prompt de traducción
            translation_prompt = f"""
            Redacta el siguiente texto de español a {target_lang_name}.
            
            Instrucciones:
            - Ten cuidado con los signos de puntuación y los espacios antes y después de los signos.
            {specific_instructions}
            - Mantén todas las etiquetas de marcado y la estructura tal cual.
            - No traduzcas nombres propios ni marcas (ejemplo: "Viajemos") a excepción de ciudades, países o estados.
            - Traduce con fluidez, usando expresiones naturales y comerciales en {target_lang_name}.
            - Asegúrate de que el tono sea persuasivo, amigable y atractivo, pensado para marketing digital (landing pages, anuncios, blogs).
            - Evita sonar robótico o forzado; prioriza naturalidad y coherencia.
            - Cuando hables de descuentos deja en mayúscula la palabra "OFF" (ejemplo: 10% OFF).
            
            Texto en español:
            {request.sourceContent}
            
            Traducción al {target_lang_name}:
            """
            
            # Mensaje de sistema
            system_message = f"""
            Eres un traductor de marketing digital.
            Tu trabajo es redactar el contenido de español a {target_lang_name} con tono comercial, persuasivo y nativo.
            Responde solo con el texto traducido, mantén las etiquetas HTML (puedes quitar las etiquetas para traducir y luego ponerlas según corresponde manteniendo la lógica que se tiene en español), sin explicaciones adicionales.
            {system_examples}
            """
            
            # Ejecutar traducción
            translated_content = generator.llm.generate(
                translation_prompt,
                system_message
            )
            
            logging.info(f"Translated content to {request.targetLanguage} for LP {landing_page_id}")
            
            return models.TranslationResponse(
                translatedContent=translated_content.strip(),
                sourceLanguage="es",
                targetLanguage=request.targetLanguage,
                cellKey=request.cellKey
            )
            
        except Exception as e:
            logging.error(f"Error translating content: {str(e)}")
            raise e

            