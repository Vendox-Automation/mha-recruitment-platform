"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui";
import { statusTone } from "@/features/applications";

import { statusLabelKey } from "../board";
import type { ApplicationStatus } from "../types";

/**
 * Localised applicant-status badge for the employer workspace. The stage is
 * always carried by the TEXT (mapped on the frontend from the status code) so
 * meaning never depends on colour alone (spec §13.7). The tone mapping is shared
 * with the candidate side ({@link statusTone}); the labels live in the employer
 * namespace so both surfaces stay at locale parity.
 */
export function ApplicantStatusBadge({
  status,
}: {
  status: ApplicationStatus;
}) {
  const t = useTranslations("employer.applicants");
  return (
    <Badge tone={statusTone(status)} withDot>
      {t(statusLabelKey(status))}
    </Badge>
  );
}
