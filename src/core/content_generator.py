"""
DEPRECADO: Este archivo ya no contiene lógica de generación.
La lógica fue separada por marca en:
  - src/core/generators/miles_generator.py    → Miles Car Rental
  - src/core/generators/viajemos_generator.py → Viajemos
  - src/core/generators/base_generator.py     → Utilidades compartidas

Este archivo se mantiene solo como shim de compatibilidad.
NO agregues lógica de generación aquí.
"""

# Re-exportar constantes y clases para compatibilidad con imports externos
from src.core.generators.base_generator import (
    _RESTRICCIONES,
    _SEMANTICA,
    _ESTILO_MCR,
    _ESTILO_VJM,
    SYSTEM_MCR,
    SYSTEM_VJM,
    _BRAND_SYSTEMS,
    _BENEFICIOS_LATAM,
    _BENEFICIOS_USA,
    _BENEFICIOS_USA_MCR,
    _BENEFICIOS_BRA,
    _FAV_CITY_DEFAULTS,
    BaseGenerator,
)

# ContentGenerator apunta al miles generator para backwards compatibility.
# Para uso real, importar directamente:
#   from src.core.generators import MilesGenerator, ViajemosGenerator
from src.core.generators.miles_generator import ContentGenerator

__all__ = [
    "ContentGenerator",
    "BaseGenerator",
    "SYSTEM_MCR",
    "SYSTEM_VJM",
    "_FAV_CITY_DEFAULTS",
    "_BENEFICIOS_LATAM",
    "_BENEFICIOS_USA",
    "_BENEFICIOS_USA_MCR",
    "_BENEFICIOS_BRA",
]
