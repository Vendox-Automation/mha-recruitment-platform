"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import { Card, Skeleton } from "@/components/ui";

/**
 * Lazy boundary for the Career Intelligence Console (spec §13.8 "lazy-load
 * non-critical visual modules"). The console is below the fold and fetches
 * client-side, so it is code-split into its own chunk and loaded only when the
 * homepage hydrates — keeping it out of the critical path. A fixed-height
 * skeleton placeholder reserves space to avoid layout shift (spec §13.8).
 */
const CareerIntelligenceConsole = dynamic(
  () =>
    import("./CareerIntelligenceConsole").then(
      (mod) => mod.CareerIntelligenceConsole,
    ),
  {
    ssr: false,
    loading: function ConsoleLoading() {
      return <ConsoleFallback />;
    },
  },
);

function ConsoleFallback() {
  const t = useTranslations("common.states");
  return (
    <div
      role="status"
      aria-label={t("loadingSpinner")}
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="flex flex-col gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </Card>
      ))}
    </div>
  );
}

export function LazyConsole() {
  return <CareerIntelligenceConsole />;
}
