from fastapi import APIRouter, status, BackgroundTasks
from uuid import UUID
import time

from ..database.core import DbSession
from . import models
from .service import IAService
from ..auth.service import CurrentUser
from ..logging_service.ai_logging import AILoggingService
from ..entities.landing_page import LandingPage

router = APIRouter(
    prefix="/ia",
    tags=["IA Content Generation"]
)

# Endpoints de IA por bloque
@router.post("/{landing_page_id}/block-1", response_model=models.IAContentResponse)
def generate_ia_block_1(
    db: DbSession,
    landing_page_id: UUID,
    request: models.IAContentRequest,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks
):
    """Generar contenido IA (Quicksearch)"""
    request.lpId = landing_page_id

    start_time = time.time()
    response = IAService.generate_block_content(
        current_user, db, landing_page_id, request
    )
    duration_ms = int((time.time() - start_time) * 1000)

    # Log generation in background
    background_tasks.add_task(
        _log_ai_generation_background,
        db=db,
        current_user=current_user,
        landing_page_id=landing_page_id,
        request=request,
        response=response,
        duration_ms=duration_ms
    )

    return response

@router.post("/{landing_page_id}/block-2", response_model=models.IAContentResponse)
def generate_ia_block_2(
    db: DbSession,
    landing_page_id: UUID,
    request: models.IAContentRequest,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks
):
    """Generar contenido IA para (Fleet)"""
    request.lpId = landing_page_id

    start_time = time.time()
    response = IAService.generate_block_content(
        current_user, db, landing_page_id, request
    )
    duration_ms = int((time.time() - start_time) * 1000)

    background_tasks.add_task(
        _log_ai_generation_background,
        db=db,
        current_user=current_user,
        landing_page_id=landing_page_id,
        request=request,
        response=response,
        duration_ms=duration_ms
    )

    return response

@router.post("/{landing_page_id}/block-3", response_model=models.IAContentResponse)
def generate_ia_block_3(
    db: DbSession,
    landing_page_id: UUID,
    request: models.IAContentRequest,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks
):
    """Generar contenido IA para Bloque 3 (Agencies)"""
    request.lpId = landing_page_id

    start_time = time.time()
    response = IAService.generate_block_content(
        current_user, db, landing_page_id, request
    )
    duration_ms = int((time.time() - start_time) * 1000)

    background_tasks.add_task(
        _log_ai_generation_background,
        db=db,
        current_user=current_user,
        landing_page_id=landing_page_id,
        request=request,
        response=response,
        duration_ms=duration_ms
    )

    return response

@router.post("/{landing_page_id}/block-4", response_model=models.IAContentResponse)
def generate_ia_block_4(
    db: DbSession,
    landing_page_id: UUID,
    request: models.IAContentRequest,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks
):
    """Generar contenido IA para (FAQs)"""
    request.lpId = landing_page_id

    start_time = time.time()
    response = IAService.generate_block_content(
        current_user, db, landing_page_id, request
    )
    duration_ms = int((time.time() - start_time) * 1000)

    background_tasks.add_task(
        _log_ai_generation_background,
        db=db,
        current_user=current_user,
        landing_page_id=landing_page_id,
        request=request,
        response=response,
        duration_ms=duration_ms
    )

    return response

@router.post("/{landing_page_id}/block-5", response_model=models.IAContentResponse)
def generate_ia_block_5(
    db: DbSession,
    landing_page_id: UUID,
    request: models.IAContentRequest,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks
):
    """Generar contenido IA para (Car Rental)"""
    request.lpId = landing_page_id

    start_time = time.time()
    response = IAService.generate_block_content(
        current_user, db, landing_page_id, request
    )
    duration_ms = int((time.time() - start_time) * 1000)

    background_tasks.add_task(
        _log_ai_generation_background,
        db=db,
        current_user=current_user,
        landing_page_id=landing_page_id,
        request=request,
        response=response,
        duration_ms=duration_ms
    )

    return response

@router.post("/{landing_page_id}/block-6", response_model=models.IAContentResponse)
def generate_ia_block_6(
    db: DbSession,
    landing_page_id: UUID,
    request: models.IAContentRequest,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks
):
    """Generar contenido IA para (Favorite City)"""
    request.lpId = landing_page_id

    start_time = time.time()
    response = IAService.generate_block_content(
        current_user, db, landing_page_id, request
    )
    duration_ms = int((time.time() - start_time) * 1000)

    background_tasks.add_task(
        _log_ai_generation_background,
        db=db,
        current_user=current_user,
        landing_page_id=landing_page_id,
        request=request,
        response=response,
        duration_ms=duration_ms
    )

    return response

