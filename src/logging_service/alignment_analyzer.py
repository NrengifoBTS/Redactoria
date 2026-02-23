import re
import logging
from typing import Dict, Any
from collections import Counter

from .semantic_analyzer import SemanticAnalyzer


class AlignmentAnalyzer:
    """
    Analyzes alignment between AI-generated content and final user edits.

    Measures:
    - Semantic divergence (Alignment Shift Score)
    - HTML formatting pattern extraction for LoRA training

    Uses spaCy for semantic similarity, comparing clean text (without HTML).
    """

    def __init__(self):
        """Initialize with shared SemanticAnalyzer instance."""
        self.semantic_analyzer = SemanticAnalyzer()
        self.nlp = self.semantic_analyzer.nlp  # Reuse spaCy model

    def calculate_alignment_shift_score(
        self,
        ai_baseline: str,
        final_content: str
    ) -> float:
        """
        Calculate Alignment Shift Score (ASS) between AI baseline and final edited content.

        Methodology:
        1. Clean HTML from both texts using SemanticAnalyzer._clean_html()
        2. Process with spaCy (es_core_news_sm)
        3. Calculate semantic similarity using spaCy's word vectors

        Args:
            ai_baseline: Original AI-generated content (from ai_generations.raw_output)
            final_content: Final edited content (from user_edits.content_after)

        Returns:
            Float between 0.0 (total divergence) and 1.0 (perfect alignment)
            - 1.0: Identical semantic meaning
            - 0.9-1.0: Minimal editing
            - 0.7-0.9: Moderate editing (style/tone adjustments)
            - 0.5-0.7: Significant editing (structure changes)
            - <0.5: Complete rewrite

        Raises:
            None: Returns 0.0 if spaCy fails or texts are empty
        """
        if not self.nlp:
            logging.warning("[ASS] spaCy model not loaded, returning 0.0")
            return 0.0

        if not ai_baseline or not final_content:
            logging.debug("[ASS] Empty input, returning 0.0")
            return 0.0

        try:
            # Clean HTML for semantic comparison
            clean_ai = self.semantic_analyzer._clean_html(ai_baseline)
            clean_final = self.semantic_analyzer._clean_html(final_content)

            if not clean_ai or not clean_final:
                logging.debug("[ASS] Empty clean text after HTML removal")
                return 0.0

            # Process with spaCy
            doc_ai = self.nlp(clean_ai)
            doc_final = self.nlp(clean_final)

            # Calculate similarity (reuse SemanticAnalyzer method)
            similarity = self.semantic_analyzer._calculate_similarity(doc_ai, doc_final)

            logging.info(
                f"[ASS] Calculated score: {similarity:.3f} "
                f"(AI: {len(clean_ai)} chars, Final: {len(clean_final)} chars)"
            )

            return similarity

        except Exception as e:
            logging.error(f"[ASS] Failed to calculate score: {e}", exc_info=True)
            return 0.0

    def extract_format_patterns(
        self,
        ai_baseline: str,
        final_content: str
    ) -> Dict[str, Any]:
        """
        Extract HTML formatting patterns for future LoRA training.

        Analyzes:
        - Tags added/removed (e.g., <strong>, <ul>, <em>)
        - Semantic tag usage counts
        - HTML/content ratio
        - Formatting changes (bold, lists, emphasis, paragraphs)

        Args:
            ai_baseline: Original AI-generated HTML content
            final_content: Final edited HTML content

        Returns:
            Dictionary with structure:
            {
                "html_tags_added": ["strong", "ul"],
                "html_tags_removed": ["b"],
                "semantic_tags_count": {"strong": 3, "em": 1, "ul": 2},
                "html_to_content_ratio": 0.15,
                "formatting_changes": {
                    "added_bold": True,
                    "added_lists": True,
                    "added_emphasis": False,
                    "restructured_paragraphs": False
                },
                "has_special_chars": False
            }
        """
        try:
            # Extract HTML tags from both versions
            ai_tags = self._extract_html_tags(ai_baseline)
            final_tags = self._extract_html_tags(final_content)

            # Calculate HTML/content ratio
            clean_ai = self.semantic_analyzer._clean_html(ai_baseline)
            clean_final = self.semantic_analyzer._clean_html(final_content)

            ai_text_length = len(clean_ai) if clean_ai else 0
            final_text_length = len(clean_final) if clean_final else 0
            ai_html_length = len(ai_baseline) - ai_text_length
            final_html_length = len(final_content) - final_text_length

            html_ratio = final_html_length / max(final_text_length, 1) if final_text_length else 0.0

            # Detect specific formatting changes
            formatting_changes = {
                "added_bold": self._tag_added(ai_tags, final_tags, ["strong", "b"]),
                "added_lists": self._tag_added(ai_tags, final_tags, ["ul", "ol"]),
                "added_emphasis": self._tag_added(ai_tags, final_tags, ["em", "i"]),
                "restructured_paragraphs": abs(ai_tags.get("p", 0) - final_tags.get("p", 0)) > 2
            }

            # Extract semantic tags (important for LoRA training)
            semantic_tags = ["strong", "em", "h1", "h2", "h3", "h4", "ul", "ol", "li"]
            semantic_tags_count = {
                tag: count for tag, count in final_tags.items()
                if tag in semantic_tags
            }

            # Detect special characters (Unicode, emojis, etc.)
            has_special_chars = bool(re.search(r'[^\w\s<>/"=\-]', final_content, re.UNICODE))

            return {
                "html_tags_added": list(set(final_tags.keys()) - set(ai_tags.keys())),
                "html_tags_removed": list(set(ai_tags.keys()) - set(final_tags.keys())),
                "semantic_tags_count": semantic_tags_count,
                "html_to_content_ratio": round(html_ratio, 3),
                "formatting_changes": formatting_changes,
                "has_special_chars": has_special_chars
            }

        except Exception as e:
            logging.error(f"[FormatAnalysis] Failed to extract patterns: {e}", exc_info=True)
            return {
                "html_tags_added": [],
                "html_tags_removed": [],
                "semantic_tags_count": {},
                "html_to_content_ratio": 0.0,
                "formatting_changes": {
                    "added_bold": False,
                    "added_lists": False,
                    "added_emphasis": False,
                    "restructured_paragraphs": False
                },
                "has_special_chars": False
            }

    def _extract_html_tags(self, html_content: str) -> Counter:
        """
        Extract all HTML tags and their counts.

        Args:
            html_content: HTML string

        Returns:
            Counter with tag names as keys and counts as values
            Example: Counter({'p': 3, 'strong': 2, 'em': 1})
        """
        if not html_content:
            return Counter()

        # Match opening tags: <tag> or <tag attr="value">
        tag_pattern = r'<(\w+)(?:\s|>)'
        tags = re.findall(tag_pattern, html_content)
        return Counter(tags)

    def _tag_added(self, ai_tags: Counter, final_tags: Counter, tag_list: list) -> bool:
        """
        Check if any tag from tag_list was added in final version.

        Args:
            ai_tags: Counter of tags in AI baseline
            final_tags: Counter of tags in final content
            tag_list: List of tag names to check (e.g., ["strong", "b"])

        Returns:
            True if any tag from tag_list has more occurrences in final than AI
        """
        for tag in tag_list:
            if final_tags.get(tag, 0) > ai_tags.get(tag, 0):
                return True
        return False
