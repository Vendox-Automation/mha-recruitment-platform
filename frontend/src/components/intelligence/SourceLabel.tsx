import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui";

export type IntelligenceSource =
  | "mhaInsight"
  | "platformAnalytics"
  | "illustrativePreview";

/**
 * Mandatory source label for every Career Intelligence module (spec §5.3,
 * §13.5, AGENTS §13). Each insight must state whether it is MHA insight, real
 * platform analytics, or an illustrative preview — never implied as live data.
 */
export function SourceLabel({ source }: { source: IntelligenceSource }) {
  const t = useTranslations("common.source");
  const tone =
    source === "mhaInsight"
      ? "brand"
      : source === "platformAnalytics"
        ? "success"
        : "neutral";
  return <Badge tone={tone}>{t(source)}</Badge>;
}
