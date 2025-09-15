import os
from pathlib import Path
from typing import Optional
import logging

def get_template_path(proyecto: str, categoria: str) -> Optional[Path]:
    """
    Busca el template Excel correspondiente al proyecto y categoría
    Orden de prioridad:
    1. {proyecto}_{categoria}.xlsx
    2. {proyecto}_default.xlsx  
    3. {categoria}.xlsx
    4. default.xlsx
    """
    # Obtener la ruta base donde están los templates
    base_path = Path(__file__).parent / "excel"
    
    # Crear directorio si no existe
    base_path.mkdir(parents=True, exist_ok=True)
    
    # Patrones de búsqueda en orden de prioridad
    patterns = [
        
        f"{proyecto}_{categoria}.xlsx",
        f"{proyecto}_default.xlsx", 
        f"{categoria}.xlsx",
        "default.xlsx"
    ]
    
    for pattern in patterns:
        template_path = base_path / pattern
        if template_path.exists():
            logging.info(f"Template encontrado: {template_path}")
            return template_path
    
    logging.warning(f"No se encontró template para {proyecto}_{categoria}")
    return None

def template_exists(proyecto: str, categoria: str) -> bool:
    """Verifica si existe un template para el proyecto y categoría"""
    return get_template_path(proyecto, categoria) is not None

def list_available_templates() -> list:
    """Lista todos los templates disponibles"""
    base_path = Path(__file__).parent / "excel"
    
    if not base_path.exists():
        return []
    
    templates = []
    for file_path in base_path.glob("*.xlsx"):
        templates.append({
            "filename": file_path.name,
            "path": str(file_path),
            "size": file_path.stat().st_size,
            "modified": file_path.stat().st_mtime
        })
    
    return templates

def get_template_info(proyecto: str, categoria: str) -> dict:
    """Obtiene información del template que se usará"""
    template_path = get_template_path(proyecto, categoria)
    
    if template_path:
        return {
            "found": True,
            "path": str(template_path),
            "filename": template_path.name,
            "size": template_path.stat().st_size,
            "proyecto": proyecto,
            "categoria": categoria
        }
    else:
        return {
            "found": False,
            "path": None,
            "filename": None,
            "proyecto": proyecto,
            "categoria": categoria,
            "message": f"No se encontró template para {proyecto}_{categoria}"
        }