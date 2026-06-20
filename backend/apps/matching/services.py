"""Smart Job Fit orchestration service (spec §16, §20.11; ADR-0001 §9.3).

:func:`compute_job_fit` is the single candidate-facing entry point that ties the
pure pieces together:

  1. gather the candidate's stated preferences,
  2. extract the resume keyword set (cached on the profile when freshly derived),
  3. extract the job's requirement keyword set,
  4. run the deterministic rule engine (:mod:`apps.matching.engine`),
  5. phrase the result (real AI provider if enabled, else deterministic fallback —
     :mod:`apps.matching.ai`), keeping the engine's numeric score untouched,
  6. upsert the single current :class:`JobFitResult` for the (candidate, job) pair.

It is synchronous and runs inside a transaction (ADR-0001 §9.3): the model's
``generated_at`` is shaped so a future async worker can slot in without a schema
change. This is candidate-facing ONLY — there is no employer ranking or
sensitive-trait inference anywhere in this path (AGENTS §9, spec §16.1).
"""

from __future__ import annotations

from pathlib import PurePosixPath

from django.db import transaction

from apps.candidates.models import CandidateProfile
from apps.jobs.models import Job
from apps.matching import ai, engine, resume_keywords
from apps.matching.models import JobFitResult


def _resume_keyword_set(candidate: CandidateProfile) -> set[str]:
    """Return the candidate's resume keyword set, deriving it when needed.

    Prefers a previously-cached set on ``resume_extracted_keywords_json``; when the
    cache is empty but a resume file exists, extracts keywords from the stored
    bytes (via the storage API, never a raw path) and caches them. On any failure
    returns an empty set so the overlap factor degrades to an honest ``unknown``.
    """
    cached = candidate.resume_extracted_keywords_json or []
    if cached:
        return {str(k) for k in cached}

    if not candidate.resume_file:
        return set()

    ext = PurePosixPath(candidate.resume_file.name).suffix
    try:
        with candidate.resume_file.open("rb") as fh:
            data = fh.read()
    except Exception:
        return set()

    keywords = resume_keywords.extract_keywords(data, ext)
    if keywords:
        # Cache the derived set (only the keyword set, never raw text) so repeat
        # scoring avoids re-reading the file. Best-effort; ignore write races.
        candidate.resume_extracted_keywords_json = sorted(keywords)
        candidate.save(update_fields=["resume_extracted_keywords_json", "updated_at"])
    return keywords


@transaction.atomic
def compute_job_fit(candidate: CandidateProfile, job: Job) -> JobFitResult:
    """Compute, phrase, and upsert the current Job Fit for a (candidate, job).

    Returns the persisted :class:`JobFitResult`. Always recomputes from current
    data and overwrites the single existing row for the pair (one current result,
    spec §20.11). The AI layer only phrases the explanation; the engine's numeric
    score/band are stored verbatim and never altered by AI (spec §16.5).
    """
    resume_kw = _resume_keyword_set(candidate)
    requirement_kw = engine.tokenize_text(job.requirements or "")

    fit = engine.compute(
        preferred_job_title=candidate.preferred_job_title or "",
        preferred_location=candidate.preferred_location or "",
        preferred_employment_type=candidate.preferred_employment_type or "",
        job_title=job.title or "",
        job_location=job.location or "",
        job_employment_type=job.employment_type or "",
        resume_keywords=resume_kw,
        requirement_keywords=requirement_kw,
    )

    provider, ai_enabled = ai.get_provider()
    try:
        explanation = provider.generate_explanation(
            locale="en",
            score=fit.score,
            band=fit.band,
            matched=fit.matched,
            gaps=fit.gaps,
            unknown=fit.unknown,
        )
    except Exception:
        # Any provider failure → deterministic fallback (spec §16.5). The score is
        # already fixed by the engine, so a failed AI call never affects it.
        explanation = ai.FallbackProvider().generate_explanation(
            locale="en",
            score=fit.score,
            band=fit.band,
            matched=fit.matched,
            gaps=fit.gaps,
            unknown=fit.unknown,
        )
        provider, ai_enabled = ai.FallbackProvider(), False

    result, _created = JobFitResult.objects.update_or_create(
        candidate=candidate,
        job=job,
        defaults={
            "score": fit.score,
            "band": fit.band,
            "matched_json": fit.matched,
            "gaps_json": fit.gaps,
            "unknown_json": fit.unknown,
            "rule_version": fit.rule_version,
            "ai_enabled": ai_enabled,
            "ai_provider": getattr(provider, "name", "") if ai_enabled else "",
            "ai_model": getattr(provider, "model", "") if ai_enabled else "",
            "ai_explanation": explanation,
        },
    )
    return result
