from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy.orm import Session
from typing import Optional, List
from . import models
from src.auth.models import TokenData
from src.entities.landing_page import LandingPage
from src.entities.proyecto import Proyecto
from src.exceptions import LandingPageCreationError, LandingPageNotFoundError
import logging

# Lista de IDs de administradores 
ADMIN_USER_IDS = [
  '65cd97a4-c3b9-4bfd-b014-55457ae847e3',
  'f49cda9b-2138-435e-a497-fda85be87e63',
  'c7c17838-074d-44fa-9248-8dc87c15edd5',
  '152c46be-e2f4-48da-86b1-592af570624a',
  'b43f1d04-f339-4cf9-8e4e-4f127f12af5a',
  ]

def is_admin_user(user_uuid) -> bool:
    """Verificar si el usuario es administrador"""
    if user_uuid is None:
        return False
    
    # Convertir a string para comparar, manejar tanto UUID como string
    user_str = str(user_uuid)
    is_admin = user_str in ADMIN_USER_IDS
    
    return is_admin

def create_landing_page(current_user: TokenData, db: Session, landing_page: models.LandingPageCreate) -> LandingPage:
    try:
        # Verificar que el proyecto existe y el usuario tiene permisos
        proyecto = db.query(Proyecto).filter(Proyecto.id == landing_page.proyecto_id).first()
        if not proyecto:
            raise LandingPageCreationError("Proyecto not found")
        
        # Verificar permisos: solo creador, asignado del proyecto o admin pueden crear LP
        user_uuid = current_user.get_uuid()
        if not is_admin_user(user_uuid) and proyecto.created_by != user_uuid and proyecto.assigned_to != user_uuid:
            raise LandingPageCreationError("Insufficient permissions to create landing page")
        
        # Verificar que no existe ya una LP para este proyecto (relación 1:1)
        existing_lp = db.query(LandingPage).filter(LandingPage.proyecto_id == landing_page.proyecto_id).first()
        if existing_lp:
            raise LandingPageCreationError("Landing page already exists for this proyecto")
        
        new_landing_page = LandingPage(
            proyecto_id=landing_page.proyecto_id,
            url_slug=landing_page.url_slug,
            title=landing_page.title,
            meta_description=landing_page.meta_description,
            is_published=False,
            created_at=datetime.now(timezone.utc)
        )
        
        db.add(new_landing_page)
        db.commit()
        db.refresh(new_landing_page)
        logging.info(f"Created new landing page for proyecto {landing_page.proyecto_id} by user: {current_user.get_uuid()}")
        return new_landing_page
    except Exception as e:
        logging.error(f"Failed to create landing page for user {current_user.get_uuid()}. Error: {str(e)}")
        raise LandingPageCreationError(str(e))

def get_landing_pages(current_user: TokenData, db: Session, is_published: Optional[bool] = None) -> List[LandingPage]:
    query = db.query(LandingPage).join(Proyecto)
    
    user_uuid = current_user.get_uuid()
    
    # Si es admin, puede ver todas las landing pages
    if not is_admin_user(user_uuid):
        # Filtrar por permisos: solo LPs de proyectos donde el usuario está involucrado
        query = query.filter(
            (Proyecto.created_by == user_uuid) | (Proyecto.assigned_to == user_uuid)
        )
    
    # Filtrar por estado de publicación si se especifica
    if is_published is not None:
        query = query.filter(LandingPage.is_published == is_published)
    
    landing_pages = query.order_by(LandingPage.created_at.desc()).all()
    logging.info(f"Retrieved {len(landing_pages)} landing pages for user: {current_user.get_uuid()}")
    return landing_pages

def get_landing_page_by_id(current_user: TokenData, db: Session, landing_page_id: UUID) -> LandingPage:
    landing_page = db.query(LandingPage).filter(LandingPage.id == landing_page_id).first()
    if not landing_page:
        logging.warning(f"Landing page {landing_page_id} not found for user {current_user.get_uuid()}")
        raise LandingPageNotFoundError(landing_page_id)
    
    user_uuid = current_user.get_uuid()
    
    # Si no es admin, verificar permisos a través del proyecto
    if not is_admin_user(user_uuid):
        proyecto = db.query(Proyecto).filter(Proyecto.id == landing_page.proyecto_id).first()
        if proyecto and proyecto.created_by != user_uuid and proyecto.assigned_to != user_uuid:
            raise LandingPageNotFoundError("Insufficient permissions to access this landing page")
    
    logging.info(f"Retrieved landing page {landing_page_id} for user {current_user.get_uuid()}")
    return landing_page

