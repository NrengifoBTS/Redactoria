from fastapi import APIRouter, status, BackgroundTasks, HTTPException
from uuid import UUID
from typing import Dict, Any, List, Optional
import logging
from src.database.core import DbSession
from src.auth.service import CurrentUser
from . import models 
from .edit_logging import BlogEditLoggingService
from .ai_logging import BlogAILoggingService

router = APIRouter(
    prefix="/logs_blog",
    tags=["Blog Logging & AI Training"]
)

# --- 1. ENDPOINT PARA CAMBIOS MANUALES (EXISTENTE) ---

@router.post("/structure-change", status_code=status.HTTP_202_ACCEPTED)
def log_blog_structure_change(
    db: DbSession,
    request: models.LogBlogStructureRequest, 
    current_user: CurrentUser,
    background_tasks: BackgroundTasks
):
    """
    Registra un cambio manual o reordenamiento en la estructura del blog.
    Se ejecuta en segundo plano para análisis semántico.
    """
    background_tasks.add_task(
        _process_blog_edit_log,
        db=db,
        current_user=current_user,
        request=request
    )

    return {"status": "processing", "message": "Log de estructura enviado a cola de análisis"}


# --- 2. NUEVO: ENDPOINT PARA GENERACIÓN INICIAL IA ---

@router.post("/ai-generation", status_code=status.HTTP_201_CREATED)
def log_ai_generation(
    db: DbSession,
    request: models.LogAIGenerationRequest,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks
):
    """
    Registra la propuesta original de la IA antes de que el usuario la edite.
    Esto establece la 'línea base' para medir el entrenamiento futuro.
    """
    # Usamos BackgroundTasks por si el log_generation hace algún proceso extra, 
    # aunque normalmente es una inserción rápida.
    background_tasks.add_task(
        _process_ai_generation_log,
        db=db,
        request=request
    )

    return {"status": "success", "message": "Generación de IA registrada"}


# --- FUNCIONES DE PROCESAMIENTO (BACKGROUND) ---

def _process_blog_edit_log(db: DbSession, current_user: CurrentUser, request: models.LogBlogStructureRequest):
    try:
        service = BlogEditLoggingService()
        
        # LLAMADA CORREGIDA: Ajustada a los nuevos nombres de la función
        log_entry = service.log_structure_edit(
            db=db,
            user_id=current_user.get_uuid(),
            blog_id=request.blog_id,
            titles_after=request.titles_after, # <--- Antes se llamaba diferente en el controlador
            structure_after=request.structure_after, # <---Estructura generada de titulos y contenido IA
            scraping_id=request.scraping_id, 
            action_type="user_confirmed_structure",
            action_context=request.edit_context
        )

        if log_entry:
            logging.info(f"✓ Estructura de blog {request.blog_id} guardada exitosamente.")

    except Exception as e:
        logging.error(f"✗ Error al procesar el log de edición: {e}", exc_info=True)


def _process_ai_generation_log(db: DbSession, request: models.LogAIGenerationRequest):
    try:
        service = BlogAILoggingService()
        # Asegúrate de pasar titles_before que es lo que tu servicio espera
        log_entry = service.log_generation(
            db=db,
            blog_id=request.blog_id,
            titles_before=request.titles_before, 
            scraping_id=request.scraping_id
        )
        if log_entry:
            logging.info(f"✓ Log de IA guardado para blog {request.blog_id}")
    except Exception as e:
        logging.error(f"✗ Error: {e}")