"use client";

import { useTranslations } from "next-intl";

import { Button, LinkButton } from "@/components/ui";
import { useAuth } from "@/lib/auth";

import { ShareJobButton } from "./ShareJobButton";

/**
 * Primary job actions (spec §14.3): Apply Now, Save Job, Share.
 *
 * - Apply Now resolves by session state:
 *     anonymous            -> link to /sign-in (apply flow arrives in Phase 6)
 *     candidate            -> link toward the (placeholder) apply route
 *     employer / admin     -> apply is hidden (they cannot apply to roles)
 * - Save Job is an HONEST disabled affordance — saved jobs is Phase 9, so it is
 *   not wired to anything and says so via its title; we never fake a save.
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
  const { isAuthenticated, role, isLoading } = useAuth();

  const fullWidth = layout === "stacked";
  // Real apply flow is Phase 6 — link to a stable placeholder anchor on the
  // candidate side; anonymous users go to sign-in first.
  const applyHref = `/jobs/${slug}#apply`;
  const canApply = !isAuthenticated || role === "CANDIDATE";

  return (
    <div
      className={
        layout === "stacked" ? "flex flex-col gap-3" : "flex w-full gap-2"
      }
    >
      {canApply ? (
        isAuthenticated ? (
          <LinkButton href={applyHref} fullWidth={fullWidth}>
            {t("applyNow")}
          </LinkButton>
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