# Endpoint de traducción
@router.post("/{landing_page_id}/translate", response_model=models.TranslationResponse)
def translate_content(
    db: DbSession,
    landing_page_id: UUID,
    request: models.TranslationRequest,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks
):
    """Traducir contenido de español a inglés o portugués"""
    request.lpId = landing_page_id

    start_time = time.time()
    response = IAService.translate_content(
        current_user, db, landing_page_id, request
    )
    duration_ms = int((time.time() - start_time) * 1000)

    # Log translation in background
    background_tasks.add_task(
        _log_translation_background,
        db=db,
        current_user=current_user,
        landing_page_id=landing_page_id,
        request=request,
        response=response,
        duration_ms=duration_ms
    )

    return response


# ========== Background Logging Helpers ==========

def _log_ai_generation_background(
    db: DbSession,
    current_user,
    landing_page_id: UUID,
    request: models.IAContentRequest,
    response: models.IAContentResponse,
    duration_ms: int
):
    """Log AI generation in background without blocking the response"""
    try:
        # Get landing page to extract proyecto_id
        landing_page = db.query(LandingPage).filter(LandingPage.id == landing_page_id).first()
        if not landing_page:
            print(f"[AI Logging] Landing page {landing_page_id} not found")
            return

        # Check if there's a previous generation for this cell
        # If yes, mark it as rejected (user regenerated = didn't like previous output)
        previous_generation = AILoggingService.get_generation_by_cell(
            db=db,
            landing_page_id=landing_page_id,
            cell_position=request.cellKey
        )

        if previous_generation and previous_generation.was_accepted in ['accepted', 'modified']:
            # User regenerated content, mark previous as rejected
            success = AILoggingService.update_acceptance_status(
                db=db,
                generation_id=previous_generation.id,
                status='rejected',
                feedback='User regenerated content'
            )
            if success:
                print(f"[AI Logging] Marked previous generation as rejected (regenerated) for {request.cellKey}")

        # Build generation context from request
        generation_context = {
            "block_type": request.blockType or "unknown",
            "block_number": request.blockNumber,
            "generation_type": "ai_generation",
            "tema": request.tema,
            "model_config": {
                "model_name": "gpt-oss-20b",
                "temperature": 0.4,
                "max_tokens": None
            }
        }

        # Log the NEW generation
        AILoggingService.log_generation(
            db=db,
            current_user=current_user,
            landing_page_id=landing_page_id,
            proyecto_id=landing_page.proyecto_id,
            block_type=request.blockType or "unknown",
            cell_position=request.cellKey,
            generation_context=generation_context,
            raw_output=str(response.generatedContent),  # Original AI response
            processed_output=response.dict(),  # Full response with metadata
            duration_ms=duration_ms
        )

        print(f"[AI Logging] Successfully logged generation for {request.blockType} at {request.cellKey}")

    except Exception as e:
        print(f"[AI Logging] Error logging generation: {str(e)}")
        # Don't raise - logging failures shouldn't affect main operation


def _log_translation_background(
    db: DbSession,
    current_user,
    landing_page_id: UUID,
    request: models.TranslationRequest,
    response: models.TranslationResponse,
    duration_ms: int
):
    """Log translation as a special AI generation in background"""
    try:
        # Get landing page to extract proyecto_id
        landing_page = db.query(LandingPage).filter(LandingPage.id == landing_page_id).first()
        if not landing_page:
            print(f"[Translation Logging] Landing page {landing_page_id} not found")
            return

        # Build generation context for translation
        generation_context = {
            "block_type": "translation",
            "generation_type": "translation",
            "source_language": "es",
            "target_language": request.targetLanguage,
            "model_config": {
                "model_name": "gpt-oss-20b",
                "temperature": 0.3,  # Lower temperature for translation accuracy
                "max_tokens": None
            }
        }

        # Log as AI generation
        AILoggingService.log_generation(
            db=db,
            current_user=current_user,
            landing_page_id=landing_page_id,
            proyecto_id=landing_page.proyecto_id,
            block_type="translation",
            cell_position=request.cellKey,
            generation_context=generation_context,
            raw_output=response.translatedContent,
            processed_output={
                "source": request.sourceContent,
                "translation": response.translatedContent,
                "target_language": request.targetLanguage
            },
            duration_ms=duration_ms
        )

        print(f"[Translation Logging] Successfully logged translation to {request.targetLanguage}")

    except Exception as e:
        print(f"[Translation Logging] Error logging translation: {str(e)}")