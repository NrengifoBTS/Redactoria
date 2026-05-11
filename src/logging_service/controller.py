from fastapi import APIRouter, status, BackgroundTasks, HTTPException
from uuid import UUID
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from collections import Counter, defaultdict
from sqlalchemy import cast, String
import logging
import json
import re
import os

from src.database.core import DbSession
from src.auth.service import CurrentUser
from src.entities.proyecto import Proyecto

from .models import (
    LogUserEditRequest,
    UserProfileResponse,
    MetricsResponse,
    AcceptanceStatusRequest,
    EditHistoryResponse,
    BlockEditStats,
    BlockAlignmentStats,  # NEW
    UserActivityStats,
    GenerationFailureRequest
)
from .edit_logging import EditLoggingService
from .profile_builder import ProfileBuilderService
from .ai_logging import AILoggingService
from ..entities.logging.training_dataset import TrainingDataset
from ..entities.template import Template
from ..entities.logging.ai_generation import AIGeneration


router = APIRouter(
    prefix="/logs",
    tags=["Logging & Analytics"]
)


@router.post("/edit", status_code=status.HTTP_202_ACCEPTED)
def log_user_edit(
    db: DbSession,
    request: LogUserEditRequest,
    current_user: CurrentUser,
    background_tasks: BackgroundTasks
):
    """
    Log a user edit event (called from frontend on cell blur).
    Processing happens in background to not block user experience.

    Returns immediately with 202 Accepted.
    """
    # Add background task to process the edit log
    background_tasks.add_task(
        _process_edit_log,
        db=db,
        current_user=current_user,
        request=request
    )

    return {"status": "logged", "message": "Edit logging queued"}


@router.get("/user-profile/{user_id}", response_model=UserProfileResponse)
def get_user_profile(
    db: DbSession,
    user_id: UUID,
    current_user: CurrentUser,
    proyecto_id: Optional[UUID] = None
):
    """
    Get user style profile with learned preferences and patterns.

    Query Parameters:
    - proyecto_id: Filter by specific project (required for multiple profiles per user).

    Returns profile with confidence score (0.0-1.0) based on number of analyzed edits.
    """
    result = ProfileBuilderService.get_profile(db, user_id, proyecto_id)

    # Handle different return types from get_profile
    if proyecto_id:
        # Single profile requested
        profile = result
    else:
        # Multiple profiles returned (list), get first one or None
        profile = result[0] if result and len(result) > 0 else None

    if not profile:
        # Return empty profile if not found
        from src.entities.logging.user_style_profile import UserStyleProfile
        profile = UserStyleProfile(
            user_id=user_id,
            proyecto_id=proyecto_id,
            profile_confidence=0.0,
            total_edits_analyzed=0,
            style_signature={},
            semantic_patterns={},
            block_preferences={},
            profile_version=0,
            last_updated=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc)
        )

    return profile


def _is_spanish_title_edit(edit) -> bool:
    """
    Detecta si una edición es a un título de Español (h2/h3).

    Criterios:
    - Columna 3 (contenido en español)
    - Realizada por admin (performed_by_user_id)
    - Fila corresponde a título según block_type
    """
    try:
        if not edit.cell_position:
            return False

        row, col = edit.cell_position.split('-')

        # Solo columna 3 (español)
        if col != '3':
            return False

        # Solo si es realizada por admin
        from src.core.config import settings
        if not edit.performed_by_user_id or not settings.is_admin_user(edit.performed_by_user_id):
            return False

        # Detectar filas de títulos según block_type
        # NOTA: Estos patrones se deben refinar basándose en los logs
        row_num = int(row)
        title_rows_by_block = {
            'quicksearch': [0, 1],
            'fleet': [6, 7],
            'reviews': [10, 11],
            'rentcompanies': [12, 13],
            'questions': list(range(15, 29, 2)),  # Filas pares entre 15-28
            'advicestipocarrusel': list(range(30, 39, 2))
        }

        if edit.block_type in title_rows_by_block:
            return row_num in title_rows_by_block[edit.block_type]

        return False

    except Exception:
        return False


