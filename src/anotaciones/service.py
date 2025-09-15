from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy.orm import Session
from typing import List, Dict
from . import models
from src.auth.models import TokenData
from src.entities.anotacion import Anotacion
from src.entities.landing_page import LandingPage
from src.entities.proyecto import Proyecto
from src.entities.user import User
from src.exceptions import AnotacionCreationError, AnotacionNotFoundError
import logging

def create_anotacion(current_user: TokenData, db: Session, anotacion: models.AnotacionCreate) -> Anotacion:
    try:
        # Verificar que la landing page existe y el usuario tiene permisos
        landing_page = db.query(LandingPage).filter(LandingPage.id == anotacion.landing_page_id).first()
        if not landing_page:
            raise AnotacionCreationError("Landing page not found")
        
        # Verificar permisos a través del proyecto
        _verify_landing_page_permissions(current_user, db, landing_page)
        
        # Obtener nombre del usuario para el autor
        user = db.query(User).filter(User.id == current_user.get_uuid()).first()
        author_name = f"{user.first_name} {user.last_name}" if user else "Usuario Desconocido"
        
        new_anotacion = Anotacion(
            landing_page_id=anotacion.landing_page_id,
            user_id=current_user.get_uuid(),
            cell_position=anotacion.cell_position,
            text=anotacion.text,
            author=author_name,
            created_at=datetime.now(timezone.utc)
        )
        
        db.add(new_anotacion)
        db.commit()
        db.refresh(new_anotacion)
        logging.info(f"Created new anotacion at {anotacion.cell_position} for landing page {anotacion.landing_page_id}")
        return new_anotacion
    except Exception as e:
        logging.error(f"Failed to create anotacion for user {current_user.get_uuid()}. Error: {str(e)}")
        raise AnotacionCreationError(str(e))

def get_anotaciones_by_landing_page(current_user: TokenData, db: Session, landing_page_id: UUID) -> List[Anotacion]:
    # Verificar permisos
    landing_page = db.query(LandingPage).filter(LandingPage.id == landing_page_id).first()
    if not landing_page:
        raise AnotacionNotFoundError("Landing page not found")
    
    _verify_landing_page_permissions(current_user, db, landing_page)
    
    anotaciones = db.query(Anotacion).filter(
        Anotacion.landing_page_id == landing_page_id
    ).order_by(Anotacion.created_at.desc()).all()
    
    logging.info(f"Retrieved {len(anotaciones)} anotaciones for landing page {landing_page_id}")
    return anotaciones

def get_anotacion_by_id(current_user: TokenData, db: Session, anotacion_id: UUID) -> Anotacion:
    anotacion = db.query(Anotacion).filter(Anotacion.id == anotacion_id).first()
    if not anotacion:
        logging.warning(f"Anotacion {anotacion_id} not found for user {current_user.get_uuid()}")
        raise AnotacionNotFoundError(anotacion_id)
    
    # Verificar permisos a través de landing page
    landing_page = db.query(LandingPage).filter(LandingPage.id == anotacion.landing_page_id).first()
    if landing_page:
        _verify_landing_page_permissions(current_user, db, landing_page)
    
    logging.info(f"Retrieved anotacion {anotacion_id} for user {current_user.get_uuid()}")
    return anotacion

def update_anotacion(current_user: TokenData, db: Session, anotacion_id: UUID, 
                    anotacion_update: models.AnotacionUpdate) -> Anotacion:
    anotacion = get_anotacion_by_id(current_user, db, anotacion_id)
    
    # Solo el autor puede editar su anotación (o admin)
    if anotacion.user_id != current_user.get_uuid():
        # Aquí verificarías si es admin
        pass
    
    # Actualizar campos si se proporcionan
    update_data = anotacion_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(anotacion, field, value)
    
    anotacion.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(anotacion)
    logging.info(f"Successfully updated anotacion {anotacion_id}")
    return anotacion

def delete_anotacion(current_user: TokenData, db: Session, anotacion_id: UUID) -> None:
    anotacion = get_anotacion_by_id(current_user, db, anotacion_id)
    
    # Solo el autor puede eliminar su anotación (o admin)
    if anotacion.user_id != current_user.get_uuid():
        # Aquí verificarías si es admin
        pass
    
    db.delete(anotacion)
    db.commit()
    logging.info(f"Anotacion {anotacion_id} deleted by user {current_user.get_uuid()}")

def create_anotacion_for_cell(current_user: TokenData, db: Session, landing_page_id: UUID, 
                             anotacion_request: models.CreateAnotacionRequest) -> Anotacion:
    """Crear anotación para una celda específica desde el redactor"""
    # Verificar permisos
    landing_page = db.query(LandingPage).filter(LandingPage.id == landing_page_id).first()
    if not landing_page:
        raise AnotacionCreationError("Landing page not found")
    
    _verify_landing_page_permissions(current_user, db, landing_page)
    
    # Obtener nombre del usuario
    user = db.query(User).filter(User.id == current_user.get_uuid()).first()
    author_name = f"{user.first_name} {user.last_name}" if user else "Usuario Desconocido"
    
    new_anotacion = Anotacion(
        landing_page_id=landing_page_id,
        user_id=current_user.get_uuid(),
        cell_position=anotacion_request.cell_position,
        text=anotacion_request.text,
        author=author_name,
        created_at=datetime.now(timezone.utc)
    )
    
    db.add(new_anotacion)
    db.commit()
    db.refresh(new_anotacion)
    
    logging.info(f"Created anotacion for cell {anotacion_request.cell_position} in landing page {landing_page_id}")
    return new_anotacion

