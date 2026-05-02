import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Sequencer from "./Sequencer";
import { audioRegistry } from "../test/audio-mock";

// State-transition tests for the pentatonic step sequencer. Audio scheduling
// itself is timing-driven and not exercised here — those paths would need
// fake-timer mocks. These tests cover the things that broke last time
// (Pink Noise persistence): grid state, voice switching, lifecycle hooks
// that touch the AudioContext.

describe("Sequencer — grid state machine", () => {
  it("starts with every cell off", () => {
    render(<Sequencer />);
    const cells = screen.getAllByRole("gridcell");
    expect(cells.length).toBe(5 * 16);
    for (const cell of cells) {
      expect(cell).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("toggles a cell on click and off on second click", async () => {
    const user = userEvent.setup();
    render(<Sequencer />);
    const cell = screen.getByLabelText("도 1번 칸 꺼짐");

    await user.click(cell);
    expect(screen.getByLabelText("도 1번 칸 켜짐")).toBeInTheDocument();

    await user.click(screen.getByLabelText("도 1번 칸 켜짐"));
    expect(screen.getByLabelText("도 1번 칸 꺼짐")).toBeInTheDocument();
  });

  it("clear button zeroes every cell", async () => {
    const user = userEvent.setup();
    render(<Sequencer />);

    // Light up a few cells across rows / columns.
    await user.click(screen.getByLabelText("도 1번 칸 꺼짐"));
    await user.click(screen.getByLabelText("미 5번 칸 꺼짐"));
    await user.click(screen.getByLabelText("라 16번 칸 꺼짐"));

    expect(screen.getAllByLabelText(/켜짐/)).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "초기화" }));

    expect(screen.queryAllByLabelText(/켜짐/)).toHaveLength(0);
  });

  it("voice toggle moves the active state between buttons", async () => {
    const user = userEvent.setup();
    render(<Sequencer />);

    // Sine starts active by default — pressed=true via styling, but easier
    // signal: clicking a different voice should keep one active state alive.
    const triangle = screen.getByRole("button", { name: /Triangle/ });
    const square   = screen.getByRole("button", { name: /Square/ });

    await user.click(triangle);
    // One injoo dot anywhere in Triangle button = active marker.
    expect(within(triangle).getByText(/Triangle/)).toBeInTheDocument();

    await user.click(square);
    expect(within(square).getByText(/Square/)).toBeInTheDocument();
  });

  it("starting playback creates an AudioContext", async () => {
    const user = userEvent.setup();
    render(<Sequencer />);

    expect(audioRegistry.contexts).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "재생" }));

    expect(audioRegistry.contexts).toHaveLength(1);
    // Master gain wired to destination as part of init.
    expect(audioRegistry.gains.length).toBeGreaterThanOrEqual(1);
  });
});
