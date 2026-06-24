import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  BRAND_LOGOS,
  BrandLogo,
  MhaMark,
  VendoxMark,
  WeweMark,
  WoodeeMark,
} from "./BrandLogos";

describe("BrandLogos marks", () => {
  const marks = [
    ["VendoxMark", VendoxMark],
    ["MhaMark", MhaMark],
    ["WoodeeMark", WoodeeMark],
    ["WeweMark", WeweMark],
  ] as const;

  it.each(marks)("%s renders an <svg>", (_name, Mark) => {
    const { container } = render(<Mark />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("exposes role=img + accessible name when not decorative", () => {
    const { container } = render(<MhaMark title="MHA" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-label", "MHA");
  });

  it("drops role/aria-label and hides when decorative", () => {
    const { container } = render(<MhaMark title="MHA" aria-hidden="true" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toHaveAttribute("role");
    expect(svg).not.toHaveAttribute("aria-label");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});

describe("BrandLogo registry", () => {
  it("covers every registry slug", () => {
    expect(Object.keys(BRAND_LOGOS).sort()).toEqual([
      "mha",
      "vendox",
      "wewe",
      "woodee",
    ]);
  });

  it.each(Object.keys(BRAND_LOGOS))("renders an <svg> for %s", (slug) => {
    const { container } = render(<BrandLogo slug={slug} aria-hidden />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("returns null for an unknown slug", () => {
    const { container } = render(<BrandLogo slug="not-a-brand" />);
    expect(container.firstChild).toBeNull();
  });
});