def update_landing_page(current_user: TokenData, db: Session, landing_page_id: UUID, 
                       landing_page_update: models.LandingPageUpdate) -> LandingPage:
    landing_page = get_landing_page_by_id(current_user, db, landing_page_id)
    
    # Actualizar campos si se proporcionan
    update_data = landing_page_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(landing_page, field, value)
    
    landing_page.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(landing_page)
    logging.info(f"Successfully updated landing page {landing_page_id} for user {current_user.get_uuid()}")
    return landing_page

def delete_landing_page(current_user: TokenData, db: Session, landing_page_id: UUID) -> None:
    landing_page = get_landing_page_by_id(current_user, db, landing_page_id)
    
    user_uuid = current_user.get_uuid()
    
    # Verificar permisos adicionales para eliminar (solo creador del proyecto o admin)
    if not is_admin_user(user_uuid):
        proyecto = db.query(Proyecto).filter(Proyecto.id == landing_page.proyecto_id).first()
        if proyecto and proyecto.created_by != user_uuid:
            raise LandingPageNotFoundError("Insufficient permissions to delete this landing page")
    
    db.delete(landing_page)
    db.commit()
    logging.info(f"Landing page {landing_page_id} deleted by user {current_user.get_uuid()}")

def publish_landing_page(current_user: TokenData, db: Session, landing_page_id: UUID, is_published: bool) -> LandingPage:
    landing_page = get_landing_page_by_id(current_user, db, landing_page_id)
    
    landing_page.is_published = is_published
    if is_published:
        landing_page.published_at = datetime.now(timezone.utc)
    else:
        landing_page.published_at = None
    
    landing_page.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(landing_page)
    
    action = "published" if is_published else "unpublished"
    logging.info(f"Landing page {landing_page_id} {action} by user {current_user.get_uuid()}")
    return landing_page

def get_landing_page_by_proyecto(current_user: TokenData, db: Session, proyecto_id: UUID) -> LandingPage:
    user_uuid = current_user.get_uuid()
    # Verificar que el proyecto existe
    proyecto = db.query(Proyecto).filter(Proyecto.id == proyecto_id).first()
    if not proyecto:
        raise LandingPageNotFoundError("Associated proyecto not found")
    
    user_uuid = current_user.get_uuid()
    
    # Verificar si es admin ANTES de revisar permisos específicos
    is_admin = is_admin_user(user_uuid)
    
    if is_admin:
        logging.info(f"✅ DEBUG: Admin user has access to all proyectos")
    else:
        
        # Comparar UUIDs
        created_by_match = proyecto.created_by == user_uuid
        assigned_to_match = proyecto.assigned_to == user_uuid
        
        if not (created_by_match or assigned_to_match):
            logging.warning(f"⚠️ DEBUG: User {user_uuid} doesn't have access to proyecto {proyecto_id}")
            raise LandingPageNotFoundError("Insufficient permissions to access this proyecto")
        else:
            logging.info(f"✅ DEBUG: User has specific permissions to proyecto")
    
    landing_page = db.query(LandingPage).filter(LandingPage.proyecto_id == proyecto_id).first()
    
    if not landing_page:
        
        # ✅ AGREGAR: Ver qué landing pages existen
        all_lps = db.query(LandingPage).all()
        for lp in all_lps:
            logging.info(f"🔍 DEBUG: LP {lp.id} -> proyecto_id: {lp.proyecto_id}")
        
        raise LandingPageNotFoundError("Landing page not found for this proyecto")
    return landing_page

def get_landing_page_public(db: Session, url_slug: str) -> LandingPage:
    """Obtener landing page pública por URL slug (sin autenticación)"""
    landing_page = db.query(LandingPage).filter(
        LandingPage.url_slug == url_slug,
        LandingPage.is_published == True
    ).first()
    
    if not landing_page:
        raise LandingPageNotFoundError("Published landing page not found")
    
    logging.info(f"Retrieved public landing page with slug: {url_slug}")
    return landing_page

def preview_landing_page(current_user: TokenData, db: Session, landing_page_id: UUID) -> LandingPage:
    """Preview de landing page para desarrollo/testing"""
    landing_page = get_landing_page_by_id(current_user, db, landing_page_id)
    
    # Convertir a formato público para preview
    logging.info(f"Preview landing page {landing_page_id} by user {current_user.get_uuid()}")
    return landing_page