@router.get("/metrics", response_model=MetricsResponse)
def get_metrics(
    db: DbSession,
    current_user: CurrentUser,
    landing_page_id: Optional[UUID] = None,
    proyecto_id: Optional[UUID] = None,
    proyecto_general: Optional[str] = None,
    user_id: Optional[UUID] = None,
    days: Optional[int] = 30,
    exclude_admins: bool = False
):
    """
    Get analytics metrics for AI generations and user edits.

    Query Parameters:
    - landing_page_id: Filter by specific landing page (optional)
    - proyecto_id: Filter by specific project (optional)
    - proyecto_general: Filter by general project name like "viajemos", "mcr" (optional)
    - user_id: Filter by specific user (optional)
    - days: Time range in days (default: 30, None for all time)

    Returns:
    - Total generations and edits
    - Acceptance rate (% of AI content accepted without modification)
    - Most edited blocks
    - Average edit magnitude
    - Temporal trends (daily aggregation)
    """
    from src.entities.logging.ai_generation import AIGeneration
    from src.entities.logging.user_edit import UserEdit
    from src.entities.landing_page import LandingPage
    from src.entities.template import Template

    # Calculate cutoff date (None means all time)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days) if days is not None else None

    # If proyecto_general is provided, get all landing_page_ids that belong to that general project
    landing_page_ids_filter = None
    if proyecto_general:
        # Find all templates with this proyecto value
        templates = db.query(Template).filter(Template.proyecto == proyecto_general).all()
        template_ids = [t.id for t in templates]

        # Find all landing pages using these templates
        lps = db.query(LandingPage).filter(LandingPage.template_id.in_(template_ids)).all()
        landing_page_ids_filter = [lp.id for lp in lps]

    # Query generations
    gen_query = db.query(AIGeneration)
    if cutoff is not None:
        gen_query = gen_query.filter(AIGeneration.created_at >= cutoff)
    if proyecto_id:
        gen_query = gen_query.filter(AIGeneration.proyecto_id == proyecto_id)
    if landing_page_id:
        gen_query = gen_query.filter(AIGeneration.landing_page_id == landing_page_id)
    elif landing_page_ids_filter:  # Only apply if no specific LP is selected
        gen_query = gen_query.filter(AIGeneration.landing_page_id.in_(landing_page_ids_filter))
    if user_id:
        gen_query = gen_query.filter(AIGeneration.user_id == user_id)

    # Exclude admin generations if requested
    if exclude_admins:
        from src.core.config import settings
        gen_query = gen_query.filter(~AIGeneration.user_id.in_(settings.ADMIN_USER_IDS))

    generations = gen_query.all()

    # ALWAYS exclude users from EXCLUDED_FROM_ANALYTICS_USER_IDS (regardless of exclude_admins)
    from src.core.config import settings
    generations = [g for g in generations if str(g.user_id) not in settings.EXCLUDED_FROM_ANALYTICS_USER_IDS]

    # Query edits
    edit_query = db.query(UserEdit)
    if cutoff is not None:
        edit_query = edit_query.filter(UserEdit.created_at >= cutoff)
    if proyecto_id:
        edit_query = edit_query.filter(UserEdit.proyecto_id == proyecto_id)
    if landing_page_id:
        edit_query = edit_query.filter(UserEdit.landing_page_id == landing_page_id)
    elif landing_page_ids_filter:  # Only apply if no specific LP is selected
        edit_query = edit_query.filter(UserEdit.landing_page_id.in_(landing_page_ids_filter))
    if user_id:
        edit_query = edit_query.filter(UserEdit.user_id == user_id)

    edits = edit_query.all()

    # ALWAYS exclude users from EXCLUDED_FROM_ANALYTICS_USER_IDS (regardless of exclude_admins)
    edits = [e for e in edits if str(e.user_id) not in settings.EXCLUDED_FROM_ANALYTICS_USER_IDS]

    # Filter admin edits if requested
    if exclude_admins:
        from src.core.config import settings
        filtered_edits = []

        # First pass: Log Spanish title edits for identification
        logging.info(f"[Spanish Title Detection] Analyzing edits for Spanish titles...")
        for edit in edits:
            try:
                if edit.cell_position and edit.performed_by_user_id:
                    row, col = edit.cell_position.split('-')
                    if col == '3' and settings.is_admin_user(edit.performed_by_user_id):
                        logging.info(
                            f"[Spanish Title Detection] "
                            f"Cell: {edit.cell_position}, "
                            f"Block: {edit.block_type}, "
                            f"Admin: {edit.performed_by_user_id}, "
                            f"Content length: {len(edit.content_after) if edit.content_after else 0}, "
                            f"Is admin edit: {edit.is_admin_edit}"
                        )
            except Exception as e:
                logging.warning(f"[Spanish Title Detection] Error parsing cell_position {edit.cell_position}: {e}")

        # Second pass: Apply filtering logic
        for edit in edits:
            # ALWAYS include admin corrections to editors (is_admin_edit=True)
            if edit.is_admin_edit:
                filtered_edits.append(edit)
                continue

            # Exclude Spanish title edits by admins
            if _is_spanish_title_edit(edit):
                logging.info(f"[Filter] Excluding Spanish title edit at cell {edit.cell_position}")
                continue

            # Exclude edits by admins to their own content
            if str(edit.user_id) in settings.ADMIN_USER_IDS:
                continue

            # This is an edit by a regular editor
            filtered_edits.append(edit)

        edits = filtered_edits

        # Add logging for debugging
        logging.info(f"[Metrics Filter] exclude_admins=True")
        logging.info(f"[Metrics Filter] Total generations after filter: {len(generations)}")
        logging.info(f"[Metrics Filter] Total edits after filter: {len(edits)}")
        logging.info(f"[Metrics Filter] Admin IDs: {settings.ADMIN_USER_IDS}")

    # Calculate metrics
    total_generations = len(generations)
    successful_generations = sum(1 for g in generations if g.generation_success)
    failed_generations = sum(1 for g in generations if not g.generation_success)
    generation_success_rate = successful_generations / total_generations if total_generations > 0 else 0.0

    total_edits = len(edits)

    # Acceptance rate (only for successful generations)
    successful_gens = [g for g in generations if g.generation_success]
    accepted = sum(1 for g in successful_gens if g.was_accepted == 'accepted')
    acceptance_rate = accepted / len(successful_gens) if successful_gens else 0.0

    # Most edited blocks
    block_counts = Counter(e.block_type for e in edits if e.block_type)
    block_magnitudes = defaultdict(list)
    for e in edits:
        if e.block_type and e.content_before and e.content_after:
            magnitude = abs(e.char_delta) / max(len(e.content_before), 1)
            block_magnitudes[e.block_type].append(magnitude)

    most_edited_blocks = [
        BlockEditStats(
            block_type=block,
            edit_count=count,
            avg_magnitude=sum(block_magnitudes[block]) / len(block_magnitudes[block]) if block in block_magnitudes else None
        )
        for block, count in block_counts.most_common(5)
    ]

    # Average edit magnitude
    all_magnitudes = []
    for e in edits:
        if e.content_before and e.content_after:
            # Calculate magnitude: relative change in character count
            magnitude = abs(e.char_delta) / max(len(e.content_before), 1)
            all_magnitudes.append(magnitude)

    logging.info(f"[Metrics] Calculated {len(all_magnitudes)} magnitudes: {all_magnitudes[:5]}")  # Debug
    avg_magnitude = sum(all_magnitudes) / len(all_magnitudes) if all_magnitudes else 0.0
    logging.info(f"[Metrics] Average magnitude: {avg_magnitude}")  # Debug

    # Temporal trends (daily aggregation)
    daily_trends = defaultdict(lambda: {"generations": 0, "edits": 0})

    for g in generations:
        day = g.created_at.date().isoformat()
        daily_trends[day]["generations"] += 1

    for e in edits:
        day = e.created_at.date().isoformat()
        daily_trends[day]["edits"] += 1

    # User activity breakdown
    from src.entities.user import User

    # Aggregate generations by user
    user_gen_stats = defaultdict(lambda: {"total": 0, "successful": 0, "failed": 0})
    for g in generations:
        user_gen_stats[g.user_id]["total"] += 1
        if g.generation_success:
            user_gen_stats[g.user_id]["successful"] += 1
        else:
            user_gen_stats[g.user_id]["failed"] += 1

    # Aggregate edits by user
    user_edit_stats = defaultdict(lambda: {"count": 0, "magnitudes": [], "admin_edits_received": 0})
    user_admin_performed = defaultdict(int)  # Track admin edits performed

    for e in edits:
        # Count for attributed user (who gets credit)
        user_edit_stats[e.user_id]["count"] += 1
        if e.content_before and e.content_after:
            magnitude = abs(e.char_delta) / max(len(e.content_before), 1)
            user_edit_stats[e.user_id]["magnitudes"].append(magnitude)

        # Track admin edits
        if e.is_admin_edit:
            user_edit_stats[e.user_id]["admin_edits_received"] += 1
            if e.performed_by_user_id:
                user_admin_performed[e.performed_by_user_id] += 1

    # Combine user stats and get user emails
    all_user_ids = set(user_gen_stats.keys()) | set(user_edit_stats.keys())
    # Exclude users from analytics
    all_user_ids = {uid for uid in all_user_ids if str(uid) not in settings.EXCLUDED_FROM_ANALYTICS_USER_IDS}
    user_activity = []

    for user_id in all_user_ids:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            gen_stats = user_gen_stats.get(user_id, {"total": 0, "successful": 0, "failed": 0})
            edit_stats = user_edit_stats.get(user_id, {"count": 0, "magnitudes": []})

            avg_mag = sum(edit_stats["magnitudes"]) / len(edit_stats["magnitudes"]) if edit_stats["magnitudes"] else None

            user_activity.append(UserActivityStats(
                user_id=user_id,
                user_email=user.email,
                total_generations=gen_stats["total"],
                successful_generations=gen_stats["successful"],
                failed_generations=gen_stats["failed"],
                total_edits=edit_stats["count"],
                avg_edit_magnitude=avg_mag,
                admin_edits_received=edit_stats.get("admin_edits_received", 0),
                admin_edits_performed=user_admin_performed.get(user_id, 0)
            ))

    # Sort by total activity (generations + edits)
    user_activity.sort(key=lambda u: u.total_generations + u.total_edits, reverse=True)

    # NEW: Calculate Alignment Shift Score metrics
    alignment_scores = [
        e.alignment_shift_score
        for e in edits
        if e.alignment_shift_score is not None
    ]
    avg_alignment = sum(alignment_scores) / len(alignment_scores) if alignment_scores else None

    # NEW: ASS by block type
    block_alignment_stats = defaultdict(lambda: {"scores": [], "magnitudes": [], "count": 0})
    for edit in edits:
        if edit.block_type:
            block_alignment_stats[edit.block_type]["count"] += 1
            if edit.alignment_shift_score is not None:
                block_alignment_stats[edit.block_type]["scores"].append(edit.alignment_shift_score)
            if edit.content_before and edit.content_after:
                magnitude = abs(edit.char_delta) / max(len(edit.content_before), 1)
                block_alignment_stats[edit.block_type]["magnitudes"].append(magnitude)

    alignment_by_block = [
        BlockAlignmentStats(
            block_type=block,
            edit_count=stats["count"],
            avg_alignment_score=sum(stats["scores"]) / len(stats["scores"]) if stats["scores"] else None,
            avg_edit_magnitude=sum(stats["magnitudes"]) / len(stats["magnitudes"]) if stats["magnitudes"] else None
        )
        for block, stats in block_alignment_stats.items()
    ]

    # NEW: Temporal alignment trends (daily ASS)
    daily_alignment = defaultdict(lambda: {"scores": []})
    for edit in edits:
        if edit.alignment_shift_score is not None:
            day = edit.created_at.date().isoformat()
            daily_alignment[day]["scores"].append(edit.alignment_shift_score)

    alignment_trends = {
        day: sum(data["scores"]) / len(data["scores"]) if data["scores"] else None
        for day, data in daily_alignment.items()
    }

    # NEW: ASS by user (update user_activity)
    user_alignment_stats = defaultdict(lambda: {"scores": []})
    for edit in edits:
        if edit.alignment_shift_score is not None:
            user_alignment_stats[edit.user_id]["scores"].append(edit.alignment_shift_score)

    # Update user_activity with alignment scores
    for user_stat in user_activity:
        scores = user_alignment_stats.get(user_stat.user_id, {}).get("scores", [])
        user_stat.avg_alignment_score = sum(scores) / len(scores) if scores else None

    return MetricsResponse(
        # Existing fields
        total_generations=total_generations,
        successful_generations=successful_generations,
        failed_generations=failed_generations,
        generation_success_rate=generation_success_rate,
        total_edits=total_edits,
        acceptance_rate=acceptance_rate,
        most_edited_blocks=most_edited_blocks,
        avg_edit_magnitude=avg_magnitude,  # Edit Behavior Intensity (Step 1: keep)
        temporal_trends=dict(daily_trends),
        user_activity=user_activity,  # Now includes avg_alignment_score
        # NEW: Alignment tracking fields
        avg_alignment_shift_score=avg_alignment,
        alignment_trends=alignment_trends,
        alignment_by_block=alignment_by_block
    )


