from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Union
from uuid import UUID
from datetime import datetime

# =======================================================================
# 1. MODELO DE LOG DE ESTRUCTURA (Ediciones manuales del usuario)
# =======================================================================

class LogBlogStructureRequest(BaseModel):
    blog_id: UUID
    scraping_id: Optional[UUID] = None
    titles_after: Optional[Any] = None 
    structure_after: List[Dict[str, Any]] # <--- Esto acepta [] pero NO acepta null (None)
    edit_context: Dict[str, Any] = Field(default_factory=dict)

# =======================================================================
# 2. MODELO PARA LA IA (Punto de partida - CORREGIDO)
# =======================================================================

class LogAIGenerationRequest(BaseModel):
    blog_id: UUID
    titles_before: Any  # Esto es lo único que envías
    scraping_id: Optional[UUID] = None
    structure_before: Optional[Any] = None
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