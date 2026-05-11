from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy.orm import Session
from typing import Optional, List
from fastapi import BackgroundTasks
from . import models
from src.auth.models import TokenData
from src.entities.proyecto import Proyecto
from src.entities.landing_page import LandingPage
from src.exceptions import ProyectoCreationError, ProyectoNotFoundError
import logging

def create_proyecto(current_user: TokenData, db: Session, proyecto: models.ProyectoCreate) -> Proyecto:
    try:
        now = datetime.now(timezone.utc)
        new_proyecto = Proyecto(
            name=proyecto.name,
            description=proyecto.description,
            estado=proyecto.estado.value,
            prioridad=proyecto.prioridad.value,
            created_by=current_user.get_uuid(),
            assigned_to=proyecto.assigned_to,
            template_id=proyecto.template_id,
            created_at=now,
            last_modified=now,
            assigned_at=now if proyecto.assigned_to else None,
        )
        
        db.add(new_proyecto)
        db.commit()
        
        new_landing_page = LandingPage(
            proyecto_id=new_proyecto.id,
            url_slug=f"proyecto-{str(new_proyecto.id)[:8]}",  # Primeros 8 chars del UUID
            title=f"Landing Page - {new_proyecto.name}",
            meta_description=f"Landing page para el proyecto {new_proyecto.name}",
            is_published=False,
            template_id=new_proyecto.template_id,
            created_at=datetime.now(timezone.utc)
        )
        
        db.add(new_landing_page)
        db.commit()
        db.refresh(new_landing_page)
        db.refresh(new_proyecto)
        
        


        logging.info(f"Created new proyecto for user: {current_user.get_uuid()}")
        return new_proyecto
    except Exception as e:
        db.rollback()
        logging.error(f"Failed to create proyecto for user {current_user.get_uuid()}. Error: {str(e)}")
        raise ProyectoCreationError(str(e))

def get_proyectos(current_user: TokenData, db: Session, 
                 estado: Optional[models.EstadoProyecto] = None,
                 prioridad: Optional[models.PrioridadProyecto] = None,
                 assigned_to: Optional[UUID] = None) -> List[Proyecto]:
    
    query = db.query(Proyecto)
    
    # Filtrar por permisos: admin ve todos, otros solo los suyos (creados o asignados)
    user_uuid = current_user.get_uuid()
    if estado:
        query = query.filter(Proyecto.estado == estado.value)
    if prioridad:
        query = query.filter(Proyecto.prioridad == prioridad.value)
    if assigned_to:
        query = query.filter(Proyecto.assigned_to == assigned_to)
    
    proyectos = query.order_by(Proyecto.last_modified.desc()).all()
    logging.info(f"Retrieved {len(proyectos)} proyectos for user: {current_user.get_uuid()}")
    return proyectos

def get_proyecto_by_id(current_user: TokenData, db: Session, proyecto_id: UUID) -> Proyecto:
    proyecto = db.query(Proyecto).filter(Proyecto.id == proyecto_id).first()
    if not proyecto:
        logging.warning(f"Proyecto {proyecto_id} not found for user {current_user.get_uuid()}")
        raise ProyectoNotFoundError(proyecto_id)
    
    # Verificar permisos: solo creador, asignado o admin pueden ver
    user_uuid = current_user.get_uuid()
    if proyecto.created_by != user_uuid and proyecto.assigned_to != user_uuid:
        # Aquí verificarías si es admin, por ahora permito acceso
        pass
    
    logging.info(f"Retrieved proyecto {proyecto_id} for user {current_user.get_uuid()}")
    return proyecto

def update_proyecto(
    current_user: TokenData,
    db: Session,
    proyecto_id: UUID,
    proyecto_update: models.ProyectoUpdate,
    background_tasks: BackgroundTasks
) -> Proyecto:
    proyecto = get_proyecto_by_id(current_user, db, proyecto_id)

    # Capturar estado anterior antes de actualizar
    old_status = proyecto.estado
    status_changed = False

    # Actualizar campos si se proporcionan
    update_data = proyecto_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ['estado', 'prioridad'] and hasattr(value, 'value'):
            if field == 'estado' and value.value != old_status:
                status_changed = True
            setattr(proyecto, field, value.value)
        else:
            setattr(proyecto, field, value)

    proyecto.updated_at = datetime.now(timezone.utc)
    proyecto.last_modified = datetime.now(timezone.utc)

    db.commit()
    db.refresh(proyecto)
    logging.info(f"Successfully updated proyecto {proyecto_id} for user {current_user.get_uuid()}")

    # Si cambió el estado, enviar notificación
    if status_changed:
        logging.info(f"Proyecto {proyecto_id} estado changed to {proyecto.estado} by user {current_user.get_uuid()}")
        background_tasks.add_task(
            _send_status_change_notification,
            proyecto_id=proyecto_id,
            old_status=old_status,
            new_status=proyecto.estado,
            changed_by_user_id=current_user.get_uuid()
        )

    return proyecto

