// Clip data model + initial library for the Launchpad-style pad grid.
//
// A clip is a 16-step pattern that loops on its own track. Each track
// is mutex (one clip at a time) but tracks play independently.
//
// We freeze the scale to pentatonic so clip rows always map to the same
// frequencies — keeps the v1 surface tight. Scale picker can return later.

import {
  DRUM_PRESETS,
  drumGridFromPreset,
  generateBass,
  generateMelody,
  makeRng,
  PROGRESSIONS,
  type ChordProgression,
} from "./generators";
import { buildScaleRows, SCALES } from "./scales";

export const COLS = 16;
export const TRACKS = ["drums", "bass", "lead"] as const;
export type Track = (typeof TRACKS)[number];
export const SCENES = 8;

export type DrumClip = {
  kind: "drums";
  name: string;
  steps: boolean[][];                 // [4 lanes][16] — kick/snare/hat/clap
};

export type BassClip = {
  kind: "bass";
  name: string;
  steps: boolean[][];                 // [bassRows.length][16]
  progression: ChordProgression;
};

export type LeadClip = {
  kind: "lead";
  name: string;
  steps: boolean[][];                 // [leadRows.length][16]
};

export type Clip = DrumClip | BassClip | LeadClip;

// ---------------------------------------------------------------------------
// Frozen scale + row layouts (pentatonic, 1 oct bass + 2 oct lead)
// ---------------------------------------------------------------------------
const PENTATONIC = SCALES.find((s) => s.id === "pentatonic")!;
export const BASS_ROWS = buildScaleRows(PENTATONIC, 36, 1);   // C2, 5 rows
export const LEAD_ROWS = buildScaleRows(PENTATONIC, 60, 2);   // C4, 10 rows

// ---------------------------------------------------------------------------
// Per-track scene library — built once at module load. Deterministic per
// scene index so the same cell always carries the same clip across reloads.
// ---------------------------------------------------------------------------
function buildDrumScenes(): DrumClip[] {
  // 8 scenes from 4 presets — first 4 = the canonical presets, next 4 =
  // the same presets again (acts as variety placeholder; users can re-roll
  // a cell later if we add that affordance).
  return Array.from({ length: SCENES }, (_, i) => {
    const preset = DRUM_PRESETS[i % DRUM_PRESETS.length];
    return {
      kind: "drums" as const,
      name: preset.label,
      steps: drumGridFromPreset(preset),
    };
  });
}

function buildBassScenes(): BassClip[] {
  const scaleSize = PENTATONIC.intervals.length;
  const candidates = PROGRESSIONS.filter((p) =>
    p.degrees.every((d) => d <= scaleSize),
  );
  return Array.from({ length: SCENES }, (_, i) => {
    const prog = candidates[i % candidates.length];
    // Seed encodes both the scene index and the progression — gives stable
    // density variation across reloads without manual choice.
    const rng = makeRng(0xb455_0000 + i * 17);
    const { grid, progression, density } = generateBass(
      BASS_ROWS.length,
      scaleSize,
      rng,
      prog.id,
    );
    return {
      kind: "bass" as const,
      name: `${progression.label} · ${density}`,
      steps: grid,
      progression,
    };
  });
}

function buildLeadScenes(bassClips: BassClip[]): LeadClip[] {
  const scaleSize = PENTATONIC.intervals.length;
  return Array.from({ length: SCENES }, (_, i) => {
    const rng = makeRng(0x1ead_0000 + i * 23);
    // Pair each lead with the same scene's bass progression so they harmonise.
    const grid = generateMelody(LEAD_ROWS.length, rng, bassClips[i].progression, scaleSize);
    return {
      kind: "lead" as const,
      name: `Lead ${i + 1}`,
      steps: grid,
    };
  });
}

export type SceneLibrary = Record<Track, Clip[]>;

export function buildLibrary(): SceneLibrary {
  const drums = buildDrumScenes();
  const bass = buildBassScenes();
  const lead = buildLeadScenes(bass);
  return { drums, bass, lead };
}
