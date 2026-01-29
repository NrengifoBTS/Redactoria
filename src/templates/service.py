from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy.orm import Session
from typing import Optional, List
from . import models
from src.auth.models import TokenData
from src.entities.template import Template
from src.exceptions import TemplateCreationError, TemplateNotFoundError
import logging

def create_template(current_user: TokenData, db: Session, template: models.TemplateCreate) -> Template:
    try:
        new_template = Template(
            name=template.name,
            description=template.description,
            template_config=template.template_config,
            is_active=template.is_active,
            created_by=current_user.get_uuid(),
            created_at=datetime.now(timezone.utc)
        )
        
        db.add(new_template)
        db.commit()
        db.refresh(new_template)
        logging.info(f"Created new template '{template.name}' for user: {current_user.get_uuid()}")
        return new_template
    except Exception as e:
        logging.error(f"Failed to create template for user {current_user.get_uuid()}. Error: {str(e)}")
        raise TemplateCreationError(str(e))

def get_templates(current_user: TokenData, db: Session, is_active: Optional[bool] = True) -> List[Template]:
    query = db.query(Template)
    
    # Filtrar por usuario (solo sus templates)
    query = query.filter(Template.created_by == current_user.get_uuid())
    
    # Filtrar por estado activo si se especifica
    if is_active is not None:
        query = query.filter(Template.is_active == is_active)
    
    templates = query.order_by(Template.created_at.desc()).all()
    logging.info(f"Retrieved {len(templates)} templates for user: {current_user.get_uuid()}")
    return templates

def get_template_by_id(current_user: TokenData, db: Session, template_id: UUID) -> Template:
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        logging.warning(f"Template {template_id} not found for user {current_user.get_uuid()}")
        raise TemplateNotFoundError(template_id)
    
    # Verificar permisos: solo el creador puede ver (a menos que sea admin)
    if template.created_by != current_user.get_uuid():
        # Aquí verificarías si es admin, por ahora permito acceso
        pass
    
    logging.info(f"Retrieved template {template_id} for user {current_user.get_uuid()}")
    return template

def update_template(current_user: TokenData, db: Session, template_id: UUID, 
                   template_update: models.TemplateUpdate) -> Template:
    template = get_template_by_id(current_user, db, template_id)
    
    # Solo el creador puede actualizar
    if template.created_by != current_user.get_uuid():
        # Aquí verificarías si es admin
        pass
    
    # Actualizar campos si se proporcionan
    update_data = template_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)
    
    template.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(template)
    logging.info(f"Successfully updated template {template_id} for user {current_user.get_uuid()}")
    return template

def delete_template(current_user: TokenData, db: Session, template_id: UUID) -> None:
    template = get_template_by_id(current_user, db, template_id)
    
    # Solo el creador puede eliminar
    if template.created_by != current_user.get_uuid():
        # Aquí verificarías si es admin
        pass
    
    # Soft delete - marcar como inactivo en lugar de eliminar
    template.is_active = False
    template.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    logging.info(f"Template {template_id} marked as inactive by user {current_user.get_uuid()}")

def toggle_template(current_user: TokenData, db: Session, template_id: UUID, is_active: bool) -> Template:
    template = get_template_by_id(current_user, db, template_id)
    
    # Solo el creador puede activar/desactivar
    if template.created_by != current_user.get_uuid():
        # Aquí verificarías si es admin
        pass
    
    template.is_active = is_active
    template.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(template)
    
    action = "activated" if is_active else "deactivated"
    logging.info(f"Template {template_id} {action} by user {current_user.get_uuid()}")
    return template

def create_template_from_config(current_user: TokenData, db: Session, 
                               config_request: models.CreateTemplateFromConfigRequest) -> Template:
    try:
        # Construir template_config desde los campos individuales
        template_config = {
            "mergedCells": {k: v.model_dump() for k, v in config_request.merged_cells.items()},
            "columnWidths": config_request.column_widths,
            "templateData": {k: v.model_dump() for k, v in config_request.template_data.items()},
            "tableConfig": config_request.table_config.model_dump(),
            "columnHeaders": config_request.column_headers
        }
        
        # Agregar blocks_metadata si existe
        if hasattr(config_request, "blocks_metadata") and config_request.blocks_metadata:
            template_config["blocks_metadata"] = config_request.blocks_metadata

        new_template = Template(
            name=config_request.name,
            description=config_request.description,
            template_config=template_config,  
            proyecto=config_request.proyecto,     
            dominio=config_request.dominio,       
            categoria=config_request.categoria, 
            is_active=True,
            created_by=current_user.get_uuid(),
            created_at=datetime.now(timezone.utc)
        )
        
        db.add(new_template)
        db.commit()
        db.refresh(new_template)
        logging.info(f"Created template from config '{config_request.name}' for user: {current_user.get_uuid()}")
        return new_template
    except Exception as e:
        logging.error(f"Failed to create template from config for user {current_user.get_uuid()}. Error: {str(e)}")
        raise TemplateCreationError(str(e))

def get_template_config(current_user: TokenData, db: Session, template_id: UUID) -> dict:
    template = get_template_by_id(current_user, db, template_id)
    
    # Retornar solo la configuración para el redactor
    return template.template_config

def duplicate_template(current_user: TokenData, db: Session, template_id: UUID, new_name: str) -> Template:
    original_template = get_template_by_id(current_user, db, template_id)
    
    try:
        duplicated_template = Template(
            name=new_name,
            description=f"Copia de: {original_template.description}" if original_template.description else "Template duplicado",
            template_config=original_template.template_config.copy(),  # Deep copy del JSON
            is_active=True,
            created_by=current_user.get_uuid(),
            created_at=datetime.now(timezone.utc)
        )
        
        db.add(duplicated_template)
        db.commit()
        db.refresh(duplicated_template)
        logging.info(f"Duplicated template {template_id} as '{new_name}' for user: {current_user.get_uuid()}")
        return duplicated_template
    except Exception as e:
        logging.error(f"Failed to duplicate template {template_id} for user {current_user.get_uuid()}. Error: {str(e)}")
        raise TemplateCreationError(str(e))

def get_active_templates_public(db: Session) -> List[Template]:
    """Obtener templates activos públicos (sin autenticación para selección inicial)"""
    templates = db.query(Template).filter(Template.is_active == True).order_by(Template.created_at.desc()).all()
    logging.info(f"Retrieved {len(templates)} active public templates")
    return templates

def get_all_templates_for_analytics(db: Session) -> List[Template]:
    """
    Obtener todos los templates del sistema (activos e inactivos)
    Para uso en Analytics/Dashboard donde necesitamos ver todas las LPs con sus templates
    """
    templates = db.query(Template).order_by(Template.created_at.desc()).all()
    logging.info(f"Retrieved {len(templates)} templates for analytics")
    return templates

def get_unique_proyectos(db: Session) -> List[str]:
    """
    Get unique proyecto values from templates (e.g., 'viajemos', 'mcr')

    Returns list of unique proyecto names for filtering in Analytics dashboard
    """
    from sqlalchemy import distinct
    proyectos = db.query(distinct(Template.proyecto)).order_by(Template.proyecto).all()
    # Extract strings from tuples and capitalize first letter
    return [p[0].capitalize() for p in proyectos if p[0]]