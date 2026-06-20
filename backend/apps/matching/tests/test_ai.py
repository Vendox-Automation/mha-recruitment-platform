"""Tests for the provider-neutral AI explanation layer (spec §16.5, §16.7)."""

from __future__ import annotations

import pytest

from apps.matching import ai


@pytest.fixture(autouse=True)
def _clear_override():
    ai.set_provider_override(None)
    yield
    ai.set_provider_override(None)


def test_fallback_provider_is_deterministic():
    p = ai.FallbackProvider()
    args = {
        "locale": "en",
        "score": 82,
        "band": "strong",
        "matched": ["Matches your preferred location"],
        "gaps": ["The job title is related but not an exact match"],
        "unknown": ["Salary preference is not available"],
    }
    first = p.generate_explanation(**args)
    second = p.generate_explanation(**args)
    assert first == second
    assert "82%" in first
    assert "Strong match" in first


def test_get_provider_returns_fallback_when_disabled(settings):
    settings.AI_JOB_FIT_ENABLED = False
    provider, enabled = ai.get_provider()
    assert enabled is False
    assert isinstance(provider, ai.FallbackProvider)


def test_get_provider_returns_fallback_when_enabled_but_no_provider(settings):
    # Enabled but no real provider configured / installed -> honest fallback.
    settings.AI_JOB_FIT_ENABLED = True
    provider, enabled = ai.get_provider()
    assert enabled is False
    assert isinstance(provider, ai.FallbackProvider)


def test_mock_provider_used_when_enabled_and_installed(settings):
    settings.AI_JOB_FIT_ENABLED = True
    ai.set_provider_override(ai.MockProvider())
    provider, enabled = ai.get_provider()
    assert enabled is True
    assert isinstance(provider, ai.MockProvider)


def test_provider_protocol_conformance():
    assert isinstance(ai.FallbackProvider(), ai.JobFitExplanationProvider)
    assert isinstance(ai.MockProvider(), ai.JobFitExplanationProvider)


def test_disclaimer_text_matches_spec():
    assert "does not guarantee" in ai.DISCLAIMER
    assert "Job Fit is guidance" in ai.DISCLAIMER
