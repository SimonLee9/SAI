import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Sequencer from "./Sequencer";
import { audioRegistry } from "../test/audio-mock";

// State-machine tests for the multi-track Studio. Drum/bass/melody patterns
// each have their own grid; mixer state (mute/vol) and scale changes touch
// row layouts. Pure audio scheduling is timer-driven and not exercised
// here — these guard the UI invariants.

describe("Sequencer (Studio 2.0) — multi-track state machine", () => {
  it("renders three tracks with the expected default row counts", () => {
    render(<Sequencer />);
    // Drums = 4 lanes; pentatonic Bass = 5 (1 octave); Melody = 10 (2 octaves).
    expect(screen.getByRole("grid", { name: /Drums pattern/  })).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: /Bass pattern/   })).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: /Melody pattern/ })).toBeInTheDocument();

    const drumsGrid = screen.getByRole("grid", { name: /Drums pattern/ });
    expect(within(drumsGrid).getAllByRole("gridcell").length).toBe(4 * 16);

    const bassGrid = screen.getByRole("grid", { name: /Bass pattern/ });
    expect(within(bassGrid).getAllByRole("gridcell").length).toBe(5 * 16);

    const melodyGrid = screen.getByRole("grid", { name: /Melody pattern/ });
    expect(within(melodyGrid).getAllByRole("gridcell").length).toBe(10 * 16);
  });

  it("toggles a drum cell on click", async () => {
    const user = userEvent.setup();
    render(<Sequencer />);
    const grid = screen.getByRole("grid", { name: /Drums pattern/ });
    const firstCell = within(grid).getAllByRole("gridcell")[0];
    expect(firstCell).toHaveAttribute("aria-pressed", "false");
    await user.click(firstCell);
    expect(firstCell).toHaveAttribute("aria-pressed", "true");
  });

  it("전체 초기화 zeroes every cell across tracks", async () => {
    const user = userEvent.setup();
    render(<Sequencer />);
    const drumsGrid  = screen.getByRole("grid", { name: /Drums pattern/  });
    const melodyGrid = screen.getByRole("grid", { name: /Melody pattern/ });

    await user.click(within(drumsGrid).getAllByRole("gridcell")[0]);
    await user.click(within(melodyGrid).getAllByRole("gridcell")[5]);
    // Sanity: 2 cells now active across the grids.
    expect(
      screen.getAllByRole("gridcell").filter((c) => c.getAttribute("aria-pressed") === "true"),
    ).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "전체 초기화" }));
    expect(
      screen.getAllByRole("gridcell").filter((c) => c.getAttribute("aria-pressed") === "true"),
    ).toHaveLength(0);
  });

  it("scale switch reshapes Bass and Melody row counts", async () => {
    const user = userEvent.setup();
    render(<Sequencer />);

    // Default pentatonic: Bass 5 rows, Melody 10 rows.
    expect(within(screen.getByRole("grid", { name: /Bass pattern/   })).getAllByRole("gridcell").length).toBe(5  * 16);
    expect(within(screen.getByRole("grid", { name: /Melody pattern/ })).getAllByRole("gridcell").length).toBe(10 * 16);

    // Switch to Major (7 rows / octave).
    await user.click(screen.getByRole("button", { name: /Major/ }));
    expect(within(screen.getByRole("grid", { name: /Bass pattern/   })).getAllByRole("gridcell").length).toBe(7  * 16);
    expect(within(screen.getByRole("grid", { name: /Melody pattern/ })).getAllByRole("gridcell").length).toBe(14 * 16);
  });

  it("Mute toggle on Drums flips the button label", async () => {
    const user = userEvent.setup();
    render(<Sequencer />);
    // First "Mute" button = Drums (tracks render in order Drums → Bass → Melody).
    const muteBtns = screen.getAllByRole("button", { name: /^Mute$|^Muted$/ });
    expect(muteBtns).toHaveLength(3);
    await user.click(muteBtns[0]);
    // Re-query — the button text changes on click.
    expect(screen.getAllByRole("button", { name: /^Muted$/ }).length).toBeGreaterThanOrEqual(1);
  });

  it("starting playback creates an AudioContext", async () => {
    const user = userEvent.setup();
    render(<Sequencer />);
    expect(audioRegistry.contexts).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "재생" }));
    expect(audioRegistry.contexts).toHaveLength(1);
    // 4 buses (master + drums + bass + melody) all get GainNodes.
    expect(audioRegistry.gains.length).toBeGreaterThanOrEqual(4);
  });
});
