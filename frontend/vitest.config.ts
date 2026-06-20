import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Vitest + React Testing Library config (ADR-0001 §1.2). jsdom environment for
 * component/interaction tests; `@/*` path aliases resolved natively from
 * tsconfig via Vite's built-in support.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
