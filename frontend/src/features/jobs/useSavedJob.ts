"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocale } from "next-intl";

import { useAuth } from "@/lib/auth";

import { savedJobsKey } from "./savedJobsQueryKeys";
import { listSavedJobs, saveJob, unsaveJob } from "./savedJobsService";
import type { SavedJob } from "./savedJobsTypes";

/**
 * The signed-in candidate's saved-jobs list query, gated to candidates so an
 * anonymous/employer/admin session never fetches it. Used by the saved-jobs page
 * and (indirectly) by {@link useSavedJob} to derive a single job's saved state.
 */
export function useSavedJobsList() {
  const locale = useLocale();
  const { isAuthenticated, role } = useAuth();
  const isCandidate = isAuthenticated && role === "CANDIDATE";

  return useQuery<SavedJob[]>({
    queryKey: savedJobsKey(locale),
    queryFn: () => listSavedJobs(locale),
    enabled: isCandidate,
    staleTime: 30_000,
  });
}

export interface UseSavedJobResult {
  /** Whether this candidate has the job saved (optimistically up to date). */
  isSaved: boolean;
  /** The list is still resolving — defer rendering the toggle's final state. */
  isLoading: boolean;
  /** A save/unsave request is in flight. */
  isMutating: boolean;
  /** The last mutation failed and was rolled back (caller may surface a notice). */
  isError: boolean;
  /** Save by slug, or un-save by the job id when one is known. */
  toggle: () => void;
}

/**
 * Drives a per-job save/un-save toggle (spec §15.5). The saved state is derived
 * from the candidate's saved-jobs list cache — one shared query backs every
 * toggle on a page rather than a probe per job.
 *
 * Optimistic with rollback: `toggle` patches the cached list immediately, then
 * the mutation reconciles. On error the previous list snapshot is restored and
 * `isError` flips true so the UI can show an honest "couldn't save" message.
 *
 * Un-save needs the job's UUID (the DELETE path is keyed by job id). When the
 * id is unknown (a backend build that has not exposed it yet), un-save is a
 * no-op and `canUnsave` is false so the caller can disable the control rather
 * than fire a broken request.
 */
export function useSavedJob({
  slug,
  jobId,
}: {
  slug: string;
  /** The job's UUID, when available — required to un-save. */
  jobId?: string;
}): UseSavedJobResult & { canUnsave: boolean } {
  const locale = useLocale();
  const queryClient = useQueryClient();
  const list = useSavedJobsList();

  const key = savedJobsKey(locale);
  const rows = list.data ?? [];
  const savedRow = rows.find((row) => row.job.slug === slug);
  const isSaved = savedRow !== undefined;
  // Prefer the job id surfaced on the saved row; fall back to the prop.
  const resolvedJobId = savedRow?.job.id ?? jobId;
  const canUnsave = resolvedJobId !== undefined;

  const save = useMutation({
    mutationFn: () => saveJob(slug, locale),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SavedJob[]>(key);
      // Optimistically insert a placeholder row so the toggle flips at once.
      if (previous && !previous.some((row) => row.job.slug === slug)) {
        const optimistic: SavedJob = {
          id: `optimistic-${slug}`,
          created_at: new Date().toISOString(),
          is_available: true,
          job: {
            id: jobId,
            slug,
            title: "",
            location: null,
            employment_type: "",
            salary_min: null,
            salary_max: null,
            salary_currency: null,
            salary_period: null,
            salary_disclosed: false,
            status: "PUBLISHED",
            is_mha_supported: false,
            company: null,
          },
        };
        queryClient.setQueryData<SavedJob[]>(key, [optimistic, ...previous]);
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (saved) => {
      // Replace the optimistic placeholder with the authoritative row.
      queryClient.setQueryData<SavedJob[]>(key, (current) => {
        const without = (current ?? []).filter(
          (row) => row.job.slug !== slug,
        );
        return [saved, ...without];
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const unsave = useMutation({
    mutationFn: () => {
      if (!resolvedJobId) {
        return Promise.reject(new Error("missing-job-id"));
      }
      return unsaveJob(resolvedJobId, locale);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SavedJob[]>(key);
      queryClient.setQueryData<SavedJob[]>(key, (current) =>
        (current ?? []).filter((row) => row.job.slug !== slug),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const toggle = () => {
    if (save.isPending || unsave.isPending) return;
    if (isSaved) {
      if (canUnsave) unsave.mutate();
    } else {
      save.mutate();
    }
  };

  return {
    isSaved,
    isLoading: list.isLoading,
    isMutating: save.isPending || unsave.isPending,
    isError: save.isError || unsave.isError,
    canUnsave,
    toggle,
  };
}
