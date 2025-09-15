from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy.orm import Session
from typing import List
from . import models
from src.auth.models import TokenData
from src.entities.seccion_lp import SeccionLP
from src.entities.landing_page import LandingPage
from src.entities.proyecto import Proyecto
from src.exceptions import SeccionLPCreationError, SeccionLPNotFoundError
# from src.core.content_generator import ContentGenerator  # Cuando esté disponible
import logging

def create_seccion(current_user: TokenData, db: Session, seccion: models.SeccionLPCreate) -> SeccionLP:
    try:
        # Verificar que la landing page existe y el usuario tiene permisos
        landing_page = db.query(LandingPage).filter(LandingPage.id == seccion.landing_page_id).first()
        if not landing_page:
            raise SeccionLPCreationError("Landing page not found")
        
        # Verificar permisos a través del proyecto
        _verify_landing_page_permissions(current_user, db, landing_page)
        
        new_seccion = SeccionLP(
            landing_page_id=seccion.landing_page_id,
            cell_position=seccion.cell_position,
            section_type=seccion.section_type.value if seccion.section_type else models.SectionType.CUSTOM.value,
            title=seccion.title,
            content=seccion.content,
            created_at=datetime.now(timezone.utc)
        )
        
        db.add(new_seccion)
        db.commit()
        db.refresh(new_seccion)
        logging.info(f"Created new seccion at {seccion.cell_position} for landing page {seccion.landing_page_id}")
        return new_seccion
    except Exception as e:
        logging.error(f"Failed to create seccion for user {current_user.get_uuid()}. Error: {str(e)}")
        raise SeccionLPCreationError(str(e))

def get_secciones_by_landing_page(current_user: TokenData, db: Session, landing_page_id: UUID) -> List[SeccionLP]:
    # Verificar permisos
    landing_page = db.query(LandingPage).filter(LandingPage.id == landing_page_id).first()
    if not landing_page:
        raise SeccionLPNotFoundError("Landing page not found")
    
    _verify_landing_page_permissions(current_user, db, landing_page)
    
    secciones = db.query(SeccionLP).filter(
        SeccionLP.landing_page_id == landing_page_id
    ).order_by(SeccionLP.cell_position).all()
    
    logging.info(f"Retrieved {len(secciones)} secciones for landing page {landing_page_id}")
    return secciones

def get_seccion_by_id(current_user: TokenData, db: Session, seccion_id: UUID) -> SeccionLP:
    seccion = db.query(SeccionLP).filter(SeccionLP.id == seccion_id).first()
    if not seccion:
        logging.warning(f"Seccion {seccion_id} not found for user {current_user.get_uuid()}")
        raise SeccionLPNotFoundError(seccion_id)
    
    # Verificar permisos a través de landing page
    landing_page = db.query(LandingPage).filter(LandingPage.id == seccion.landing_page_id).first()
    if landing_page:
        _verify_landing_page_permissions(current_user, db, landing_page)
    
    logging.info(f"Retrieved seccion {seccion_id} for user {current_user.get_uuid()}")
    return seccion

def update_seccion(current_user: TokenData, db: Session, seccion_id: UUID, 
                  seccion_update: models.SeccionLPUpdate) -> SeccionLP:
    seccion = get_seccion_by_id(current_user, db, seccion_id)
    
    # Actualizar campos si se proporcionan
    update_data = seccion_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == 'section_type' and hasattr(value, 'value'):
            setattr(seccion, field, value.value)
        else:
            setattr(seccion, field, value)
    
    seccion.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(seccion)
    logging.info(f"Successfully updated seccion {seccion_id}")
    return seccion

def delete_seccion(current_user: TokenData, db: Session, seccion_id: UUID) -> None:
    seccion = get_seccion_by_id(current_user, db, seccion_id)
    
    db.delete(seccion)
    db.commit()
    logging.info(f"Seccion {seccion_id} deleted by user {current_user.get_uuid()}")

