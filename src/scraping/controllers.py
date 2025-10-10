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
    try:
        return service.run_final_ai_analysis(req)
    except HTTPException as http_e: # 👈 DEBE CAPTURAR ESTO
        raise http_e # 👈 Y PROPAGARLO
    except Exception as e:
        # Si capturas la Exception genérica, asegúrate de dar el detalle:
        raise HTTPException(status_code=500, detail=f"Fallo en el controlador de IA: {str(e)}") 