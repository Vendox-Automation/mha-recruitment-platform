"""Application submission workflow (spec §15.4).

Enforces: candidate has a resume, one application per job, and valid answers to
all required screening questions. Creates the application, an immutable private
resume snapshot, the screening answers, and the initial status-history entry —
all atomically — and records an audit event.
"""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from pathlib import PurePosixPath
from typing import Any

from django.core.files.base import ContentFile
from django.db import IntegrityError, transaction
from rest_framework import serializers

from apps.audit.services import record_action
from apps.jobs.models import ScreeningQuestion

from ..exceptions import DuplicateApplication
from ..models import Application, ApplicationAnswer, ApplicationStatus, ApplicationStatusHistory


def _coerce_answer(question: ScreeningQuestion, value: Any) -> tuple[str, dict]:
    """Validate one answer by question type; return (answer_text, answer_json)."""
    qtype = question.question_type
    if qtype == ScreeningQuestion.QuestionType.YES_NO:
        if isinstance(value, bool):
            flag = value
        elif isinstance(value, str) and value.strip().lower() in {"yes", "no", "true", "false"}:
            flag = value.strip().lower() in {"yes", "true"}
        else:
            raise serializers.ValidationError("Answer must be yes or no.")
        return ("Yes" if flag else "No", {"value": flag})
    if qtype == ScreeningQuestion.QuestionType.NUMBER:
        try:
            number = Decimal(str(value))
        except (InvalidOperation, TypeError):
            raise serializers.ValidationError("Answer must be a number.") from None
        # Store the number as a STRING in answer_json so large/precise values are
        # preserved losslessly (a JSON float would drift for big integers or many
        # decimal places). ``answer_text`` already carries the same canonical
        # string; both stay exact (Phase 6 review).
        return (str(number), {"value": str(number)})
    if qtype == ScreeningQuestion.QuestionType.SINGLE_CHOICE:
        options = question.options_json or []
        if value not in options:
            raise serializers.ValidationError("Answer must be one of the provided options.")
        return (str(value), {"value": value})
    # SHORT_TEXT / LONG_TEXT
    text = "" if value is None else str(value)
    return (text, {"value": text})


def _is_blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and value.strip() == "")


def validate_answers(
    job, answers_by_question: dict[str, Any]
) -> list[tuple[ScreeningQuestion, str, dict]]:
    """Validate the submitted answers against the job's screening questions.

    Required questions must be answered with a valid value; optional questions
    may be blank/omitted. Returns cleaned (question, text, json) rows. Raises a
    DRF ValidationError keyed by question id on any problem.
    """
    cleaned: list[tuple[ScreeningQuestion, str, dict]] = []
    errors: dict[str, list[str]] = {}
    for question in job.screening_questions.all():
        raw = answers_by_question.get(str(question.id))
        if _is_blank(raw):
            if question.is_required:
                errors[str(question.id)] = ["This question is required."]
            continue
        try:
            text, payload = _coerce_answer(question, raw)
        except serializers.ValidationError as exc:
            errors[str(question.id)] = list(exc.detail)
            continue
        cleaned.append((question, text, payload))
    if errors:
        raise serializers.ValidationError({"answers": errors})
    return cleaned


@transaction.atomic
def submit_application(*, candidate, job, cover_letter: str, answers_by_question: dict[str, Any]):
    """Create an application with an immutable resume snapshot and initial history."""
    if not candidate.resume_file:
        raise serializers.ValidationError({"resume": ["Upload a resume before applying."]})
    if Application.objects.filter(job=job, candidate=candidate).exists():
        raise DuplicateApplication()

    cleaned_answers = validate_answers(job, answers_by_question)

    # Copy the resume bytes into an immutable per-application snapshot so a later
    # resume replacement never alters this application (ADR-0001 §5.5).
    candidate.resume_file.open("rb")
    try:
        resume_bytes = candidate.resume_file.read()
    finally:
        candidate.resume_file.close()
    # Use the candidate's display name; if it is empty, fall back to a NEUTRAL
    # name (never the storage path, which embeds the candidate's internal user
    # UUID and would otherwise leak to the employer — security review rec 1).
    original_name = candidate.resume_original_name
    if not original_name:
        suffix = PurePosixPath(candidate.resume_file.name).suffix or ".pdf"
        original_name = f"resume{suffix}"

    application = Application(
        job=job,
        candidate=candidate,
        cover_letter=cover_letter or "",
        status=ApplicationStatus.APPLIED,
        resume_snapshot_name=original_name,
    )
    application.resume_file_snapshot.save(original_name, ContentFile(resume_bytes), save=False)
    try:
        application.save()
    except IntegrityError as exc:  # concurrent duplicate
        raise DuplicateApplication() from exc

    ApplicationAnswer.objects.bulk_create(
        [
            ApplicationAnswer(
                application=application,
                question=question,
                answer_text=text,
                answer_json=payload,
            )
            for question, text, payload in cleaned_answers
        ]
    )

    ApplicationStatusHistory.objects.create(
        application=application,
        from_status=None,
        to_status=ApplicationStatus.APPLIED,
        changed_by=candidate.user,
        change_note="",
    )

    record_action(
        actor=candidate.user,
        action="application.submitted",
        target=application,
        metadata={"job_id": str(job.id)},
    )
    return application
