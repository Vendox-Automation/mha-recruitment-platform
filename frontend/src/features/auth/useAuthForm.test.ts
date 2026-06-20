import { describe, expect, it, vi } from "vitest";

import { ApiRequestError } from "@/lib/api/client";

import { applyApiError } from "./useAuthForm";

const KNOWN = ["email", "password"] as const;

describe("applyApiError", () => {
  it("maps known field errors onto the form and returns no form-level message", () => {
    const setError = vi.fn();
    const error = new ApiRequestError({
      code: "validation_error",
      message: "Please review the highlighted fields.",
      fields: { email: ["Enter a valid email address."] },
      status: 400,
    });

    const formMessage = applyApiError(error, setError, KNOWN, "fallback");

    expect(setError).toHaveBeenCalledWith("email", {
      type: "server",
      message: "Enter a valid email address.",
    });
    expect(formMessage).toBeNull();
  });

  it("joins multiple messages for one field", () => {
    const setError = vi.fn();
    const error = new ApiRequestError({
      code: "validation_error",
      message: "x",
      fields: { password: ["Too short.", "Needs a number."] },
      status: 400,
    });

    applyApiError(error, setError, KNOWN, "fallback");

    expect(setError).toHaveBeenCalledWith("password", {
      type: "server",
      message: "Too short. Needs a number.",
    });
  });

  it("folds unknown fields (e.g. non_field_errors) into the form-level message", () => {
    const setError = vi.fn();
    const error = new ApiRequestError({
      code: "validation_error",
      message: "These credentials are invalid.",
      fields: { non_field_errors: ["These credentials are invalid."] },
      status: 400,
    });

    const formMessage = applyApiError(error, setError, KNOWN, "fallback");

    expect(setError).not.toHaveBeenCalled();
    expect(formMessage).toBe("These credentials are invalid.");
  });

  it("returns the envelope message when there are no field details", () => {
    const setError = vi.fn();
    const error = new ApiRequestError({
      code: "throttled",
      message: "Too many attempts. Try again later.",
      status: 429,
    });

    const formMessage = applyApiError(error, setError, KNOWN, "fallback");

    expect(formMessage).toBe("Too many attempts. Try again later.");
  });

  it("returns the fallback for non-API errors", () => {
    const setError = vi.fn();
    const formMessage = applyApiError(
      new Error("network down"),
      setError,
      KNOWN,
      "fallback",
    );
    expect(formMessage).toBe("fallback");
    expect(setError).not.toHaveBeenCalled();
  });
});
