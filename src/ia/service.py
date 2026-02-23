import logging
import os
from uuid import UUID
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from src.auth.models import TokenData
from src.core.content_generator import ContentGenerator  
from src.utils.file_utils import FileHandler
from src.utils.text_utils import TextProcessor  
from . import models
from ..landing_pages import service as lp_service
import traceback

class IAService:
    """Servicio para manejar generación de contenido IA y traducción"""
    
    # Mapeo de bloques a métodos del generador
    BLOCK_METHODS = {
        "quicksearch": "generate_quicksearch",
        "fleet": "generate_fleet", 
        "agencies": "generate_agencies",
        "faqs": "generate_faq",
        "car_rental": "generate_car_rental",
        "fav_city": "generate_fav_city"
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
        
        # Limpiar espacios múltiples
        text = re.sub(r'\s+', ' ', text)
        
        # Limpiar espacios al inicio y final
        text = text.strip()
        
        return text

    @staticmethod
    def process_llm_response(raw_content: str, block_type: str) -> Dict[str, Any]:
        """
        Procesa respuesta del LLM y la estructura en un diccionario.
        """
        try:
            import re
            
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
            
            # Procesamiento específico por tipo de bloque
            if block_type == "quicksearch":
                # Bloque 1: tit, desc
                result["structured_content"] = {
                    "titulo": extracted_fields.get("tit", ""),
                    "desc": extracted_fields.get("desc", "")
                }
                
            elif block_type == "fleet":
                # Bloque 2: tit, desc, ip_usa, ip_bra
                result["structured_content"] = {
                    "titulo": extracted_fields.get("tit", ""),
                    "desc": extracted_fields.get("desc", ""),
                    "ip_usa": extracted_fields.get("ip_usa", ""),
                    "ip_bra": extracted_fields.get("ip_bra", "")
                }
                
            elif block_type == "rentacar":
                # Bloque rentacar: tit, desc, desc_h2, desc_h3
                result["structured_content"] = {
                    "titulo": extracted_fields.get("tit", ""),
                    "desc": extracted_fields.get("desc", ""),
                    "desc_h2": extracted_fields.get("desc_h2", ""),
                    "desc_h3": extracted_fields.get("desc_h3", "")
    }
                
            
                
            elif block_type == "reviews" or block_type == "rentcompanies":
                # Bloque reviews/rentcompanies: tit, desc
                result["structured_content"]= {
                    "titulo": extracted_fields.get("tit", ""),
                    "desc": extracted_fields.get("desc", ""),
                    "desc_h2": extracted_fields.get("desc", "")
                }

            elif block_type == "agencies":
                # Bloque 3: tit, desc_h2, desc_h3
                result["structured_content"] = {
                    "titulo": extracted_fields.get("tit", ""),
                    "desc_h2": extracted_fields.get("desc_h2", ""),
                    "desc_h3": extracted_fields.get("desc_h3", "")
                }
                
            elif block_type == "faqs" or block_type == "questions":
                # Bloque 4: desc
                result["structured_content"] = {
                    "desc": extracted_fields.get("desc", "")
                }
                
            elif block_type == "faqs_additional":
                # Procesar respuestas individuales de FAQ
                result["structured_content"] = {}
                for i in range(1, 8):  # faq_1 hasta faq_7
                    faq_key = f"faq_{i}"
                    if faq_key in extracted_fields:
                        result["structured_content"][faq_key] = extracted_fields[faq_key]
                
            elif block_type == "car_rental" or block_type == "fleetcarrusel":
                # Bloque 5: desc
                result["structured_content"] = {
                    "desc": extracted_fields.get("desc", "")
                }
                
            elif block_type == "advicestipocarrusel":
                # Bloque: desc
                result["structured_content"] = {
                    "desc": extracted_fields.get("desc", "")
                }
                
            elif block_type == "advicestipocarrusel_additional":
                # Procesar descripciones de consejos
                result["structured_content"] = {}
                for i in range(1, 7):  # desc_1 hasta desc_6
                    desc_key = f"desc_{i}"
                    if desc_key in extracted_fields:
                        result["structured_content"][desc_key] = extracted_fields[desc_key]
                
            elif block_type == "car_rental_additional" or block_type == "fleetcarrusel_additional":
                # Procesar descripciones de tipos de autos
                result["structured_content"] = {}
                for i in range(1, 7):  # desc_1 hasta desc_6
                    desc_key = f"desc_{i}"
                    if desc_key in extracted_fields:
                        result["structured_content"][desc_key] = extracted_fields[desc_key]
                
            elif block_type == "fav_city" or block_type == "locationscarrusel":
                # Bloque 6: tit, desc
                result["structured_content"] = {
                    "titulo": extracted_fields.get("tit", ""),
                    "desc": extracted_fields.get("desc", "")
                }
                
            elif block_type == "fav_city_additional" or block_type == "locationscarrusel_additional":
                # Procesar descripciones de ciudades/ubicaciones
                result["structured_content"] = {}
                for i in range(1, 20):  # Soporta hasta 19 ciudades (desc_1 a desc_19)
                    desc_key = f"desc_{i}"
                    if desc_key in extracted_fields:
                        result["structured_content"][desc_key] = extracted_fields[desc_key]
            
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
            logging.info(f"BACKEND RAW - blockType del request: '{request.blockType}'")
            logging.info(f"BACKEND RAW - blockNumber del request: {request.blockNumber}")
            # Debug: verificar si el frontend envía datos del template
            logging.info(f"BACKEND RAW - template_proyecto: '{request.template_proyecto}'")
            logging.info(f"BACKEND RAW - template_dominio: '{request.template_dominio}'")
            logging.info(f"BACKEND RAW - template_categoria: '{request.template_categoria}'")
            if len(titulo_limpio) > 100:
                titulo_limpio = titulo_limpio[:100] + "..."
                 
            nuevo_tema = request.tema or "Tema por defecto"
            # Determinar block_type
            block_type = request.blockType   # Usar  el tipo de bloque
            logging.info(f"BACKEND ASIGNADO - block_type variable: '{block_type}'")
            # Cargar ejemplos
            try:
                if request.template_proyecto and request.template_dominio and request.template_categoria:
                    secciones_ejemplos = IAService.load_ejemplos_from_data_folder(
                        request.template_proyecto, 
                        request.template_dominio, 
                        request.template_categoria
                    )
                    ejemplos = secciones_ejemplos.get(block_type, [])
                else:
                    logging.warning("No se recibieron datos del template para cargar ejemplos")
                    ejemplos = []
            except Exception as e:
                logging.error(f"Error cargando ejemplos: {str(e)}")
                ejemplos = []
            
            # Inicializar generador
            try:
                generator = ContentGenerator()
            except Exception as e:
                logging.error(f"Error inicializando generator: {str(e)}")
                raise e
            
            # GENERACIÓN DE CONTENIDO PARA TODOS LOS BLOQUES
            raw_generated_content = ""
            additional_content = ""
            
            try:
                
                logging.info(f"BACKEND ANTES DEL SWITCH - block_type final: '{block_type}'")
                if block_type == "quicksearch":
                    template_data = {}
                    raw_generated_content = generator.generate_quicksearch(titulo_limpio, template_data, nuevo_tema, ejemplos)
                    
                elif block_type == "fleet":
                    template_data = {}
                    raw_generated_content = generator.generate_fleet(titulo_limpio, template_data, nuevo_tema, ejemplos)
                    
                elif block_type == "agencies":
                    template_data = {}
                    raw_generated_content = generator.generate_agencies(titulo_limpio, template_data, nuevo_tema, ejemplos)
                    
                elif block_type == "reviews" or block_type == "rentcompanies":
                    template_data = {}
                    raw_generated_content = generator.generate_reviews(titulo_limpio, template_data, nuevo_tema, ejemplos)
                    
                elif block_type == "advicestipocarrusel":
                    raw_generated_content = generator.generate_advicestipocarrusel(titulo_limpio, nuevo_tema, ejemplos)
                    
                    tipos_recibidos = request.car_types or []  # Reutilizamos car_types para los consejos
                    tipos_validos = [t for t in tipos_recibidos if t and t.strip()]
                    
                    if tipos_validos:
                        additional_content = generator.generate_advice_type(tipos_validos, nuevo_tema, ejemplos)
                    else:
                        logging.error("ADVICES: No se encontraron consejos válidos del frontend")
                        tipos_default = [
                            "Consejo sobre reservas", "Consejo sobre seguros", 
                            "Consejo sobre combustible", "Consejo sobre documentación",
                            "Consejo sobre inspección", "Consejo sobre devolución"
                        ]
                        additional_content = generator.generate_advice_type(tipos_default, nuevo_tema, ejemplos)
                    
                elif block_type == "rentacar":
                    template_data = {}
                    raw_generated_content = generator.generate_rentacar(titulo_limpio, template_data, nuevo_tema, ejemplos)
                    
                elif block_type == "faqs" or block_type == "questions":
                    raw_generated_content = generator.generate_faq(titulo_limpio, nuevo_tema, ejemplos)
                    
                    preguntas_recibidas = request.faq_questions or []
                    preguntas_validas = [q for q in preguntas_recibidas if q and q.strip()]
                    
                    if preguntas_validas:
                        additional_content = generator.generate_faq_respuesta(nuevo_tema, preguntas_validas, ejemplos)
                    else:
                        additional_content = "|error: No se encontraron preguntas válidas para generar respuestas|"
                
                elif block_type == "car_rental" or block_type == "fleetcarrusel":
                    raw_generated_content = generator.generate_car_rental(1, titulo_limpio, nuevo_tema, ejemplos)
                    
                    tipos_recibidos = request.car_types or []
                    tipos_validos = [t for t in tipos_recibidos if t and t.strip()]
                    print(request)
                    if tipos_validos:
                        additional_content = generator.generate_car_type(tipos_validos, nuevo_tema, ejemplos)
                    else:
                        tipos_autos_default = [
                            "Autos x defecto 1", "Autos x defecto 2", "Autos x defecto 3",
                            "Autos x defecto 4", "Autos x defecto 5", "Autos x defecto 6"
                        ]
                        additional_content = generator.generate_car_type(tipos_autos_default, nuevo_tema, ejemplos)
                    
                    
                elif block_type == "fav_city" or block_type == "locationscarrusel":
                    template_data = {}
                    raw_generated_content = generator.generate_fav_city(titulo_limpio, template_data, nuevo_tema, ejemplos)
                    
                    ciudades_recibidas = request.fav_city_questions or []
                    ciudades_validas = [c for c in ciudades_recibidas if c and c.strip()]
                    
                    if ciudades_validas:
                        additional_content = generator.generate_fav_city_respuesta(nuevo_tema, ciudades_validas, ejemplos)
                    else:
                        logging.error("No se encontraron ciudades válidas del frontend")
                        additional_content = "|error: No se encontraron ciudades válidas para generar descripciones|"
                    
                else:
                    logging.error(f"Block type {block_type} no válido")
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
                    
                    if additional_processed and additional_processed.get("processed_fields"):
                        # Combinar campos del contenido adicional con el principal
                        processed_response["structured_content"].update(additional_processed["processed_fields"])
                        processed_response["frontend_ready"]["available_fields"].extend(additional_processed["frontend_ready"]["available_fields"])
                        processed_response["frontend_ready"]["field_count"] += additional_processed["frontend_ready"]["field_count"]
                        processed_response["frontend_ready"]["content_preview"].update(additional_processed["frontend_ready"]["content_preview"])
                    
                except Exception as e:
                    logging.error(f"Error en proceso adicional: {str(e)}")
            
            block_names = {1: "Bloque 1", 2: "Bloque 2", 3: "Bloque 3", 4: "Bloque 4", 5: "Bloque 5", 6: "Bloque 6", 7: "Bloque 7"}
            block_name = block_names.get(request.blockNumber, f"Bloque {request.blockNumber}")
            
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
            translated_content = generator.llm_client.generate(
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

            