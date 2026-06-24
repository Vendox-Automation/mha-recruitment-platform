"""Production-oriented settings.

Production hosting is out of MVP scope (spec §6.2), but secure defaults are
recorded here so the project is not accidentally deployed with dev settings.
"""

from __future__ import annotations

from .base import *  # noqa: F401,F403
from .base import (
    ALLOWED_HOSTS,
    CORS_ALLOWED_ORIGINS,
    CSRF_TRUSTED_ORIGINS,
    FRONTEND_ORIGIN,
)
from config.env import env, env_bool, env_list

DEBUG = False

# ---------------------------------------------------------------------------
# Hosts — a missing backend hostname is the usual cause of "400 on every
# request" on Railway (Django DisallowedHost). Railway injects
# RAILWAY_PUBLIC_DOMAIN; also honour DJANGO_ALLOWED_HOSTS from the dashboard.
# ---------------------------------------------------------------------------
_extra_hosts = env_list("DJANGO_EXTRA_ALLOWED_HOSTS", "")
_railway_domain = env("RAILWAY_PUBLIC_DOMAIN")
if _railway_domain:
    _extra_hosts = [*_extra_hosts, _railway_domain]
# Subdomain wildcard for *.up.railway.app when any Railway env is present.
if env("RAILWAY_ENVIRONMENT") or _railway_domain:
    _extra_hosts = [*_extra_hosts, ".up.railway.app"]
ALLOWED_HOSTS = list(dict.fromkeys([*ALLOWED_HOSTS, *_extra_hosts]))

# ---------------------------------------------------------------------------
# CORS / CSRF — when the Next.js app and API are on different origins, list
# the frontend URL in CORS_ALLOWED_ORIGINS and CSRF_TRUSTED_ORIGINS. If only
# FRONTEND_ORIGIN is set, append it automatically.
# ---------------------------------------------------------------------------
_frontend = (FRONTEND_ORIGIN or "").rstrip("/")
if _frontend and _frontend not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS = [*CORS_ALLOWED_ORIGINS, _frontend]
if _frontend and _frontend not in CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS = [*CSRF_TRUSTED_ORIGINS, _frontend]

# Split-domain deploy: session/CSRF cookies must be SameSite=None; Secure.
if env_bool("CROSS_ORIGIN_COOKIES", False):
    SESSION_COOKIE_SAMESITE = "None"
    CSRF_COOKIE_SAMESITE = "None"

# Secure cookies and transport.
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_CONTENT_TYPE_NOSNIFF = True
