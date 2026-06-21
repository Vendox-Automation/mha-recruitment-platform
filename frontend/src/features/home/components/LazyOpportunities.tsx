"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui";

/**
 * Lazy boundary for the Opportunities & organisations showcase (spec §13.8).
 * Below-the-fold and client-fetched, so it is code-split and loaded on
 * hydration with a fixed-height skeleton that reserves space (no layout shift).
 */
const OpportunitiesShowcase = dynamic(
  () =>
    import("./OpportunitiesShowcase").then((mod) => mod.OpportunitiesShowcase),
  {
    ssr: false,
    loading: function OpportunitiesLoading() {
      return <OpportunitiesFallback />;
    },
  },
);

function OpportunitiesFallback() {
  const t = useTranslations("common.states");
  return (
    <div
      role="status"
      aria-label={t("loadingSpinner")}
      className="grid gap-8 lg:grid-cols-2"
    >
      {Array.from({ length: 2 }).map((_, column) => (
        <div key={column} className="flex flex-col gap-4">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 3 }).map((_, row) => (
            <div
              key={row}
              className="flex flex-col gap-3 rounded-lg border border-border-default bg-surface-canvas p-5"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function LazyOpportunities() {
  return <OpportunitiesShowcase />;
}
