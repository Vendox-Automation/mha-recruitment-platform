"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui";

import { statusLabelKey, statusTone } from "../status";
import type { ApplicationStatus } from "../types";

/**
 * Localised status badge. The stage is always carried by the TEXT (mapped on the
 * frontend from the status code, never the backend label) so meaning never
 * depends on colour alone (spec §13.7). A dot adds a second, non-colour cue.
 */
export function ApplicationStatusBadge({
  status,
}: {
  status: ApplicationStatus;
}) {
  const t = useTranslations("candidate.applications");
  return (
    <Badge tone={statusTone(status)} withDot>
      {t(statusLabelKey(status))}
    </Badge>
  );
}
