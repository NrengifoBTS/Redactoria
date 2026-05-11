#redactoria/src/scraping/models.py
from typing import List, Dict, Optional, Union, Any
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID

# =======================================================================
# 1. MODELOS DE SCRAPING (PETICIONES)
# =======================================================================

class URLObject(BaseModel):
    """Modelo para representar una URL individual en la petición de scraping."""
    url: str

class ScrapeRequest(BaseModel):
    """Modelo para la petición inicial de scraping."""
    title_base: str
    urls: List[URLObject]
    num_results: int = 1
    use_ai: bool = True

# =======================================================================
# 2. MODELOS DE SCRAPING (RESULTADOS Y RESPUESTA)
# =======================================================================

class ScrapeResult(BaseModel):
    """Modelo para el resultado del scraping de una única URL."""
    url: str
    title: str
    headers: Dict[str, List[str]]
    ai_titles: List[str]
    ai_analysis: Optional[str] = None
    title_suggestions: Optional[List[str]] = []
    subtitles: Optional[List[str]] = []
    text_content: Optional[str] = None
    final_structure: str
    status: str = 'ERROR'
    article_blocks: Optional[List[Dict[str, Any]]] = None
    word_count: Optional[int] = None

class ScrapeResponse(BaseModel):
    """Modelo para la respuesta completa de la API de scraping."""
    count: int
    results: List[ScrapeResult]
    final_structure: Optional[Dict[str, Any]] = None
    consolidated_content: Optional[str] = None
    log: Optional[List[str]] = None

# =======================================================================
# 3. MODELOS DE ANÁLISIS Y GENERACIÓN DE CONTENIDO CON IA (PETICIONES)
# =======================================================================

class PeticionGeneracionContenido(BaseModel):
    """Modelo para la petición de generación de contenido de una sección específica (H2/H3/H4)."""
    # Usamos Union[UUID, str] porque si el front envía "", el validador de UUID falla.
    blog_id: Optional[Union[UUID, str]] = None
    query: Optional[str] = None
    consolidated_content: Optional[str] = None
    idioma: Optional[str] = None
    acento: Optional[str] = None
    tono: Optional[str] = None
    tecnica: Optional[str] = None 
    
    # IMPORTANTE: Cambiar Field(None) por default_factory para evitar errores de iteración
    keywords: List[str] = Field(default_factory=list)
    section_type: Optional[str] = None
    
    # Aseguramos que siempre sea un diccionario
    regenerate_data: Dict[str, Any] = Field(default_factory=dict)


class AIAnalysisRequest(BaseModel):
    """Modelo para la petición de análisis o generación de IA (motor LLM)."""
    blog_id: Optional[Union[UUID, str]] = None
    query: Optional[str] = None
    consolidated_content: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    results: Optional[List[ScrapeResult]] = None
    log: Optional[List[str]] = None
    title_base: Optional[str] = None
    categoria: Optional[str] = None
    idioma: Optional[str] = None
    tecnica: Optional[str] = None
    acento: Optional[str] = None
    tono: Optional[str] = None
    main_title: Optional[str] = Field(None)
    
    # Agregamos project para que no de error si el front lo envía (o para usar el default)
    project: Optional[str] = "viajemos"
    
    max_length: int = Field(default=500)

    # Valores por defecto numéricos para evitar que 'None' rompa cálculos en el service
    palabras_acumuladas: int = Field(default=0)
    subsecciones_pendientes: int = Field(default=0)
    limite_palabras_bloque: int = Field(default=0)
    total_sections: Optional[int] = None
    total_word_budget: Optional[int] = None

    # --- CORRECCIÓN CLAVE ---
    section_type: Optional[str] = None
    
    # El front envía una LISTA de contenidos previos. 
    # Usar Union[str, List[Any]] permite que acepte ambos formatos.
    previous_content: Union[str, List[Any]] = Field(default_factory=list)
    
    # Cambiamos Optional por default_factory
    regenerate_data: Dict[str, Any] = Field(default_factory=dict)

    system_message: Optional[str] = None
    contexto_minimo_conductor: Optional[str] = None
# =======================================================================
# 4. MODELOS DE PERSISTENCIA Y ACTUALIZACIÓN
# =======================================================================

class ProjectModel(BaseModel):
    """Modelo maestro para la persistencia del proyecto."""
    blog_id: Optional[UUID] = None
    query:  Optional[str] = None
    num_results: int
    consolidated_content: Optional[str] = None
    final_structure_markdown: Optional[str] = None
    scrape_results: List[ScrapeResult]
    log: Optional[List[str]] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class TitleUpdateRequest(BaseModel):
    """Modelo para la petición de actualización de un título/subtítulo en el proyecto."""
    blog_id: Optional[UUID] = None
    old_title: str
    new_title: str
    level: str = Field(..., description="Nivel del encabezado: 'h2' o 'h3'.")


# =======================================================================
# MODELOS PARA LA DESCARGA TIPO WORD
# =======================================================================
class BlogSectionData(BaseModel):
    """Modelo para un único item de la estructura del blog (H1, H2, H3...)."""
    
    # El título está en la clave 'text'
    text: str = Field(..., description="El título o texto del encabezado.")
    
    # El nivel es un string ('h1', 'h2', etc.)
    level: str = Field(..., description="Nivel del encabezado.")
    
    # Contenido (puede ser None si no se ha generado)
    content: Optional[str] = None 

    # Campos adicionales de su estructura:
    enumeration: Optional[str] = None
    multimedia: Optional[str] = None
    multimediaDescription: Optional[str] = None
    uniqueId: Optional[str] = None
    wordCount: Optional[int] = None
    
    # Campo para la estructura anidada (children)
    children: List[Dict[str, Any]] = Field(default_factory=list, description="Subsecciones anidadas.")
    
class DownloadRequest(BaseModel):
    """Modelo que FastAPI usará para recibir el body del POST."""
    # La clave debe ser 'structure_data' para coincidir con el front-end
    structure_data: List[BlogSectionData] = Field(..., description="Lista de secciones principales del blog.")


class FAQStructureRequest(BaseModel):
    blog_id: UUID
    full_structure_text: str
    keyword: Optional[str] = None