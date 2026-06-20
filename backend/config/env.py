"""Typed environment-variable helpers.

Environment is loaded once via python-dotenv in the settings modules. These
helpers keep settings free of repetitive parsing and avoid a second config
library (see ADR-0001 §1.1).
"""

from __future__ import annotations

import os


def env(key: str, default: str | None = None) -> str | None:
    """Return a raw string environment variable."""
    return os.environ.get(key, default)


def env_bool(key: str, default: bool = False) -> bool:
    """Return a boolean environment variable (1/true/yes/on)."""
    raw = os.environ.get(key)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_list(key: str, default: str = "") -> list[str]:
    """Return a comma-separated environment variable as a trimmed list."""
    raw = os.environ.get(key, default)
    return [item.strip() for item in raw.split(",") if item.strip()]
