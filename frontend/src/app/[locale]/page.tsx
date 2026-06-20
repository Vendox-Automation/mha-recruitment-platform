import { getTranslations, setRequestLocale } from "next-intl/server";

/**
 * Placeholder homepage for the Phase 0 skeleton. The full executive homepage
 * is built in Phase 10; the page shells arrive in Phase 1.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="text-sm font-medium uppercase tracking-wide text-brand-primary">
        {t("operatedBy")}
      </p>
      <h1 className="text-4xl font-semibold leading-tight text-text-primary sm:text-5xl">
        {t("headline")}
      </h1>
      <p className="max-w-2xl text-lg text-text-secondary">{t("subheadline")}</p>
    </main>
  );
}
