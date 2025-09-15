from fastapi import APIRouter, status
from uuid import UUID

from ..database.core import DbSession
from . import models
from .service import IAService  # Cambiado para usar la clase
from ..auth.service import CurrentUser

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
    current_user: CurrentUser
):
    """Generar contenido IA (Quicksearch)"""
    request.lpId = landing_page_id  # Asegurar que lpId esté configurado
    return IAService.generate_block_content(
        current_user, db, landing_page_id, request
    )

@router.post("/{landing_page_id}/block-2", response_model=models.IAContentResponse)
def generate_ia_block_2(
    db: DbSession,
    landing_page_id: UUID,
    request: models.IAContentRequest,
    current_user: CurrentUser
):
    """Generar contenido IA para (Fleet)"""
    request.lpId = landing_page_id
    return IAService.generate_block_content(
        current_user, db, landing_page_id, request
    )

@router.post("/{landing_page_id}/block-3", response_model=models.IAContentResponse)
def generate_ia_block_3(
    db: DbSession,
    landing_page_id: UUID,
    request: models.IAContentRequest,
    current_user: CurrentUser
):
    """Generar contenido IA para Bloque 3 (Agencies)"""
    request.lpId = landing_page_id
    return IAService.generate_block_content(
        current_user, db, landing_page_id, request
    )

@router.post("/{landing_page_id}/block-4", response_model=models.IAContentResponse)
def generate_ia_block_4(
    db: DbSession,
    landing_page_id: UUID,
    request: models.IAContentRequest,
    current_user: CurrentUser
):
    """Generar contenido IA para (FAQs)"""
    request.lpId = landing_page_id
    return IAService.generate_block_content(
        current_user, db, landing_page_id, request
    )

@router.post("/{landing_page_id}/block-5", response_model=models.IAContentResponse)
def generate_ia_block_5(
    db: DbSession,
    landing_page_id: UUID,
    request: models.IAContentRequest,
    current_user: CurrentUser
):
    """Generar contenido IA para (Car Rental)"""
    request.lpId = landing_page_id
    return IAService.generate_block_content(
        current_user, db, landing_page_id, request
    )

@router.post("/{landing_page_id}/block-6", response_model=models.IAContentResponse)
def generate_ia_block_6(
    db: DbSession,
    landing_page_id: UUID,
    request: models.IAContentRequest,
    current_user: CurrentUser
):
    """Generar contenido IA para (Favorite City)"""
    request.lpId = landing_page_id
    return IAService.generate_block_content(
        current_user, db, landing_page_id, request
    )

# Endpoint de traducción
@router.post("/{landing_page_id}/translate", response_model=models.TranslationResponse)
def translate_content(
    db: DbSession,
    landing_page_id: UUID,
    request: models.TranslationRequest,
    current_user: CurrentUser
):
    """Traducir contenido de español a inglés o portugués"""
    request.lpId = landing_page_id  
    return IAService.translate_content(
        current_user, db, landing_page_id, request
    )