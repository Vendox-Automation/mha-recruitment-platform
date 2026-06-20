"""Django admin approval workflow for employer profiles (spec §9.5, §14.13).

This is the MVP internal admin interface for employer approvals. Every approval
transition is routed through ``apps.employers.services.approval_service`` rather
than mutating fields directly, so the status sync, audit entry, and transactional
email always fire together — there is no admin path that changes approval state
without an audit trail.

Approve / Suspend / Restore are bulk list actions (no reason needed). Reject
requires a non-sensitive, employer-facing reason, so it is exposed as a per-row
change-view button that opens an intermediate confirmation form capturing the
reason. Audit-relevant fields are read-only in the change form.
"""

from __future__ import annotations

from django import forms
from django.contrib import admin, messages
from django.http import HttpRequest, HttpResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404, render
from django.urls import path, reverse
from django.utils.translation import gettext_lazy as _

from apps.employers.models import EmployerProfile
from apps.employers.services import approval_service
from apps.employers.services.approval_service import IllegalTransition


class RejectForm(forms.Form):
    reason = forms.CharField(
        label=_("Rejection reason (shown to the employer)"),
        widget=forms.Textarea(attrs={"rows": 4}),
        required=True,
    )


@admin.register(EmployerProfile)
class EmployerProfileAdmin(admin.ModelAdmin):
    list_display = [
        "company_name",
        "user",
        "approval_status",
        "contact_person",
        "approved_by",
        "approved_at",
        "suspended_at",
        "created_at",
    ]
    list_filter = ["approval_status", "industry"]
    search_fields = ["company_name", "user__email", "contact_person"]
    readonly_fields = [
        "id",
        "created_at",
        "updated_at",
        "approval_status",
        "approval_reason",
        "approved_by",
        "approved_at",
        "suspended_at",
    ]
    raw_id_fields = ["user"]
    actions = ["approve_selected", "suspend_selected", "restore_selected"]

    # --- Bulk actions (no reason required) ---------------------------------

    @admin.action(description=_("Approve selected employers"))
    def approve_selected(self, request: HttpRequest, queryset) -> None:
        self._run_bulk(request, queryset, approval_service.approve_employer, "approved")

    @admin.action(description=_("Suspend selected employers"))
    def suspend_selected(self, request: HttpRequest, queryset) -> None:
        self._run_bulk(request, queryset, approval_service.suspend_employer, "suspended")

    @admin.action(description=_("Restore selected employers"))
    def restore_selected(self, request: HttpRequest, queryset) -> None:
        self._run_bulk(request, queryset, approval_service.restore_employer, "restored")

    def _run_bulk(self, request: HttpRequest, queryset, fn, verb: str) -> None:
        ok = 0
        for profile in queryset:
            try:
                fn(profile, actor=request.user)
                ok += 1
            except IllegalTransition as exc:
                self.message_user(
                    request,
                    _("%(company)s: %(error)s")
                    % {"company": profile.company_name, "error": str(exc)},
                    level=messages.WARNING,
                )
        if ok:
            self.message_user(
                request,
                _("%(count)d employer(s) %(verb)s.") % {"count": ok, "verb": verb},
                level=messages.SUCCESS,
            )

    # --- Per-row reject (reason required) ---------------------------------

    def change_view(self, request, object_id, form_url="", extra_context=None):
        extra_context = extra_context or {}
        profile = self.get_object(request, object_id)
        extra_context["show_reject_button"] = (
            profile is not None
            and profile.approval_status == EmployerProfile.ApprovalStatus.PENDING
        )
        return super().change_view(request, object_id, form_url, extra_context)

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                "<path:object_id>/reject/",
                self.admin_site.admin_view(self.reject_view),
                name="employers_employerprofile_reject",
            ),
        ]
        return custom + urls

    def reject_view(self, request: HttpRequest, object_id: str) -> HttpResponse:
        profile = get_object_or_404(EmployerProfile, pk=object_id)
        changelist = reverse("admin:employers_employerprofile_changelist")

        if request.method == "POST":
            form = RejectForm(request.POST)
            if form.is_valid():
                try:
                    approval_service.reject_employer(
                        profile, actor=request.user, reason=form.cleaned_data["reason"]
                    )
                    self.message_user(
                        request,
                        _("%(company)s was rejected.") % {"company": profile.company_name},
                        level=messages.SUCCESS,
                    )
                    return HttpResponseRedirect(changelist)
                except IllegalTransition as exc:
                    form.add_error(None, str(exc))
        else:
            form = RejectForm()

        context = {
            **self.admin_site.each_context(request),
            "title": _("Reject employer: %(company)s") % {"company": profile.company_name},
            "form": form,
            "object": profile,
            "opts": self.model._meta,
        }
        return render(request, "admin/employers/reject_employer.html", context)
