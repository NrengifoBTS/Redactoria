#redactoria/src/scraping/controllers.py

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from src.database.core import DbSession
from uuid import UUID
from . import models,service
from src.entities.blog import Blog
from src.scraping.models import DownloadRequest
from src.scraping.service import DocumentService




# =======================================================================
# 1. ROUTER DE SCRAPING
# =======================================================================

router = APIRouter(prefix="/scraping", tags=["Scraping"])

@router.post("/stream/{blog_id}") # <--- Acepta el blog_id en la ruta
def scrape_stream(blog_id: UUID, req: models.ScrapeRequest, db: DbSession): # <--- Inyecta DB y recibe blog_id
    """
    Inicia el proceso de scraping de URLs y devuelve los resultados 
    como un flujo de eventos (Server-Sent Events), usando el blog_id.
    """
    try:
        # Llama a la función de servicio, pasando la sesión DB, el blog_id y la petición
        return StreamingResponse(
            service.execute_scraping(db, blog_id, req),
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el proceso de scraping: {str(e)}")

# =======================================================================
# 2. ROUTER DE IA (GENERACIÓN Y ANÁLISIS)
# =======================================================================

router_ai = APIRouter(prefix="/ai", tags=["AI Generation"])

@router_ai.post("/generate_structure", response_model=Dict[str, Any])
def generate_structure_manually(req: models.AIAnalysisRequest, db: DbSession):
    """
    Analiza el contenido consolidado y genera una estructura de blog 
    (títulos H1, H2...). Llama al servicio que orquesta la generación.
    """
    try:
        # Instanciar el servicio si es un método de clase
        ai_service = service.AIService() 
        
        # Llamar a la función de servicio, PASANDO LA SESIÓN 'db' y los parámetros.
        return ai_service.analisis_final_ia(
            db=db, # <-- El parámetro de la DB se pasa al servicio
            query=req.query,
            title_base=req.title_base,
            categoria=req.categoria, 
            idioma=req.idioma,       
            tecnica=req.tecnica,      
            acento=req.acento,        
            tono=req.tono,            
            blog_id=req.blog_id,
            consolidated_text=req.consolidated_content
        )
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo en el controlador de IA: {str(e)}")


@router_ai.post("/regenerate_titles", response_model=Dict[str, Any])
def regenerar_titulos_controller(req: models.AIAnalysisRequest, db: DbSession):
    """
    Controlador para la regeneración de títulos/subtítulos de la estructura.
    Obtiene el contenido consolidado de la DB antes de llamar al servicio.
    Este endpoint llama a service.regenerar_titulos.
    """
    if not req.regenerate_data or not req.blog_id:
        # Validaciones para evitar el error 500 si faltan datos clave
        raise HTTPException(status_code=400, detail="Los campos 'blog_id' y 'regenerate_data' son requeridos para la regeneración de títulos.")
        
    try:
        # 1. Obtener el contenido consolidado de la DB usando blog_id (CORRECCIÓN CLAVE)
        blog_entity = db.query(Blog).filter(Blog.id == req.blog_id).first()
        
        # Si no se encuentra el blog o el contenido, usamos una cadena vacía para evitar TypeError 500.
        consolidated_content = blog_entity.consolidated_content if blog_entity and hasattr(blog_entity, 'consolidated_content') else ""

        ai_service = service.AIService() # Inicialización del servicio (asumiendo que se hace así)
        
        # 2. Extracción de datos del regenerate_data (enviado por el frontend)
        section_to_regenerate = req.regenerate_data.get('section_text')
        full_structure_markdown = req.regenerate_data.get('full_structure_markdown')
        new_prompt = req.regenerate_data.get('new_prompt')
        
        if not section_to_regenerate or not full_structure_markdown:
             raise HTTPException(status_code=400, detail="Faltan campos requeridos en regenerate_data: 'section_text' o 'full_structure_markdown'.")
        
        # 3. Llamar a la función del servicio de título/estructura
        regenerated_suggestions: List[str] = ai_service.regenerar_titulos(
            consolidated_text=consolidated_content, # <--- Se pasa el contenido de la DB
            full_structure_markdown=full_structure_markdown,
            section_to_regenerate=section_to_regenerate,
            new_prompt=new_prompt,
            idioma=req.idioma,
            acento=req.acento,
            tono=req.tono,
            main_title=req.query 
        )
        
        return {
            "regenerated_suggestions": regenerated_suggestions,
            "success": True
        }

    except HTTPException as http_e:
        # Propagar errores de cliente
        raise http_e
    except Exception as e:
        # Capturar cualquier otro error y devolver un 500 con detalle
        raise HTTPException(status_code=500, detail=f"Fallo en el controlador de regeneración de títulos: {str(e)}")


@router_ai.post("/generate_content", response_model=Dict[str, str])
def generar_contenido_seccion(req: models.PeticionGeneracionContenido, db:DbSession): # Mantiene db, req
    """
    Genera el contenido de la sección de un blog (H2, H3, H4) usando IA, 
    basándose en la estructura y el contenido de scraping.
    """
    try:
        # 1. Instanciar el servicio AI
        ai_service = service.AIService() 
        
        # 2. Llamar al método de instancia, pasándole solo 'req'
        # NOTA: Si generar_contenido_seccion no usa la DB (como parece ser el caso), no necesita pasar 'db'. 
        # Si lo necesita, debe pasarlo como un argumento nombrado si el servicio lo acepta.
        return ai_service.generar_contenido_seccion(req)
        
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        # El error original era el que ocurría aquí
        raise HTTPException(status_code=500, detail=f"Fallo en el controlador de generación de contenido: {str(e)}")


@router_ai.post("/generate_full_content", response_model=Dict[str, Any])
def generar_contenido_completo(req: models.AIAnalysisRequest, db: DbSession): 
    """
    Genera el contenido de una sección en modo libre, con carga de datos de DB.
    """
    try:
        ai_service = service.AIService()
        return ai_service.generar_contenido_blog_libre(db, req) 
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo al generar contenido libre: {str(e)}")


@router_ai.post("/update_title", response_model=Dict[str, Any])
def update_title_and_persist(req: models.TitleUpdateRequest):
    """
    Recibe el projectId, old_title, new_title y level, 
    y llama al servicio para aplicar el cambio y guardar el proyecto.
    """
    try:
        # Llama a la nueva función de servicio 
        return service.update_title_and_persist(req)
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo al actualizar el título: {str(e)}")
    

@router_ai.post("/download_blog_doc/{blog_id}", response_class=StreamingResponse)
def download_blog_document(
    blog_id: UUID,
    db: DbSession 
):
    """
    Endpoint SIMPLIFICADO: Solo necesita el blog_id.
    """
    try:
        document_service = service.DocumentService()
        
        # El servicio ahora obtiene todo de la BD
        return document_service.generar_documento_word(
            blog_id=blog_id,
            db=db
        )
        
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        import logging
        logging.error(f"Error en download_blog_document: {str(e)}", exc_info=True)
        raise HTTPException(500, f"Error al generar documento: {str(e)}")
    

@router.post("/generate-faqs-from-structure") # Esto queda como /scraping/generate-faqs-from-structure
def generate_faqs_from_structure(req: models.FAQStructureRequest):
    try:
        return service.AIService.generar_faqs_con_estructura(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    