def delete_proyecto(current_user: TokenData, db: Session, proyecto_id: UUID) -> None:
    proyecto = get_proyecto_by_id(current_user, db, proyecto_id)
    
    # Verificar permisos
    if proyecto.created_by != current_user.get_uuid():
        # Aquí verificarías si es admin
        pass
    
    try:
        # 1. ELIMINAR LANDING PAGE PRIMERO
        landing_page = db.query(LandingPage).filter(LandingPage.proyecto_id == proyecto_id).first()
        if landing_page:
            db.delete(landing_page)
            logging.info(f"Landing page {landing_page.id} deleted for proyecto {proyecto_id}")
        
        # 2. ELIMINAR PROYECTO
        db.delete(proyecto)
        
        # 3. Confirmar cambios
        db.commit()
        logging.info(f"Proyecto {proyecto_id} and associated landing page deleted by user {current_user.get_uuid()}")
        
    except Exception as e:
        db.rollback()
        logging.error(f"Failed to delete proyecto {proyecto_id}: {str(e)}")
        raise e

def assign_proyecto(current_user: TokenData, db: Session, proyecto_id: UUID, assigned_to: UUID) -> Proyecto:
    proyecto = get_proyecto_by_id(current_user, db, proyecto_id)

    proyecto.assigned_to = assigned_to
    proyecto.assigned_at = datetime.now(timezone.utc)
    proyecto.updated_at = datetime.now(timezone.utc)
    proyecto.last_modified = datetime.now(timezone.utc)

    db.commit()
    db.refresh(proyecto)
    logging.info(f"Proyecto {proyecto_id} assigned to {assigned_to} by user {current_user.get_uuid()}")
    return proyecto

def update_estado_proyecto(
    current_user: TokenData,
    db: Session,
    proyecto_id: UUID,
    nuevo_estado: models.EstadoProyecto,
    background_tasks: BackgroundTasks
) -> Proyecto:
    proyecto = get_proyecto_by_id(current_user, db, proyecto_id)

    # Capturar estado anterior
    old_status = proyecto.estado

    # Actualizar estado
    proyecto.estado = nuevo_estado.value
    proyecto.updated_at = datetime.now(timezone.utc)
    proyecto.last_modified = datetime.now(timezone.utc)

    db.commit()
    db.refresh(proyecto)
    logging.info(f"Proyecto {proyecto_id} estado changed to {nuevo_estado.value} by user {current_user.get_uuid()}")

    # Encolar notificación en background (NO BLOQUEA)
    background_tasks.add_task(
        _send_status_change_notification,
        proyecto_id=proyecto_id,
        old_status=old_status,
        new_status=nuevo_estado.value,
        changed_by_user_id=current_user.get_uuid()
    )

    return proyecto

def get_proyectos_by_user(current_user: TokenData, db: Session, user_id: UUID) -> List[Proyecto]:
    # Solo admin puede ver proyectos de otros usuarios
    # Aquí verificarías permisos de admin
    
    proyectos = db.query(Proyecto).filter(Proyecto.assigned_to == user_id).all()
    logging.info(f"Retrieved {len(proyectos)} proyectos for user {user_id}")
    return proyectos

def get_proyectos_created_by_user(current_user: TokenData, db: Session) -> List[Proyecto]:
    proyectos = db.query(Proyecto).filter(Proyecto.created_by == current_user.get_uuid()).all()
    logging.info(f"Retrieved {len(proyectos)} created proyectos for user {current_user.get_uuid()}")
    return proyectos

def get_proyectos_assigned_to_user(current_user: TokenData, db: Session) -> List[Proyecto]:
    proyectos = db.query(Proyecto).filter(Proyecto.assigned_to == current_user.get_uuid()).all()
    logging.info(f"Retrieved {len(proyectos)} assigned proyectos for user {current_user.get_uuid()}")
    return proyectos


# ===== Background Task Functions =====

def _send_status_change_notification(
    proyecto_id: UUID,
    old_status: str,
    new_status: str,
    changed_by_user_id: UUID
):
    """
    Background task para enviar notificaciones de Teams cuando cambia el estado de un proyecto.
    Crea su propia sesión de base de datos para evitar problemas de sesión cerrada.
    """
    from src.database.core import get_db

    # Crear nueva sesión de BD para el background task
    db = next(get_db())

    try:
        import os
        from src.notifications.notification_service import NotificationService
        from src.auth.models import TokenData
        from src.entities.user import User

        # Obtener webhook URL de env
        webhook_url = os.getenv("TEAMS_WEBHOOK_URL")
        if not webhook_url:
            logging.warning("TEAMS_WEBHOOK_URL no configurado, saltando notificación")
            return

        # Reconstruir objetos necesarios
        proyecto = db.query(Proyecto).filter(Proyecto.id == proyecto_id).first()
        if not proyecto:
            logging.error(f"Proyecto {proyecto_id} no encontrado para notificación")
            return

        # Verificar que el usuario existe
        user = db.query(User).filter(User.id == changed_by_user_id).first()
        if not user:
            logging.error(f"User {changed_by_user_id} not found for notification")
            return

        # Crear TokenData minimal para changed_by_user
        changed_by_user = TokenData(user_id=str(changed_by_user_id))

        # Construir URL del proyecto
        frontend_url = os.getenv("FRONTEND_URL", "http://192.168.1.129:3001/")
        project_url = f"{frontend_url}/redactor/{proyecto_id}"

        # Enviar notificaciones
        notification_service = NotificationService(webhook_url)
        notification_service.notify_status_change(
            db=db,
            proyecto=proyecto,
            old_status=old_status,
            new_status=new_status,
            changed_by_user=changed_by_user,
            project_url=project_url
        )

    except Exception as e:
        logging.error(f"✗ Error en notificación background: {e}", exc_info=True)
    finally:
        db.close()