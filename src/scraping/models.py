from typing import List, Dict, Optional, Union, Any
from pydantic import BaseModel, Field
from datetime import datetime 


class URLObject(BaseModel):
    """Modelo para representar una URL individual en la petición."""
    url: str 

class ScrapeRequest (BaseModel): 
    query: str 
    urls: List[URLObject] 
    num_results: int = 1
    use_ai: bool = True

class ScrapeResult(BaseModel): 
    url: str
    title: str
    headers: Dict[str, List[str]]
    ai_titles: List[str]
    ai_analysis: Optional[str] = None
    title_suggestions: Optional[List[str]]= []
    subtitles: Optional[List[str]] = []
    text_content: Optional[str] = None
    final_structure: str
    status: str = 'ERROR' 
    article_blocks: Optional[List[Dict[str, Any]]] = None 
    word_count: Optional[int] = None


class ScrapeResponse(BaseModel):
    query: str
    count: int
    results: List[ScrapeResult]
    final_structure: Optional[str] = None
    consolidated_content: Optional[str] = None 
    log: Optional[List[str]] = None

class PeticionGeneracionContenido(BaseModel):
    """
    Modelo para la petición de generación de contenido de una sección específica.
    """
    # Se mantienen los nombres en inglés aquí por convención de API/JSON
    project_id: str = Field(..., alias="projectId")
    query: str
    section_title: str = Field(..., description="Título del H2/H3/H4 a generar contenido.")
    section_level: str = Field(..., description="Nivel del encabezado (H2, H3, H4).")
    full_structure_markdown: str = Field(..., description="Estructura completa del blog para contexto.")
    consolidated_content: str = Field(..., description="Contenido consolidado del scraping para referencia.")

class AIAnalysisRequest(BaseModel):
    """Modelo para la petición de análisis IA bajo demanda."""
    query: str
    consolidated_content: str
    keywords: List[str] = Field(default_factory=list) 
    results: Optional[List[ScrapeResult]] = None
    log: Optional[List[str]] = None
    title_base: Optional[str] = None
    categoria: Optional[str] = None
    idioma: Optional[str] = 'es'
    tecnica: Optional[str] = 'SEO'
    acento: Optional[str] = 'neutral'
    tono: Optional[str] = 'profesional'

    max_length: int = Field(default=500, description="Límite aproximado de caracteres para la respuesta de la IA.")

    # --- NUEVOS CAMPOS PARA EL PRESUPUESTO DINÁMICO (Conteo Regresivo) ---
    palabras_acumuladas: Optional[int] = Field(
        0, description="Palabras totales generadas en el artículo hasta el momento."
    )
    subsecciones_pendientes: Optional[int] = Field(
        None, description="Número de subsecciones (H2/H3) que quedan por generar."
    )
    limite_palabras_bloque: Optional[int] = Field(
        None, description="Límite de palabras estricto para la generación del bloque actual (calculado en el frontend)."
    )

    total_sections: Optional[int] = Field(
        None, description="Número total de secciones/bloques en la estructura final."
    )
    total_word_budget: Optional[int] = Field(
        None, description="Presupuesto total de palabras del artículo estimado por la IA (estimatedWordCount)."
    )


    # CAMPOS PARA LA REGENERACION 
    section_type: Optional[str] = Field(
        None, 
        description="Tipo de sección a regenerar: 'structure_section'." 
    )
    previous_content: Optional[Union[str, List[str]]] = Field(
        None, description="Historial de contenido generado para exclusión y unicidad (lista de strings)."
    )
    regenerate_data: Optional[Dict[str, Any]] = Field(
        None, description="Datos adicionales para la regeneración de secciones (ej. section_text, full_structure_markdown)."
    )

    system_message: Optional[str] = Field(
        None, 
        description="Mensaje del sistema para la IA. Define el rol, tono y acento."
    )

# =======================================================================
# MODELOS DE PERSISTENCIA (LIMPIEZA)
# =======================================================================

class ProjectModel(BaseModel):
    """Modelo maestro para la persistencia del proyecto."""
    project_id: str = Field(..., alias="projectId")
    query: str
    num_results: int
    consolidated_content: Optional[str] = None

    #Estructura del Blog
    final_structure_markdown: Optional[str] = None
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