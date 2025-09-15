from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class TemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    template_config: Dict[str, Any]
    proyecto: str    
    dominio: str     
    categoria: str   
    is_active: bool = True

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    template_config: Optional[Dict[str, Any]] = None
    proyecto: Optional[str] = None
    dominio: Optional[str] = None
    categoria: Optional[str] = None
    is_active: Optional[bool] = None

class TemplateResponse(TemplateBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class TemplateGrouped(BaseModel):
    proyecto: str
    dominios: Dict[str, Dict[str, list[TemplateResponse]]]

# Modelos para configuraciones específicas del template
class MergedCell(BaseModel):
    rowSpan: int
    colSpan: int

class TemplateData(BaseModel):
    text: str
    color: str = "#000000"

class TableConfig(BaseModel):
    numRows: int
    numCols: int
    defaultRowHeight: int = 40
    defaultColumnWidth: int = 120

class TemplateConfigStructure(BaseModel):
    """Estructura real basada en templateConfig.js"""
    templateData: Dict[str, TemplateData]  # "0-0": {text: "LP Las Vegas", color: "#000000"}
    mergedCells: Dict[str, MergedCell]     # "0-0": {rowSpan: 2, colSpan: 1}
    columnWidths: Dict[str, int]           # "0": 120, "1": 120, etc.
    tableConfig: TableConfig
    columnHeaders: list[str] = [
        "Página", "Bloque", "Comentarios para el equipo IT", "Español", 
        "Inglés", "Portugués", "Revisado por / Fecha"
    ]

# Request para crear template desde templateConfig.js
class CreateTemplateFromConfigRequest(BaseModel):
    name: str
    description: Optional[str] = None
    proyecto: str
    dominio: str  
    categoria: str
    merged_cells: Dict[str, MergedCell]
    column_widths: Dict[str, int] 
    template_data: Dict[str, TemplateData]
    table_config: TableConfig
    column_headers: list[str]
    blocks_metadata: Optional[Dict[str, Any]] = None

# Request para activar/desactivar template
class ToggleTemplateRequest(BaseModel):
    is_active: bool