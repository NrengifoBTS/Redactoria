from typing import List, Dict, Optional, Union, Any
from pydantic import BaseModel, Field
from datetime import datetime # Necesario para ProjectModel

# =======================================================================
# REQUESTS Y RESPONSES ORIGINALES
# =======================================================================

class ScrapeRequest (BaseModel): 
    query: str 
    num_results: int = 1
    use_ai: bool = True

class ScrapeResult(BaseModel): 
    url: str
    title: str
    headers: Dict[str, List[str]]
    keywords: List[str]
    ai_titles: List[str]
    ai_intent: str
    ai_analysis: Optional[str] = None
    title_suggestions: Optional[List[str]]= []
    search_intent: Optional [str] = None
    subtitles: Optional[List[str]] = []
    text_content: Optional[str] = None
    final_structure: str
    conclusion: Optional[str] = None
    status: str = 'ERROR' 
    # Añadido para guardar los bloques extraídos
    article_blocks: Optional[List[Dict[str, Any]]] = None 


class ScrapeResponse(BaseModel):
    query: str
    count: int
    results: List[ScrapeResult] # Tipado corregido
    final_structure: Optional[str] = None
    search_intent: Optional[str] = None
    final_keywords: Optional[List[str]] = None
    consolidated_content: Optional[str] = None 
    log: Optional[List[str]] = None

class AIAnalysisRequest(BaseModel):
    """Modelo para la petición de análisis IA bajo demanda."""
    query: str
    consolidated_content: str
    keywords: List[str]
    
    # Nuevos campos de contexto para la FASE 4 (Análisis Final Completo)
    results: Optional[List[ScrapeResult]] = None
    log: Optional[List[str]] = None
    title_base: Optional[str] = None
    main_keyword: Optional[str] = None
    principal_keywords: Optional[List[str]] = None
    categoria: Optional[str] = None
    idioma: Optional[str] = 'es'
    tecnica: Optional[str] = 'SEO'
    acento: Optional[str] = 'neutral'
    tono: Optional[str] = 'profesional'
    
    # Campos para la Regeneración (FASE 5)
    section_type: Optional[str] = Field(
        None, description="Tipo de sección a regenerar: 'search_intent', 'introduction', 'conclusion_cta', 'structure_section'."
    )
    previous_content: Optional[Union[str, List[str]]] = Field(
        None, description="Historial de contenido generado para exclusión y unicidad (lista de strings)."
    )
    regenerate_data: Optional[Dict[str, Any]] = Field(
        None, description="Datos adicionales para la regeneración de secciones (ej. section_text, full_structure_markdown)."
    )

# =======================================================================
# MODELOS DE PERSISTENCIA (FIX para el error ProjectModel)
# =======================================================================

class ProjectModel(BaseModel):
    """Modelo maestro para la persistencia del proyecto."""
    project_id: str = Field(..., alias="projectId")
    query: str
    num_results: int
    search_intent: Optional[str] = None
    final_keywords: Optional[List[str]] = None
    consolidated_content: Optional[str] = None

    #Estructura del Blog
    final_structure_markdown: Optional[str] = None
    
    
    introduction: Optional[str] = None
    conclusion_cta: Optional[str] = None
    # Aseguramos que los resultados del scraping se persistan
    scrape_results: List[ScrapeResult]
    log: Optional[List[str]] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class TitleUpdateRequest(BaseModel):
    """Modelo para la petición de actualización de un título/subtítulo."""
    project_id: str = Field(..., alias="projectId")
    old_title: str
    new_title: str
    level: str = Field(..., description="Nivel del encabezado: 'h2' o 'h3'.")