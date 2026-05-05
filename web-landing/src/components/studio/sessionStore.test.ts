import { describe, it, expect, beforeEach } from "vitest";
import { save, load, clear, listSlots, type Session } from "./sessionStore";
import { buildLibrary } from "./clips";

const sample = (): Session => ({
  version: 1,
  scale: "pentatonic",
  rootPc: 0,
  swing: 0.25,
  bpm: 120,
  masterVol: 0.6,
  tracks: {
    drums: { mute: false, vol: 0.85, send: 0.1 },
    bass:  { mute: false, vol: 0.75, send: 0.1 },
    lead:  { mute: false, vol: 0.7,  send: 0.2 },
    pad:   { mute: false, vol: 0.6,  send: 0.4 },
    perc:  { mute: false, vol: 0.5,  send: 0.1 },
  },
  library: buildLibrary({ scale: "pentatonic", rootPc: 0 }),
});

describe("sessionStore", () => {
  beforeEach(() => localStorage.clear());

  it("save/load round-trips the session", () => {
    const s = sample();
    save("1", s);
    const got = load("1");
    expect(got).not.toBeNull();
    expect(got!.bpm).toBe(120);
    expect(got!.scale).toBe("pentatonic");
    expect(got!.library.drums).toHaveLength(8);
  });

  it("load returns null for an empty slot", () => {
    expect(load("2")).toBeNull();
  });

  it("load returns null when version doesn't match", () => {
    localStorage.setItem("sai.studio.session.1", JSON.stringify({ version: 999 }));
    expect(load("1")).toBeNull();
  });

  it("listSlots returns metadata for non-empty slots only", () => {
    save("1", sample());
    const slots = listSlots();
    expect(slots.find((s) => s.slot === "1")).toBeDefined();
    expect(slots.find((s) => s.slot === "2")).toBeUndefined();
  });

  it("clear removes a slot", () => {
    save("1", sample());
    clear("1");
    expect(load("1")).toBeNull();
  });
});
