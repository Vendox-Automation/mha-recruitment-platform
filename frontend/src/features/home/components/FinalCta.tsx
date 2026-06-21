"use client";

import { useTranslations } from "next-intl";

import { Card, LinkButton } from "@/components/ui";
import { cn } from "@/lib/cn";

import { PERSPECTIVES } from "../perspective";
import { usePerspective } from "../PerspectiveContext";

const CTA: Record<
  "candidate" | "employer",
  { href: string; variant: "primary" | "secondary" }
> = {
  candidate: { href: "/register/candidate", variant: "primary" },
  employer: { href: "/register/employer", variant: "secondary" },
};

/**
 * Final dual call to action (spec §14.1 J). EQUAL candidate and employer next
 * steps — both always present and full-width — with the card matching the
 * selected perspective given a subtle border emphasis so the chosen path is
 * one obvious click without repeating the entire hero (spec §14.1 J).
 */
export function FinalCta() {
  const t = useTranslations("home.finalCta");
  const { perspective } = usePerspective();

  return (
    <div className="mx-auto mt-8 grid max-w-3xl gap-6 sm:grid-cols-2">
      {PERSPECTIVES.map((key) => {
        const active = key === perspective;
        return (
          <Card
            key={key}
            className={cn(
              "flex flex-col gap-3 transition-colors",
              active && "border-brand-primary ring-1 ring-brand-primary",
            )}
          >
            <h3 className="type-heading-3 text-text-primary">
              {t(`${key}Title`)}
            </h3>
            <p className="type-body-sm text-text-secondary">
              {t(`${key}Body`)}
            </p>
            <div className="mt-auto pt-1">
              <LinkButton
                href={CTA[key].href}
                variant={CTA[key].variant}
                fullWidth
              >
                {t(`${key}Cta`)}
              </LinkButton>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
