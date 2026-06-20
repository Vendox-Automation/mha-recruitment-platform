"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { Badge, Button, LinkButton } from "@/components/ui";
import { jobApplicationStatusKey } from "@/features/applications/queryKeys";
import { getJobApplicationStatus } from "@/features/applications/service";
import { statusLabelKey, statusTone } from "@/features/applications/status";
import { useAuth } from "@/lib/auth";

import { ShareJobButton } from "./ShareJobButton";

/**
 * Primary job actions (spec §14.3): Apply Now, Save Job, Share.
 *
 * - Apply Now resolves by session state:
 *     anonymous            -> link to /sign-in
 *     candidate (new)      -> link to the apply route /jobs/{slug}/apply
 *     candidate (applied)  -> "View Application" + current stage, no duplicate
 *                             (spec §14.3)
 *     employer / admin     -> apply is hidden (they cannot apply to roles)
 * - Save Job is an HONEST disabled affordance — saved jobs is Phase 9.
 * - Share uses the existing ShareJobButton (native share / copy URL).
 */
export function JobActions({
  slug,
  layout = "stacked",
}: {
  slug: string;
  layout?: "stacked" | "inline";
}) {
  const t = useTranslations("jobs.detail");
  const tApplications = useTranslations("candidate.applications");
  const locale = useLocale();
  const { isAuthenticated, role, isLoading } = useAuth();

  const isCandidate = role === "CANDIDATE";

  // Only candidates probe whether they have already applied (spec §14.3). The
  // probe 404 → null means "not applied yet".
  const statusQuery = useQuery({
    queryKey: jobApplicationStatusKey(slug),
    queryFn: () => getJobApplicationStatus(slug, locale),
    enabled: isCandidate,
    staleTime: 30_000,
  });
  const existing = statusQuery.data ?? null;

  const fullWidth = layout === "stacked";
  const applyHref = `/jobs/${slug}/apply`;
  const canApply = !isAuthenticated || isCandidate;

  return (
    <div
      className={
        layout === "stacked" ? "flex flex-col gap-3" : "flex w-full gap-2"
      }
    >
      {canApply ? (
        isAuthenticated ? (
          existing ? (
            <div className={layout === "stacked" ? "flex flex-col gap-2" : ""}>
              <LinkButton
                href={`/candidate/applications/${existing.id}`}
                fullWidth={fullWidth}
              >
                {t("viewApplication")}
              </LinkButton>
              {layout === "stacked" ? (
                <p className="type-caption flex items-center gap-2">
                  {t("currentStage")}:{" "}
                  <Badge tone={statusTone(existing.status)} withDot>
                    {tApplications(statusLabelKey(existing.status))}
                  </Badge>
                </p>
              ) : null}
            </div>
          ) : (
            <LinkButton href={applyHref} fullWidth={fullWidth}>
              {t("applyNow")}
            </LinkButton>
          )
        ) : (
          <LinkButton href="/sign-in" fullWidth={fullWidth}>
            {t("applySignIn")}
          </LinkButton>
        )
      ) : null}

      <Button
        variant="secondary"
        fullWidth={fullWidth}
        disabled
        aria-disabled="true"
        title={t("saveComingSoon")}
      >
        {t("saveJob")}
      </Button>

      {layout === "stacked" ? <ShareJobButton fullWidth /> : null}

      {/* Keep the action bar honest even while the session resolves. */}
      {isLoading ? <span className="sr-only">{t("loadingTitle")}</span> : null}
    </div>
  );
}
