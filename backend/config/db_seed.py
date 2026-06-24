"""Export and import database seed bundles (JSON + private files).

A seed bundle is a portable snapshot of domain data for moving between
databases (e.g. local Postgres → Railway). It contains:

* ``database.json`` — Django fixture produced by ``dumpdata``
* ``private_media/`` — copy of ``PRIVATE_MEDIA_ROOT`` (resumes, snapshots, etc.)
* ``extra_files/`` — employer logos and other default-storage uploads
* ``manifest.json`` — metadata (counts, export time, model list)
"""

from __future__ import annotations

import json
import shutil
from datetime import UTC, datetime
from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.core.management import call_command
from django.db.models import FileField

_BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_SEED_DIR = _BACKEND_DIR / "data" / "seed"

# Fixture order: parents before children where possible. ``loaddata`` resolves
# FKs by PK, so strict ordering is not required, but this documents intent.
SEED_MODEL_LABELS: tuple[str, ...] = (
    "accounts.user",
    "employers.employerprofile",
    "candidates.candidateprofile",
    "jobs.job",
    "jobs.screeningquestion",
    "applications.application",
    "applications.applicationanswer",
    "applications.applicationstatushistory",
    "candidates.savedjob",
    "matching.jobfitresult",
    "support.supportrequest",
    "analytics.marketinsight",
    "analytics.jobviewevent",
    "audit.auditlog",
    "reviews.companyreview",
    "reviews.employerreply",
)


def _backend_dir() -> Path:
    return _BACKEND_DIR


def _model_counts() -> dict[str, int]:
    counts: dict[str, int] = {}
    for label in SEED_MODEL_LABELS:
        model = apps.get_model(label)
        counts[label] = model._default_manager.count()
    return counts


def _copy_private_media(source: Path, destination: Path) -> int:
    if not source.exists():
        destination.mkdir(parents=True, exist_ok=True)
        return 0
    shutil.copytree(source, destination, dirs_exist_ok=True)
    return sum(1 for path in destination.rglob("*") if path.is_file())


def _export_extra_files(destination: Path) -> int:
    """Copy default-storage FileField uploads (e.g. employer logos)."""
    destination.mkdir(parents=True, exist_ok=True)
    copied = 0
    for label in SEED_MODEL_LABELS:
        model = apps.get_model(label)
        file_fields = [f for f in model._meta.fields if isinstance(f, FileField)]
        if not file_fields:
            continue
        for obj in model._default_manager.all().iterator():
            for field in file_fields:
                file_obj = getattr(obj, field.name)
                if not file_obj:
                    continue
                try:
                    src = Path(file_obj.path)
                except (ValueError, NotImplementedError):
                    continue
                if not src.is_file():
                    continue
                private_root = Path(settings.PRIVATE_MEDIA_ROOT).resolve()
                if private_root in src.resolve().parents or src.resolve() == private_root:
                    continue
                try:
                    rel = src.relative_to(_backend_dir().resolve())
                except ValueError:
                    rel = Path(file_obj.name)
                dest = destination / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dest)
                copied += 1
    return copied


def _restore_extra_files(source: Path) -> int:
    if not source.exists():
        return 0
    restored = 0
    base_dir = _backend_dir().resolve()
    for src in source.rglob("*"):
        if not src.is_file():
            continue
        rel = src.relative_to(source)
        dest = base_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        restored += 1
    return restored


def export_seed_bundle(output_dir: Path | None = None) -> Path:
    """Write a seed bundle to ``output_dir`` and return that path."""
    target = (output_dir or DEFAULT_SEED_DIR).resolve()
    target.mkdir(parents=True, exist_ok=True)

    fixture_path = target / "database.json"
    with fixture_path.open("w", encoding="utf-8") as handle:
        call_command(
            "dumpdata",
            *SEED_MODEL_LABELS,
            indent=2,
            stdout=handle,
            natural_foreign=True,
            natural_primary=True,
        )

    private_dest = target / "private_media"
    private_files = _copy_private_media(Path(settings.PRIVATE_MEDIA_ROOT), private_dest)
    extra_files = _export_extra_files(target / "extra_files")

    manifest = {
        "version": 1,
        "exported_at": datetime.now(UTC).isoformat(),
        "models": list(SEED_MODEL_LABELS),
        "record_counts": _model_counts(),
        "private_media_files": private_files,
        "extra_files": extra_files,
        "fixture": fixture_path.name,
    }
    manifest_path = target / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    return target


def seed_from_bundle(
    input_dir: Path | None = None,
    *,
    clear: bool = False,
) -> Path:
    """Restore files and load ``database.json`` into the current database."""
    source = (input_dir or DEFAULT_SEED_DIR).resolve()
    fixture_path = source / "database.json"
    if not fixture_path.is_file():
        raise FileNotFoundError(f"Missing fixture: {fixture_path}")

    if clear:
        call_command("flush", verbosity=0, interactive=False)

    private_src = source / "private_media"
    Path(settings.PRIVATE_MEDIA_ROOT).mkdir(parents=True, exist_ok=True)
    _copy_private_media(private_src, Path(settings.PRIVATE_MEDIA_ROOT))
    _restore_extra_files(source / "extra_files")

    call_command("loaddata", str(fixture_path), verbosity=1)

    return source
