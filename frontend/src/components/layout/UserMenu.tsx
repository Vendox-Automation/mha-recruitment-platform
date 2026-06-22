"use client";

import { useTranslations } from "next-intl";

import type { User } from "@/features/auth/types";
import { Link } from "@/i18n/navigation";
import { destinationForUser, userDisplayName } from "@/lib/auth";
import { cn } from "@/lib/cn";

import { SignOutButton } from "./SignOutButton";

/**
 * Signed-in account control for the public header (spec §14.6). Shows the user's
 * name linking to their role-aware workspace, plus secure sign-out. Replaces the
 * Sign In / Create Account actions once a session is present, so an authenticated
 * user is never shown as a guest on public routes.
 */
export function UserMenu({ user, className }: { user: User; className?: string }) {
  const t = useTranslations("common");

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Link
        href={destinationForUser(user)}
        title={t("nav.workspace")}
        className="type-body-sm max-w-[12rem] truncate font-medium text-text-primary no-underline hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        {userDisplayName(user)}
      </Link>
      <SignOutButton label={t("nav.signOut")} />
    </div>
  );
}
