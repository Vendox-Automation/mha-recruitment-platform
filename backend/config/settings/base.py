"""Base Django settings shared across all environments.

Environment-specific modules (dev, prod, test) import from here. Configuration
is driven by environment variables loaded from `.env` files; nothing
environment-specific is hardcoded (ADR-0001 §4.3, spec §18.7.14).
"""

from __future__ import annotations

from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

from config.env import env, env_bool, env_list

# BASE_DIR points at the `backend/` directory.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
REPO_ROOT = BASE_DIR.parent

# Load environment files: backend/.env then repo-root/.env (repo root may hold
# shared values). Existing process env always wins.
load_dotenv(BASE_DIR / ".env")
load_dotenv(REPO_ROOT / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY", "dev-insecure-change-me")
DEBUG = env_bool("DJANGO_DEBUG", False)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

# Application definition ----------------------------------------------------

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
]

# Domain apps (per spec §18.5 / ADR-0001 §3.1). Apps without models yet are
# still registered so their config and future migrations are wired in.
LOCAL_APPS = [
    "apps.accounts",
    "apps.candidates",
    "apps.employers",
    "apps.jobs",
    "apps.applications",
    "apps.matching",
    "apps.support",
    "apps.analytics",
    "apps.audit",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "config.middleware.RequestIDMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Database ------------------------------------------------------------------
# Canonical DB is PostgreSQL via DATABASE_URL. A SQLite fallback is used only
# in environments without Postgres (ADR-0001 §6). Code never branches on the
# backend; it depends solely on DATABASE_URL.
DATABASES = {
    "default": dj_database_url.config(
        default=env("DATABASE_URL", f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
        conn_max_age=600,
    )
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Internationalisation (spec §17) -------------------------------------------
LANGUAGE_CODE = "en"
LANGUAGES = [
    ("en", "English"),
    ("zh-hans", "Simplified Chinese"),
]
LOCALE_PATHS = [BASE_DIR / "locale"]
TIME_ZONE = "Asia/Kuala_Lumpur"
USE_I18N = True
USE_TZ = True

# Static & media ------------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Private media (resumes etc.) is stored OUTSIDE any public/static route and
# is only ever served through permission-checked views (ADR-0001 §5, spec §22.2).
PRIVATE_MEDIA_ROOT = Path(env("PRIVATE_MEDIA_ROOT", str(BASE_DIR / "private_media")))
RESUME_MAX_BYTES = 5 * 1024 * 1024  # 5 MB initial limit (spec §22.2)
RESUME_ALLOWED_EXTENSIONS = ["pdf", "docx"]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# REST framework ------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    # Secure by default: endpoints opt in to public access explicitly.
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "config.pagination.DefaultPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "config.exceptions.api_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "auth": "10/min",
        "register": "10/hour",
        "password_reset": "5/hour",
        "support": "10/hour",
        "public": "120/min",
    },
}

# Authentication transport (ADR-0001 §4) ------------------------------------
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
# CSRF cookie is readable by JS so the SPA can echo it in the X-CSRFToken header.
CSRF_COOKIE_HTTPONLY = False

FRONTEND_ORIGIN = env("FRONTEND_ORIGIN", "http://localhost:3000")
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
)
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
)

# Email (dev uses console/file backend; overridden per environment) ---------
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", "no-reply@mha-jobs.local")

# Smart Job Fit AI provider (spec §16.7) — disabled by default --------------
AI_JOB_FIT_ENABLED = env_bool("AI_JOB_FIT_ENABLED", False)
AI_PROVIDER = env("AI_PROVIDER", "")
AI_MODEL = env("AI_MODEL", "")
AI_API_KEY = env("AI_API_KEY", "")
