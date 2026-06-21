import { getTranslations } from "next-intl/server";

import { AnalyticalGraphic } from "@/components/intelligence";
import { Card } from "@/components/ui";

/**
 * Employer workspace preview (spec §14.1 H). A polished but HONEST static
 * preview of the real employer interface regions — attention queue, active
 * jobs, applicant table, Kanban pipeline, and recruitment insights — rendered
 * with placeholder bars rather than any candidate data. It is explicitly
 * labelled an interface preview (`previewNote`) so it can never be mistaken for
 * live activity (spec §14.1 H "do not create misleading live data"). Server
 * component — no interactivity needed here.
 */
export async function WorkspacePreview() {
  const t = await getTranslations("home.workspace");

  return (
    <Card className="flex flex-col gap-5" padded>
      {/* A toolbar-like header echoing the real dashboard chrome. */}
      <div className="flex items-center justify-between gap-3 border-b border-border-default pb-4">
        <p className="type-label text-text-primary">{t("dashboardTitle")}</p>
        <span
          aria-hidden="true"
          className="rounded-md bg-surface-subtle px-2.5 py-1 type-caption"
        >
          {t("previewBadge")}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        {/* Left column: attention queue + active jobs */}
        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-border-default bg-surface-raised p-4">
            <p className="type-label text-text-primary">
              {t("attentionQueue")}
            </p>
            <div aria-hidden="true" className="mt-3 flex flex-col gap-2">
              <span className="h-2 w-3/4 rounded-full bg-surface-subtle" />
              <span className="h-2 w-2/3 rounded-full bg-surface-subtle" />
              <span className="h-2 w-1/2 rounded-full bg-surface-subtle" />
            </div>
          </div>
          <div className="rounded-md border border-border-default bg-surface-raised p-4">
            <p className="type-label text-text-primary">{t("activeJobs")}</p>
            <div aria-hidden="true" className="mt-3 flex flex-col gap-2">
              <span className="h-2 w-2/3 rounded-full bg-surface-subtle" />
              <span className="h-2 w-1/2 rounded-full bg-surface-subtle" />
            </div>
          </div>
          <div className="rounded-md border border-dashed border-border-strong p-4">
            <p className="type-label text-text-primary">{t("insights")}</p>
            <div className="mt-3 h-24">
              <AnalyticalGraphic />
            </div>
          </div>
        </div>

        {/* Right column: applicant table + Kanban pipeline */}
        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-border-default bg-surface-raised p-4">
            <p className="type-label text-text-primary">{t("applicantTable")}</p>
            <div aria-hidden="true" className="mt-3 flex flex-col gap-2.5">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <span className="h-6 w-6 shrink-0 rounded-full bg-surface-subtle" />
                  <span className="h-2 w-1/3 rounded-full bg-surface-subtle" />
                  <span className="ml-auto h-2 w-16 rounded-full bg-surface-subtle" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-border-default bg-surface-raised p-4">
            <p className="type-label text-text-primary">{t("kanban")}</p>
            <div
              aria-hidden="true"
              className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5"
            >
              {[0, 1, 2, 3, 4].map((col) => (
                <div key={col} className="flex flex-col gap-2">
                  <span className="h-2 w-full rounded-full bg-surface-subtle" />
                  <span className="h-10 w-full rounded-md border border-border-default bg-surface-canvas" />
                  <span className="h-10 w-full rounded-md border border-border-default bg-surface-canvas" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="type-caption">{t("previewNote")}</p>
    </Card>
  );
}
