"""Candidate-facing application serializers (spec §21.5).

Explicit fields only. ``employer_private_notes`` and the raw resume-snapshot
path/URL are NEVER serialised to candidates (spec §15.4, §22.1).
"""

from __future__ import annotations

from typing import Any

from rest_framework import serializers

from apps.accounts.models import User

from .models import Application, ApplicationAnswer, ApplicationStatusHistory


class ApplyInputSerializer(serializers.Serializer):
    cover_letter = serializers.CharField(required=False, allow_blank=True, default="")
    # Map of screening-question id -> submitted answer value.
    answers = serializers.JSONField(required=False, default=dict)

    def validate_answers(self, value: Any) -> dict:
        if not isinstance(value, dict):
            raise serializers.ValidationError("Answers must be an object keyed by question id.")
        return value


class _JobSummarySerializer(serializers.Serializer):
    title = serializers.CharField()
    slug = serializers.CharField()
    location = serializers.CharField()
    employment_type = serializers.CharField()
    company_name = serializers.SerializerMethodField()

    def get_company_name(self, job) -> str | None:
        return job.employer.company_name if job.employer_id else None


class _ScreeningQuestionMiniSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    question = serializers.CharField()
    question_type = serializers.CharField()


class ApplicationAnswerSerializer(serializers.ModelSerializer):
    question = _ScreeningQuestionMiniSerializer(read_only=True)

    class Meta:
        model = ApplicationAnswer
        fields = ["question", "answer_text", "answer_json"]


class StatusHistorySerializer(serializers.ModelSerializer):
    source = serializers.SerializerMethodField()

    class Meta:
        model = ApplicationStatusHistory
        fields = ["from_status", "to_status", "change_note", "created_at", "source"]

    def get_source(self, history) -> str:
        actor = history.changed_by
        if actor is None:
            return "platform"
        if actor.role == User.Role.EMPLOYER:
            return "employer"
        if actor.role == User.Role.CANDIDATE:
            return "candidate"
        return "platform"


class ApplicationListSerializer(serializers.ModelSerializer):
    job = _JobSummarySerializer(read_only=True)

    class Meta:
        model = Application
        fields = ["id", "job", "status", "submitted_at", "updated_at"]


class ApplicationDetailSerializer(serializers.ModelSerializer):
    job = _JobSummarySerializer(read_only=True)
    answers = ApplicationAnswerSerializer(many=True, read_only=True)
    status_history = StatusHistorySerializer(many=True, read_only=True)
    has_resume_snapshot = serializers.SerializerMethodField()

    class Meta:
        model = Application
        # NOTE: employer_private_notes and the snapshot file path are intentionally excluded.
        fields = [
            "id",
            "job",
            "status",
            "cover_letter",
            "answers",
            "status_history",
            "has_resume_snapshot",
            "resume_snapshot_name",
            "submitted_at",
            "updated_at",
        ]

    def get_has_resume_snapshot(self, application) -> bool:
        return bool(application.resume_file_snapshot)
