"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ADMIN_ROOT_KEY, ADMIN_SUMMARY_KEY } from "./queryKeys";
import {
  approveEmployer,
  rejectEmployer,
  restoreEmployer,
  suspendEmployer,
} from "./service";
import type { AdminEmployerAction } from "./status";
import type { AdminEmployerDetail } from "./types";

interface EmployerActionVars {
  id: string | number;
  action: AdminEmployerAction;
  /** Required for `reject`, ignored otherwise. */
  reason?: string;
}

interface UseEmployerActionArgs {
  locale?: string;
  onSuccess?: (detail: AdminEmployerDetail, vars: EmployerActionVars) => void;
  onError?: (error: unknown, vars: EmployerActionVars) => void;
}

/**
 * Employer approval-action mutation. On success it invalidates the whole admin
 * tree (every employer-list page + the summary counts) so the queue and the
 * dashboard reconcile with the server — the source of truth for the lifecycle.
 *
 * Unlike the candidate Kanban, this is NOT optimistic: an approval decision is
 * consequential and a row's status / available actions depend on the server's
 * verdict, so we wait for confirmation before mutating the visible state.
 */
export function useEmployerAction({
  locale,
  onSuccess,
  onError,
}: UseEmployerActionArgs = {}) {
  const queryClient = useQueryClient();

  return useMutation<AdminEmployerDetail, unknown, EmployerActionVars>({
    mutationFn: ({ id, action, reason }) => {
      switch (action) {
        case "approve":
          return approveEmployer(id, locale);
        case "reject":
          return rejectEmployer(id, reason ?? "", locale);
        case "suspend":
          return suspendEmployer(id, locale);
        case "restore":
          return restoreEmployer(id, locale);
        default:
          return Promise.reject(new Error(`Unknown action: ${action}`));
      }
    },

    onSuccess(detail, vars) {
      onSuccess?.(detail, vars);
    },

    onError(error, vars) {
      onError?.(error, vars);
    },

    onSettled() {
      // Reconcile every admin query (all list pages + the dashboard summary).
      void queryClient.invalidateQueries({ queryKey: ADMIN_ROOT_KEY });
      void queryClient.invalidateQueries({ queryKey: ADMIN_SUMMARY_KEY });
    },
  });
}

export type { EmployerActionVars };
