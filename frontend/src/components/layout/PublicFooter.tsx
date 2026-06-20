import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { LocaleSwitcher } from "./LocaleSwitcher";
import { Wordmark } from "./Wordmark";

const COLUMNS: { heading: string; links: { key: string; href: string }[] }[] = [
  {
    heading: "candidates",
    links: [
      { key: "findJobs", href: "/jobs" },
      { key: "companies", href: "/companies" },
      { key: "careerSupport", href: "/career-support" },
      { key: "createAccount", href: "/register/candidate" },
    ],
  },
  {
    heading: "employers",
    links: [
      { key: "forEmployers", href: "/for-employers" },
      { key: "employerAccess", href: "/register/employer" },
      { key: "signIn", href: "/sign-in" },
    ],
  },
  {
    heading: "platform",
    links: [
      { key: "support", href: "/career-support" },
      { key: "privacy", href: "/privacy" },
      { key: "terms", href: "/terms" },
    ],
  },
];

/**
 * Public site footer (spec §14.1 K, §9.1). MHA identity, candidate + employer
 * access, support, privacy/terms, and a route-preserving locale switcher.
 */
export function PublicFooter() {
  const t = useTranslations("common");

  return (
    <footer className="border-t border-border-default bg-surface-raised">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div className="flex flex-col gap-3">
          <Wordmark label={t("brand")} homeLabel={t("nav.home")} />
          <p className="type-body-sm max-w-xs text-text-secondary">
            {t("footer.about")}
          </p>
          <p className="type-caption">{t("operatedByMha")}</p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.heading} aria-label={t(`footer.${column.heading}`)}>
            <h2 className="type-label text-text-primary">
              {t(`footer.${column.heading}`)}
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={`${column.heading}-${link.key}`}>
                  <Link
                    href={link.href}
                    className="type-body-sm text-text-secondary no-underline hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  >
                    {t(`footer.links.${link.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-border-default">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="type-caption">{t("footer.copyright")}</p>
          <LocaleSwitcher />
        </div>
      </div>
    </footer>
  );
}
