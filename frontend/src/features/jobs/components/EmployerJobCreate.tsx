"use client";

import { useQueryClient } from "@tanstack/react-query";

import { Card } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";

import { JobForm } from "./JobForm";

/**
 * Create-mode wrapper around {@link JobForm} (spec §14.11). On a successful
 * POST the new DRAFT job is returned; we invalidate the cached jobs list and
 * route to the job's owner detail/preview so the employer can review and then
 * publish from there.
 */
export function EmployerJobCreate() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return (
    <Card>
      <JobForm
        onSaved={(job) => {
          queryClient.invalidateQueries({ queryKey: ["employer", "jobs"] });
          router.push(`/employer/jobs/${job.id}`);
        }}
      />
    </Card>
  );
}