@router.post("/acceptance-status", status_code=status.HTTP_200_OK)
def update_acceptance_status(
    db: DbSession,
    request: AcceptanceStatusRequest,
    current_user: CurrentUser
):
    """
    Update acceptance status for an AI generation.

    Statuses:
    - "accepted": User accepted AI content without changes
    - "rejected": User completely rejected and replaced AI content
    - "modified": User made changes to AI content
    """
    success = AILoggingService.update_acceptance_status(
        db=db,
        generation_id=request.generation_id,
        status=request.status,
        feedback=request.feedback
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AI generation {request.generation_id} not found"
        )

    return {"status": "updated", "generation_id": str(request.generation_id)}


@router.get("/edit-history/{landing_page_id}/{cell_position}", response_model=List[EditHistoryResponse])
def get_edit_history(
    db: DbSession,
    landing_page_id: UUID,
    cell_position: str,
    current_user: CurrentUser,
    limit: int = 10
):
    """
    Get edit history for a specific cell.

    Returns chronological list of edits with semantic analysis and admin attribution.
    """
    from src.entities.user import User

    service = EditLoggingService()
    history = service.get_edit_history(
        db=db,
        landing_page_id=landing_page_id,
        cell_position=cell_position,
        limit=limit
    )

    # Enrich with admin email for display
    enriched_history = []
    for edit in history:
        response = EditHistoryResponse(
            cell_position=edit.cell_position,
            edit_type=edit.edit_type,
            content_before=edit.content_before,
            content_after=edit.content_after,
            char_delta=edit.char_delta,
            edit_duration_seconds=edit.edit_duration_seconds,
            semantic_analysis=edit.semantic_analysis,
            created_at=edit.created_at,
            user_id=edit.user_id,
            is_admin_edit=edit.is_admin_edit,
            performed_by_user_id=edit.performed_by_user_id
        )

        # Fetch admin email if this was an admin edit
        if edit.performed_by_user_id:
            admin_user = db.query(User).filter(User.id == edit.performed_by_user_id).first()
            response.performed_by_email = admin_user.email if admin_user else None

        enriched_history.append(response)

    return enriched_history


