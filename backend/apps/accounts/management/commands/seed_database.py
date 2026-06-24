"""Populate the database from an export_database seed bundle."""

from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from config.db_seed import DEFAULT_SEED_DIR, seed_from_bundle


class Command(BaseCommand):
    help = (
        "Load a seed bundle created by export_database into the current database. "
        "Run migrate on the target database first. Use --clear to wipe existing rows."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--input",
            type=str,
            default=str(DEFAULT_SEED_DIR),
            help=f"Seed bundle directory (default: {DEFAULT_SEED_DIR})",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Flush the database before loading (destructive).",
        )

    def handle(self, *args, **options):
        source = Path(options["input"]).expanduser()
        if not (source / "database.json").is_file():
            raise CommandError(
                f"No database.json in {source}. Run export_database first."
            )

        if options["clear"]:
            self.stdout.write(self.style.WARNING("Clearing existing database rows…"))

        try:
            seed_from_bundle(source, clear=options["clear"])
        except Exception as exc:  # noqa: BLE001 — surface a clean CLI error
            raise CommandError(str(exc)) from exc

        self.stdout.write(self.style.SUCCESS(f"Seeded database from {source}"))
