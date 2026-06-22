"""Job and company serializers (spec §21.4, §21.7, §22.1).

Explicit fields only (never ``__all__``) so server-authoritative state — slug,
status, ``employer``, ``created_by``, ``source_type``, ``is_mha_supported``,
``moderation_reason``, timestamps — is never client-settable on the employer
write path. Lifecycle transitions happen through the lifecycle service, not by
PATCHing ``status``.

Three audiences:
  * Employer (owner) read/write — full editable detail + nested screening Qs.
  * Public job — only safe presentation fields, plus a company summary.
  * Public company — approved employer profile + active job count.
"""

from __future__ import annotations

from rest_framework import serializers

from apps.employers.models import EmployerProfile
from apps.jobs.models import Job, ScreeningQuestion

# Fields an employer may set/edit on their own job. Server-owned fields are
# excluded entirely so a malicious payload cannot self-publish or self-support.
EDITABLE_JOB_FIELDS = [
    "title",
    "location",
    "employment_type",
    "salary_min",
    "salary_max",
    "salary_currency",
    "salary_period",
    "salary_disclosed",
    "description",
    "requirements",
    "application_deadline",
    "listing_language",
]


# --- Screening questions ---------------------------------------------------


class ScreeningQuestionSerializer(serializers.ModelSerializer):
    """Read/write a screening question (nested under a job)."""

    class Meta:
        model = ScreeningQuestion
        fields = [
            "id",
            "question",
            "question_type",
            "is_required",
            "options_json",
            "display_order",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        q_type = attrs.get("question_type")
        options = attrs.get("options_json", [])
        if q_type == ScreeningQuestion.QuestionType.SINGLE_CHOICE:
            if not isinstance(options, list) or len(options) < 2:
                raise serializers.ValidationError(
                    {"options_json": "Single-choice questions need at least two options."}
                )
        elif options:
            # Options are only meaningful for single-choice; drop otherwise.
            attrs["options_json"] = []
        return attrs


class ScreeningQuestionPreviewSerializer(serializers.ModelSerializer):
    """Public preview of a screening question (no answers, ordered)."""

    class Meta:
        model = ScreeningQuestion
        fields = ["id", "question", "question_type", "is_required", "options_json", "display_order"]


# --- Employer (owner) job serializers --------------------------------------


class EmployerJobSerializer(serializers.ModelSerializer):
    """Full owner-facing read/write serializer with nested screening questions.

    The nested ``screening_questions`` are writable: on create/update the
    provided list fully replaces the job's questions (a focused, predictable
    contract — partial question patching is out of MVP scope).
    """

    screening_questions = ScreeningQuestionSerializer(many=True, required=False)

    class Meta:
        model = Job
        fields = [
            "id",
            "slug",
            "source_type",
            "status",
            "is_mha_supported",
            "moderation_reason",
            "published_at",
            "closed_at",
            "created_at",
            "updated_at",
            "screening_questions",
            *EDITABLE_JOB_FIELDS,
        ]
        read_only_fields = [
            "id",
            "slug",
            "source_type",
            "status",
            "is_mha_supported",
            "moderation_reason",
            "published_at",
            "closed_at",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        # Resolve effective bounds against the instance for partial updates.
        salary_min = attrs.get("salary_min", getattr(self.instance, "salary_min", None))
        salary_max = attrs.get("salary_max", getattr(self.instance, "salary_max", None))
        if salary_min is not None and salary_max is not None and salary_min > salary_max:
            raise serializers.ValidationError(
                {"salary_min": "Minimum salary cannot exceed maximum salary."}
            )
        return attrs

    def create(self, validated_data):
        questions = validated_data.pop("screening_questions", [])
        job = Job.objects.create(**validated_data)
        self._sync_questions(job, questions)
        return job

    def update(self, instance, validated_data):
        questions = validated_data.pop("screening_questions", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if questions is not None:
            self._sync_questions(instance, questions)
        return instance

    @staticmethod
    def _sync_questions(job: Job, questions: list[dict]) -> None:
        """Replace the job's screening questions with the provided list."""
        job.screening_questions.all().delete()
        for index, data in enumerate(questions):
            data.setdefault("display_order", index)
            ScreeningQuestion.objects.create(job=job, **data)


# --- Public job serializers ------------------------------------------------


class PublicCompanySummarySerializer(serializers.ModelSerializer):
    """Compact company block embedded in a public job."""

    class Meta:
        model = EmployerProfile
        fields = ["slug", "company_name", "logo", "industry", "company_location"]


class PublicJobListSerializer(serializers.ModelSerializer):
    """Public job-search result row (safe fields only)."""

    company = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            "slug",
            "title",
            "location",
            "employment_type",
            "salary_min",
            "salary_max",
            "salary_currency",
            "salary_period",
            "salary_disclosed",
            "listing_language",
            "is_mha_supported",
            "published_at",
            "company",
        ]

    def get_company(self, obj: Job):
        if obj.employer_id is None:
            return None
        return PublicCompanySummarySerializer(obj.employer, context=self.context).data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Never expose figures the employer chose not to disclose.
        if not instance.salary_disclosed:
            data["salary_min"] = None
            data["salary_max"] = None
        return data


class PublicJobDetailSerializer(PublicJobListSerializer):
    """Public job detail: list fields + body + screening previews."""

    screening_questions = ScreeningQuestionPreviewSerializer(many=True, read_only=True)

    class Meta(PublicJobListSerializer.Meta):
        fields = [
            *PublicJobListSerializer.Meta.fields,
            "description",
            "requirements",
            "application_deadline",
            "source_type",
            "screening_questions",
        ]


# --- Public company serializers --------------------------------------------


class PublicCompanyListSerializer(serializers.ModelSerializer):
    """Approved-company directory row.

    ``average_rating`` / ``review_count`` are read from queryset annotations
    (``review_avg`` / ``review_count_anno``) added by the company-list selector
    so the directory never N+1s across companies. ``average_rating`` is rounded
    to 1 dp and is ``None`` when the company has no reviews.
    """

    active_job_count = serializers.IntegerField(read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = EmployerProfile
        fields = [
            "slug",
            "company_name",
            "logo",
            "company_summary",
            "industry",
            "company_location",
            "active_job_count",
            "average_rating",
            "review_count",
        ]

    def get_average_rating(self, obj: EmployerProfile) -> float | None:
        avg = getattr(obj, "review_avg", None)
        return round(avg, 1) if avg is not None else None

    def get_review_count(self, obj: EmployerProfile) -> int:
        return getattr(obj, "review_count_anno", 0) or 0


class PublicCompanyDetailSerializer(serializers.ModelSerializer):
    """Approved-company detail with culture/benefits and active public jobs.

    The review aggregate (``average_rating``, ``review_count``,
    ``rating_distribution``) is computed once per company via
    ``apps.reviews.services.aggregate_for`` — a single annotated query — since
    the detail view serialises exactly one company.
    """

    active_jobs = serializers.SerializerMethodField()
    is_approved = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    rating_distribution = serializers.SerializerMethodField()

    class Meta:
        model = EmployerProfile
        fields = [
            "slug",
            "company_name",
            "logo",
            "company_summary",
            "website",
            "industry",
            "company_size",
            "company_location",
            "culture_text",
            "benefits_text",
            "is_approved",
            "active_jobs",
            "average_rating",
            "review_count",
            "rating_distribution",
        ]

    def _aggregate(self, obj: EmployerProfile) -> dict:
        # Compute once and cache on the serializer instance per object so the
        # three methods share a single query.
        from apps.reviews.services import aggregate_for

        cache = self.__dict__.setdefault("_review_aggregates", {})
        if obj.pk not in cache:
            cache[obj.pk] = aggregate_for(obj)
        return cache[obj.pk]

    def get_is_approved(self, obj: EmployerProfile) -> bool:
        return obj.is_approved

    def get_active_jobs(self, obj: EmployerProfile):
        jobs = Job.objects.public().filter(employer=obj)
        return PublicJobListSerializer(jobs, many=True, context=self.context).data

    def get_average_rating(self, obj: EmployerProfile) -> float | None:
        return self._aggregate(obj)["average_rating"]

    def get_review_count(self, obj: EmployerProfile) -> int:
        return self._aggregate(obj)["review_count"]

    def get_rating_distribution(self, obj: EmployerProfile) -> dict:
        return self._aggregate(obj)["rating_distribution"]
