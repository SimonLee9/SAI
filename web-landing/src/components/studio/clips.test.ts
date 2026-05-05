import { describe, it, expect } from "vitest";
import {
  buildLibrary,
  regenerateClip,
  rowsFor,
  TRACKS,
  SCENES,
} from "./clips";

describe("clips — buildLibrary", () => {
  it("returns 5 tracks × SCENES clips each", () => {
    const lib = buildLibrary({ scale: "pentatonic", rootPc: 0 });
    expect(TRACKS.length).toBe(5);
    for (const t of TRACKS) {
      expect(lib[t]).toHaveLength(SCENES);
    }
  });

  it("produces different bass row counts for pentatonic vs major", () => {
    const pent = rowsFor({ scale: "pentatonic", rootPc: 0 });
    const maj  = rowsFor({ scale: "major",      rootPc: 0 });
    expect(pent.bass.length).toBe(5);
    expect(maj.bass.length).toBe(7);
  });

  it("changing rootPc shifts every bass row by the same offset", () => {
    const c = rowsFor({ scale: "major", rootPc: 0 });
    const f = rowsFor({ scale: "major", rootPc: 5 });
    expect(f.bass[0].midi - c.bass[0].midi).toBe(5);
  });
});

describe("clips — regenerateClip", () => {
  it("is deterministic given the same seed", () => {
    const opts = { scale: "pentatonic" as const, rootPc: 0 };
    const a = regenerateClip("drums", 0, opts, 12345);
    const b = regenerateClip("drums", 0, opts, 12345);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("produces different output for different seeds (sanity)", () => {
    const opts = { scale: "pentatonic" as const, rootPc: 0 };
    const a = regenerateClip("bass", 0, opts, 1);
    const b = regenerateClip("bass", 0, opts, 999);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});

describe("clips — pad & perc presence", () => {
  it("library contains PadClip with progression + stabs", () => {
    const lib = buildLibrary({ scale: "major", rootPc: 0 });
    const pad = lib.pad[0];
    expect(pad.kind).toBe("pad");
    if (pad.kind === "pad") {
      expect(pad.progression.degrees.length).toBeGreaterThan(0);
      expect(pad.stabs.length).toBeGreaterThan(0);
    }
  });

  it("library contains PercClip with 4 lanes × 16 steps", () => {
    const lib = buildLibrary({ scale: "pentatonic", rootPc: 0 });
    const perc = lib.perc[0];
    expect(perc.kind).toBe("perc");
    if (perc.kind === "perc") {
      expect(perc.steps).toHaveLength(4);
      for (const lane of perc.steps) expect(lane).toHaveLength(16);
    }
  });
});
