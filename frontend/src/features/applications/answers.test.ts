import { describe, expect, it } from "vitest";

import { buildAnswersPayload, buildAnswerValue } from "./answers";
import type { AnswerableQuestion } from "./answers";

describe("buildAnswerValue", () => {
  it("trims text answers and treats blank as empty", () => {
    expect(buildAnswerValue("SHORT_TEXT", "  hi  ")).toBe("hi");
    expect(buildAnswerValue("LONG_TEXT", "")).toBeUndefined();
    expect(buildAnswerValue("SHORT_TEXT", "   ")).toBeUndefined();
  });

  it("maps YES_NO to a boolean", () => {
    expect(buildAnswerValue("YES_NO", "true")).toBe(true);
    expect(buildAnswerValue("YES_NO", "yes")).toBe(true);
    expect(buildAnswerValue("YES_NO", "false")).toBe(false);
    expect(buildAnswerValue("YES_NO", "no")).toBe(false);
    expect(buildAnswerValue("YES_NO", "")).toBeUndefined();
  });

  it("parses NUMBER to a finite number, undefined when not numeric", () => {
    expect(buildAnswerValue("NUMBER", "42")).toBe(42);
    expect(buildAnswerValue("NUMBER", "3.5")).toBe(3.5);
    expect(buildAnswerValue("NUMBER", "abc")).toBeUndefined();
    expect(buildAnswerValue("NUMBER", "")).toBeUndefined();
  });

  it("passes SINGLE_CHOICE through as the selected string", () => {
    expect(buildAnswerValue("SINGLE_CHOICE", "Option A")).toBe("Option A");
  });
});

const q = (
  id: string,
  question_type: string,
  is_required = false,
  options_json?: string[],
): AnswerableQuestion => ({ id, question_type, is_required, options_json });

describe("buildAnswersPayload", () => {
  it("builds a typed payload keyed by question id", () => {
    const questions = [
      q("1", "SHORT_TEXT"),
      q("2", "YES_NO"),
      q("3", "NUMBER"),
      q("4", "SINGLE_CHOICE", false, ["A", "B"]),
    ];
    const { payload, errors } = buildAnswersPayload(questions, {
      "1": "Engineer",
      "2": "true",
      "3": "5",
      "4": "B",
    });
    expect(errors).toEqual({});
    expect(payload).toEqual({
      "1": "Engineer",
      "2": true,
      "3": 5,
      "4": "B",
    });
  });

  it("flags required questions left blank and omits optional blanks", () => {
    const questions = [q("1", "SHORT_TEXT", true), q("2", "SHORT_TEXT", false)];
    const { payload, errors } = buildAnswersPayload(questions, {
      "1": "",
      "2": "",
    });
    expect(errors).toEqual({ "1": "errors.required" });
    expect(payload).toEqual({});
  });

  it("flags a required YES_NO with no selection", () => {
    const { errors } = buildAnswersPayload([q("1", "YES_NO", true)], {});
    expect(errors).toEqual({ "1": "errors.required" });
  });

  it("flags a NUMBER with non-numeric text as invalid (not merely required)", () => {
    const { errors, payload } = buildAnswersPayload([q("1", "NUMBER", true)], {
      "1": "ten",
    });
    expect(errors).toEqual({ "1": "errors.invalidNumber" });
    expect(payload).toEqual({});
  });

  it("rejects a SINGLE_CHOICE value outside the allowed options", () => {
    const { errors } = buildAnswersPayload(
      [q("1", "SINGLE_CHOICE", true, ["A", "B"])],
      { "1": "C" },
    );
    expect(errors).toEqual({ "1": "errors.invalidChoice" });
  });

  it("omits an empty optional NUMBER without error", () => {
    const { errors, payload } = buildAnswersPayload([q("1", "NUMBER", false)], {
      "1": "",
    });
    expect(errors).toEqual({});
    expect(payload).toEqual({});
  });
});
