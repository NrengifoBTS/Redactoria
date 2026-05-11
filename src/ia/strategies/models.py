from dataclasses import dataclass, field
from typing import List


@dataclass
class GenerationResult:
    raw_generated_content: str = ""
    additional_content: str = ""
    faq_questions_for_response: List[str] = field(default_factory=list)
    city_titles_for_response: List[str] = field(default_factory=list)
