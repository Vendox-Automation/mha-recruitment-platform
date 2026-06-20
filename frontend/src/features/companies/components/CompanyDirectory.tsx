"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Skeleton,
} from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { useDebouncedValue } from "@/features/jobs/useDebouncedValue";

import { listCompanies } from "../service";
import type { CompanySearchParams } from "../types";
import { CompanyCard } from "./CompanyCard";

const PAGE_SIZE = 20; // DRF default page size for the companies endpoint.

function parseParams(query: string): CompanySearchParams {
  const params = new URLSearchParams(query);
  const search = params.get("search")?.trim() || undefined;
  const page = Number(params.get("page"));
  return { search, page: Number.isFinite(page) && page >= 1 ? page : 1 };
}

function toQuery(params: CompanySearchParams): string {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.page > 1) q.set("page", String(params.page));
  return q.toString();
}

/**
 * Approved-company directory (spec §14.4). Name search (debounced) + paginated
 * results, with search/page state persisted in the URL query string so a view
 * is shareable. Loading / empty / error states handled.
 */
export function CompanyDirectory({ initialQuery }: { initialQuery: string }) {
  const t = useTranslations("companies.directory");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();
  const router = useRouter();

  const initial = useMemo(() => parseParams(initialQuery), [initialQuery]);
  // Committed page state (search comes from the debounced draft, folded in).
  const [committed, setCommitted] = useState<CompanySearchParams>(initial);
  const [searchDraft, setSearchDraft] = useState(initial.search ?? "");
  const debouncedSearch = useDebouncedValue(searchDraft, 300);

  // Effective params fold the debounced search term in — derived, no effect.
  const params = useMemo<CompanySearchParams>(() => {
    const search = debouncedSearch.trim() || undefined;
    return search === committed.search ? committed : { search, page: 1 };
  }, [committed, debouncedSearch]);

  const queryString = toQuery(params);

  useEffect(() => {
    const current =
      typeof window !== "undefined"
        ? window.location.search.replace(/^\?/, "")
        : "";
    if (toQuery(parseParams(current)) !== queryString) {
      router.replace(
        queryString ? `/companies?${queryString}` : "/companies",
        { scroll: false },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  const query = useQuery({
    queryKey: ["companies", queryString, locale],
    queryFn: () => listCompanies(params, locale),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const companies = query.data?.results ?? [];
  const count = query.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const isSearching = Boolean(params.search);

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-md">
        <Field label={t("searchLabel")}>
          <Input
            type="search"
            placeholder={t("searchPlaceholder")}
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </Field>
      </div>

      <p className="type-body-sm text-text-secondary" role="status" aria-live="polite">
        {query.isLoading
          ? tCommon("loadingTitle")
          : t("resultsSummary", { count })}
      </p>

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="flex flex-col gap-3">
              <Skeleton className="h-12 w-12" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
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
      ) : companies.length === 0 ? (
        <EmptyState
          title={isSearching ? t("emptySearchTitle") : t("emptyTitle")}
          description={
            isSearching ? t("emptySearchDescription") : t("emptyDescription")
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {companies.map((company) => (
            <li key={company.slug}>
              <CompanyCard company={company} />
            </li>
          ))}
        </ul>
      )}

      {!query.isLoading && !query.isError && count > PAGE_SIZE ? (
        <nav className="flex items-center justify-between gap-3" aria-label={t("title")}>
          <Button
            variant="secondary"
            size="sm"
            disabled={params.page <= 1}
            onClick={() => setCommitted({ ...params, page: params.page - 1 })}
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
            onClick={() => setCommitted({ ...params, page: params.page + 1 })}
          >
            {t("next")}
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
