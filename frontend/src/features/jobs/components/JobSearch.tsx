"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useState } from "react";

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Select,
  Skeleton,
} from "@/components/ui";
import { useRouter } from "@/i18n/navigation";

import { PAGE_SIZE, searchJobs } from "../service";
import {
  parseSearchParams,
  searchParamsEqual,
  toQueryString,
} from "../searchState";
import type { JobSearchParams, JobSortOption } from "../types";
import { useDebouncedValue } from "../useDebouncedValue";
import { JobCard } from "./JobCard";
import { JobFilters } from "./JobFilters";
import { JobPreviewPane } from "./JobPreviewPane";

/**
 * Adaptive job search (spec §14.2, §15.3, §24, §25).
 *
 * - All filter/sort/page state lives in the URL query string. We read it on
 *   load (so a shared link reproduces the search) and write it on change.
 * - Keyword is debounced ~300ms before it touches the URL/fetch.
 * - TanStack Query is keyed on the parsed params + locale; `keepPreviousData`
 *   prevents layout thrash so comparison stays stable while a page loads.
 * - Desktop ≥lg: split-screen — selecting a card previews it on the right.
 *   Below lg: full-width list, filters in a disclosure, selection navigates to
 *   the full /jobs/[slug] page.
 */
export function JobSearch({ initialQuery }: { initialQuery: string }) {
  const t = useTranslations("jobs.search");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();
  const router = useRouter();

  const filtersId = useId();
  const [filtersOpen, setFiltersOpen] = useState(false);
  // The slug the user explicitly clicked; the *effective* selection is derived
  // during render (below) so we never need a setState-in-effect to keep it
  // valid against the current result page.
  const [userSelectedSlug, setUserSelectedSlug] = useState<string | null>(null);

  // Committed filter/sort/page state (everything except the live keyword box).
  // URL is the source of truth; seed from the server-provided initial query.
  const initial = useMemo(() => parseSearchParams(initialQuery), [initialQuery]);
  const [committed, setCommitted] = useState<JobSearchParams>(initial);

  // Keyword has its own immediate draft so typing feels responsive; the
  // debounced value is what actually drives the URL + search.
  const [keywordDraft, setKeywordDraft] = useState(initial.keyword ?? "");
  const debouncedKeyword = useDebouncedValue(keywordDraft, 300);

  // The effective search params fold the debounced keyword into the committed
  // state — derived, so no effect/setState round-trip is needed (spec §25).
  const params = useMemo<JobSearchParams>(() => {
    const keyword = debouncedKeyword.trim() || undefined;
    return keyword === committed.keyword
      ? committed
      : { ...committed, keyword, page: 1 };
  }, [committed, debouncedKeyword]);

  const queryString = toQueryString(params);

  // Write committed state back to the URL (shallow replace, no scroll jump).
  // This is a genuine "sync React state to an external system" effect — it does
  // not call setState, so it does not cascade renders.
  useEffect(() => {
    const current =
      typeof window !== "undefined"
        ? window.location.search.replace(/^\?/, "")
        : "";
    if (!searchParamsEqual(parseSearchParams(current), params)) {
      router.replace(queryString ? `/jobs?${queryString}` : "/jobs", {
        scroll: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  const query = useQuery({
    queryKey: ["jobs", "search", queryString, locale],
    queryFn: () => searchJobs(params, locale),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const results = useMemo(() => query.data?.results ?? [], [query.data]);
  const count = query.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  // Effective desktop selection: the user's pick if it's still on this page,
  // otherwise the first result. Derived during render (no effect needed).
  const selectedSlug =
    userSelectedSlug && results.some((r) => r.slug === userSelectedSlug)
      ? userSelectedSlug
      : (results[0]?.slug ?? null);

  function patch(next: Partial<JobSearchParams>) {
    // Editing a filter commits immediately and folds the live keyword in so the
    // box value isn't lost when another control changes.
    setCommitted({ ...params, ...next });
  }

  const clearFilters = () => {
    setKeywordDraft("");
    setCommitted({ sort: "newest", page: 1 });
  };

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        params.keyword ||
          params.location ||
          params.employment_type ||
          params.salary_min != null ||
          params.salary_max != null,
      ),
    [params],
  );

  const filters = (
    <JobFilters
      keyword={keywordDraft}
      onKeywordChange={setKeywordDraft}
      params={params}
      onParamChange={patch}
    />
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

        {/* Sort + result count */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="type-body-sm text-text-secondary" role="status" aria-live="polite">
            {query.isLoading
              ? tCommon("loadingTitle")
              : t("resultsSummary", { count })}
          </p>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <span className="whitespace-nowrap">{t("sortLabel")}</span>
            <Select
              value={params.sort}
              onChange={(e) =>
                patch({ sort: e.target.value as JobSortOption, page: 1 })
              }
              className="h-9 w-auto"
            >
              <option value="newest">{t("sortNewest")}</option>
              <option value="relevant">{t("sortRelevant")}</option>
            </Select>
          </label>
        </div>

        {/* Results region */}
        <section aria-label={t("resultsLabel")} className="flex flex-col gap-4">
          {query.isLoading ? (
            <div className="flex flex-col gap-4" aria-hidden="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="flex flex-col gap-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </Card>
              ))}
            </div>
          ) : query.isError ? (
            <ErrorState
              title={t("errorTitle")}
              description={t("errorDescription")}
              action={
                <Button variant="secondary" onClick={() => query.refetch()}>
                  {t("retry")}
                </Button>
              }
            />
          ) : results.length === 0 ? (
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                <div className="flex flex-col items-center gap-3">
                  <ul className="type-body-sm flex flex-col gap-1 text-left text-text-secondary">
                    <li>{t("emptyTips.location")}</li>
                    <li>{t("emptyTips.keyword")}</li>
                    <li>{t("emptyTips.salary")}</li>
                    <li>{t("emptyTips.support")}</li>
                  </ul>
                  {hasActiveFilters ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      {t("clearFilters")}
                    </Button>
                  ) : null}
                </div>
              }
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {results.map((job) => (
                <li key={job.slug}>
                  {/* Desktop: select to preview. Mobile: link to full page. */}
                  <div className="hidden lg:block">
                    <JobCard
                      job={job}
                      selected={job.slug === selectedSlug}
                      onSelect={setUserSelectedSlug}
                    />
                  </div>
                  <div className="lg:hidden">
                    <JobCard
                      job={job}
                      as="link"
                      renderLink={(slug, children) => (
                        <a
                          href={`/${locale}/jobs/${slug}`}
                          className="no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                          onClick={(e) => {
                            e.preventDefault();
                            router.push(`/jobs/${slug}`);
                          }}
                        >
                          {children}
                        </a>
                      )}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Pagination */}
          {!query.isLoading && !query.isError && count > PAGE_SIZE ? (
            <nav
              className="flex items-center justify-between gap-3"
              aria-label={t("resultsLabel")}
            >
              <Button
                variant="secondary"
                size="sm"
                disabled={params.page <= 1}
                onClick={() => patch({ page: params.page - 1 })}
              >
                {t("previous")}
              </Button>
              <span className="type-body-sm text-text-secondary" aria-live="polite">
                {t("pageStatus", { page: params.page, pages: totalPages })}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={params.page >= totalPages}
                onClick={() => patch({ page: params.page + 1 })}
              >
                {t("next")}
              </Button>
            </nav>
          ) : null}
        </section>
      </div>

      {/* Right: preview pane (desktop only) */}
      <aside aria-label={t("previewLabel")} className="hidden lg:block">
        <JobPreviewPane slug={selectedSlug} />
      </aside>
    </div>
  );
}
