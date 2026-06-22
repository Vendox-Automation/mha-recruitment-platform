import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RatingInput, StarRating } from "./StarRating";

describe("StarRating (display)", () => {
  it("exposes a single labelled image to assistive tech", () => {
    render(<StarRating value={4.3} label="4.3 out of 5" />);
    const img = screen.getByRole("img", { name: "4.3 out of 5" });
    expect(img).toBeInTheDocument();
  });
});

describe("RatingInput (interactive)", () => {
  it("is a labelled radio group with five options", () => {
    render(
      <RatingInput
        value={0}
        onChange={vi.fn()}
        legend="Select a rating"
        optionLabel={(r) => `${r} out of 5`}
      />,
    );
    expect(
      screen.getByRole("radiogroup", { name: "Select a rating" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(
      screen.getByRole("radio", { name: "3 out of 5" }),
    ).toBeInTheDocument();
  });

  it("selects a rating on click", async () => {
    const onChange = vi.fn();
    render(
      <RatingInput
        value={0}
        onChange={onChange}
        legend="Select a rating"
        optionLabel={(r) => `${r} out of 5`}
      />,
    );
    await userEvent.click(screen.getByRole("radio", { name: "4 out of 5" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("moves the rating with the arrow keys", async () => {
    const onChange = vi.fn();
    render(
      <RatingInput
        value={3}
        onChange={onChange}
        legend="Select a rating"
        optionLabel={(r) => `${r} out of 5`}
      />,
    );
    const selected = screen.getByRole("radio", { name: "3 out of 5" });
    selected.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith(4);
  });
});
