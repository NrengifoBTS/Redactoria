from typing import List, Dict, Optional, Union
from pydantic import BaseModel, Field

#REQUEST Y RESPOSE 

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


class ScrapeResponse(BaseModel):
    query: str
    count: int
    results: List
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
    section_type: Optional[str] = Field(None, description="Tipo de sección a regenerar: 'intent', 'keywords', 'titles'.")
    previous_content: Optional[Union[str, List[str]]] = Field(
        None, description="Historial de contenido generado para exclusión y unicidad (lista de strings)."
    )