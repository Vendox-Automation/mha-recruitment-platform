import { describe, expect, it } from "vitest";

import {
  bandLabelKey,
  bandTone,
  FIT_REASON_CODES,
  isSparseFit,
  localizeReasons,
} from "./fit";

describe("bandTone", () => {
  it("maps each band to a distinct, non-default status tone", () => {
    expect(bandTone("strong")).toBe("success");
    expect(bandTone("good")).toBe("info");
    expect(bandTone("partial")).toBe("warning");
    expect(bandTone("limited")).toBe("neutral");
  });

  it("falls back to neutral for an unknown band rather than throwing", () => {
    expect(bandTone("nonsense")).toBe("neutral");
  });
});

describe("bandLabelKey", () => {
  it("returns the label key for each known band", () => {
    expect(bandLabelKey("strong")).toBe("strong");
    expect(bandLabelKey("good")).toBe("good");
    expect(bandLabelKey("partial")).toBe("partial");
    expect(bandLabelKey("limited")).toBe("limited");
  });

  it("falls back to limited for an unknown band", () => {
    expect(bandLabelKey("???")).toBe("limited");
  });
});

describe("isSparseFit", () => {
  it("is sparse when there is no matched/gap signal and only unknowns", () => {
    expect(isSparseFit({ matched: [], gaps: [], unknown: ["No resume yet"] })).toBe(
      true,
    );
  });

  it("is NOT sparse when there is at least one matched factor", () => {
    expect(
      isSparseFit({ matched: ["Title aligns"], gaps: [], unknown: ["x", "y"] }),
    ).toBe(false);
  });

  it("is NOT sparse when there is at least one concrete gap", () => {
    expect(
      isSparseFit({ matched: [], gaps: ["Location differs"], unknown: ["x"] }),
    ).toBe(false);
  });

  it("is NOT sparse when there are no signals at all (nothing to render)", () => {
    expect(isSparseFit({ matched: [], gaps: [], unknown: [] })).toBe(false);
  });
});

describe("localizeReasons", () => {
  const translate = (code: string) => `t:${code}`;

  it("resolves every known reason code via the translator", () => {
    const allCodes = [
      ...FIT_REASON_CODES.matched,
      ...FIT_REASON_CODES.gaps,
      ...FIT_REASON_CODES.unknown,
    ];
    expect(localizeReasons(allCodes, translate)).toEqual(
      allCodes.map((code) => `t:${code}`),
    );
  });

  it("drops unrecognised codes rather than rendering them raw", () => {
    expect(
      localizeReasons(["title_strong", "made_up_code", "location_match"], translate),
    ).toEqual(["t:title_strong", "t:location_match"]);
  });

  it("returns an empty array when given no codes", () => {
    expect(localizeReasons([], translate)).toEqual([]);
  });
});
