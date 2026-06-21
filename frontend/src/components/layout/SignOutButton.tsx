"use client";

import { useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

export interface SignOutButtonProps {
  /** Localised sign-out label (passed from the server layout). */
  label: string;
  className?: string;
}

/**
 * Sign-out control for the dashboard chrome (ADR-0001 §4.1, spec §11 secure
 * logout). Calls `logout()` — which clears the Django session server-side and
 * drops the cached `["me"]` query — then returns to the locale home. Rendered
 * as a real <button> so it is keyboard- and screen-reader-accessible.
 */
export function SignOutButton({ label, className }: SignOutButtonProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onClick = async () => {
    setPending(true);
    try {
      await logout();
      router.replace("/");
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(
        "type-body-sm text-text-secondary no-underline transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {label}
    </button>
  );
}
