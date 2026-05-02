import { describe, expect, it } from "vitest";

import {
  DRUM_PRESETS,
  drumGridFromPreset,
  generateBass,
  generateMelody,
  generatePattern,
  makeRng,
} from "./generators";

const STEPS = 16;

function countActive(grid: boolean[][]): number {
  return grid.reduce((acc, row) => acc + row.filter(Boolean).length, 0);
}

describe("Studio generators — pure functions", () => {
  it("every drum preset uses only valid step indices (0..15)", () => {
    for (const preset of DRUM_PRESETS) {
      for (const lane of [preset.kick, preset.snare, preset.hat, preset.clap]) {
        for (const beat of lane) {
          expect(beat).toBeGreaterThanOrEqual(0);
          expect(beat).toBeLessThan(STEPS);
        }
      }
    }
  });

  it("drumGridFromPreset places hits in the right rows", () => {
    const preset = DRUM_PRESETS[1]; // House
    const grid = drumGridFromPreset(preset);
    expect(grid).toHaveLength(4); // kick / snare / hat / clap
    expect(grid[0].filter(Boolean)).toHaveLength(preset.kick.length);
    expect(grid[1].filter(Boolean)).toHaveLength(preset.snare.length);
    expect(grid[2].filter(Boolean)).toHaveLength(preset.hat.length);
    expect(grid[3].filter(Boolean)).toHaveLength(preset.clap.length);
    expect(grid[0][0]).toBe(true); // kick on the downbeat
  });

  it("generateBass produces a non-empty grid in any of the three variants", () => {
    // Try several seeds; with rowCount=5 every variant should fire some hits.
    for (let seed = 1; seed <= 10; ++seed) {
      const grid = generateBass(5, makeRng(seed));
      expect(grid).toHaveLength(5);
      expect(countActive(grid)).toBeGreaterThan(0);
      // No row should overflow 16 steps.
      for (const row of grid) expect(row).toHaveLength(STEPS);
    }
  });

  it("generateMelody ends on the tonic (bottom row)", () => {
    const rowCount = 10;
    for (let seed = 1; seed <= 10; ++seed) {
      const grid = generateMelody(rowCount, makeRng(seed));
      // Find the highest-index beat that has any active note, then check
      // it lives on the tonic (last) row.
      let lastBeat = -1;
      let lastRow = -1;
      for (let beat = STEPS - 1; beat >= 0 && lastBeat === -1; --beat) {
        for (let row = 0; row < rowCount; ++row) {
          if (grid[row][beat]) {
            lastBeat = beat;
            lastRow = row;
            break;
          }
        }
      }
      expect(lastBeat).toBeGreaterThanOrEqual(0);
      expect(lastRow).toBe(rowCount - 1);
    }
  });

  it("generatePattern returns valid dimensions for drums, bass, melody", () => {
    const p = generatePattern(7, 14, makeRng(42));
    expect(p.drums).toHaveLength(4);
    expect(p.bass).toHaveLength(7);
    expect(p.melody).toHaveLength(14);
    expect(p.drumLabel).toBeTruthy();
    expect(DRUM_PRESETS.map((d) => d.label)).toContain(p.drumLabel);
  });

  it("seeded generation is deterministic", () => {
    const a = generatePattern(5, 10, makeRng(123));
    const b = generatePattern(5, 10, makeRng(123));
    expect(a.drumLabel).toBe(b.drumLabel);
    expect(a.bass).toEqual(b.bass);
    expect(a.melody).toEqual(b.melody);
  });
});
