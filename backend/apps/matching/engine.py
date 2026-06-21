"""Deterministic, side-effect-free Smart Job Fit rule engine (spec §16.2-16.4).

This module is the authoritative, **pure** scoring core: given explicit inputs
(candidate preferences, job fields, and a resume keyword set) it returns a
:class:`JobFit` describing the numeric score, band, and structured candidate-facing
reasons. It performs NO database access, NO file IO, and NO network calls, so it
is fully unit-testable from plain Python values and produces identical output for
identical input.

Scoring (spec §16.2)::

    Preferred role/title similarity   weight 35
    Preferred location match          weight 25
    Preferred employment type match   weight 20
    Resume-to-requirements overlap    weight 20

Each factor produces a match fraction in ``[0, 1]``. The final score is the
weighted average of the *available* factors, scaled to ``0..100`` and rounded.

Missing-factor re-normalisation (spec §16.2): when a factor has no usable data
(no preference recorded, no resume keywords, no job requirement keywords) it is
EXCLUDED from the denominator and the remaining weights are re-normalised, so the
score reflects only the information actually available. Excluded factors surface
in the ``unknown`` reason list rather than silently dragging the score down.

The engine intentionally does NOT infer sensitive personal characteristics, does
NOT rank candidates, and does NOT make any hiring decision (AGENTS §9, spec §16.1).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Final

# Rule weights (spec §16.2). Kept as a constant mapping so a single source of
# truth drives both scoring and re-normalisation.
WEIGHT_TITLE: Final = 35
WEIGHT_LOCATION: Final = 25
WEIGHT_EMPLOYMENT_TYPE: Final = 20
WEIGHT_RESUME_OVERLAP: Final = 20

# Version stamp persisted on each result so a future weight/logic change is
# distinguishable in stored history (spec §20.11 ``rule_version``).
RULE_VERSION: Final = "1.0"

# Band thresholds (spec §16.3). Lower bound is inclusive.
BAND_STRONG: Final = "strong"
BAND_GOOD: Final = "good"
BAND_PARTIAL: Final = "partial"
BAND_LIMITED: Final = "limited"

# --- Reason codes (spec §16.4, §17 localisation) ---------------------------
# The engine emits STABLE, language-neutral snake_case CODES, never prose. The
# frontend maps each code to localized text (en + zh-CN), so the same result
# renders correctly in either locale and the wording can change without a backend
# change. This is the COMPLETE enumerated set the engine can ever emit; adding a
# new reason MUST add a code here AND a frontend translation, or it renders raw.
#
# matched (a positive alignment):
REASON_TITLE_STRONG: Final = "title_strong"
REASON_LOCATION_MATCH: Final = "location_match"
REASON_EMPLOYMENT_TYPE_MATCH: Final = "employment_type_match"
REASON_RESUME_OVERLAP_STRONG: Final = "resume_overlap_strong"
#
# gaps (a present-but-weaker or mismatched factor):
REASON_TITLE_RELATED: Final = "title_related"
REASON_TITLE_MISMATCH: Final = "title_mismatch"
REASON_LOCATION_MISMATCH: Final = "location_mismatch"
REASON_EMPLOYMENT_TYPE_MISMATCH: Final = "employment_type_mismatch"
REASON_RESUME_OVERLAP_PARTIAL: Final = "resume_overlap_partial"
REASON_RESUME_OVERLAP_NONE: Final = "resume_overlap_none"
#
# unknown (a factor excluded for lack of usable data on either side):
REASON_TITLE_UNKNOWN: Final = "title_unknown"
REASON_LOCATION_UNKNOWN: Final = "location_unknown"
REASON_EMPLOYMENT_TYPE_UNKNOWN: Final = "employment_type_unknown"
REASON_RESUME_UNKNOWN: Final = "resume_unknown"

# Frozen membership sets — the authoritative enumeration of valid codes per
# bucket. Used for documentation, tests, and any future validation.
MATCHED_CODES: Final = frozenset(
    {
        REASON_TITLE_STRONG,
        REASON_LOCATION_MATCH,
        REASON_EMPLOYMENT_TYPE_MATCH,
        REASON_RESUME_OVERLAP_STRONG,
    }
)
GAP_CODES: Final = frozenset(
    {
        REASON_TITLE_RELATED,
        REASON_TITLE_MISMATCH,
        REASON_LOCATION_MISMATCH,
        REASON_EMPLOYMENT_TYPE_MISMATCH,
        REASON_RESUME_OVERLAP_PARTIAL,
        REASON_RESUME_OVERLAP_NONE,
    }
)
UNKNOWN_CODES: Final = frozenset(
    {
        REASON_TITLE_UNKNOWN,
        REASON_LOCATION_UNKNOWN,
        REASON_EMPLOYMENT_TYPE_UNKNOWN,
        REASON_RESUME_UNKNOWN,
    }
)
ALL_REASON_CODES: Final = MATCHED_CODES | GAP_CODES | UNKNOWN_CODES

# Light, language-neutral-ish stopword set for title tokenisation. Deliberately
# small (spec calls for "stopword-light"): only words that add no matching signal.
_TITLE_STOPWORDS: Final = frozenset(
    {
        "a",
        "an",
        "and",
        "the",
        "of",
        "for",
        "to",
        "in",
        "on",
        "with",
        "at",
        "or",
        "job",
        "role",
        "position",
        "vacancy",
    }
)

# Slightly broader stopword set for free-text requirement/resume tokenisation.
_TEXT_STOPWORDS: Final = _TITLE_STOPWORDS | frozenset(
    {
        "is",
        "are",
        "be",
        "as",
        "we",
        "you",
        "our",
        "your",
        "will",
        "must",
        "have",
        "has",
        "this",
        "that",
        "from",
        "able",
        "etc",
        "experience",
        "years",
        "year",
        "work",
        "working",
        "skills",
        "skill",
        "knowledge",
        "strong",
        "good",
        "plus",
    }
)

_TOKEN_RE: Final = re.compile(r"[a-z0-9+#.]+")
_MIN_TOKEN_LEN: Final = 2


def tokenize_title(text: str) -> set[str]:
    """Lowercased, stopword-light token set for a short title string."""
    tokens = _TOKEN_RE.findall((text or "").lower())
    return {t for t in tokens if len(t) >= _MIN_TOKEN_LEN and t not in _TITLE_STOPWORDS}


def tokenize_text(text: str) -> set[str]:
    """Lowercased keyword set for free-text (requirements / resume) blocks."""
    tokens = _TOKEN_RE.findall((text or "").lower())
    return {t for t in tokens if len(t) >= _MIN_TOKEN_LEN and t not in _TEXT_STOPWORDS}


@dataclass(frozen=True)
class JobFit:
    """Result of a pure scoring run.

    ``score`` is an integer 0..100, ``band`` one of the four band constants, and
    the three reason lists are STABLE reason CODES (spec §16.4, §17) — never
    prose. The frontend maps each code to localized en / zh-CN text, so the same
    result renders correctly in either locale. ``factors`` exposes the per-factor
    fraction/weight breakdown for transparency and testing; it is not part of the
    persisted candidate output.
    """

    score: int
    band: str
    matched: list[str] = field(default_factory=list)
    gaps: list[str] = field(default_factory=list)
    unknown: list[str] = field(default_factory=list)
    factors: dict[str, dict[str, float]] = field(default_factory=dict)
    rule_version: str = RULE_VERSION


def band_for_score(score: int) -> str:
    """Map a 0..100 score to its band (spec §16.3, lower bound inclusive)."""
    if score >= 80:
        return BAND_STRONG
    if score >= 60:
        return BAND_GOOD
    if score >= 40:
        return BAND_PARTIAL
    return BAND_LIMITED


def _title_similarity(preferred_title: str, job_title: str) -> float:
    """Jaccard token overlap between preferred and job title (case-insensitive)."""
    pref = tokenize_title(preferred_title)
    job = tokenize_title(job_title)
    if not pref or not job:
        return 0.0
    intersection = pref & job
    union = pref | job
    return len(intersection) / len(union)


def _location_match(preferred_location: str, job_location: str) -> float:
    """1.0 when either location contains the other (case-insensitive), else 0.0.

    Containment (not just exact equality) is used so "Kuala Lumpur" matches a
    job located in "Kuala Lumpur, Malaysia" and vice versa — a common, honest
    real-world alignment that exact match would miss. It is still binary: there
    is no partial credit, so the signal stays interpretable for the candidate.
    """
    pref = (preferred_location or "").strip().casefold()
    job = (job_location or "").strip().casefold()
    if not pref or not job:
        return 0.0
    if pref == job or pref in job or job in pref:
        return 1.0
    return 0.0


def _employment_type_match(preferred_type: str, job_type: str) -> float:
    """Exact (case-insensitive) employment-type match → 1.0 else 0.0."""
    pref = (preferred_type or "").strip().casefold()
    job = (job_type or "").strip().casefold()
    if not pref or not job:
        return 0.0
    return 1.0 if pref == job else 0.0


def _resume_overlap(resume_keywords: set[str], requirement_keywords: set[str]) -> float:
    """Fraction of job-requirement keywords present in the resume keyword set."""
    if not requirement_keywords:
        return 0.0
    present = requirement_keywords & resume_keywords
    return len(present) / len(requirement_keywords)


def compute(
    *,
    preferred_job_title: str = "",
    preferred_location: str = "",
    preferred_employment_type: str = "",
    job_title: str = "",
    job_location: str = "",
    job_employment_type: str = "",
    resume_keywords: set[str] | None = None,
    requirement_keywords: set[str] | None = None,
) -> JobFit:
    """Compute a :class:`JobFit` from explicit inputs (pure function).

    A factor is *available* only when both sides carry usable data:
      * title: a preferred title AND a job title are present;
      * location: a preferred location is recorded (the job must also have one);
      * employment type: a preferred type is recorded (job must also have one);
      * resume overlap: the resume yielded keywords AND the job lists requirement
        keywords.

    Unavailable factors are excluded from the denominator and re-normalised
    (spec §16.2); they appear in ``unknown`` so the candidate sees the score is
    based on partial information.
    """
    resume_keywords = resume_keywords or set()
    requirement_keywords = requirement_keywords or set()

    matched: list[str] = []
    gaps: list[str] = []
    unknown: list[str] = []
    factors: dict[str, dict[str, float]] = {}

    weighted_sum = 0.0
    total_weight = 0.0

    # --- Title -----------------------------------------------------------
    if preferred_job_title.strip() and job_title.strip():
        frac = _title_similarity(preferred_job_title, job_title)
        weighted_sum += frac * WEIGHT_TITLE
        total_weight += WEIGHT_TITLE
        factors["title"] = {"fraction": frac, "weight": WEIGHT_TITLE}
        if frac >= 0.6:
            matched.append(REASON_TITLE_STRONG)
        elif frac > 0.0:
            gaps.append(REASON_TITLE_RELATED)
        else:
            gaps.append(REASON_TITLE_MISMATCH)
    else:
        unknown.append(REASON_TITLE_UNKNOWN)

    # --- Location --------------------------------------------------------
    if preferred_location.strip() and job_location.strip():
        frac = _location_match(preferred_location, job_location)
        weighted_sum += frac * WEIGHT_LOCATION
        total_weight += WEIGHT_LOCATION
        factors["location"] = {"fraction": frac, "weight": WEIGHT_LOCATION}
        if frac >= 1.0:
            matched.append(REASON_LOCATION_MATCH)
        else:
            gaps.append(REASON_LOCATION_MISMATCH)
    else:
        unknown.append(REASON_LOCATION_UNKNOWN)

    # --- Employment type -------------------------------------------------
    if preferred_employment_type.strip() and job_employment_type.strip():
        frac = _employment_type_match(preferred_employment_type, job_employment_type)
        weighted_sum += frac * WEIGHT_EMPLOYMENT_TYPE
        total_weight += WEIGHT_EMPLOYMENT_TYPE
        factors["employment_type"] = {"fraction": frac, "weight": WEIGHT_EMPLOYMENT_TYPE}
        if frac >= 1.0:
            matched.append(REASON_EMPLOYMENT_TYPE_MATCH)
        else:
            gaps.append(REASON_EMPLOYMENT_TYPE_MISMATCH)
    else:
        unknown.append(REASON_EMPLOYMENT_TYPE_UNKNOWN)

    # --- Resume-to-requirements overlap ----------------------------------
    if resume_keywords and requirement_keywords:
        frac = _resume_overlap(resume_keywords, requirement_keywords)
        weighted_sum += frac * WEIGHT_RESUME_OVERLAP
        total_weight += WEIGHT_RESUME_OVERLAP
        factors["resume_overlap"] = {"fraction": frac, "weight": WEIGHT_RESUME_OVERLAP}
        if frac >= 0.5:
            matched.append(REASON_RESUME_OVERLAP_STRONG)
        elif frac > 0.0:
            gaps.append(REASON_RESUME_OVERLAP_PARTIAL)
        else:
            gaps.append(REASON_RESUME_OVERLAP_NONE)
    else:
        unknown.append(REASON_RESUME_UNKNOWN)

    # --- Aggregate + re-normalise ----------------------------------------
    # ``total_weight`` is the sum of weights of the AVAILABLE factors only;
    # dividing by it re-normalises the remaining factors to a 0..1 scale.
    if total_weight > 0:
        score = round(100 * weighted_sum / total_weight)
    else:
        # No factor had usable data: an honest, undefined-information zero.
        score = 0

    score = max(0, min(100, score))
    band = band_for_score(score)

    return JobFit(
        score=score,
        band=band,
        matched=matched,
        gaps=gaps,
        unknown=unknown,
        factors=factors,
        rule_version=RULE_VERSION,
    )
