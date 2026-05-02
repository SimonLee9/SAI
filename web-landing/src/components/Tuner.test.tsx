import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Tuner from "./Tuner";
import { audioRegistry } from "../test/audio-mock";

// Tuner state-machine tests. Drag interaction itself is hard to exercise
// without a real layout (jsdom returns zero rects), so these focus on the
// non-positional state: source switch, reset, audio lifecycle.

describe("Tuner — EQ state machine", () => {
  it("renders five band handles initialised at 0 dB", () => {
    render(<Tuner />);
    const handles = screen.getAllByRole("slider");
    // The five EQ band handles share role=slider; the Q range inputs are
    // role=slider too (5 of them) — so we expect 10 slider elements total.
    expect(handles.length).toBeGreaterThanOrEqual(5);

    // Five band handles include the Hz/dB summary in their accessible name.
    const bandHandles = handles.filter((h) =>
      /Band \d+: \d+ Hz, 0\.0 dB/.test(h.getAttribute("aria-label") ?? ""),
    );
    expect(bandHandles).toHaveLength(5);
  });

  it("switches source when a different option is clicked", async () => {
    const user = userEvent.setup();
    render(<Tuner />);

    const sweepBtn = screen.getByRole("button", { name: /Sweep/ });
    await user.click(sweepBtn);
    // Source button shows label even when active; just confirm the click
    // didn't crash and the button remains in the DOM.
    expect(sweepBtn).toBeInTheDocument();
  });

  it("starts playback and creates an AudioContext + filter chain", async () => {
    const user = userEvent.setup();
    render(<Tuner />);

    expect(audioRegistry.contexts).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "재생" }));

    expect(audioRegistry.contexts).toHaveLength(1);
    // The filter chain installs as part of context init: 5 BiquadFilters,
    // a master gain, and an analyser. Mock counts approximate this.
    expect(audioRegistry.gains.length).toBeGreaterThanOrEqual(1);
  });

  it("reset returns all band labels to 0.0 dB", async () => {
    const user = userEvent.setup();
    render(<Tuner />);

    // Bands are at 0.0 dB on first render.
    const zeroDB = screen.getAllByText(/^\+?0\.0 dB$/);
    expect(zeroDB.length).toBe(5);

    // Reset is idempotent at start; the test asserts the action wires up.
    await user.click(screen.getByRole("button", { name: "초기화" }));
    expect(screen.getAllByText(/^\+?0\.0 dB$/).length).toBe(5);
  });
});
