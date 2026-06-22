"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import type { ReactNode } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { useAuth, userDisplayName } from "@/lib/auth";
import { cn } from "@/lib/cn";

import { LocaleSwitcher } from "./LocaleSwitcher";
import { SignOutButton } from "./SignOutButton";
import { Wordmark } from "./Wordmark";

export interface DashboardNavItem {
  /** Stable key for React lists. */
  key: string;
  href: string;
  /** Resolved (already localised) label. Server layout passes this in so no
   *  function prop crosses the server/client boundary. */
  label: string;
}

export interface DashboardShellProps {
  /** Visible workspace area label (already localised). */
  areaLabel: string;
  /** Eyebrow that distinguishes candidate vs employer (already localised). */
  eyebrow: string;
  /** Accent treatment — same palette, different emphasis (spec §9.1). */
  accent: "candidate" | "employer" | "admin";
  /** Brand name (from common.brand). */
  brand: string;
  /** Home link aria-label (from common.nav.home). */
  homeLabel: string;
  /** Sign-out label (from common.nav.signOut). */
  signOutLabel: string;
  nav: DashboardNavItem[];
  children: ReactNode;
}

/**
 * Calm operational chrome for candidate/employer working screens (spec §11.7,
 * §5.8). Sidebar on desktop, accessible disclosure on mobile. Candidate and
 * employer areas are visibly distinct via an eyebrow + accent rail while
 * staying one brand and one palette (spec §9.1, §5.2). Restrained motion only.
 */
export function DashboardShell({
  areaLabel,
  eyebrow,
  accent,
  brand,
  homeLabel,
  signOutLabel,
  nav,
  children,
}: DashboardShellProps) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const navId = useId();

  // Close the mobile nav when the route changes (adjust-state-during-render
  // pattern; avoids an effect that syncs state to props).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const accentRail =
    accent === "candidate"
      ? "bg-brand-primary"
      : accent === "admin"
        ? "bg-data-series-5"
        : "bg-data-series-2";

  const navList = (
    <ul className="flex flex-col gap-1">
      {nav.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                active
                  ? "bg-brand-primary-soft text-brand-primary-strong"
                  : "text-text-secondary hover:bg-surface-subtle hover:text-text-primary",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex min-h-screen flex-col bg-surface-raised lg:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 border-r border-border-default bg-surface-canvas lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b border-border-default px-5">
          <Wordmark label={brand} homeLabel={homeLabel} />
        </div>
        <div className="flex items-center gap-2 px-5 py-4">
          <span
            aria-hidden="true"
            className={cn("h-8 w-1 rounded-full", accentRail)}
          />
          <div>
            <p className="type-eyebrow text-brand-primary">{eyebrow}</p>
            <p className="type-label text-text-primary">{areaLabel}</p>
          </div>
        </div>
        <nav
          aria-label={areaLabel}
          className="flex-1 overflow-y-auto px-3 pb-4"
        >
          {navList}
        </nav>
      </aside>

      {/* Mobile topbar */}
      <header className="flex h-16 items-center justify-between border-b border-border-default bg-surface-canvas px-4 lg:hidden">
        <Wordmark label={brand} homeLabel={homeLabel} />
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border-default text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          aria-expanded={open}
          aria-controls={navId}
          aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true" className="text-lg leading-none">
            {open ? "✕" : "☰"}
          </span>
        </button>
      </header>
      <div
        id={navId}
        hidden={!open}
        className="border-b border-border-default bg-surface-canvas px-4 py-4 lg:hidden"
      >
        <p className="type-eyebrow mb-2 text-brand-primary">{eyebrow}</p>
        <nav aria-label={areaLabel}>{navList}</nav>
        <div className="mt-4 border-t border-border-default pt-4">
          {user ? (
            <p className="mb-3 type-body-sm truncate font-medium text-text-primary">
              {userDisplayName(user)}
            </p>
          ) : null}
          <div className="flex items-center justify-between">
            <LocaleSwitcher />
            <SignOutButton label={signOutLabel} />
          </div>
        </div>
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="hidden h-16 items-center justify-end gap-4 border-b border-border-default bg-surface-canvas px-6 lg:flex">
          {user ? (
            <span className="type-body-sm max-w-[16rem] truncate font-medium text-text-primary">
              {userDisplayName(user)}
            </span>
          ) : null}
          <LocaleSwitcher />
          <SignOutButton label={signOutLabel} />
        </div>
        <main id="main-content" className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
