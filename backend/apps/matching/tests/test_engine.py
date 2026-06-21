"""Unit tests for the pure rule engine (spec §16.2-16.4). No DB, no IO."""

from __future__ import annotations

from apps.matching import engine
from apps.matching.engine import (
    WEIGHT_EMPLOYMENT_TYPE,
    WEIGHT_LOCATION,
    WEIGHT_RESUME_OVERLAP,
    WEIGHT_TITLE,
    band_for_score,
    compute,
)


def _full_inputs(**overrides):
    base = {
        "preferred_job_title": "Data Analyst",
        "preferred_location": "Kuala Lumpur",
        "preferred_employment_type": "full_time",
        "job_title": "Data Analyst",
        "job_location": "Kuala Lumpur",
        "job_employment_type": "full_time",
        "resume_keywords": {"sql", "python", "tableau"},
        "requirement_keywords": {"sql", "python", "tableau"},
    }
    base.update(overrides)
    return base


def test_determinism_same_inputs_same_output():
    a = compute(**_full_inputs())
    b = compute(**_full_inputs())
    assert a.score == b.score
    assert a.band == b.band
    assert a.matched == b.matched
    assert a.gaps == b.gaps
    assert a.unknown == b.unknown


def test_perfect_match_is_100_strong():
    fit = compute(**_full_inputs())
    assert fit.score == 100
    assert fit.band == "strong"
    assert not fit.gaps
    assert not fit.unknown


def test_weights_sum_to_100():
    assert WEIGHT_TITLE + WEIGHT_LOCATION + WEIGHT_EMPLOYMENT_TYPE + WEIGHT_RESUME_OVERLAP == 100


def test_each_factor_contributes_independently():
    # Only location matches; everything else mismatches but is still AVAILABLE.
    fit = compute(
        preferred_job_title="Welder",
        job_title="Surgeon",
        preferred_location="Penang",
        job_location="Penang",
        preferred_employment_type="part_time",
        job_employment_type="full_time",
        resume_keywords={"banana"},
        requirement_keywords={"sql", "python"},
    )
    # Only the 25-weight location factor scores 1.0; all four are present.
    # score = 100 * (1.0*25) / 100 = 25
    assert fit.score == 25
    assert engine.REASON_LOCATION_MATCH in fit.matched


def test_employment_type_exact_only():
    matched = compute(**_full_inputs(preferred_employment_type="full_time"))
    mismatch = compute(**_full_inputs(job_employment_type="contract"))
    assert engine.REASON_EMPLOYMENT_TYPE_MATCH in matched.matched
    assert engine.REASON_EMPLOYMENT_TYPE_MATCH not in mismatch.matched
    assert engine.REASON_EMPLOYMENT_TYPE_MISMATCH in mismatch.gaps
    assert mismatch.score < matched.score


def test_resume_overlap_fraction():
    # 1 of 4 requirement keywords present -> overlap fraction 0.25.
    fit = compute(
        preferred_job_title="",  # exclude title
        preferred_location="",  # exclude location
        preferred_employment_type="",  # exclude type
        resume_keywords={"sql"},
        requirement_keywords={"sql", "python", "tableau", "excel"},
    )
    # Only resume factor available: score = 100 * 0.25 = 25.
    assert fit.score == 25
    assert fit.factors["resume_overlap"]["fraction"] == 0.25


def test_missing_location_renormalises_denominator():
    # No location preference -> location (weight 25) excluded; denominator 75.
    fit = compute(
        preferred_job_title="Data Analyst",
        job_title="Data Analyst",
        preferred_location="",  # MISSING -> excluded
        job_location="Kuala Lumpur",
        preferred_employment_type="full_time",
        job_employment_type="full_time",
        resume_keywords={"sql", "python"},
        requirement_keywords={"sql", "python"},
    )
    # title 1.0*35 + type 1.0*20 + resume 1.0*20 = 75; denominator 75 -> 100.
    assert fit.score == 100
    assert "location" not in fit.factors
    assert engine.REASON_LOCATION_UNKNOWN in fit.unknown