def update_cell_content(current_user: TokenData, db: Session, landing_page_id: UUID, 
                       cell_update: models.CellContentUpdate) -> SeccionLP:
    """Actualizar contenido de una celda específica desde el redactor"""
    # Verificar permisos
    landing_page = db.query(LandingPage).filter(LandingPage.id == landing_page_id).first()
    if not landing_page:
        raise SeccionLPNotFoundError("Landing page not found")
    
    _verify_landing_page_permissions(current_user, db, landing_page)
    
    # Buscar sección existente en esa posición
    seccion = db.query(SeccionLP).filter(
        SeccionLP.landing_page_id == landing_page_id,
        SeccionLP.cell_position == cell_update.cell_position
    ).first()
    
    if seccion:
        # Actualizar existente
        seccion.content = cell_update.content
        seccion.updated_at = datetime.now(timezone.utc)
    else:
        # Crear nueva sección
        seccion = SeccionLP(
            landing_page_id=landing_page_id,
            cell_position=cell_update.cell_position,
            section_type=models.SectionType.CUSTOM.value,
            content=cell_update.content,
            created_at=datetime.now(timezone.utc)
        )
        db.add(seccion)
    
    db.commit()
    db.refresh(seccion)
    logging.info(f"Updated cell content at {cell_update.cell_position} for landing page {landing_page_id}")
    return seccion

