from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import Dict, Any 
from . import models, service
from .models import AIAnalysisRequest, TitleUpdateRequest


# --- ROUTER DE SCRAPING  ---
router = APIRouter(prefix="/scraping", tags=["Scraping"]) 

@router.post("/stream")
def scrape_stream(req: models.ScrapeRequest):
    try:
        return StreamingResponse(
            service.execute_scraping(req),
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el proceso de scraping: {str(e)}")


# --- ROUTER DE IA  ---
router_ai = APIRouter(prefix="/ai", tags=["AI Generation"])

@router_ai.post("/generate_structure", response_model=Dict[str, Any]) 
def generate_structure_manually(req: AIAnalysisRequest):
    try:
        # service.analisis_final_ia retorna un dict que debe ser aceptado.
        return service.analisis_final_ia(req)
    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fallo en el controlador de IA: {str(e)}") 

# Actualizar y persistir el título (Mantenido)
@router_ai.post("/update_title", response_model=Dict[str, Any])
def update_title_and_persist(req: TitleUpdateRequest):
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