def test_missing_factor_only_uses_available_information():
    # Title present and a perfect match; location present but mismatches;
    # employment type & resume both MISSING (excluded).
    fit = compute(
        preferred_job_title="Data Analyst",
        job_title="Data Analyst",
        preferred_location="Penang",
        job_location="Kuala Lumpur",
        preferred_employment_type="",  # excluded
        job_employment_type="full_time",
        resume_keywords=set(),  # excluded
        requirement_keywords={"sql"},
    )
    # Available: title 1.0*35 + location 0.0*25 = 35; denominator 60.
    # score = round(100*35/60) = 58.
    assert fit.score == 58
    assert "employment_type" not in fit.factors
    assert "resume_overlap" not in fit.factors
    assert len(fit.unknown) == 2
    assert engine.REASON_EMPLOYMENT_TYPE_UNKNOWN in fit.unknown
    assert engine.REASON_RESUME_UNKNOWN in fit.unknown
    assert engine.REASON_LOCATION_MISMATCH in fit.gaps


def test_no_usable_data_scores_zero_limited():
    fit = compute()
    assert fit.score == 0
    assert fit.band == "limited"
    assert len(fit.unknown) == 4
    assert set(fit.unknown) == {
        engine.REASON_TITLE_UNKNOWN,
        engine.REASON_LOCATION_UNKNOWN,
        engine.REASON_EMPLOYMENT_TYPE_UNKNOWN,
        engine.REASON_RESUME_UNKNOWN,
    }
    assert not fit.factors


def test_band_boundaries():
    assert band_for_score(39) == "limited"
    assert band_for_score(40) == "partial"
    assert band_for_score(59) == "partial"
    assert band_for_score(60) == "good"
    assert band_for_score(79) == "good"
    assert band_for_score(80) == "strong"
    assert band_for_score(100) == "strong"
    assert band_for_score(0) == "limited"


def test_title_partial_is_gap_not_matched():
    fit = compute(
        preferred_job_title="Senior Data Analyst",
        job_title="Data Engineer",
        preferred_location="",
        preferred_employment_type="",
        resume_keywords=set(),
        requirement_keywords=set(),
    )
    # "data" overlaps; jaccard = 1/4 = 0.25 -> a gap, not a match.
    assert engine.REASON_TITLE_RELATED in fit.gaps
    assert not fit.matched


def test_location_containment_matches():
    fit = compute(
        preferred_job_title="",
        preferred_location="Kuala Lumpur",
        job_location="Kuala Lumpur, Malaysia",
        preferred_employment_type="",
        resume_keywords=set(),
        requirement_keywords=set(),
    )
    assert fit.score == 100
    assert engine.REASON_LOCATION_MATCH in fit.matched


def test_structured_reasons_are_known_codes():
    # Every emitted reason is a stable code drawn from the enumerated sets, never
    # prose. This is what lets the frontend code-map to localized text (spec §17).
    fit = compute(**_full_inputs(job_location="Penang"))
    for code in fit.matched:
        assert code in engine.MATCHED_CODES
    for code in fit.gaps:
        assert code in engine.GAP_CODES
    for code in fit.unknown:
        assert code in engine.UNKNOWN_CODES
    # Codes are stable snake_case identifiers (no spaces, lowercased).
    for code in (*fit.matched, *fit.gaps, *fit.unknown):
        assert code == code.lower()
        assert " " not in code


def test_reason_code_sets_are_disjoint():
    assert not (engine.MATCHED_CODES & engine.GAP_CODES)
    assert not (engine.MATCHED_CODES & engine.UNKNOWN_CODES)
    assert not (engine.GAP_CODES & engine.UNKNOWN_CODES)
    assert engine.ALL_REASON_CODES == (
        engine.MATCHED_CODES | engine.GAP_CODES | engine.UNKNOWN_CODES
    )


def test_tokenize_text_filters_stopwords_and_short_tokens():
    tokens = engine.tokenize_text("We have strong SQL and Python experience")
    assert "sql" in tokens
    assert "python" in tokens
    assert "we" not in tokens
    assert "and" not in tokens
    assert "experience" not in tokens
