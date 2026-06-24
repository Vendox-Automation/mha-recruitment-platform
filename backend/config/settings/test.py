"""Test settings — fast and deterministic."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

from .base import *  # noqa: F401,F403

DEBUG = False

# In-memory SQLite keeps the local suite fast. CI sets DJANGO_TEST_USE_POSTGRES=1
# and DB_* vars so tests inherit PostgreSQL from base.py (ADR-0001 section 6.5).
if os.environ.get("DJANGO_TEST_USE_POSTGRES") != "1":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
    }

# Fast password hashing for tests only.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Throttling off during tests unless a test enables it explicitly.
REST_FRAMEWORK = {  # noqa: F405
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {},
}

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Resume uploads land in a throwaway temp directory during tests.
PRIVATE_MEDIA_ROOT = Path(tempfile.gettempdir()) / "mha_test_private_media"
