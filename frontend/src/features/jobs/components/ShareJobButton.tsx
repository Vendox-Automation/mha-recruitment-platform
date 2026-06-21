"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui";

/**
 * Share action for a job (spec §14.3 / §15.6). Uses the native Web Share API
 * when available, otherwise copies the current URL to the clipboard and shows a
 * brief confirmation. Keyboard accessible; degrades gracefully.
 */
export function ShareJobButton({ fullWidth }: { fullWidth?: boolean }) {
  const t = useTranslations("jobs.detail");
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const nav = window.navigator as Navigator & {
      share?: (data: { url: string }) => Promise<void>;
    };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ url });
        return;
      } catch {
        // User dismissed share sheet — fall through to copy.
      }
    }
    try {
      await window.navigator.clipboard?.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — no-op; the URL remains in the address bar.
    }
  }

  return (
    <Button
      variant="ghost"
      fullWidth={fullWidth}
      onClick={handleShare}
      aria-live="polite"
    >
      {copied ? t("shareCopied") : t("shareJob")}
    </Button>
  );
}
