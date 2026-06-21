import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/**
 * Locale-aware navigation helpers. Using these (instead of next/link and
 * next/navigation directly) preserves the active locale across navigation
 * (spec §17.2 "keep the user on the equivalent route when switching language").
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
