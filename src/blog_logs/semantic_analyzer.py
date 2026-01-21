# redactoria/src/blog_logs/semantic_analyzer.py

import spacy
from typing import Dict, Any, Optional, List
import logging
from difflib import SequenceMatcher
import re

class SemanticAnalyzer:
    """
    Motor de análisis semántico avanzado para artículos.
    Extrae patrones de edición, cambios de entidades y keywords 
    para el futuro entrenamiento de modelos LoRA.
    """

    def __init__(self):
        try:
            # Requisito: python -m spacy download es_core_news_sm
            self.nlp = spacy.load("es_core_news_sm")
            logging.info("✓ Motor Semántico (spaCy) cargado correctamente")
        except Exception as e:
            logging.error(f"✗ Error al cargar spaCy: {e}")
            self.nlp = None

    def analyze_edit(self, structure_before: Optional[str], structure_after: str) -> Dict[str, Any]:
        """
        Realiza una disección profunda del cambio entre el bloque de la IA y el del Usuario.
        """
        if not self.nlp or not structure_after:
            return self._fallback_analysis(structure_before, structure_after)

        # 1. Limpieza de HTML para análisis de texto puro
        clean_before = self._clean_html(structure_before or "")
        clean_after = self._clean_html(structure_after)

        # 2. Procesamiento con spaCy
        doc_before = self.nlp(clean_before)
        doc_after = self.nlp(clean_after)

        # 3. Cálculo de Similitud Semántica (Vectores)
        # 1.0 = Idéntico, < 0.5 = Cambio radical
        similarity = doc_before.similarity(doc_after) if clean_before else 0.0

        # 4. Extracción de Entidades (Nombres, Lugares, Marcas)
        entities_before = {ent.text.lower() for ent in doc_before.ents}
        entities_after = {ent.text.lower() for ent in doc_after.ents}

        # 5. Análisis de Keywords (Sustantivos y Adjetivos relevantes)
        keywords_before = {token.lemma_.lower() for token in doc_before if token.pos_ in ["NOUN", "ADJ"]}
        keywords_after = {token.lemma_.lower() for token in doc_after if token.pos_ in ["NOUN", "ADJ"]}

        return {
            "similarity_score": round(similarity, 4),
            "tone_shift": self._detect_tone_shift(doc_before, doc_after),
            "entities_added": list(entities_after - entities_before),
            "entities_removed": list(entities_before - entities_after),
            "keyword_changes": {
                "added": list(keywords_after - keywords_before),
                "removed": list(keywords_before - keywords_after)
            },
            "semantic_drift": self._classify_drift(similarity),
            "char_count_change": len(clean_after) - len(clean_before)
        }

    def _detect_tone_shift(self, doc_before, doc_after) -> str:
        """
        Detecta si el usuario cambió el tono del contenido.
        Ej: Si añade más adjetivos, el tono puede volverse más descriptivo/comercial.
        """
        def get_adj_ratio(doc):
            return len([t for t in doc if t.pos_ == "ADJ"]) / len(doc) if len(doc) > 0 else 0

        ratio_before = get_adj_ratio(doc_before)
        ratio_after = get_adj_ratio(doc_after)

        if ratio_after > ratio_before * 1.3: return "more_descriptive"
        if ratio_after < ratio_before * 0.7: return "more_direct"
        return "neutral"

    def _classify_drift(self, score: float) -> str:
        if score > 0.95: return "identical"
        if score > 0.75: return "polishing" # Ediciones menores
        if score > 0.40: return "heavy_edit" # Cambió mucho el contenido
        return "re_written" # Lo borró y escribió de nuevo

    def _clean_html(self, html: str) -> str:
        if not html: return ""
        # Quitamos etiquetas y normalizamos espacios
        text = re.sub(r'<[^>]+>', ' ', html)
        return " ".join(text.split()).strip()

    def _fallback_analysis(self, before, after) -> Dict[str, Any]:
        """Análisis de emergencia si spaCy falla."""
        sim = SequenceMatcher(None, self._clean_html(before or ""), self._clean_html(after)).ratio()
        return {
            "similarity_score": round(sim, 2),
            "tone_shift": "unknown",
            "semantic_drift": "basic_compare"
        }