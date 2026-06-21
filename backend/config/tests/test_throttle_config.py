"""Smoke tests for the default REST throttle configuration (spec §22).

Phases 3-9 security reviews repeatedly flagged that endpoints WITHOUT an explicit
ScopedRateThrottle scope were effectively un-throttled. The base settings now add
generous global User/Anon throttles as defence in depth. These tests assert that
hardening is configured in the BASE settings, while confirming the test settings
keep throttling DISABLED so the suite is unaffected.
"""

from __future__ import annotations

import importlib

from django.conf import settings


def test_base_settings_add_global_user_and_anon_throttles():
    base = importlib.import_module("config.settings.base")
    classes = base.REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"]
    rates = base.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]

    # The tight scoped throttle is retained alongside the new global ceilings.
    assert "rest_framework.throttling.ScopedRateThrottle" in classes
    assert "rest_framework.throttling.UserRateThrottle" in classes
    assert "rest_framework.throttling.AnonRateThrottle" in classes

    # Generous global ceilings exist for otherwise-unscoped endpoints, and the
    # pre-existing scoped rates are preserved.
    assert rates["anon"] == "120/min"
    assert rates["user"] == "2000/hour"
    for scope in ("auth", "register", "password_reset", "support", "public"):
        assert scope in rates


def test_test_settings_keep_throttling_disabled():
    # Under the active (test) settings the suite must not be throttled.
    assert settings.REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] == []
    assert settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] == {}
