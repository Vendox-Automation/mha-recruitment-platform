"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { Card, ErrorState, LoadingState } from "@/components/ui";

import { getEmployerProfile } from "../service";
import { CompanyProfileForm } from "./CompanyProfileForm";

const EMPLOYER_PROFILE_KEY = ["employer", "profile"] as const;

/**
 * Approved-employer company-profile editor (spec §14.4/§14.10). Loads the full
 * profile via GET /employer/profile/ and renders the shared edit form. Wrapped
 * by `EmployerWorkspaceGuard` at the page level so only approved employers
 * reach it (pending → /employer/pending). Handles loading and error (retry)
 * states; success is shown inline by the form.
 */
export function CompanyProfileView() {
  const t = useTranslations("employer.companyProfile");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();

  const profileQuery = useQuery({
    queryKey: EMPLOYER_PROFILE_KEY,
    queryFn: () => getEmployerProfile(locale),
  });

  if (profileQuery.isLoading) {
    return (
      <Card>
        <LoadingState
          title={tCommon("loadingTitle")}
          description={tCommon("loadingDescription")}
          spinnerLabel={tCommon("loadingSpinner")}
        />
      </Card>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <Card>
        <ErrorState
          title={tCommon("errorTitle")}
          description={tCommon("errorDescription")}
          action={
            <button
              type="button"
              className="type-body-sm font-semibold text-brand-primary hover:underline"
              onClick={() => profileQuery.refetch()}
            >
              {tCommon("retry")}
            </button>
          }
        />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5">
      <p className="type-body-sm text-text-secondary">{t("editLead")}</p>
      <CompanyProfileForm profile={profileQuery.data} />
    </Card>
  );
}
