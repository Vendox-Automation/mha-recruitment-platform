"""Serializers for the candidate-facing Job Fit output (spec §16.4, §16.6).

Explicit fields only (ADR-0001 §7, no ``__all__``) so no internal field leaks. The
disclaimer (spec §16.6) is attached by the view, not stored on the row, so it is
always present and cannot drift out of sync with a stale record.
"""

from __future__ import annotations

from rest_framework import serializers

from apps.matching.models import JobFitResult


class JobFitResultSerializer(serializers.ModelSerializer):
    """Candidate-facing view of a :class:`JobFitResult`."""

    matched = serializers.ListField(source="matched_json", child=serializers.CharField())
    gaps = serializers.ListField(source="gaps_json", child=serializers.CharField())
    unknown = serializers.ListField(source="unknown_json", child=serializers.CharField())

    class Meta:
        model = JobFitResult
        fields = [
            "score",
            "band",
            "matched",
            "gaps",
            "unknown",
            "explanation",
            "ai_enabled",
            "ai_provider",
            "ai_model",
            "rule_version",
            "generated_at",
        ]
        read_only_fields = fields

    explanation = serializers.CharField(source="ai_explanation", read_only=True)
