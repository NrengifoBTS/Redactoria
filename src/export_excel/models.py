from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from uuid import UUID


class CellData(BaseModel):
    value: str
    style: Optional[Dict[str, Any]] = None
    type: Optional[str] = None


class BlockMetadata(BaseModel):
    name: str
    type: str
    startRow: int
    endRow: int
    titleRow: int
    descRow: Optional[int] = None  
    contentMapping: Optional[Dict[str, str]] = None  


class TemplateConfig(BaseModel):
    blocks_metadata: Dict[str, BlockMetadata]
    columnHeaders: List[str]
    columnWidths: Dict[str, int]
    mergedCells: Dict[str, Dict[str, Any]]
    tableConfig: Dict[str, Any]
    templateData: Dict[str, CellData]


class TemplateInfo(BaseModel):
    id: UUID
    name: str
    description: str
    categoria: str
    proyecto: str
    dominio: str
    is_active: bool


class ExportExcelRequest(BaseModel):
    template_config: TemplateConfig
    template_info: TemplateInfo
    cell_data: Optional[Dict[str, CellData]] = None  # Datos actualizados desde el frontend


class ExportExcelResponse(BaseModel):
    success: bool
    message: str
    filename: str