# redactoria/src/blog_logs/alignment_analyzer.py
import re
import logging
from typing import Dict, Any, List
from collections import Counter
from .semantic_analyzer import SemanticAnalyzer

class BlogAlignmentAnalyzer:
    """
    Analiza la alineación entre el contenido generado por la IA y la edición final del usuario.
    """

    def __init__(self):
        """Inicializa usando una instancia de SemanticAnalyzer para procesar texto."""
        self.semantic_analyzer = SemanticAnalyzer()
        self.nlp = self.semantic_analyzer.nlp  

    def calculate_alignment_shift_score(
        self,
        ai_baseline_text: str,
        final_content_text: str
    ) -> float:
        """
        Calcula el Alignment Shift Score (ASS) entre la base de la IA y el texto final.
        """
        if not ai_baseline_text or not final_content_text:
            return 0.0

        analysis = self.semantic_analyzer.analyze_edit(ai_baseline_text, final_content_text)
        return analysis.get("similarity_score", 0.0)

    def analyze_structural_alignment(self, ai_json: List[Dict], final_json: List[Dict]) -> Dict[str, Any]:
        """
        Analiza qué tanto cambió la JERARQUÍA del blog (títulos H2/H3).
        """
        # Extraemos títulos ignorando vacíos y espacios extra
        ai_titles = [s.get('text', '').strip().lower() for s in ai_json if s.get('text')]
        final_titles = [s.get('text', '').strip().lower() for s in final_json if s.get('text')]
        
        if not ai_titles:
            return {
                "retention_score": 1.0 if not final_titles else 0.0,
                "original_count": 0,
                "final_count": len(final_titles),
                "was_reordered": False
            }

        # Encontrar cuántos títulos originales sobrevivieron
        matches = set(ai_titles).intersection(set(final_titles))
        structure_retention = len(matches) / len(ai_titles)
        
        return {
            "retention_score": round(structure_retention, 2),
            "original_count": len(ai_titles),
            "final_count": len(final_titles),
            "was_reordered": ai_titles != final_titles and structure_retention > 0.7
        }

    def extract_formatting_patterns(self, html_content: str) -> Dict[str, Any]:
        """
        Extrae patrones de formato para entender el estilo visual del redactor.
        """
        if not html_content:
            return {"tags_count": {}, "rich_text_density": 0}

        tags = self._extract_html_tags(html_content)
        total_tags = sum(tags.values())
        
        return {
            "tags_count": dict(tags),
            "rich_text_density": round(total_tags / len(html_content), 4) if len(html_content) > 0 else 0,
            "prefers_lists": tags['li'] > 0 or tags['ul'] > 0,
            "prefers_emphasis": (tags['strong'] + tags['b']) > 2
        }

    def _extract_html_tags(self, html_content: str) -> Counter:
        """Extrae todas las etiquetas HTML y sus conteos."""
        if not html_content:
            return Counter()
        # Captura el nombre de la etiqueta (p, strong, li, etc.)
        tag_pattern = r'<(\w+)(?:\s|>)'
        tags = re.findall(tag_pattern, html_content)
        return Counter(tags)