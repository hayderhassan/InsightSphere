from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)


try:
    import nltk
    from nltk.corpus import wordnet as wn
except Exception:  # pragma: no cover - optional dependency
    nltk = None  # type: ignore[assignment]
    wn = None  # type: ignore[assignment]


def _ensure_wordnet_loaded() -> None:
    """
    Best-effort loader for the WordNet corpus.


    If NLTK or WordNet is not available, we log and fall back gracefully.
    """
    if wn is None or nltk is None:
        logger.debug("NLTK / WordNet not available; skipping antonym lookup.")
        return

    try:
        wn.ensure_loaded()
    except LookupError:
        try:
            nltk.download("wordnet", quiet=True)
            wn.ensure_loaded()
        except Exception as exc:  # pragma: no cover
            logger.warning("Failed to download/load WordNet: %s", exc)


def get_antonym(word: str) -> Optional[str]:
    """
    Return a single "best guess" antonym for the given word, if any.


    Uses NLTK WordNet when available. Falls back to None if:
    - NLTK/WordNet is not installed, or
    - No reasonable antonym is found.
    """
    if not word:
        return None

    if wn is None or nltk is None:
        return None

    _ensure_wordnet_loaded()

    word_lower = word.strip().lower()
    if not word_lower:
        return None

    candidates: set[str] = set()

    try:
        for syn in wn.synsets(word_lower):
            for lemma in syn.lemmas():
                for ant in lemma.antonyms():
                    name = ant.name().replace("_", " ").strip()
                    if name:
                        candidates.add(name)
    except Exception as exc:  # pragma: no cover
        logger.debug("Antonym lookup failed for %r: %s", word, exc)
        return None

    if not candidates:
        return None

    # Prefer the shortest non-identical candidate
    best = min(candidates, key=len)
    if best.lower() == word_lower:
        return None
    return best


def build_boolean_labels(column_name: str) -> dict[str, str]:
    """
    Given a boolean/binary target column name like "passed",
    return human-friendly positive / negative labels, e.g.:


    - "Passed" / "Failed"  (if antonym is found)
    - "Passed" / "Not passed"  (fallback)
    """
    base = (column_name or "").strip()
    if not base:
        base = "Positive"

    base_clean = base.replace("_", " ")
    positive = base_clean[:1].upper() + base_clean[1:]

    antonym = get_antonym(base_clean)
    if antonym:
        negative = antonym[:1].upper() + antonym[1:]
    else:
        negative = f"Not {positive.lower()}"

    return {
        "positive_label": positive,
        "negative_label": negative,
    }
