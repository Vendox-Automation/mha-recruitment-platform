import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount React trees after each test so DOM/state never leaks between cases.
afterEach(() => {
  cleanup();
});
