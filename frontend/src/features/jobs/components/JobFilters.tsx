"use client";

import { useTranslations } from "next-intl";

import { Field, Input, Select } from "@/components/ui";

import type { JobSearchParams } from "../types";

interface JobFiltersProps {
  /** Current draft keyword (controlled; debounced upstream before search). */
  keyword: string;
  onKeywordChange: (value: string) => void;
  params: JobSearchParams;
  onParamChange: (patch: Partial<JobSearchParams>) => void;
}

const EMPLOYMENT_TYPES = [
  "fullTime",
  "partTime",
  "contract",
  "internship",
  "temporary",
] as const;

/** Maps an i18n employment-type key to the backend filter value. */
const TYPE_VALUE: Record<string, string> = {
  fullTime: "FULL_TIME",
  partTime: "PART_TIME",
  contract: "CONTRACT",
  internship: "INTERNSHIP",
  temporary: "TEMPORARY",
};

/**
 * Job-search filter controls (spec §14.2). Keyword is debounced by the parent;
 * the other controls commit immediately. Values flow up via callbacks so the
 * single source of truth stays the URL query string (spec §15.3).
 */
export function JobFilters({
  keyword,
  onKeywordChange,
  params,
  onParamChange,
}: JobFiltersProps) {
  const t = useTranslations("jobs.search");
  const tType = useTranslations("jobs.employmentType");

  function parseSalary(value: string): number | undefined {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    const num = Number(trimmed);
    return Number.isFinite(num) && num >= 0 ? Math.floor(num) : undefined;
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label={t("keyword")}>
        <Input
          type="search"
          placeholder={t("keywordPlaceholder")}
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
        />
      </Field>
      <Field label={t("location")}>
        <Input
          placeholder={t("locationPlaceholder")}
          value={params.location ?? ""}
          onChange={(e) =>
            onParamChange({ location: e.target.value.trim() || undefined, page: 1 })
          }
        />
      </Field>
      <Field label={t("employmentType")}>
        <Select
          value={params.employment_type ?? ""}
          onChange={(e) =>
            onParamChange({
              employment_type: e.target.value || undefined,
              page: 1,
            })
          }
        >
          <option value="">{t("employmentTypeAny")}</option>
          {EMPLOYMENT_TYPES.map((key) => (
            <option key={key} value={TYPE_VALUE[key]}>
              {tType(key)}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("salaryMin")}>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={params.salary_min ?? ""}
            onChange={(e) =>
              onParamChange({ salary_min: parseSalary(e.target.value), page: 1 })
            }
          />
        </Field>
        <Field label={t("salaryMax")}>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={params.salary_max ?? ""}
            onChange={(e) =>
              onParamChange({ salary_max: parseSalary(e.target.value), page: 1 })
            }
          />
        </Field>
      </div>
    </div>
  );
}