@router.post("/generation-failure", status_code=status.HTTP_200_OK)
def mark_generation_failure(
    db: DbSession,
    request: GenerationFailureRequest,
    current_user: CurrentUser
):
    """
    Mark the most recent AI generation for a cell as failed.

    Called from frontend when:
    - AI returned empty/invalid content
    - Content couldn't be applied to the cell
    - Any error occurred during generation process
    """
    try:
        # Get the most recent generation for this cell
        recent_generation = AILoggingService.get_generation_by_cell(
            db=db,
            landing_page_id=request.landing_page_id,
            cell_position=request.cell_position
        )

        if recent_generation:
            # Mark as failed
            recent_generation.generation_success = False
            recent_generation.failure_reason = request.failure_reason
            recent_generation.was_accepted = None  # Clear acceptance status for failed generations

            db.commit()

            logging.info(f"[Generation Failure] Marked generation as failed for cell {request.cell_position}: {request.failure_reason}")
            return {"status": "marked_as_failed", "generation_id": str(recent_generation.id)}

        return {"status": "no_recent_generation"}

    except Exception as e:
        logging.error(f"✗ Failed to mark generation as failed: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark generation as failed: {str(e)}"
        )


# ===== Background Task Functions =====

def _process_edit_log(db: DbSession, current_user, request: LogUserEditRequest):
    """
    Background task to process and log user edit.
    Includes semantic analysis, profile update, and AI acceptance tracking.
    """
    try:
        # Check if there's a recent AI generation for this cell
        recent_generation = AILoggingService.get_generation_by_cell(
            db=db,
            landing_page_id=request.landing_page_id,
            cell_position=request.cell_position
        )

        # Add generation_id to edit context if found
        if recent_generation:
            request.edit_context['ai_generation_id'] = recent_generation.id

            # Only update status if it's not already rejected
            # (If user already regenerated, keep it as rejected)
            if recent_generation.was_accepted != 'rejected':
                # User is editing AI-generated content
                # Strip HTML tags for comparison
                import re
                ai_content = recent_generation.raw_output
                ai_text = re.sub(r'<[^>]+>', '', ai_content).strip()
                before_text = re.sub(r'<[^>]+>', '', request.content_before or '').strip()
                after_text = re.sub(r'<[^>]+>', '', request.content_after).strip()

                # Determine status based on the edit
                if after_text == ai_text or (before_text and after_text == before_text):
                    # User didn't actually change anything (edge case)
                    status = 'accepted'
                elif len(after_text) == 0:
                    # User deleted all content
                    status = 'rejected'
                else:
                    # User modified the AI content
                    status = 'modified'

                # Update acceptance status
                AILoggingService.update_acceptance_status(
                    db=db,
                    generation_id=recent_generation.id,
                    status=status
                )
                logging.info(f"[Acceptance Tracking] Marked generation as '{status}' for cell {request.cell_position}")

        service = EditLoggingService()
        edit_log = service.log_edit(
            db=db,
            current_user=current_user,
            landing_page_id=request.landing_page_id,
            proyecto_id=request.proyecto_id,
            cell_position=request.cell_position,
            content_before=request.content_before,
            content_after=request.content_after,
            edit_context=request.edit_context
        )

        if edit_log:
            # Update user profile incrementally after successful log (per-project)
            ProfileBuilderService.update_profile(db, current_user.get_uuid(), request.proyecto_id)

    except Exception as e:
        logging.error(f"✗ Failed to process edit log in background: {e}", exc_info=True)



