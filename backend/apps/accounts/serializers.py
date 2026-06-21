"""Auth serializers (spec §21.1).

Serializers stay thin: they validate and shape data. Multi-record creation lives
in ``services/`` and session login lives in the views. Explicit fields only — no
``__all__`` (spec §22.1). Passwords are never serialized out.
"""

from __future__ import annotations

from typing import Any

from django.contrib.auth import authenticate, password_validation
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers

from apps.accounts.models import User
from apps.accounts.tokens import email_verification_token_generator


def _validate_password_strength(value: str, user: User | None = None) -> str:
    """Run Django's configured password validators, raising DRF errors."""
    try:
        password_validation.validate_password(value, user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(list(exc.messages)) from exc
    return value


def _validate_unique_email(value: str) -> str:
    """Case-insensitive uniqueness check (ADR-0001 §6.1.7)."""
    normalised = value.strip().lower()
    if User.objects.filter(email__iexact=normalised).exists():
        raise serializers.ValidationError("An account with this email already exists.")
    return normalised


# --- Registration ----------------------------------------------------------


class CandidateRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    full_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=40)
    preferred_job_title = serializers.CharField(max_length=150)
    preferred_location = serializers.CharField(
        max_length=150, required=False, allow_blank=True, default=""
    )
    preferred_employment_type = serializers.CharField(
        max_length=50, required=False, allow_blank=True, default=""
    )
    preferred_locale = serializers.ChoiceField(choices=User.Locale.choices, required=False)

    def validate_email(self, value: str) -> str:
        return _validate_unique_email(value)

    def validate_password(self, value: str) -> str:
        return _validate_password_strength(value)


class EmployerRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    company_name = serializers.CharField(max_length=200)
    contact_person = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=40)
    preferred_locale = serializers.ChoiceField(choices=User.Locale.choices, required=False)

    def validate_email(self, value: str) -> str:
        return _validate_unique_email(value)

    def validate_password(self, value: str) -> str:
        return _validate_password_strength(value)


# --- Login -----------------------------------------------------------------


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        request = self.context.get("request")
        email = attrs["email"].strip().lower()
        user = authenticate(request=request, username=email, password=attrs["password"])
        if user is None:
            raise serializers.ValidationError("Invalid email or password.")
        # DEACTIVATED accounts cannot sign in; SUSPENDED/PENDING may (restricted).
        if user.status == User.Status.DEACTIVATED:
            raise serializers.ValidationError("This account has been deactivated.")
        attrs["user"] = user
        return attrs


# --- Me payload + updates --------------------------------------------------


class MeSerializer(serializers.ModelSerializer):
    """Single source of session/role/status truth for the frontend."""

    is_email_verified = serializers.BooleanField(read_only=True)
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "role",
            "status",
            "preferred_locale",
            "is_email_verified",
            "profile",
        ]
        read_only_fields = fields

    def get_profile(self, user: User) -> dict[str, Any] | None:
        if user.is_candidate:
            profile = getattr(user, "candidate_profile", None)
            if profile is None:
                return None
            return {
                "full_name": profile.full_name,
                "has_resume": profile.has_resume,
                "profile_completion": profile.profile_completion,
            }
        if user.is_employer:
            profile = getattr(user, "employer_profile", None)
            if profile is None:
                return None
            return {
                "company_name": profile.company_name,
                "approval_status": profile.approval_status,
            }
        return None


class MeUpdateSerializer(serializers.Serializer):
    """Explicit safe account fields only (spec §22.1).

    Account-level locale plus a small subset of the role profile. Sensitive
    fields (role, status, approval) are never updatable here.
    """

    preferred_locale = serializers.ChoiceField(choices=User.Locale.choices, required=False)

    # Candidate basic profile subset.
    full_name = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=40, required=False)
    preferred_job_title = serializers.CharField(max_length=150, required=False)
    preferred_location = serializers.CharField(max_length=150, required=False, allow_blank=True)
    preferred_employment_type = serializers.CharField(
        max_length=50, required=False, allow_blank=True
    )

    # Employer basic profile subset.
    company_name = serializers.CharField(max_length=200, required=False)
    contact_person = serializers.CharField(max_length=150, required=False)

    _CANDIDATE_FIELDS = (
        "full_name",
        "phone",
        "preferred_job_title",
        "preferred_location",
        "preferred_employment_type",
    )
    _EMPLOYER_FIELDS = ("company_name", "contact_person", "phone")

    def update(self, instance: User, validated_data: dict[str, Any]) -> User:
        if "preferred_locale" in validated_data:
            instance.preferred_locale = validated_data["preferred_locale"]
            instance.save(update_fields=["preferred_locale", "updated_at"])

        if instance.is_candidate:
            profile = getattr(instance, "candidate_profile", None)
            if profile is not None:
                self._apply(profile, validated_data, self._CANDIDATE_FIELDS)
        elif instance.is_employer:
            profile = getattr(instance, "employer_profile", None)
            if profile is not None:
                self._apply(profile, validated_data, self._EMPLOYER_FIELDS)
        return instance

    @staticmethod
    def _apply(profile: Any, data: dict[str, Any], allowed: tuple[str, ...]) -> None:
        changed = []
        for field in allowed:
            if field in data:
                setattr(profile, field, data[field])
                changed.append(field)
        if changed:
            profile.save(update_fields=[*changed, "updated_at"])


# --- Password reset --------------------------------------------------------


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class _UidTokenSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()

    token_generator = default_token_generator

    def _resolve_user(self, uid: str) -> User | None:
        try:
            pk = force_str(urlsafe_base64_decode(uid))
            return User.objects.get(pk=pk)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return None


class PasswordResetConfirmSerializer(_UidTokenSerializer):
    new_password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        user = self._resolve_user(attrs["uid"])
        if user is None or not self.token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError(
                {"token": ["This reset link is invalid or has expired."]}
            )
        try:
            password_validation.validate_password(attrs["new_password"], user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)}) from exc
        attrs["user"] = user
        return attrs


class EmailVerificationConfirmSerializer(_UidTokenSerializer):
    token_generator = email_verification_token_generator

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        user = self._resolve_user(attrs["uid"])
        if user is None or not self.token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError(
                {"token": ["This verification link is invalid or has expired."]}
            )
        attrs["user"] = user
        return attrs
