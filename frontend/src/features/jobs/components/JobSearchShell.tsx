"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
} from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * Job search results shell (spec §14.2). Desktop: adaptive split-screen with
 * search controls + list on the left and a preview pane on the right. Mobile:
 * full-width list with a collapsible filter disclosure; job detail opens as its
 * own page. Filter controls (keyword, location, employment type, salary) and
 * sort (newest / relevant) are present but non-functional this phase — no fake
 * vacancies are shown; an honest empty state stands in for results.
 */
export function JobSearchShell() {
  const t = useTranslations("jobs.search");
  const tType = useTranslations("jobs.employmentType");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = useId();

  const filters = (
    <div className="flex flex-col gap-4">
      <Field label={t("keyword")}>
        <Input placeholder={t("keywordPlaceholder")} />
      </Field>
      <Field label={t("location")}>
        <Input placeholder={t("locationPlaceholder")} />
      </Field>
      <Field label={t("employmentType")}>
        <Select defaultValue="">
          <option value="">{t("employmentTypeAny")}</option>
          <option value="fullTime">{tType("fullTime")}</option>
          <option value="partTime">{tType("partTime")}</option>
          <option value="contract">{tType("contract")}</option>
          <option value="internship">{tType("internship")}</option>
          <option value="temporary">{tType("temporary")}</option>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("salaryMin")}>
          <Input type="number" inputMode="numeric" min={0} />
        </Field>
        <Field label={t("salaryMax")}>
          <Input type="number" inputMode="numeric" min={0} />
        </Field>
      </div>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] xl:grid-cols-[0.9fr_1.1fr]">
      {/* Left: controls + list */}
      <div className="flex flex-col gap-4">
        {/* Mobile filter disclosure */}
        <div className="lg:hidden">
          <Button
            variant="secondary"
            fullWidth
            aria-expanded={filtersOpen}
            aria-controls={filtersId}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            {filtersOpen ? t("closeFilters") : t("openFilters")}
          </Button>
          <div id={filtersId} hidden={!filtersOpen} className="mt-4">
            <Card tone="subtle">{filters}</Card>
          </div>
        </div>

        {/* Desktop filters */}
        <Card tone="subtle" className="hidden lg:block">
          <h2 className="type-label mb-4 text-text-primary">
            {t("filtersTitle")}
          </h2>
          {filters}
        </Card>

        {/* Sort + results region */}
        <div className="flex items-center justify-between gap-3">
          <p className="type-body-sm text-text-secondary" role="status">
            {t("resultsCount")}
          </p>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <span className="whitespace-nowrap">{t("sortLabel")}</span>
            <Select defaultValue="newest" className="h-9 w-auto">
              <option value="newest">{t("sortNewest")}</option>
              <option value="relevant">{t("sortRelevant")}</option>
            </Select>
          </label>
        </div>

        <section aria-label={t("resultsLabel")}>
          <EmptyState
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        </section>
      </div>

      {/* Right: preview pane (desktop) */}
      <aside
        aria-label={t("previewLabel")}
        className={cn(
          "hidden lg:block",
        )}
      >
        <Card className="sticky top-24 flex min-h-[24rem] items-center justify-center text-center">
          <p className="type-body-sm max-w-xs text-text-muted">
            {t("selectPrompt")}
          </p>
        </Card>
      </aside>
    </div>
  );
}