#LOG COMPLETO DE LANDING PAGES PARA DATASET DE ENTRENAMIENTO (V3 GOLD)
#CREACION DE  CARPETA Y GUARDADO DE ARCHIVO JSON POR CADA LANDING PAGE (SE SOBREESCRIBE SI YA EXISTE, PARA MANTENER SOLO LA VERSIÓN MÁS RECIENTE) CON EL CONTENIDO LIMPIO Y LOS METADATOS RELEVANTES. TAMBIÉN SE HACE UPSERT EN BASE DE DATOS PARA TENER REGISTRO ESTRUCTURADO DE CADA LANDING PAGE PROCESADA.
@router.post("/training-dataset", status_code=status.HTTP_201_CREATED)
def log_full_landing_dataset(
    db: DbSession,
    request: dict,
    current_user: CurrentUser
):
    try:
        u_id = getattr(current_user, 'id', None) or getattr(current_user, 'user_id', None)
        lp_id = request.get("landing_page_id")
        raw_content = request.get("full_json_content", {}) 
        metadata_front = request.get('metadata', {})
        tema = metadata_front.get('tit_seo', 'Tema Desconocido')

        template_id = request.get("template_id") 
        template_db = db.query(Template).filter(Template.id == template_id).first()
        template_name = template_db.name if template_db else "Template Desconocido"        

        # 1. BUSCAR LA LANDING PARA LLEGAR AL PROYECTO
        # Suponiendo que tu entidad se llama LandingPage y tiene un campo 'proyecto_id'
        # Si 'Proyecto' ya es la entidad que tiene el contenido, saltar al paso 2.
        from src.entities.landing_page import LandingPage # Asegúrate de importar tu entidad de LP
        
        lp_db = db.query(LandingPage).filter(LandingPage.id == lp_id).first()
        if not lp_db:
            raise HTTPException(status_code=404, detail="No se encontró la Landing Page")

        # 2. OBTENER EL PROYECTO ASOCIADO
        # Usamos el proyecto_id que tiene la landing para buscar el estado real
        proyecto_db = db.query(Proyecto).filter(Proyecto.id == lp_db.proyecto_id).first()
        
        if not proyecto_db:
            raise HTTPException(status_code=404, detail="Proyecto asociado no encontrado")

        # 3. FILTRO DE ESTADOS PERMITIDOS (Inclusión estricta)
        # Solo estos estados pueden entrar al Training Data:
        estados_permitidos = ["rev_kws", "cargue", "en_it", "test", "completed", "pen_review","approved"]
        estado_actual = (proyecto_db.estado or "").lower()

        if estado_actual not in estados_permitidos:
            return {
                "status": "skipped", 
                "message": f"Estado '{estado_actual}' no es apto para Training Dataset. Solo se permiten: {estados_permitidos}"
            }

        # 4. Recuperamos el OBJETO Template
        template_db = db.query(Template).filter(Template.id == template_id).first()
        template_name = template_db.name if template_db else "Template Desconocido"
        t_config = template_db.template_config if template_db else {}


        # 1. RECONSTRUCCIÓN DE LA MATRIZ
        matrix_rows = {}
        for key, value in raw_content.items():
            try:
                r, c = map(int, key.split('-'))
                if r not in matrix_rows: matrix_rows[r] = {}
                text = value.get("content", "") if isinstance(value, dict) else str(value)
                matrix_rows[r][c] = re.sub(r'<[^>]*>', '', text).strip()
            except: continue

        # 2. AGRUPACIÓN POR BLOQUE
        bloques_finales = {}
        current_page = ""
        current_block = ""

        for r in sorted(matrix_rows.keys()):
            row = matrix_rows[r]
            if row.get(0): current_page = row.get(0).strip().lower()
            if row.get(1): current_block = row.get(1).strip()
            
            contenido = row.get(3, "").strip()
            if not contenido or not current_page: continue

            block_key = f"{current_page}_{current_block}"
            if block_key not in bloques_finales:
                bloques_finales[block_key] = {"page": current_page, "texts": []}
            
            bloques_finales[block_key]["texts"].append(contenido)

        # =========================================================
        # PRE-PROCESAMIENTO: UNIFICAR SECCIONES ESPECIALES
        # =========================================================
        
        # 1. UNIFICAR FAVORITE CITIES
        fc_keys = [k for k in bloques_finales.keys() if "favoritecities" in k.lower()]
        if len(fc_keys) > 1:
            fc_unificado = {"page": bloques_finales[fc_keys[0]]["page"], "texts": []}
            for key in sorted(fc_keys):
                fc_unificado["texts"].extend(bloques_finales[key]["texts"])
            for key in fc_keys:
                del bloques_finales[key]
            bloques_finales["favoritecities_unificado"] = fc_unificado

        # 2. UNIFICAR AGENCIES
        agencies_keys = [k for k in bloques_finales.keys() if "agencies" in k.lower()]
        if len(agencies_keys) > 1:
            agencies_unificado = {"page": bloques_finales[agencies_keys[0]]["page"], "texts": []}
            for key in sorted(agencies_keys):
                agencies_unificado["texts"].extend(bloques_finales[key]["texts"])
            for key in agencies_keys:
                del bloques_finales[key]
            bloques_finales["agencies_unificado"] = agencies_unificado
        # =========================================================

        registros_creados = 0

        # 3. GENERACIÓN DINÁMICA DE PARES (INPUT/OUTPUT)
        for key, data in bloques_finales.items():
            page = data["page"]
            block = data.get("block", page) 
            textos = [txt.strip() for txt in data["texts"] if txt and txt.strip()]

            if not textos: continue

            output_p = ""
            uid = None

            # --- MAPEO DE ETIQUETAS SEGÚN LA FUNCIÓN DEL PROYECTO ---
            
            # 1. Quicksearch 
            if any(x in key for x in ["quicksearch"]):
                tit = textos[0] if len(textos) > 0 else tema
                desc = textos[1] if len(textos) > 1 else ""
                output_p = f"|tit: {tit}|\n|desc: {desc}|"
                uid = f"lp_{lp_id}_{key.lower().replace(' ', '_')}"

            # 2. Fleet
            elif "fleet" in key:
                tit = textos[0] if len(textos) > 0 else tema
                desc = textos[1] if len(textos) > 1 else ""
                ip_u = textos[2] if len(textos) > 2 else ""
                ip_b = textos[3] if len(textos) > 3 else ""
                output_p = f"|tit: {tit}|\n|desc: {desc}|\n|ip_usa: {ip_u}|\n|ip_bra: {ip_b}|"
                uid = f"lp_{lp_id}_{key.lower().replace(' ', '_')}"

            # 3. Agencies (UNIFICADO - PROCESA TODOS LOS TEXTOS)
            elif "agencies" in key.lower():
                uid = f"lp_{lp_id}_agencies_full"
                
                output_parts = []
                textos_proc = textos[:]
                disclaimer = ""
                
                # Detectar disclaimer al final (igual que FAQ)
                if len(textos_proc) > 0 and ("sujetos a cambios" in textos_proc[-1].lower() or 
                    "precios pueden variar" in textos_proc[-1].lower() or
                    "términos y condiciones" in textos_proc[-1].lower()):
                    disclaimer = textos_proc.pop()
                
                # Header principal
                tit = textos_proc[0] if len(textos_proc) > 0 else tema
                output_parts.append(f"|tit: {tit}|")
                
                # Descripción H2
                if len(textos_proc) > 1:
                    output_parts.append(f"|desc_h2: {textos_proc[1]}|")
                
                # Descripción H3
                if len(textos_proc) > 2:
                    output_parts.append(f"|desc_h3: {textos_proc[2]}|")
                
                # Procesar TODOS los textos restantes (agencias individuales, info adicional, etc.)
                textos_extra = textos_proc[3:]
                for i, txt in enumerate(textos_extra):
                    if txt and txt.strip():
                        output_parts.append(f"|info_{i+1}: {txt}|")
                
                # Agregar disclaimer si existe
                if disclaimer:
                    output_parts.append(f"|info: {disclaimer}|")
                
                output_p = "\n".join(output_parts)
                # NO sobrescribir uid

            # 4. CAR RENTAL
            elif any(x in key.lower() for x in ["carrental", "car_type", "alquiler_autos"]):
                tit_h2 = textos[0] if len(textos) > 0 else tema
                desc_h2 = textos[1] if len(textos) > 1 else ""
                
                output_parts = [
                    f"|tit: {tit_h2}|",
                    f"|desc: {desc_h2}|"
                ]
                
                items_raw = textos[2:]
                contador = 1
                
                for i in range(0, len(items_raw), 2):
                    if i + 1 < len(items_raw):
                        nombre_auto = items_raw[i].strip()
                        descripcion_auto = items_raw[i+1].strip()
                        
                        if nombre_auto or descripcion_auto:
                            output_parts.append(f"|desc_{contador}: {nombre_auto}\n{descripcion_auto}|")
                            contador += 1
                
                output_p = "\n".join(output_parts)
                uid = f"lp_{lp_id}_{key.lower().replace(' ', '_')}"

            # 5. FAQ
            elif any(x in key.lower() for x in ["faqs", "questions", "faq"]):
                disclaimer = ""
                textos_proc = textos[:] 
                if len(textos_proc) > 0 and ("basados en los resultados" in textos_proc[-1].lower() or "precios pueden variar" in textos_proc[-1].lower()):
                    disclaimer = textos_proc.pop()

                tit_h2 = textos_proc[0] if len(textos_proc) > 0 else ""
                desc_h2 = textos_proc[1] if len(textos_proc) > 1 else ""
                
                output_parts = [
                    f"|tit: {tit_h2}|",
                    f"|desc: {desc_h2}|"
                ]
                
                qa_items = textos_proc[2:] 
                faq_index = 1
                
                for i in range(0, len(qa_items), 2):
                    if i + 1 < len(qa_items):
                        pregunta = qa_items[i].strip()
                        respuesta = qa_items[i+1].strip()
                        
                        if pregunta or respuesta:
                            output_parts.append(f"|faq_{faq_index}: {pregunta}: {respuesta}|")
                            faq_index += 1
                
                if disclaimer:
                    output_parts.append(f"|info: {disclaimer}|")
                    
                output_p = "\n".join(output_parts)
                uid = f"lp_{lp_id}_{key.lower().replace(' ', '_')}"

            # 6. FAVORITE CITIES (UNIFICADO)
            elif any(x in key.lower() for x in ["favoritecities"]):
                uid = f"lp_{lp_id}_favorite_cities_full" 

                tit_h2 = textos[0] if len(textos) > 0 else tema
                desc_h2 = textos[1] if len(textos) > 1 else ""
                
                output_parts = [
                    f"|tit: {tit_h2}|",
                    f"|desc: {desc_h2}|"
                ]
                
                ciudades_raw = textos[2:]
                
                if ciudades_raw:
                    contador = 1
                    for i in range(0, len(ciudades_raw), 2):
                        if i + 1 < len(ciudades_raw):
                            nombre_ciudad = ciudades_raw[i].strip()
                            desc_ciudad = ciudades_raw[i+1].strip()
                            
                            if nombre_ciudad and desc_ciudad:
                                output_parts.append(f"|desc_{contador}: {nombre_ciudad}\n{desc_ciudad}|")
                                contador += 1
                
                output_p = "\n".join(output_parts)

            else:
                output_p = "\n".join([f"|desc_{i+1}: {txt}|" for i, txt in enumerate(textos)])
                uid = f"lp_{lp_id}_{key.lower().replace(' ', '_')}"
            
            # --- INPUT TÉCNICO ---
            input_p = f"Nuevo tema: {tema}, Tipo: {block.upper()}, template: {template_name}"

            # =========================================================
            # VALIDACIÓN DE INTEGRIDAD
            # =========================================================
            
            if not output_p or not output_p.strip():
                continue
            
            if not input_p or not input_p.strip():
                continue

            contenido_real = re.sub(r'\|[^:]+:\s*\|', '', output_p).strip()
            if len(contenido_real) < 3:
                continue

            if not uid:
                uid = f"lp_{lp_id}_{key.lower().replace(' ', '_')}"
            # =========================================================

            dataset_entry = {
                "user_id": u_id,
                "input_prompt": input_p,
                "expected_output": output_p,
                "block_type": page,
                "is_verified": True,
                "dataset_version": "v4_generic_style",
                "extra_metadata": {
                    "landing_page_id": str(lp_id),
                    "proyecto_id": str(proyecto_db.id), # Guardamos la referencia al proyecto
                    "template_name": template_name,
                    "template_config": t_config,    # CONFIG para que la IA sepa cómo se hace
                    "estado_validado": estado_actual,
                    "marca": metadata_front.get('marca'),
                    "tema": metadata_front.get('tit_seo')
                }
            }

            existing = db.query(TrainingDataset).filter(
                cast(TrainingDataset.extra_metadata['unique_id'], String) == f'"{uid}"'
            ).first()

            if existing:
                for k, v in dataset_entry.items(): setattr(existing, k, v)
            else:
                db.add(TrainingDataset(**dataset_entry))
            
            registros_creados += 1

        db.commit()
        return {"status": "success", "message": f"Se procesaron {registros_creados} bloques válidos."}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))















#COMANDO SQL PARA EXTRAER EL DATASET :docker exec -t redactoria-db-1 psql -U postgres -d cleanfastapi -c "COPY (SELECT input_prompt as input, expected_output as output, (extra_metadata->>'tema') as tema, (extra_metadata->>'marca') as marca, (extra_metadata->>'template_name') as template FROM training_dataset WHERE dataset_version = 'v1_prueba' AND is_verified = true) TO '/tmp/dataset_utf8.csv' WITH CSV HEADER;"
#COMANDO PARA EXPORTAR DESDE EL CONTENEDOR: docker cp redactoria-db-1:/tmp/dataset_utf8.csv ./dataset_inspiracion_ia.csv