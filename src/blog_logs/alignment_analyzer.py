# redactoria/src/blog_logs/alignment_analyzer.py
import re
import logging
from typing import Dict, Any, List
from collections import Counter
from .semantic_analyzer import SemanticAnalyzer

class BlogAlignmentAnalyzer:
    def __init__(self):
        self.semantic_analyzer = SemanticAnalyzer()
        self.nlp = self.semantic_analyzer.nlp  

    def calculate_alignment_shift_score(self, ai_baseline_text: str, final_content_text: str) -> float:
        if not ai_baseline_text or not final_content_text:
            return 0.0
        analysis = self.semantic_analyzer.analyze_edit(ai_baseline_text, final_content_text)
        return analysis.get("similarity_score", 0.0)

    def analyze_structural_alignment(self, ai_structure: List[Dict], final_structure: List[Dict]) -> Dict[str, Any]:
        if not ai_structure or not final_structure:
            return {"retention_score": 0, "status": "incomplete"}

        ai_ids = [block.get('uniqueId') for block in ai_structure if block.get('uniqueId')]
        final_ids = [block.get('uniqueId') for block in final_structure if block.get('uniqueId')]

        matches = set(ai_ids).intersection(set(final_ids))
        retention_score = len(matches) / len(ai_ids) if ai_ids else 0

        added_by_user = [uid for uid in final_ids if uid not in ai_ids]
        common_ai_order = [uid for uid in ai_ids if uid in matches]
        common_final_order = [uid for uid in final_ids if uid in matches]
        
        was_reordered = common_ai_order != common_final_order

        return {
            "retention_score": round(retention_score, 4), # Score para la columna de la DB
            "sections_kept": len(matches),
            "sections_added": len(added_by_user),
            "sections_removed": len(ai_ids) - len(matches),
            "was_reordered": was_reordered,
            "alignment_rating": "high" if retention_score > 0.8 else "moderate" if retention_score > 0.5 else "low"
        }

    def extract_formatting_patterns(self, structure: List[Dict]) -> Dict[str, Any]:
        """Complemento: Extrae qué tanto formatea el usuario el texto"""
        total_content = ""
        levels = Counter()
        multimedia_count = 0

        for block in structure:
            total_content += block.get('content', '')
            levels[block.get('level', 'p')] += 1
            if block.get('multimedia') and block.get('multimedia') != "NONE":
                multimedia_count += 1

        tags = self._extract_html_tags(total_content)
        
        return {
            "hierarchy_distribution": dict(levels),
            "multimedia_density": round(multimedia_count / len(structure), 2) if structure else 0,
            "formatting_habits": {
                "uses_bold": tags['strong'] > 0 or tags['b'] > 0,
                "uses_lists": tags['li'] > 0,
                "avg_bold_per_section": round(tags['strong'] / len(structure), 2) if structure else 0
            }
        }

    def _extract_html_tags(self, html_content: str) -> Counter:
        if not html_content: return Counter()
        tag_pattern = r'<(\w+)(?:\s|>)'
        tags = re.findall(tag_pattern, html_content)
        return Counter(tags)