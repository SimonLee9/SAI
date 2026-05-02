import { describe, expect, it } from "vitest";

import {
  BASS_DENSITIES,
  DRUM_PRESETS,
  drumGridFromPreset,
  generateBass,
  generateMelody,
  generatePattern,
  makeRng,
  PROGRESSIONS,
  progressionsForScale,
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

  it("generateBass returns a chord-progression + density that fits the active scale", () => {
    // Pentatonic (size 5): only progressions whose max degree ≤ 5 are valid.
    for (let seed = 1; seed <= 10; ++seed) {
      const r = generateBass(5, 5, makeRng(seed));
      expect(r.grid).toHaveLength(5);
      expect(countActive(r.grid)).toBeGreaterThan(0);
      for (const row of r.grid) expect(row).toHaveLength(STEPS);
      expect(r.progression.degrees.every((d) => d <= 5)).toBe(true);
      expect(BASS_DENSITIES).toContain(r.density);
    }
  });

  it("progressionsForScale filters by max degree", () => {
    const five = progressionsForScale(5);
    const seven = progressionsForScale(7);
    expect(five.length).toBeLessThan(seven.length);
    expect(seven.length).toBe(PROGRESSIONS.length);
    for (const p of five) expect(Math.max(...p.degrees)).toBeLessThanOrEqual(5);
  });

  it("bass places the chord root on each chord's downbeat", () => {
    // Force a known progression by exhausting the rng to pick a specific one
    // is awkward; instead, scan the produced grid and verify that for each
    // 4-step chord window, *some* row has a hit on the window's first step.
    for (let seed = 1; seed <= 15; ++seed) {
      const r = generateBass(7, 7, makeRng(seed));
      for (let chord = 0; chord < r.progression.degrees.length; ++chord) {
        const downbeat = chord * (STEPS / r.progression.degrees.length);
        const anyHit = r.grid.some((row) => row[downbeat]);
        expect(anyHit).toBe(true);
      }
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

  it("generatePattern returns valid dimensions and labels", () => {
    const p = generatePattern(7, 14, makeRng(42));
    expect(p.drums).toHaveLength(4);
    expect(p.bass).toHaveLength(7);
    expect(p.melody).toHaveLength(14);
    expect(p.drumLabel).toBeTruthy();
    expect(DRUM_PRESETS.map((d) => d.label)).toContain(p.drumLabel);
    // Bass label is "<progression> · <density>".
    expect(p.bassLabel).toMatch(/^.+ · (sparse|medium|dense)$/);
  });

  it("seeded generation is deterministic", () => {
    const a = generatePattern(5, 10, makeRng(123));
    const b = generatePattern(5, 10, makeRng(123));
    expect(a.drumLabel).toBe(b.drumLabel);
    expect(a.bass).toEqual(b.bass);
    expect(a.melody).toEqual(b.melody);
  });
});
