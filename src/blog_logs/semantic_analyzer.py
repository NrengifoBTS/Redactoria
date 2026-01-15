# redactoria/src/blog_logs/semantic_analyzer.py

import spacy
from typing import Dict, Any, Optional, List
import logging
from difflib import SequenceMatcher
import re

class SemanticAnalyzer:
    """
    Motor de análisis semántico avanzado.
    Compara el texto original vs. editado para extraer patrones de estilo, 
    tonos y entidades, fundamentales para el futuro entrenamiento de modelos LoRA.
    """

    def __init__(self):
        """Inicializa el motor NLP con spaCy."""
        try:
            # Requisito: python -m spacy download es_core_news_sm
            self.nlp = spacy.load("es_core_news_sm")
            logging.info("✓ Motor Semántico (spaCy) cargado correctamente")
        except Exception as e:
            logging.error(f"✗ Error al cargar spaCy: {e}")
            self.nlp = None

    def analyze_edit(self, content_before: Optional[str], content_after: str) -> Dict[str, Any]:
        """
        Realiza una disección profunda de los cambios realizados por el redactor.
        """
        if not self.nlp:
            return self._fallback_analysis(content_before, content_after)

        # 1. Normalización de contenido (Limpieza de HTML/Entidades)
        clean_before = self._clean_html(content_before or "")
        clean_after = self._clean_html(content_after)

        if not clean_before:
            return self._analyze_new_content(clean_after)

        # 2. Procesamiento paralelo de lenguaje
        doc_before = self.nlp(clean_before)
        doc_after = self.nlp(clean_after)

        # 3. Construcción del mapa semántico de cambios
        return {
            "similarity_score": round(float(self._calculate_similarity(doc_before, doc_after)), 4),
            "tone_shift": self._detect_tone_shift(doc_before, doc_after),
            "entities": {
                "added": self._extract_entities(doc_after) - self._extract_entities(doc_before),
                "removed": self._extract_entities(doc_before) - self._extract_entities(doc_after)
            },
            "grammar_metrics": self._analyze_grammar_shift(doc_before, doc_after),
            "lexical_changes": self._detect_lexical_changes(doc_before, doc_after),
            "semantic_drift": self._calculate_semantic_drift(doc_before, doc_after)
        }

    def _calculate_similarity(self, doc_before, doc_after) -> float:
        """Calcula la similitud de vectores de palabra."""
        if doc_before.vector_norm and doc_after.vector_norm:
            return doc_before.similarity(doc_after)
        return SequenceMatcher(None, doc_before.text, doc_after.text).ratio()

    def _detect_tone_shift(self, doc_before, doc_after) -> str:
        """
        Detecta cambios en la intención comunicativa.
        Útil para saber si el redactor prefiere un estilo más agresivo o informativo.
        """
        markers = {
            "persuasive": {"mejor", "increíble", "descubre", "aprende", "beneficio", "único", "clic", "ahora"},
            "informative": {"significa", "debido", "investigación", "datos", "ejemplo", "específicamente"},
            "formal": {"asimismo", "obstante", "consecuencia", "adicionalmente", "proporcionar"}
        }

        def get_dominant_tone(doc):
            counts = {tone: sum(1 for t in doc if t.lemma_.lower() in words) 
                      for tone, words in markers.items()}
            return max(counts, key=counts.get) if any(counts.values()) else "neutral"

        tone_b = get_dominant_tone(doc_before)
        tone_a = get_dominant_tone(doc_after)

        return f"{tone_b}_to_{tone_a}" if tone_b != tone_a else f"maintained_{tone_a}"

    def _extract_entities(self, doc) -> set:
        """Extrae entidades nombradas (Lugares, Personas, Marcas)."""
        return {ent.text.lower() for ent in doc.ents}

    def _analyze_grammar_shift(self, doc_before, doc_after) -> Dict[str, Any]:
        """Analiza si el redactor simplificó u obscureció el texto."""
        len_b = len(list(doc_before.sents))
        len_a = len(list(doc_after.sents))
        
        avg_words_b = len(doc_before) / max(len_b, 1)
        avg_words_a = len(doc_after) / max(len_a, 1)

        return {
            "complexity_change": "simplified" if avg_words_a < avg_words_b * 0.9 else "extended",
            "sentence_count_diff": len_a - len_b
        }

    def _detect_lexical_changes(self, doc_before, doc_after) -> Dict[str, List[str]]:
        """Detecta verbos y sustantivos clave que fueron alterados."""
        def get_vocabulary(doc):
            return {t.lemma_.lower() for t in doc if t.pos_ in ["NOUN", "VERB", "ADJ"] and not t.is_stop}

        voc_b = get_vocabulary(doc_before)
        voc_a = get_vocabulary(doc_after)

        return {
            "new_keywords": list(voc_a - voc_b)[:10],
            "rejected_keywords": list(voc_b - voc_a)[:10]
        }

    def _calculate_semantic_drift(self, doc_before, doc_after) -> str:
        """Clasifica el nivel de 'deriva' semántica."""
        score = self._calculate_similarity(doc_before, doc_after)
        if score > 0.90: return "minimal"
        if score > 0.70: return "moderate"
        return "re-written"

    def _clean_html(self, html: str) -> str:
        """Limpia el ruido del HTML para un análisis de texto puro."""
        if not html: return ""
        # Elimina tags
        text = re.sub(r'<[^>]+>', ' ', html)
        # Normaliza espacios y limpia entidades comunes
        text = text.replace('&nbsp;', ' ').strip()
        return " ".join(text.split())

    def _fallback_analysis(self, before, after) -> Dict[str, Any]:
        """Análisis de emergencia basado en comparación de strings simple."""
        sim = SequenceMatcher(None, self._clean_html(before or ""), self._clean_html(after)).ratio()
        return {
            "similarity_score": round(sim, 2),
            "semantic_drift": "unknown_no_nlp",
            "tone_shift": "not_analyzed"
        }

    def _analyze_new_content(self, content: str) -> Dict[str, Any]:
        """Perfil inicial para contenido recién generado por la IA."""
        doc = self.nlp(content)
        return {
            "similarity_score": 1.0,
            "tone_shift": "initial_ai_draft",
            "entities": list(self._extract_entities(doc)),
            "semantic_drift": "new_content"
        }