import { describe, expect, it } from "vitest";

import type { User } from "@/features/auth/types";

import {
  destinationForUser,
  hasRole,
  isAdmin,
  isApprovedEmployer,
} from "./redirects";

function makeUser(overrides: Partial<User>): User {
  return {
    id: "u1",
    email: "person@example.com",
    role: "CANDIDATE",
    status: "ACTIVE",
    preferred_locale: "en",
    is_email_verified: true,
    profile: null,
    ...overrides,
  };
}

describe("destinationForUser", () => {
  it("sends candidates to the candidate dashboard", () => {
    expect(destinationForUser(makeUser({ role: "CANDIDATE" }))).toBe(
      "/candidate/dashboard",
    );
  });

  it("sends approved employers to the employer dashboard", () => {
    const user = makeUser({
      role: "EMPLOYER",
      profile: { approval_status: "APPROVED" },
    });
    expect(destinationForUser(user)).toBe("/employer/dashboard");
  });

  it("sends pending employers to the pending screen", () => {
    const user = makeUser({
      role: "EMPLOYER",
      status: "PENDING",
      profile: { approval_status: "PENDING" },
    });
    expect(destinationForUser(user)).toBe("/employer/pending");
  });

  it("treats employers with no approval status as not-yet-approved", () => {
    const user = makeUser({ role: "EMPLOYER", profile: null });
    expect(destinationForUser(user)).toBe("/employer/pending");
  });

  it("rejected and suspended employers do not reach the workspace", () => {
    for (const approval of ["REJECTED", "SUSPENDED"] as const) {
      const user = makeUser({
        role: "EMPLOYER",
        profile: { approval_status: approval },
      });
      expect(destinationForUser(user)).toBe("/employer/pending");
    }
  });

  it("leaves admins on the home page (admins use Django Admin)", () => {
    expect(destinationForUser(makeUser({ role: "ADMIN" }))).toBe("/");
  });
});

describe("isApprovedEmployer", () => {
  it("is true only for approved employers", () => {
    expect(
      isApprovedEmployer(
        makeUser({ role: "EMPLOYER", profile: { approval_status: "APPROVED" } }),
      ),
    ).toBe(true);
    expect(
      isApprovedEmployer(
        makeUser({ role: "EMPLOYER", profile: { approval_status: "PENDING" } }),
      ),
    ).toBe(false);
    expect(isApprovedEmployer(makeUser({ role: "CANDIDATE" }))).toBe(false);
  });
});

describe("hasRole", () => {
  it("matches the user's role and handles null", () => {
    expect(hasRole(makeUser({ role: "EMPLOYER" }), "EMPLOYER")).toBe(true);
    expect(hasRole(makeUser({ role: "CANDIDATE" }), "EMPLOYER")).toBe(false);
    expect(hasRole(null, "CANDIDATE")).toBe(false);
  });
});

describe("isAdmin", () => {
  it("is true only for the admin role", () => {
    expect(isAdmin(makeUser({ role: "ADMIN" }))).toBe(true);
    expect(isAdmin(makeUser({ role: "CANDIDATE" }))).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
});
