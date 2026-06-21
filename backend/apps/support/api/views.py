"""Support-request API (spec §14.5, §15.7, §21.3, §22.2).

Three surfaces:

* :class:`SupportRequestCreateView` — public intake (``AllowAny``: guests AND
  candidates), throttled with the ``support`` scope. Accepts an optional
  multipart ``file`` attachment, validated like a resume and stored privately by
  the support service. The authenticated requester is linked automatically.
* :class:`CandidateSupportRequestListView` — a candidate lists their OWN
  requests (``IsCandidate``, scoped to ``request.user``).
* :class:`SupportAttachmentDownloadView` — the ONLY retrieval path for an
  attachment's bytes. It is permission-checked (the owning candidate OR an
  administrator) and streams via ``FileResponse``; the FileField's ``.url`` is
  never exposed, so the attachment has no public URL (ADR-0001 §5).
"""

from __future__ import annotations

from pathlib import PurePosixPath

from django.http import FileResponse
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsActiveAccount, IsCandidate
from apps.audit.services import record_action
from apps.support.models import SupportRequest
from apps.support.serializers import (
    SupportRequestCreateSerializer,
    SupportRequestSerializer,
)
from apps.support.services import support_service


class SupportRequestCreateView(APIView):
    """POST /api/v1/support-requests/ — public career-support intake."""

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]
    throttle_scope = "support"

    def post(self, request: Request) -> Response:
        serializer = SupportRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Link the requester only when authenticated; guests stay anonymous.
        user = request.user if request.user.is_authenticated else None

        support_request = support_service.create_support_request(
            user=user,
            job=data.get("job"),
            name=data["name"],
            email=data["email"],
            phone=data.get("phone", ""),
            category=data["category"],
            message=data["message"],
            attachment=request.FILES.get("file"),
        )
        return Response(
            SupportRequestSerializer(support_request).data,
            status=status.HTTP_201_CREATED,
        )


class CandidateSupportRequestListView(APIView):
    """GET /api/v1/candidate/support-requests/ — the candidate's OWN requests."""

    permission_classes = [IsCandidate]

    def get(self, request: Request) -> Response:
        requests = (
            SupportRequest.objects.filter(user=request.user)
            .select_related("job")
            .order_by("-created_at")
        )
        return Response(SupportRequestSerializer(requests, many=True).data)


class SupportAttachmentDownloadView(APIView):
    """GET an attachment's bytes — owner candidate or administrator only.

    The attachment is private personal data (ADR-0001 §5): there is no public
    URL. Access is authorised here — the request's owner (``user``) or any
    administrator — then the bytes are streamed through the storage backend.
    A non-owner / non-admin, or a request with no attachment, gets 404 so the
    endpoint never confirms an attachment exists to an unauthorised caller.
    """

    permission_classes = [IsActiveAccount]

    def get(self, request: Request, pk: str) -> Response | FileResponse:
        support_request = SupportRequest.objects.filter(pk=pk).first()
        not_found = Response(
            {"code": "not_found", "message": "The requested resource was not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
        if support_request is None or not support_request.resume_file:
            return not_found

        is_owner = (
            support_request.user_id is not None and support_request.user_id == request.user.id
        )
        if not (is_owner or request.user.is_administrator):
            # Do not leak existence to an unauthorised caller.
            return not_found

        record_action(
            actor=request.user,
            action="support.attachment_downloaded",
            target=support_request,
            metadata={"owner": is_owner},
        )

        ext = PurePosixPath(support_request.resume_file.name).suffix.lower()
        content_type = {
            ".pdf": "application/pdf",
            ".docx": ("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        }.get(ext, "application/octet-stream")
        filename = support_request.resume_original_name or f"attachment{ext}"
        return FileResponse(
            support_request.resume_file.open("rb"),
            content_type=content_type,
            as_attachment=True,
            filename=filename,
        )
