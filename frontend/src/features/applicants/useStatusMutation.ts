"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { applicantDetailKey } from "./queryKeys";
import { updateApplicantStatus } from "./service";
import type {
  ApplicationStatus,
  EmployerApplicantDetail,
  EmployerApplicantListItem,
  Paginated,
} from "./types";

/** A query key + the function that immutably maps a list item to its next form. */
type ListKey = readonly unknown[];

interface UseStatusMutationArgs {
  /** The list query key to optimistically patch (the per-job applicant list). */
  listKey: ListKey;
  /** The active locale, forwarded so server messages are localised. */
  locale?: string;
  /** Called after the server confirms (e.g. to surface a success notice). */
  onSettledSuccess?: (detail: EmployerApplicantDetail) => void;
  /** Called when the optimistic change is rolled back (to surface an error). */
  onRollback?: (applicantId: string) => void;
}

interface StatusMutationVars {
  id: string;
  status: ApplicationStatus;
  change_note?: string;
}

interface StatusMutationContext {
  previousList?: Paginated<EmployerApplicantListItem>;
}

/**
 * Status-change mutation with OPTIMISTIC UI and ROLLBACK (spec §14.12). The
 * applicant's status is updated in the cached list immediately so the Kanban
 * card / split-screen stage flips without waiting for the round-trip; if the
 * PATCH fails, `onMutate`'s snapshot is restored in `onError` and `onRollback`
 * fires so the caller can show a clear, non-blaming error. Every committed
 * change persists via the API (the server records the history row).
 */
export function useStatusMutation({
  listKey,
  locale,
  onSettledSuccess,
  onRollback,
}: UseStatusMutationArgs) {
  const queryClient = useQueryClient();

  return useMutation<
    EmployerApplicantDetail,
    unknown,
    StatusMutationVars,
    StatusMutationContext
  >({
    mutationFn: ({ id, status, change_note }) =>
      updateApplicantStatus(id, { status, change_note }, locale),

    async onMutate({ id, status }) {
      // Stop in-flight refetches from clobbering the optimistic value.
      await queryClient.cancelQueries({ queryKey: listKey });

      const previousList =
        queryClient.getQueryData<Paginated<EmployerApplicantListItem>>(listKey);

      if (previousList) {
        queryClient.setQueryData<Paginated<EmployerApplicantListItem>>(listKey, {
          ...previousList,
          results: previousList.results.map((item) =>
            item.id === id ? { ...item, status } : item,
          ),
        });
      }

      return { previousList };
    },

    onError(_error, variables, context) {
      // Roll back to the pre-mutation snapshot.
      if (context?.previousList) {
        queryClient.setQueryData(listKey, context.previousList);
      }
      onRollback?.(variables.id);
    },

    onSuccess(detail) {
      // Seed the detail cache with the server's fresh copy (carries history).
      queryClient.setQueryData(applicantDetailKey(detail.id), detail);
      onSettledSuccess?.(detail);
    },

    onSettled() {
      // Reconcile with the server for both list and the touched detail.
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}
