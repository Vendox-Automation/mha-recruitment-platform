"""Local development settings."""

from __future__ import annotations

from .base import *  # noqa: F401,F403
from .base import CSRF_TRUSTED_ORIGINS, REST_FRAMEWORK

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]

# Browsable API is convenient locally.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}

# Cookies are sent over plain HTTP locally.
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# ---------------------------------------------------------------------------
# Tunnelled local access (e.g. ngrok) — DEV ONLY.
#
# Lets the local app be reached over an ngrok HTTPS tunnel (demos, mobile/
# cross-device testing) without editing settings per URL. Covers both
# directions: the tunnel fronting the API (host check) and the tunnel fronting
# the frontend that then calls the API (CORS + CSRF). Scoped to development;
# production (prod.py) keeps the strict, explicit allow-lists from base.py.
# ---------------------------------------------------------------------------
_TUNNEL_HOST_SUFFIXES = [".ngrok-free.dev", ".ngrok-free.app", ".ngrok.io"]
ALLOWED_HOSTS = [*ALLOWED_HOSTS, *_TUNNEL_HOST_SUFFIXES]

# Reflect any ngrok HTTPS origin in CORS responses (credentials already allowed).
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://[a-z0-9-]+\.ngrok-free\.dev$",
    r"^https://[a-z0-9-]+\.ngrok-free\.app$",
    r"^https://[a-z0-9-]+\.ngrok\.io$",
]

# Trust ngrok origins for Django's CSRF origin check (wildcard subdomains).
CSRF_TRUSTED_ORIGINS = [
    *CSRF_TRUSTED_ORIGINS,
    "https://*.ngrok-free.dev",
    "https://*.ngrok-free.app",
    "https://*.ngrok.io",
]
