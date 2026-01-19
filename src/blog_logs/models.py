from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Union
from uuid import UUID
from datetime import datetime

# =======================================================================
# 1. MODELO DE LOG DE ESTRUCTURA (Ediciones manuales del usuario)
# =======================================================================

class LogBlogStructureRequest(BaseModel):
    """
    Schema para registrar cambios manuales del usuario.
    """
    blog_id: UUID
    scraping_id: Optional[UUID] = None
    
    # Usamos Any o List[Dict] para los títulos finales tras la edición
    titles_after: Optional[Any] = None 
    structure_before: Optional[List[Dict[str, Any]]] = None
    structure_after: List[Dict[str, Any]]
    
    edit_context: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Metadatos: {action: 'drag_and_drop', section_id: '...'}"
    )

# =======================================================================
# 2. MODELO PARA LA IA (Punto de partida - CORREGIDO)
# =======================================================================

class LogAIGenerationRequest(BaseModel):
    blog_id: UUID
    titles_before: Any  # Esto es lo único que envías
    scraping_id: Optional[UUID] = None
    # Los demás los ponemos como opcionales con default None
    prompt_used: Optional[str] = None
    model_name: Optional[str] = None

# =======================================================================
# 3. MODELOS DE RESPUESTA PARA ANALÍTICAS
# =======================================================================

class BlogSectionEditHistory(BaseModel):
    action_type: str
    semantic_score: float
    alignment_score: Optional[float] = None
    created_at: datetime
    user_id: UUID

    class Config:
        from_attributes = True