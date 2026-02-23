import spacy
from typing import Dict, Any, Optional, List
import logging
from difflib import SequenceMatcher
import re

class SemanticAnalyzer:
    """
    Semantic analysis using spaCy (es_core_news_sm).
    Analyzes changes between original and edited content for:
    - Semantic similarity
    - Tone shifts
    - Entity changes
    - Grammar changes
    - Keyword modifications
    - Structural changes
    """

    def __init__(self):
        """Initialize spaCy model"""
        try:
            self.nlp = spacy.load("es_core_news_sm")
            logging.info("spaCy model (es_core_news_sm) loaded successfully")
        except Exception as e:
            logging.error(f"Failed to load spaCy model: {e}")
            logging.warning("Falling back to basic analysis without spaCy")
            self.nlp = None

    def analyze_edit(
        self,
        content_before: Optional[str],
        content_after: str
    ) -> Dict[str, Any]:
        """
        Perform comprehensive semantic analysis of an edit.

        Args:
            content_before: Original content (None if new creation)
            content_after: Edited content

        Returns:
            Dictionary with semantic analysis:
            {
                "similarity_score": float,
                "tone_shift": str,
                "entities_added": List[str],
                "entities_removed": List[str],
                "grammar_changes": List[str],
                "keyword_changes": {"added": [...], "removed": [...]},
                "structural_changes": List[str],
                "semantic_drift": str
            }
        """
        if not self.nlp:
            return self._fallback_analysis(content_before, content_after)

        # Clean HTML for text analysis
        clean_before = self._clean_html(content_before or "")
        clean_after = self._clean_html(content_after)

        if not clean_before:
            # New content creation
            return self._analyze_new_content(clean_after)

        # Process with spaCy
        doc_before = self.nlp(clean_before)
        doc_after = self.nlp(clean_after)

        analysis = {
            "similarity_score": self._calculate_similarity(doc_before, doc_after),
            "tone_shift": self._detect_tone_shift(doc_before, doc_after),
            "entities_added": self._extract_new_entities(doc_before, doc_after),
            "entities_removed": self._extract_removed_entities(doc_before, doc_after),
            "grammar_changes": self._detect_grammar_changes(doc_before, doc_after),
            "keyword_changes": self._detect_keyword_changes(doc_before, doc_after),
            "structural_changes": self._detect_structural_changes(content_before, content_after),
            "semantic_drift": self._calculate_semantic_drift(doc_before, doc_after)
        }

        return analysis

    def _calculate_similarity(self, doc_before, doc_after) -> float:
        """Calculate semantic similarity using spaCy vectors"""
        try:
            # spaCy's similarity uses word vectors
            return doc_before.similarity(doc_after)
        except Exception as e:
            logging.debug(f"spaCy similarity failed, using fallback: {e}")
            # Fallback to sequence matching
            return SequenceMatcher(None, doc_before.text, doc_after.text).ratio()

    def _detect_tone_shift(self, doc_before, doc_after) -> str:
        """
        Detect tone changes (persuasive, formal, urgent, etc.)

        Returns: "more_persuasive", "more_formal", "more_urgent", "maintained", "neutral"
        """
        # Word lists for tone detection
        persuasive_words = {
            "descuento", "exclusivo", "garantía", "mejor", "único", "especial",
            "oferta", "promoción", "ahorro", "beneficio", "ventaja", "excelente"
        }
        formal_indicators = {
            "estimado", "atentamente", "mediante", "respecto", "favor",
            "cordialmente", "sírvase", "agradecer"
        }
        urgent_words = {
            "ahora", "hoy", "inmediato", "rápido", "urgente", "pronto",
            "ya", "limitado", "último"
        }

        # Count occurrences
        before_persuasive = sum(1 for token in doc_before if token.text.lower() in persuasive_words)
        after_persuasive = sum(1 for token in doc_after if token.text.lower() in persuasive_words)

        before_formal = sum(1 for token in doc_before if token.text.lower() in formal_indicators)
        after_formal = sum(1 for token in doc_after if token.text.lower() in formal_indicators)

        before_urgent = sum(1 for token in doc_before if token.text.lower() in urgent_words)
        after_urgent = sum(1 for token in doc_after if token.text.lower() in urgent_words)

        # Determine tone shift
        if after_persuasive > before_persuasive * 1.5:
            return "more_persuasive"
        elif after_formal > before_formal * 1.5:
            return "more_formal"
        elif after_urgent > before_urgent * 1.5:
            return "more_urgent"
        elif abs(after_persuasive - before_persuasive) < 2 and abs(after_formal - before_formal) < 2:
            return "maintained"
        else:
            return "neutral"

    def _extract_new_entities(self, doc_before, doc_after) -> List[str]:
        """Extract named entities that appear in after but not before"""
        entities_before = {ent.text for ent in doc_before.ents}
        entities_after = {ent.text for ent in doc_after.ents}
        return list(entities_after - entities_before)

    def _extract_removed_entities(self, doc_before, doc_after) -> List[str]:
        """Extract named entities removed in the edit"""
        entities_before = {ent.text for ent in doc_before.ents}
        entities_after = {ent.text for ent in doc_after.ents}
        return list(entities_before - entities_after)

    def _detect_grammar_changes(self, doc_before, doc_after) -> List[str]:
        """
        Detect grammar/syntax changes using spaCy's POS tagging and dependency parsing

        Returns: List of detected changes like "verb_tense_change", "passive_to_active"
        """
        changes = []

        # Verb tense analysis
        before_tenses = [token.tag_ for token in doc_before if token.pos_ == "VERB"]
        after_tenses = [token.tag_ for token in doc_after if token.pos_ == "VERB"]

        if set(before_tenses) != set(after_tenses):
            changes.append("verb_tense_change")

        # Voice detection (active vs passive)
        before_has_passive = self._has_passive_voice(doc_before)
        after_has_passive = self._has_passive_voice(doc_after)

        if before_has_passive and not after_has_passive:
            changes.append("passive_to_active")
        elif not before_has_passive and after_has_passive:
            changes.append("active_to_passive")

        # Sentence complexity (simple heuristic)
        before_avg_sent_len = len(doc_before) / max(len(list(doc_before.sents)), 1)
        after_avg_sent_len = len(doc_after) / max(len(list(doc_after.sents)), 1)

        if after_avg_sent_len < before_avg_sent_len * 0.7:
            changes.append("simplified_sentences")
        elif after_avg_sent_len > before_avg_sent_len * 1.3:
            changes.append("more_complex_sentences")

        return changes

    def _has_passive_voice(self, doc) -> bool:
        """Detect passive voice constructions in Spanish"""
        # Spanish passive voice indicators
        for token in doc:
            # Auxiliary passive marker
            if token.dep_ == "auxpass":
                return True
            # "se" passive constructions
            if token.text.lower() == "se" and token.head.pos_ == "VERB":
                return True
        return False

    def _detect_keyword_changes(self, doc_before, doc_after) -> Dict[str, List[str]]:
        """
        Detect important keyword additions/removals

        Returns: {"added": [...], "removed": [...]}
        """
        def extract_keywords(doc):
            """Extract significant keywords (nouns, verbs, adjectives)"""
            return {
                token.lemma_.lower()
                for token in doc
                if token.pos_ in ["NOUN", "VERB", "ADJ"] and not token.is_stop and len(token.text) > 2
            }

        keywords_before = extract_keywords(doc_before)
        keywords_after = extract_keywords(doc_after)

        return {
            "added": list(keywords_after - keywords_before),
            "removed": list(keywords_before - keywords_after)
        }

    def _detect_structural_changes(self, content_before: str, content_after: str) -> List[str]:
        """
        Detect HTML/formatting structural changes

        Returns: List of changes like "added_bold", "added_list"
        """
        changes = []

        if not content_before:
            # New content, detect what's present
            if "<strong>" in content_after or "<b>" in content_after:
                changes.append("added_bold")
            if "<ul>" in content_after or "<ol>" in content_after:
                changes.append("added_list")
            if "<em>" in content_after or "<i>" in content_after:
                changes.append("added_emphasis")
            return changes

        # Check for bold additions
        if ("<strong>" not in content_before and "<strong>" in content_after) or \
           ("<b>" not in content_before and "<b>" in content_after):
            changes.append("added_bold")

        # Check for list additions
        if ("<ul>" not in content_before and "<ul>" in content_after) or \
           ("<ol>" not in content_before and "<ol>" in content_after):
            changes.append("added_list")

        # Check for emphasis additions
        if ("<em>" not in content_before and "<em>" in content_after) or \
           ("<i>" not in content_before and "<i>" in content_after):
            changes.append("added_emphasis")

        # Check for paragraph restructuring
        before_paragraphs = content_before.count("<p>")
        after_paragraphs = content_after.count("<p>")
        if after_paragraphs > before_paragraphs * 1.5:
            changes.append("added_paragraphs")

        return changes

    def _calculate_semantic_drift(self, doc_before, doc_after) -> str:
        """
        Classify semantic drift level based on similarity

        Returns: "minimal", "low", "medium", "high", or "new"
        """
        similarity = self._calculate_similarity(doc_before, doc_after)

        if similarity > 0.9:
            return "minimal"
        elif similarity > 0.7:
            return "low"
        elif similarity > 0.5:
            return "medium"
        else:
            return "high"

    def _analyze_new_content(self, content: str) -> Dict[str, Any]:
        """Analyze newly created content (no before version)"""
        doc = self.nlp(content)

        return {
            "similarity_score": 1.0,
            "tone_shift": "new_content",
            "entities_added": [ent.text for ent in doc.ents],
            "entities_removed": [],
            "grammar_changes": [],
            "keyword_changes": {
                "added": [token.lemma_ for token in doc if token.pos_ in ["NOUN", "VERB", "ADJ"] and not token.is_stop],
                "removed": []
            },
            "structural_changes": self._detect_structural_changes("", content),
            "semantic_drift": "new"
        }

    def _clean_html(self, content: str) -> str:
        """Remove HTML tags for text analysis"""
        # Remove HTML tags
        clean = re.sub(r'<[^>]+>', '', content)
        # Decode common HTML entities
        clean = clean.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
        # Remove extra whitespace
        clean = ' '.join(clean.split())
        return clean.strip()

    def _fallback_analysis(self, content_before: Optional[str], content_after: str) -> Dict[str, Any]:
        """Fallback analysis if spaCy fails (basic text comparison)"""
        clean_before = self._clean_html(content_before or "")
        clean_after = self._clean_html(content_after)

        # Simple similarity using sequence matcher
        similarity = SequenceMatcher(None, clean_before, clean_after).ratio() if clean_before else 0.0

        return {
            "similarity_score": similarity,
            "tone_shift": "unknown",
            "entities_added": [],
            "entities_removed": [],
            "grammar_changes": [],
            "keyword_changes": {"added": [], "removed": []},
            "structural_changes": self._detect_structural_changes(content_before or "", content_after),
            "semantic_drift": "medium" if similarity < 0.7 else "low"
        }
