"""Support-request serializers (spec §21.3, §22.1).

Explicit fields only (no ``__all__``). Two surfaces:

* :class:`SupportRequestCreateSerializer` — public intake. Validates the
  client-supplied contact/category/message fields and an optional ``job`` slug.
  The attachment itself is NOT a serializer field: it is validated and stored by
  the support service (which reuses the resume engine), keeping byte handling out
  of the serializer.
* :class:`SupportRequestSerializer` — candidate-facing read of their own
  requests. It exposes attachment display metadata only (``has_attachment``,
  ``resume_original_name``) and NEVER a file URL/path. Staff-only fields
  (``assigned_to``) are omitted.
"""

from __future__ import annotations

from rest_framework import serializers

from apps.jobs.models import Job
from apps.support.models import SupportCategory, SupportRequest


class SupportRequestCreateSerializer(serializers.Serializer):
    """Validate the intake payload (the attachment is handled by the service)."""

    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    category = serializers.ChoiceField(choices=SupportCategory.choices)
    message = serializers.CharField(max_length=5000)
    # Optional job context, referenced by its non-enumerable public slug.
    job = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")

    def validate_job(self, value: str) -> Job | None:
        """Resolve an optional job slug to a PUBLIC job (or None).

        Only public jobs are linkable, so a draft/suspended job's existence is
        never confirmed via the support form. An unknown slug is treated as "no
        job context" rather than an error so the form stays forgiving.
        """
        ref = (value or "").strip()
        if not ref:
            return None
        return Job.objects.public().filter(slug=ref).first()


class SupportRequestSerializer(serializers.ModelSerializer):
    """Candidate-facing read of their OWN support requests (no staff fields)."""

    has_attachment = serializers.BooleanField(read_only=True)
    job_title = serializers.SerializerMethodField()

    class Meta:
        model = SupportRequest
        fields = [
            "id",
            "category",
            "message",
            "status",
            "has_attachment",
            "resume_original_name",
            "job_title",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_job_title(self, obj: SupportRequest) -> str | None:
        return obj.job.title if obj.job_id else None
