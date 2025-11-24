#redactoria/src/scraping/controllers.py

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import Dict, Any
from . import models, service


# =======================================================================
# 1. ROUTER DE SCRAPING
# =======================================================================

router = APIRouter(prefix="/scraping", tags=["Scraping"])

@router.post("/stream")
def scrape_stream(req: models.ScrapeRequest):
    """
    Inicia el proceso de scraping de URLs y devuelve los resultados 
    como un flujo de eventos (Server-Sent Events).
    """
    try:
        return StreamingResponse(
            service.execute_scraping(req),
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el proceso de scraping: {str(e)}")

# =======================================================================
# 2. ROUTER DE IA (GENERACIÓN Y ANÁLISIS)
# =======================================================================

router_ai = APIRouter(prefix="/ai", tags=["AI Generation"])

@router_ai.post("/generate_structure", response_model=Dict[str, Any])
def generate_structure_manually(req: models.AIAnalysisRequest):
    """
    Analiza el contenido consolidado y genera una estructura de blog 
    (títulos H1, H2, H3, etc.) usando la IA.
    """
    try:
        # service.analisis_final_ia retorna un dict que debe ser aceptado.
        return service.analisis_final_ia(req)
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo en el controlador de IA: {str(e)}")

@router_ai.post("/generate_content", response_model=Dict[str, str])
def generar_contenido_seccion(req: models.PeticionGeneracionContenido):
    """
    Genera el contenido de la sección de un blog (H2, H3, H4) usando IA, 
    basándose en la estructura y el contenido de scraping.
    """
    try:
        # Llama a la nueva función de servicio en español
        return service.generar_contenido_seccion_ia(req)
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo en el controlador de generación de contenido: {str(e)}")

@router_ai.post("/generate_full_content", response_model=Dict[str, Any])
def generar_contenido_completo(req: models.AIAnalysisRequest):
    """
    Genera el contenido de una sección en modo libre. Usado para la 
    orquestación de la generación del blog completo.
    """
    try:
        ai_service = service.AIService()
        return ai_service.generar_contenido_blog_libre(req)
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