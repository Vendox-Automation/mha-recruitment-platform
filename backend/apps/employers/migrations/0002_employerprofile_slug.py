"""Add a unique public slug to EmployerProfile (for /companies/{slug}).

Three steps so existing rows get a unique value before the unique constraint is
applied: add the field non-unique, backfill a deterministic slug per row, then
tighten to unique. Backend-neutral (no vendor SQL) per ADR-0001 §6.1.9.
"""

import secrets

from django.db import migrations, models
from django.utils.text import slugify


def backfill_slugs(apps, schema_editor):
    EmployerProfile = apps.get_model("employers", "EmployerProfile")
    for profile in EmployerProfile.objects.all().iterator():
        if profile.slug:
            continue
        base = slugify(profile.company_name)[:200] or "company"
        slug = f"{base}-{secrets.token_hex(4)}"
        # Extremely unlikely collision; retry with a fresh suffix if it happens.
        while EmployerProfile.objects.filter(slug=slug).exclude(pk=profile.pk).exists():
            slug = f"{base}-{secrets.token_hex(4)}"
        profile.slug = slug
        profile.save(update_fields=["slug"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("employers", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="employerprofile",
            name="slug",
            # db_index=False on the transient add step: a SlugField is indexed
            # by default, which on PostgreSQL also creates a varchar `_like`
            # pattern index. The final AlterField (unique=True) would then try to
            # create that `_like` index a second time and fail ("relation
            # ..._like already exists"). Adding the column without an index lets
            # the unique alter create the index exactly once. SQLite has no
            # `_like` indexes, so this only manifests on PostgreSQL.
            field=models.SlugField(
                blank=True, db_index=False, default="", max_length=255, verbose_name="slug"
            ),
            preserve_default=False,
        ),
        migrations.RunPython(backfill_slugs, noop),
        migrations.AlterField(
            model_name="employerprofile",
            name="slug",
            field=models.SlugField(blank=True, max_length=255, unique=True, verbose_name="slug"),
        ),
    ]
