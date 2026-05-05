import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import PadGrid from "./PadGrid";
import { audioRegistry } from "../../test/audio-mock";
import { SCENES, TRACKS } from "./clips";

// PadGrid integration tests. PadCell now triggers on pointerUp (short tap):
// pointerDown starts the long-press timer, pointerUp fires onTrigger if the
// timer hasn't fired yet. Scene launcher buttons (▶ 1..8) are NOT PadCells —
// they still trigger on pointerDown directly.

function findCell(label: RegExp) {
  return screen.getByRole("button", { name: label });
}

describe("PadGrid — Launchpad-style clip launcher", () => {
  it(`renders the full ${TRACKS.length} × ${SCENES} cell grid plus scene launchers`, () => {
    render(<PadGrid />);

    // 8 scene-launch headers ("▶ 1" .. "▶ 8")
    for (let i = 1; i <= SCENES; ++i) {
      expect(
        screen.getByRole("button", { name: new RegExp(`Scene ${i} 모든 트랙 발사`) }),
      ).toBeInTheDocument();
    }

    // 8 cells per track × 3 tracks. Use the scene-1 label across tracks.
    expect(screen.getAllByRole("button", { name: /scene 1/i })).toHaveLength(TRACKS.length + 1);
    // ^ 3 track cells + 1 scene launcher (label includes "Scene 1")
  });

  it("does NOT create an AudioContext until the user interacts", () => {
    render(<PadGrid />);
    expect(audioRegistry.contexts).toHaveLength(0);
  });

  it("tapping a cell creates an AudioContext and queues that clip", () => {
    render(<PadGrid />);
    const cell = findCell(/Drums scene 1/);
    fireEvent.pointerDown(cell);
    fireEvent.pointerUp(cell);

    expect(audioRegistry.contexts).toHaveLength(1);
    // 4 gain nodes: master + drums + bass + lead.
    expect(audioRegistry.gains.length).toBeGreaterThanOrEqual(4);

    // After queueing, the cell should report queued state via data-state.
    expect(cell.getAttribute("data-state")).toBe("queued");
  });

  it("tapping the play button without queueing any clip starts the transport", () => {
    render(<PadGrid />);
    const play = screen.getByRole("button", { name: "재생" });
    fireEvent.click(play);
    expect(audioRegistry.contexts).toHaveLength(1);

    // Button label flips to 정지 once playing.
    expect(screen.getByRole("button", { name: "정지" })).toBeInTheDocument();
  });

  it("scene launcher button queues all three tracks", () => {
    render(<PadGrid />);
    const scene2 = screen.getByRole("button", { name: /Scene 2 모든 트랙 발사/ });
    fireEvent.pointerDown(scene2);

    // Each track's scene-2 cell should now be queued.
    const cells = screen.getAllByRole("button", { name: /scene 2/i });
    // Filter to the actual pad cells (skip the launcher itself).
    const padCells = cells.filter((c) => c.getAttribute("data-state") !== null);
    expect(padCells.length).toBe(TRACKS.length);
    for (const c of padCells) {
      expect(c.getAttribute("data-state")).toBe("queued");
    }
  });

  it("track mute toggle flips its aria-pressed state", () => {
    render(<PadGrid />);
    // Three Mute buttons, one per track row.
    const muteBtns = screen.getAllByRole("button", { name: /^Mute$/ });
    expect(muteBtns.length).toBe(TRACKS.length);
    expect(muteBtns[0]).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(muteBtns[0]);
    expect(muteBtns[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("Stop-all button stops all tracks (queues stop on each)", () => {
    render(<PadGrid />);
    // Queue something on every track first via a scene launch.
    fireEvent.pointerDown(
      screen.getByRole("button", { name: /Scene 1 모든 트랙 발사/ }),
    );
    // Then ask to stop everything.
    fireEvent.click(screen.getByRole("button", { name: "전체 트랙 끄기" }));

    // No assertion on UI state beyond "didn't crash" — actual stop only
    // applies on the next bar inside the scheduler. The earlier
    // clipScheduler.test.ts covers stop semantics directly.
    expect(audioRegistry.contexts).toHaveLength(1);
  });

  it("BPM slider is present and reflects user changes", () => {
    render(<PadGrid />);
    const bpm = screen.getByLabelText("템포") as HTMLInputElement;
    expect(bpm).toBeInTheDocument();
    fireEvent.change(bpm, { target: { value: "140" } });
    expect(bpm.value).toBe("140");
  });

  it("master volume slider is present", () => {
    render(<PadGrid />);
    expect(screen.getByLabelText("마스터 볼륨")).toBeInTheDocument();
  });

  it("scene launcher pad cells expose data-state for visual debugging", () => {
    render(<PadGrid />);
    // Sanity: every pad cell starts as 'idle'.
    const idleCells = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("data-state") === "idle");
    expect(idleCells.length).toBe(TRACKS.length * SCENES);
  });

  it("queries scoped within a track row find that row's eight cells", () => {
    render(<PadGrid />);
    // Every cell whose aria-label contains 'Drums' (track row).
    const drumsCells = screen.getAllByRole("button", { name: /^Drums scene/ });
    expect(drumsCells).toHaveLength(SCENES);
    // Same for Bass, Lead.
    expect(screen.getAllByRole("button", { name: /^Bass scene/ })).toHaveLength(SCENES);
    expect(screen.getAllByRole("button", { name: /^Lead scene/ })).toHaveLength(SCENES);
  });
});
