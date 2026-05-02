import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SoundLab from "./SoundLab";
import { audioRegistry } from "../test/audio-mock";

describe("SoundLab — preset playback state machine", () => {
  it("starts a source when a preset is clicked", async () => {
    const user = userEvent.setup();
    render(<SoundLab />);

    await user.click(screen.getByText("Pink Noise"));

    const liveSources = audioRegistry.sources.filter((s) => s.started && !s.stopped);
    expect(liveSources).toHaveLength(1);
    expect(liveSources[0].nodeType).toBe("buffer-source");
  });

  // Regression: clicking a second preset while a previous one is playing must
  // silence the predecessor. Pink Noise specifically had a bleed-through bug
  // because looping AudioBufferSourceNode.stop() doesn't always silence
  // immediately across browsers — the per-source gain mute is what guarantees
  // silence, and this test asserts it.
  it("silences the predecessor when switching presets", async () => {
    const user = userEvent.setup();
    render(<SoundLab />);

    await user.click(screen.getByText("Pink Noise"));
    const pinkSource = audioRegistry.sources[audioRegistry.sources.length - 1];
    // Find the gain node connected to this source (its destination).
    const pinkGain = audioRegistry.gains.find((g) =>
      pinkSource.connections.includes(g),
    );
    expect(pinkSource.nodeType).toBe("buffer-source");
    expect(pinkGain).toBeDefined();

    await user.click(screen.getByText("Bass"));

    // Pink source must have been stopped and disconnected.
    expect(pinkSource.stop).toHaveBeenCalled();
    expect(pinkSource.disconnect).toHaveBeenCalled();

    // Per-source gain must have been ramped to 0 (the silence guarantee).
    expect(pinkGain!.gain.setValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));
    expect(pinkGain!.disconnect).toHaveBeenCalled();

    // Exactly one source should be live now (the Bass oscillator).
    const liveSources = audioRegistry.sources.filter((s) => s.started && !s.stopped);
    expect(liveSources).toHaveLength(1);
    expect(liveSources[0].nodeType).toBe("oscillator");
  });

  it("'정지' button stops the current source", async () => {
    const user = userEvent.setup();
    render(<SoundLab />);

    await user.click(screen.getByText("Reference"));
    const refSource = audioRegistry.sources[audioRegistry.sources.length - 1];

    await user.click(screen.getByRole("button", { name: "정지" }));

    expect(refSource.stop).toHaveBeenCalled();
    const liveSources = audioRegistry.sources.filter((s) => s.started && !s.stopped);
    expect(liveSources).toHaveLength(0);
  });

  it("clicking the active preset toggles it off", async () => {
    const user = userEvent.setup();
    render(<SoundLab />);

    const treble = screen.getByText("Treble");
    await user.click(treble);
    const trebleSource = audioRegistry.sources[audioRegistry.sources.length - 1];
    expect(trebleSource.started).toBe(true);

    await user.click(treble);
    expect(trebleSource.stop).toHaveBeenCalled();
  });
});
