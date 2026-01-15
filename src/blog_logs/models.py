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
    """
    Schema flexible para registrar la propuesta inicial de la IA.
    He hecho opcionales los campos que no quieres enviar obligatoriamente ahora.
    """
    blog_id: UUID
    scraping_id: Optional[UUID] = None
    
    # Campo clave: Aquí recibiremos el markdown o JSON de títulos del render
    titles_before: Any 
    
    # Campos que ahora son opcionales para evitar errores 422
    prompt_used: Optional[str] = "Generación inicial"
    model_name: Optional[str] = "gpt-4o"
    raw_ai_output: Optional[Union[Dict[str, Any], List[Any]]] = None
    duration_ms: Optional[int] = 0
    tokens_used: Optional[int] = None

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