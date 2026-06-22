"""Company-review models (product scope addition).

Reviews are PUBLIC user-generated content: anyone (no account required) can post
a review of an approved company with a name + email, and reviews publish
immediately (no approval queue — moderation is reactive, via admin deletion).

Two privacy/identity facts shape the schema:

* ``reviewer_email`` is captured for moderation/contact but is NEVER exposed on
  the public API. It is serialised only on the administrator surface.
* A review carries a free-text ``reviewer_name`` and ``reviewer_email`` rather
  than a ``User`` FK, because the author is typically an anonymous member of the
  public, not a platform account.

``EmployerReply`` is the single, optional reply an approved employer may leave on
a review of THEIR OWN company (enforced in the API by queryset scoping, not the
model). It is a one-to-one with the review so there is at most one reply.
"""

from __future__ import annotations

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class CompanyReview(models.Model):
    """A public review of an approved company (UGC, published immediately)."""

    employer = models.ForeignKey(
        "employers.EmployerProfile",
        on_delete=models.CASCADE,
        related_name="reviews",
    )

    # Public author identity. The name is shown publicly; the email is captured
    # for moderation/contact only and is NEVER exposed on the public API.
    reviewer_name = models.CharField(_("reviewer name"), max_length=120)
    reviewer_email = models.EmailField(_("reviewer email"))

    rating = models.PositiveSmallIntegerField(
        _("rating"),
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    title = models.CharField(_("title"), max_length=150, blank=True, default="")
    body = models.TextField(_("body"), blank=True, default="")

    created_at = models.DateTimeField(_("created at"), auto_now_add=True)

    class Meta:
        verbose_name = _("company review")
        verbose_name_plural = _("company reviews")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["employer", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.rating}★ for {self.employer_id} by {self.reviewer_name}"


class EmployerReply(models.Model):
    """The single employer reply to a review (one reply per review)."""

    review = models.OneToOneField(
        CompanyReview,
        on_delete=models.CASCADE,
        related_name="reply",
    )
    # The replying user; SET_NULL keeps the reply intact if the account is later
    # removed. The reply belongs to the review's company, not to this user.
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="review_replies",
    )
    body = models.TextField(_("body"))

    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("employer reply")
        verbose_name_plural = _("employer replies")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Reply to review {self.review_id}"
