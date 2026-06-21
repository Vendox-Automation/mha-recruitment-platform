"""Production-oriented settings.

Production hosting is out of MVP scope (spec §6.2), but secure defaults are
recorded here so the project is not accidentally deployed with dev settings.
"""

from __future__ import annotations

from .base import *  # noqa: F401,F403

DEBUG = False

# Secure cookies and transport.
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_CONTENT_TYPE_NOSNIFF = True
