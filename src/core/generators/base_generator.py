"""
base_generator.py — Re-exports shared constants and BaseGenerator alias.

The actual implementation lives in miles_generator.py (ContentGenerator).
BaseGenerator is an alias kept for backward compatibility with imports.
"""

from src.core.generators.miles_generator import (
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
    ContentGenerator,
)

BaseGenerator = ContentGenerator

__all__ = [
    "BaseGenerator",
    "ContentGenerator",
    "_RESTRICCIONES",
    "_SEMANTICA",
    "_ESTILO_MCR",
    "_ESTILO_VJM",
    "SYSTEM_MCR",
    "SYSTEM_VJM",
    "_BRAND_SYSTEMS",
    "_BENEFICIOS_LATAM",
    "_BENEFICIOS_USA",
    "_BENEFICIOS_USA_MCR",
    "_BENEFICIOS_BRA",
    "_FAV_CITY_DEFAULTS",
]
