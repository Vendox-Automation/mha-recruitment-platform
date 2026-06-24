"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { destinationForUser, useAuth, userDisplayName } from "@/lib/auth";
import { cn } from "@/lib/cn";

import { LinkButton } from "@/components/ui";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { SignOutButton } from "./SignOutButton";
import { UserMenu } from "./UserMenu";
import { Wordmark } from "./Wordmark";

const NAV: { key: string; href: string }[] = [
  { key: "findJobs", href: "/jobs" },
  { key: "companies", href: "/companies" },
  { key: "careerSupport", href: "/career-support" },
  { key: "forEmployers", href: "/for-employers" },
];

/**
 * Public site header (spec §14.1 A, §9.1). Strong hierarchy without an oversized
 * bar. Desktop shows inline nav + locale switcher, and is AUTH-AWARE: a signed-in
 * user sees their name (linking to their workspace) + sign-out instead of the
 * Sign In / Create Account actions, so an authenticated user is never shown as a
 * guest on public routes (spec §14.6). Mobile uses an accessible disclosure menu
 * (keyboard + screen-reader friendly, no hover-only — spec §24). Locale switching
 * preserves the current route.
 */
export function PublicHeader() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const menuId = useId();

  // Close the mobile menu when the route changes, by adjusting state during
  // render (React's "store previous value" pattern) rather than in an effect.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-surface-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-surface-canvas/80">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Wordmark label={t("brand")} homeLabel={t("nav.home")} />
          <nav aria-label={t("nav.primary")} className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                        active
                          ? "text-brand-primary"
                          : "text-text-secondary hover:bg-surface-subtle hover:text-text-primary",
                      )}
                    >
                      {t(`nav.${item.key}`)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <LocaleSwitcher />
          {/* Avoid flashing guest actions before the session resolves. */}
          {isLoading ? null : user ? (
            <UserMenu user={user} className="ml-1" />
          ) : (
            <>
              <LinkButton href="/sign-in" variant="ghost" size="sm">
                {t("nav.signIn")}
              </LinkButton>
              <LinkButton href="/register" variant="primary" size="sm">
                {t("nav.createAccount")}
              </LinkButton>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border-default text-text-primary lg:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true" className="text-lg leading-none">
            {open ? "✕" : "☰"}
          </span>
        </button>
      </div>

      {/* Mobile disclosure menu */}
      <div
        id={menuId}
        hidden={!open}
        className="border-t border-border-default bg-surface-canvas lg:hidden"
      >
        <nav aria-label={t("nav.primary")} className="px-4 py-4 sm:px-6">
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="block rounded-md px-3 py-2.5 text-sm font-medium text-text-primary no-underline hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2 border-t border-border-default pt-4">
            {isLoading ? null : user ? (
              <>
                <LinkButton
                  href={destinationForUser(user)}
                  variant="secondary"
                  size="md"
                  fullWidth
                >
                  {userDisplayName(user)}
                </LinkButton>
                <div className="flex items-center justify-between pt-2">
                  <LocaleSwitcher />
                  <SignOutButton label={t("nav.signOut")} />
                </div>
              </>
            ) : (
              <>
                <LinkButton
                  href="/sign-in"
                  variant="secondary"
                  size="md"
                  fullWidth
                >
                  {t("nav.signIn")}
                </LinkButton>
                <LinkButton href="/register" variant="primary" size="md" fullWidth>
                  {t("nav.createAccount")}
                </LinkButton>
                <div className="pt-2">
                  <LocaleSwitcher />
                </div>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