def bulk_update_secciones(current_user: TokenData, db: Session, landing_page_id: UUID, 
                         bulk_request: models.BulkUpdateSectionsRequest) -> List[SeccionLP]:
    """Actualizar múltiples secciones de una vez (auto-guardado del redactor)"""
    
    # Verificar permisos
    landing_page = db.query(LandingPage).filter(LandingPage.id == landing_page_id).first()
    if not landing_page:
        raise SeccionLPNotFoundError("Landing page not found")
    
    _verify_landing_page_permissions(current_user, db, landing_page)
    
    # Obtener todas las secciones existentes de esta landing page
    existing_sections = db.query(SeccionLP).filter(
        SeccionLP.landing_page_id == landing_page_id
    ).all()
    
    # Crear mapa de secciones existentes por cell_position
    existing_sections_map = {}
    for section in existing_sections:
        existing_sections_map[section.cell_position] = section
    
    updated_secciones = []
    sections_to_delete = []
    
    for section_update in bulk_request.sections:
        cell_position = section_update.cell_position
        content = section_update.content.strip() if section_update.content else ""
        
        existing_section = existing_sections_map.get(cell_position)
        
        if content:  # Tiene contenido - crear o actualizar
            if existing_section:
                # Actualizar sección existente
                existing_section.content = content
                existing_section.section_type = section_update.section_type.value if section_update.section_type else models.SectionType.CUSTOM.value
                existing_section.updated_at = datetime.now(timezone.utc)
                updated_secciones.append(existing_section)
                logging.info(f"Updated section at {cell_position}")
            else:
                # Crear nueva sección
                new_section = SeccionLP(
                    landing_page_id=landing_page_id,
                    cell_position=cell_position,
                    section_type=section_update.section_type.value if section_update.section_type else models.SectionType.CUSTOM.value,
                    content=content,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(new_section)
                updated_secciones.append(new_section)
                logging.info(f"Created new section at {cell_position}")
        else:  # No tiene contenido - eliminar si existe
            if existing_section:
                sections_to_delete.append(existing_section)
                logging.info(f"Marked section at {cell_position} for deletion")
    
    # Eliminar secciones marcadas
    for section in sections_to_delete:
        db.delete(section)
    
    # Hacer commit de todos los cambios
    db.commit()
    
    # Refresh de las secciones actualizadas/creadas
    for section in updated_secciones:
        db.refresh(section)
    
    logging.info(f"Bulk operation completed: {len(updated_secciones)} sections updated/created, {len(sections_to_delete)} sections deleted for landing page {landing_page_id}")
    
    return updated_secciones

def get_seccion_by_cell(current_user: TokenData, db: Session, landing_page_id: UUID, cell_position: str) -> SeccionLP:
    """Obtener sección por posición de celda"""
    # Verificar permisos
    landing_page = db.query(LandingPage).filter(LandingPage.id == landing_page_id).first()
    if not landing_page:
        raise SeccionLPNotFoundError("Landing page not found")
    
    _verify_landing_page_permissions(current_user, db, landing_page)
    
    seccion = db.query(SeccionLP).filter(
        SeccionLP.landing_page_id == landing_page_id,
        SeccionLP.cell_position == cell_position
    ).first()
    
    if not seccion:
        raise SeccionLPNotFoundError(f"Seccion not found at position {cell_position}")
    
    logging.info(f"Retrieved seccion at {cell_position} for landing page {landing_page_id}")
    return seccion

def generate_content_for_seccion(current_user: TokenData, db: Session, seccion_id: UUID, 
                                generate_request: models.GenerateContentRequest) -> SeccionLP:
    """Generar contenido para una sección específica usando LLM"""
    seccion = get_seccion_by_id(current_user, db, seccion_id)
    
    try:
        # Aquí integrarías con tu ContentGenerator
        # content_generator = ContentGenerator()
        # generated_content = content_generator.generate_content_by_type(
        #     generate_request.section_type.value,
        #     generate_request.title,
        #     generate_request.nuevo_tema
        # )
        
        # Por ahora, contenido de ejemplo
        generated_content = f"[GENERATED CONTENT] {generate_request.section_type.value.upper()}: {generate_request.title}"
        
        seccion.content = generated_content
        seccion.section_type = generate_request.section_type.value
        seccion.title = generate_request.title
        seccion.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(seccion)
        
        logging.info(f"Generated {generate_request.section_type.value} content for seccion {seccion_id}")
        return seccion
        
    except Exception as e:
        logging.error(f"Failed to generate content for seccion {seccion_id}. Error: {str(e)}")
        raise SeccionLPCreationError(f"Content generation failed: {str(e)}")

def generate_content_for_cell(current_user: TokenData, db: Session, landing_page_id: UUID, 
                             cell_position: str, generate_request: models.GenerateContentRequest) -> SeccionLP:
    """Generar contenido directamente para una celda específica"""
    try:
        # Buscar o crear sección en esa posición
        seccion = db.query(SeccionLP).filter(
            SeccionLP.landing_page_id == landing_page_id,
            SeccionLP.cell_position == cell_position
        ).first()
        
        if not seccion:
            # Crear nueva sección
            seccion = SeccionLP(
                landing_page_id=landing_page_id,
                cell_position=cell_position,
                section_type=generate_request.section_type.value,
                title=generate_request.title,
                created_at=datetime.now(timezone.utc)
            )
            db.add(seccion)
        
        # Generar contenido (igual que la función anterior)
        generated_content = f"[GENERATED CONTENT] {generate_request.section_type.value.upper()}: {generate_request.title}"
        
        seccion.content = generated_content
        seccion.section_type = generate_request.section_type.value
        seccion.title = generate_request.title
        seccion.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(seccion)
        
        logging.info(f"Generated content for cell {cell_position} in landing page {landing_page_id}")
        return seccion
        
    except Exception as e:
        logging.error(f"Failed to generate content for cell {cell_position}. Error: {str(e)}")
        raise SeccionLPCreationError(f"Content generation failed: {str(e)}")

def get_secciones_public(db: Session, landing_page_id: UUID) -> List[SeccionLP]:
    """Obtener secciones para mostrar en landing page pública"""
    # Verificar que la landing page está publicada
    landing_page = db.query(LandingPage).filter(
        LandingPage.id == landing_page_id,
        LandingPage.is_published == True
    ).first()
    
    if not landing_page:
        raise SeccionLPNotFoundError("Published landing page not found")
    
    secciones = db.query(SeccionLP).filter(
        SeccionLP.landing_page_id == landing_page_id
    ).order_by(SeccionLP.cell_position).all()
    
    logging.info(f"Retrieved {len(secciones)} public secciones for landing page {landing_page_id}")
    return secciones

def get_secciones_by_slug_public(db: Session, url_slug: str) -> List[SeccionLP]:
    """Obtener secciones por URL slug para landing page pública"""
    landing_page = db.query(LandingPage).filter(
        LandingPage.url_slug == url_slug,
        LandingPage.is_published == True
    ).first()
    
    if not landing_page:
        raise SeccionLPNotFoundError("Published landing page not found")
    
    return get_secciones_public(db, landing_page.id)

def _verify_landing_page_permissions(current_user: TokenData, db: Session, landing_page: LandingPage) -> None:
    """Función auxiliar para verificar permisos a través del proyecto"""
    proyecto = db.query(Proyecto).filter(Proyecto.id == landing_page.proyecto_id).first()
    if proyecto:
        user_uuid = current_user.get_uuid()
        if proyecto.created_by != user_uuid and proyecto.assigned_to != user_uuid:
            # Aquí verificarías si es admin
            pass