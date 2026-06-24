"""Company-review serializers (product scope addition).

Explicit fields only (never ``__all__``). The reviewer's email is captured on
the public CREATE path but is NEVER a read field on any public serializer, so it
can never leak through the public API — admins read it via the dedicated admin
serializer instead.

Surfaces:

* :class:`PublicReviewSerializer` — public read of one review + its reply (no
  email).
* :class:`PublicReviewCreateSerializer` — validate the public intake payload
  (name/email/rating required; title/body optional with length caps).
* :class:`EmployerReplyInputSerializer` — the employer's reply body.
* :class:`EmployerReplySerializer` — read of one reply.
"""

from __future__ import annotations

from rest_framework import serializers

from apps.reviews.models import CompanyReview, EmployerReply

# Length caps for the optional free-text fields (model maxes for title; a
# generous body cap so the textarea cannot be used as an unbounded sink).
TITLE_MAX = 150
BODY_MAX = 2000


class EmployerReplySerializer(serializers.ModelSerializer):
    """Public/employer read of a single reply (no author identity exposed)."""

    class Meta:
        model = EmployerReply
        fields = ["body", "created_at", "updated_at"]
        read_only_fields = fields


class PublicReviewSerializer(serializers.ModelSerializer):
    """Public read of one review and its optional reply. NEVER exposes email."""

    reply = serializers.SerializerMethodField()

    class Meta:
        model = CompanyReview
        fields = ["id", "reviewer_name", "rating", "title", "body", "created_at", "reply"]
        read_only_fields = fields

    def get_reply(self, obj: CompanyReview) -> dict | None:
        reply = getattr(obj, "reply", None)
        if reply is None:
            return None
        return {"body": reply.body, "created_at": reply.created_at}


class PublicReviewCreateSerializer(serializers.Serializer):
    """Validate the public review intake (the service performs the write)."""

    reviewer_name = serializers.CharField(max_length=120)
    reviewer_email = serializers.EmailField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    title = serializers.CharField(
        max_length=TITLE_MAX, required=False, allow_blank=True, default=""
    )
    body = serializers.CharField(max_length=BODY_MAX, required=False, allow_blank=True, default="")


class EmployerReplyInputSerializer(serializers.Serializer):
    """Validate the employer reply body."""

    body = serializers.CharField(max_length=BODY_MAX)
