import { getTranslations } from "next-intl/server";

import { Card } from "@/components/ui";

/**
 * Architectural step sequence for the "How the journey works" section
 * (spec §14.1 F) — numbered, ordered, not a playful timeline. Server component;
 * candidate and employer paths shown side by side for equal prominence.
 */
export async function JourneySteps() {
  const t = await getTranslations("home.journey");
  const paths = [
    { key: "candidate" as const, title: t("candidateTitle") },
    { key: "employer" as const, title: t("employerTitle") },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {paths.map((path) => (
        <Card key={path.key} className="flex flex-col gap-5">
          <h3 className="type-heading-3 text-text-primary">{path.title}</h3>
          <ol className="flex flex-col gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <li key={n} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-primary-soft text-sm font-semibold text-brand-primary-strong"
                >
                  {n}
                </span>
                <span className="type-body text-text-secondary">
                  {t(`${path.key}.step${n}`)}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      ))}
    </div>
  );
}
