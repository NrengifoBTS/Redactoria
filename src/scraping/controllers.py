# controllers.py (CORRECCIÓN DE IMPORTS)

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import Dict, Any 
from . import models, service
from .models import AIAnalysisRequest 


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
    """
    Endpoint que ejecuta la lógica de la FASE 4 (Intención y Estructura) bajo demanda.
    Ruta final: /ai/generate_structure
    """
    try:
        # Llama a la función que acabamos de crear en service.py
        return service.run_final_ai_analysis(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en la generación de IA: {str(e)}")