"""Provider-neutral Job Fit explanation layer (spec §16.5, §16.7, §22.3).

The numeric score and band are produced exclusively by the deterministic rule
engine. This module only turns the *already-computed* structured match facts into
short friendly candidate-facing prose. It is provider-neutral so AI can be enabled,
disabled, or swapped without touching core scoring (spec §22.3 — "AI explanation
can be disabled without losing core functionality").

Localisation note (spec §17): when AI is DISABLED (the MVP default) no prose is
generated here at all — the engine emits stable reason CODES and the frontend
builds the localized en / zh-CN wording from them. The deterministic copy below is
retained only so a future locale-aware provider has a reference and so the provider
contract stays exercised in tests; its English string is not persisted or rendered
in the MVP. A future real provider returns locale-aware prose for the requested
``locale`` and still must NOT change the score.

Hard rules enforced here:

* The provider receives ONLY the structured facts (locale, score, band, matched /
  gaps / unknown reason lists). It NEVER receives the full resume or raw resume
  text (spec §16.5). Privacy is enforced by the call shape: there is no parameter
  through which raw resume text could flow.
* The provider MUST NOT change the numeric score — it returns a string only; the
  caller (:mod:`apps.matching.services`) keeps the engine's score/band untouched.
* On ANY provider failure the caller falls back to deterministic copy
  (:class:`FallbackProvider`), so an outage never breaks the feature.

The factory returns a real provider only when ``AI_JOB_FIT_ENABLED`` is set AND a
provider is configured. No real provider key exists in the MVP, so in practice the
factory returns the deterministic fallback; the :class:`MockProvider` exists so the
tests can exercise the "enabled" path and prove the AI cannot move the score.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from django.conf import settings

# The required disclaimer, shown with every result (spec §16.6).
DISCLAIMER = (
    "Job Fit is guidance based on available information and does not guarantee "
    "an interview or employment outcome."
)

_BAND_HEADLINE = {
    "strong": "Strong match",
    "good": "Good potential match",
    "partial": "Partial match",
    "limited": "Limited match",
}


@runtime_checkable
class JobFitExplanationProvider(Protocol):
    """Provider contract (spec §16.7).

    Implementations rewrite the structured facts into one short friendly
    paragraph. They receive no resume text and return a plain string; they must
    not attempt to alter the score.
    """

    name: str
    model: str

    def generate_explanation(
        self,
        *,
        locale: str,
        score: int,
        band: str,
        matched: list[str],
        gaps: list[str],
        unknown: list[str],
    ) -> str: ...


def _deterministic_copy(
    *,
    score: int,
    band: str,
    matched: list[str],
    gaps: list[str],
    unknown: list[str],
) -> str:
    """Build friendly copy purely from the structured reasons (no AI call).

    Deterministic given the same facts, so it is stable and testable. Used both as
    the default explanation when AI is disabled and as the fallback when an AI
    provider fails.
    """
    headline = _BAND_HEADLINE.get(band, "Match")
    lines = [f"{headline} — {score}%."]
    if matched:
        lines.append("Strengths: " + "; ".join(matched) + ".")
    if gaps:
        lines.append("Possible gaps: " + "; ".join(gaps) + ".")
    if unknown:
        lines.append("Not enough information: " + "; ".join(unknown) + ".")
    return " ".join(lines)


class FallbackProvider:
    """Deterministic, no-AI explanation provider (spec §16.5 fallback)."""

    name = ""
    model = ""

    def generate_explanation(
        self,
        *,
        locale: str,
        score: int,
        band: str,
        matched: list[str],
        gaps: list[str],
        unknown: list[str],
    ) -> str:
        return _deterministic_copy(
            score=score, band=band, matched=matched, gaps=gaps, unknown=unknown
        )


class MockProvider:
    """Test-only 'AI' provider that proves the contract without a network call.

    It phrases the facts differently from the fallback (so tests can tell which
    path ran) but, crucially, it is handed no way to change the score: it only
    receives the score as an input it must not contradict and returns a string.
    """

    def __init__(self, *, name: str = "mock", model: str = "mock-1") -> None:
        self.name = name
        self.model = model

    def generate_explanation(
        self,
        *,
        locale: str,
        score: int,
        band: str,
        matched: list[str],
        gaps: list[str],
        unknown: list[str],
    ) -> str:
        bits = []
        if matched:
            bits.append(f"You align on {len(matched)} point(s)")
        if gaps:
            bits.append(f"{len(gaps)} area(s) differ")
        if unknown:
            bits.append(f"{len(unknown)} factor(s) lack data")
        summary = "; ".join(bits) if bits else "Limited information available"
        return f"[AI] {_BAND_HEADLINE.get(band, 'Match')} at {score}%. {summary}."


# Optional hook: tests (or a future real integration) can install a provider
# instance here to be returned by the factory when AI is enabled. Kept module-
# level and explicit rather than via signals/globals magic.
_provider_override: JobFitExplanationProvider | None = None


def set_provider_override(provider: JobFitExplanationProvider | None) -> None:
    """Install (or clear) a provider used by :func:`get_provider` when enabled."""
    global _provider_override
    _provider_override = provider


def get_provider() -> tuple[JobFitExplanationProvider, bool]:
    """Return ``(provider, ai_enabled)`` based on configuration.

    ``ai_enabled`` is True only when ``AI_JOB_FIT_ENABLED`` is set and a real
    provider is available (an installed override, or — in a future build — a
    configured ``AI_PROVIDER``). Otherwise the deterministic fallback is returned
    with ``ai_enabled=False``. No real provider ships in the MVP, so without an
    override this always returns the fallback.
    """
    if getattr(settings, "AI_JOB_FIT_ENABLED", False):
        if _provider_override is not None:
            return _provider_override, True
        # A real provider would be constructed here from settings.AI_PROVIDER /
        # AI_MODEL / AI_API_KEY. None ships in the MVP, so fall back honestly.
    return FallbackProvider(), False