def get_anotaciones_by_cell(current_user: TokenData, db: Session, landing_page_id: UUID, cell_position: str) -> List[Anotacion]:
    """Obtener anotaciones de una celda específica"""
    # Verificar permisos
    landing_page = db.query(LandingPage).filter(LandingPage.id == landing_page_id).first()
    if not landing_page:
        raise AnotacionNotFoundError("Landing page not found")
    
    _verify_landing_page_permissions(current_user, db, landing_page)
    
    anotaciones = db.query(Anotacion).filter(
        Anotacion.landing_page_id == landing_page_id,
        Anotacion.cell_position == cell_position
    ).order_by(Anotacion.created_at.desc()).all()
    
    logging.info(f"Retrieved {len(anotaciones)} anotaciones for cell {cell_position}")
    return anotaciones

def delete_anotaciones_by_cell(current_user: TokenData, db: Session, landing_page_id: UUID, cell_position: str) -> None:
    """Eliminar todas las anotaciones de una celda específica"""
    # Verificar permisos
    landing_page = db.query(LandingPage).filter(LandingPage.id == landing_page_id).first()
    if not landing_page:
        raise AnotacionNotFoundError("Landing page not found")
    
    _verify_landing_page_permissions(current_user, db, landing_page)
    
    # Obtener anotaciones de la celda
    anotaciones = db.query(Anotacion).filter(
        Anotacion.landing_page_id == landing_page_id,
        Anotacion.cell_position == cell_position
    ).all()
    
    # Eliminar todas (podrías agregar validación de permisos por anotación)
    for anotacion in anotaciones:
        db.delete(anotacion)
    
    db.commit()
    logging.info(f"Deleted {len(anotaciones)} anotaciones from cell {cell_position}")

def get_anotaciones_panel(current_user: TokenData, db: Session, landing_page_id: UUID) -> models.AnotacionPanelResponse:
    """Obtener todas las anotaciones agrupadas por celda para el panel"""
    # Verificar permisos
    landing_page = db.query(LandingPage).filter(LandingPage.id == landing_page_id).first()
    if not landing_page:
        raise AnotacionNotFoundError("Landing page not found")
    
    _verify_landing_page_permissions(current_user, db, landing_page)
    
    # Obtener todas las anotaciones
    anotaciones = db.query(Anotacion).filter(
        Anotacion.landing_page_id == landing_page_id
    ).order_by(Anotacion.created_at.desc()).all()
    
    # Agrupar por celda
    anotaciones_por_celda: Dict[str, List[Anotacion]] = {}
    for anotacion in anotaciones:
        cell_pos = anotacion.cell_position
        if cell_pos not in anotaciones_por_celda:
            anotaciones_por_celda[cell_pos] = []
        anotaciones_por_celda[cell_pos].append(anotacion)
    
    # Crear response
    panel_response = models.AnotacionPanelResponse(
        landing_page_id=landing_page_id,
        anotaciones_por_celda=anotaciones_por_celda,
        total_anotaciones=len(anotaciones)
    )
    
    logging.info(f"Retrieved panel with {len(anotaciones)} anotaciones in {len(anotaciones_por_celda)} cells")
    return panel_response

def get_anotaciones_by_user(current_user: TokenData, db: Session) -> List[Anotacion]:
    """Obtener todas las anotaciones creadas por el usuario actual"""
    anotaciones = db.query(Anotacion).filter(
        Anotacion.user_id == current_user.get_uuid()
    ).order_by(Anotacion.created_at.desc()).all()
    
    logging.info(f"Retrieved {len(anotaciones)} anotaciones for user {current_user.get_uuid()}")
    return anotaciones

def get_anotaciones_by_user_in_lp(current_user: TokenData, db: Session, landing_page_id: UUID, user_id: UUID) -> List[Anotacion]:
    """Obtener anotaciones de un usuario específico en una landing page"""
    # Verificar permisos
    landing_page = db.query(LandingPage).filter(LandingPage.id == landing_page_id).first()
    if not landing_page:
        raise AnotacionNotFoundError("Landing page not found")
    
    _verify_landing_page_permissions(current_user, db, landing_page)
    
    anotaciones = db.query(Anotacion).filter(
        Anotacion.landing_page_id == landing_page_id,
        Anotacion.user_id == user_id
    ).order_by(Anotacion.created_at.desc()).all()
    
    logging.info(f"Retrieved {len(anotaciones)} anotaciones for user {user_id} in landing page {landing_page_id}")
    return anotaciones

def _verify_landing_page_permissions(current_user: TokenData, db: Session, landing_page: LandingPage) -> None:
    """Función auxiliar para verificar permisos a través del proyecto"""
    proyecto = db.query(Proyecto).filter(Proyecto.id == landing_page.proyecto_id).first()
    if proyecto:
        user_uuid = current_user.get_uuid()
        if proyecto.created_by != user_uuid and proyecto.assigned_to != user_uuid:
            # Aquí verificarías si es admin
            pass