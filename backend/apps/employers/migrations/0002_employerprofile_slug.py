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
            field=models.SlugField(blank=True, default="", max_length=255, verbose_name="slug"),
            preserve_default=False,
        ),
        migrations.RunPython(backfill_slugs, noop),
        migrations.AlterField(
            model_name="employerprofile",
            name="slug",
            field=models.SlugField(blank=True, max_length=255, unique=True, verbose_name="slug"),
        ),
    ]
