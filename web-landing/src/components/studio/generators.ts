// Algorithmic pattern generators for Studio.
//
// This is the "✨ 생성" button's brain — entirely rule-based, zero ML.
// Each call composes a complete drum + bass + melody pattern that's
// guaranteed to be musical (no out-of-scale notes, no rhythmic chaos)
// while still being meaningfully different from one click to the next.
//
// Why no AI: building Suno-class generation alone is multi-year /
// multi-million; integrating an external API drags the brand off-mission
// (S.A.I is a speaker company, not an AI music company). What users
// actually want from this button — "give me a starter I can edit" —
// is solvable with a few hundred lines of careful music-theory rules.

export type DrumPreset = {
  id: string;
  label: string;
  kick:  ReadonlyArray<number>;
  snare: ReadonlyArray<number>;
  hat:   ReadonlyArray<number>;
  clap:  ReadonlyArray<number>;
};

// Four 16-step drum patterns that read as recognisable grooves to
// listeners who don't know music theory but know what a beat sounds like.
export const DRUM_PRESETS: ReadonlyArray<DrumPreset> = [
  {
    id: "boom-bap",
    label: "Boom Bap",
    kick:  [0, 8, 10],
    snare: [4, 12],
    hat:   [0, 2, 4, 6, 8, 10, 12, 14],
    clap:  [],
  },
  {
    id: "house",
    label: "House",
    kick:  [0, 4, 8, 12],
    snare: [4, 12],
    hat:   [2, 6, 10, 14],
    clap:  [],
  },
  {
    id: "dnb",
    label: "D&B",
    kick:  [0, 10],
    snare: [4, 12],
    hat:   [0, 2, 4, 6, 8, 10, 12, 14],
    clap:  [],
  },
  {
    id: "korean-3pulse",
    // 자진모리 등 3+3+3+3 박자 어휘에서 영감 — 진짜 12/8을 16-step에
    // 억지로 끼워 맞추진 않고, 비대칭 강세만 가져온 "한국풍" 그루브.
    label: "한국풍",
    kick:  [0, 6, 10],
    snare: [3, 9, 13],
    hat:   [0, 2, 4, 6, 8, 10, 12, 14],
    clap:  [],
  },
];

const STEPS = 16;

// ---------------------------------------------------------------------------
// Tiny seedable RNG (mulberry32) so tests can pin generator output and so
// "click again, different result" stays controllable.
// ---------------------------------------------------------------------------
export function makeRng(seed: number = Date.now()): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function emptyGrid(rows: number): boolean[][] {
  return Array.from({ length: rows }, () => Array<boolean>(STEPS).fill(false));
}

// ---------------------------------------------------------------------------
// Drum preset → boolean[][] in the order Sequencer expects: kick / snare / hat / clap.
// ---------------------------------------------------------------------------
export function drumGridFromPreset(preset: DrumPreset): boolean[][] {
  const g = emptyGrid(4);
  for (const b of preset.kick)  g[0][b] = true;
  for (const b of preset.snare) g[1][b] = true;
  for (const b of preset.hat)   g[2][b] = true;
  for (const b of preset.clap)  g[3][b] = true;
  return g;
}

// ---------------------------------------------------------------------------
// Chord progressions — defined as scale-degree sequences (1-indexed
// positions within whatever scale is active), so the same progression
// transposes naturally between 5음계 / Major / Minor. Length 4 keeps each
// chord on a clean 4-step (quarter-note) boundary inside the 16-step bar.
//
// Roman-numeral labels are pentatonic-friendly nicknames; the actual
// chord quality (major/minor) follows the active scale.
// ---------------------------------------------------------------------------
export type ChordProgression = {
  id: string;
  label: string;        // shown to the user, scale-degree style
  degrees: ReadonlyArray<number>;
};

export const PROGRESSIONS: ReadonlyArray<ChordProgression> = [
  // Length 2 — each chord lasts 8 sixteenths (half note). Slow harmonic pace.
  { id: "1-5-half",  label: "I-V (half)",   degrees: [1, 5] },
  { id: "1-4-half",  label: "I-IV (half)",  degrees: [1, 4] },
  { id: "1-6-half",  label: "I-vi (half)",  degrees: [1, 6] }, // Major / Minor only

  // Length 4 — each chord = quarter note. Default pop progressions.
  { id: "1-4-5-4",   label: "I-IV-V-IV",    degrees: [1, 4, 5, 4] }, // works in 5음계 too
  { id: "1-5-4-1",   label: "I-V-IV-I",     degrees: [1, 5, 4, 1] },
  { id: "1-3-4-5",   label: "I-iii-IV-V",   degrees: [1, 3, 4, 5] },
  { id: "1-2-3-4",   label: "ascend",       degrees: [1, 2, 3, 4] },
  { id: "1-5-6-4",   label: "I-V-vi-IV",    degrees: [1, 5, 6, 4] }, // Major / Minor only
  { id: "1-6-4-5",   label: "I-vi-IV-V",    degrees: [1, 6, 4, 5] }, // Major / Minor only
  { id: "6-4-1-5",   label: "vi-IV-I-V",    degrees: [6, 4, 1, 5] }, // Major / Minor only
  { id: "1-3-6-4",   label: "I-iii-vi-IV",  degrees: [1, 3, 6, 4] }, // Major / Minor only

  // Length 8 — each chord = 8th note. Faster harmonic rhythm, jazz/funk feel.
  { id: "1-4-5-4-x2", label: "I-IV-V-IV × 2",  degrees: [1, 4, 5, 4, 1, 4, 5, 4] }, // 5음계 호환
  { id: "1-6-2-5-x2", label: "I-vi-ii-V × 2",  degrees: [1, 6, 2, 5, 1, 6, 2, 5] }, // Major / Minor
];

/** Filter progressions whose every degree fits inside the active scale. */
export function progressionsForScale(scaleSize: number): ChordProgression[] {
  return PROGRESSIONS.filter((p) => p.degrees.every((d) => d <= scaleSize));
}

// ---------------------------------------------------------------------------
// Bass — chord-progression-driven. Each chord lasts STEPS/N sixteenths
// (4 with our default 4-chord progressions). Bass note = the chord's
// root, mapped to whichever bass row the active scale has it on. Density
// then controls how many hits land per chord.
// ---------------------------------------------------------------------------
export type BassDensity = "sparse" | "medium" | "dense";
export const BASS_DENSITIES: ReadonlyArray<BassDensity> = ["sparse", "medium", "dense"];

/**
 * Map a scale-degree number (1-indexed) to a bass-grid row index.
 *
 * Bass row layout: row 0 = top of the UI = highest pitch within the
 * single bass octave; row (rowCount-1) = bottom = lowest = tonic.
 * Therefore row for degree D = rowCount - D.
 */
function degreeToRow(degree: number, rowCount: number): number {
  // Wrap into the scale if a passing-tone overshoots (e.g. degree+2 might
  // exceed scaleSize). Clamp instead of modulo so notes stay inside the
  // displayed octave rather than jumping to a hidden upper register.
  const d = Math.max(1, Math.min(rowCount, degree));
  return rowCount - d;
}

export function generateBass(
  rowCount: number,
  scaleSize: number,
  rng: () => number,
  forcedProgressionId?: string,
): { grid: boolean[][]; progression: ChordProgression; density: BassDensity } {
  const grid = emptyGrid(rowCount);
  const candidates = progressionsForScale(scaleSize);
  const forced = forcedProgressionId
    ? candidates.find((p) => p.id === forcedProgressionId)
    : undefined;
  const progression = forced ?? candidates[Math.floor(rng() * candidates.length)];
  const density = BASS_DENSITIES[Math.floor(rng() * BASS_DENSITIES.length)];

  if (rowCount === 0) return { grid, progression, density };

  const stepsPerChord = STEPS / progression.degrees.length;

  for (let i = 0; i < progression.degrees.length; ++i) {
    const degree   = progression.degrees[i];
    const rootRow  = degreeToRow(degree, rowCount);
    const startStep = i * stepsPerChord;

    // sparse  — just the root on the chord's down-beat.
    // medium  — root on down-beat + same root on the chord's mid-beat.
    // dense   — root on every other 8th, plus a 3rd-above passing tone
    //           on the off-eighths for walking-bass feel.
    if (density === "sparse") {
      grid[rootRow][startStep] = true;
    } else if (density === "medium") {
      grid[rootRow][startStep] = true;
      grid[rootRow][startStep + 2] = true;
    } else {
      grid[rootRow][startStep] = true;
      grid[rootRow][startStep + 2] = true;
      const passRow = degreeToRow(degree + 2, rowCount);
      grid[passRow][startStep + 1] = true;
      grid[passRow][startStep + 3] = true;
    }
  }
  return { grid, progression, density };
}

// ---------------------------------------------------------------------------
// Chord-tone rows for a given chord degree, expanded across both melody
// octaves. Used to bias the markov walker toward harmonically-stable
// notes on strong beats.
// ---------------------------------------------------------------------------
function chordToneRows(
  degree: number,
  scaleSize: number,
  melodyRowCount: number,
): number[] {
  const rows: number[] = [];
  // Chord = root + 3rd + 5th, measured in scale-degree steps (0/2/4
  // above the root). Scale-relative thirds, not semitone thirds —
  // pentatonic and diatonic produce different sounding triads with
  // the same code path.
  for (const interval of [0, 2, 4]) {
    const toneDegree = ((degree - 1 + interval) % scaleSize) + 1;
    // Bottom-up index of the row in this scale's bass octave is
    // (scaleSize - toneDegree). Melody spans `melodyRowCount` rows
    // (= scaleSize × octaves), so map both octaves' positions:
    for (let oct = 0; oct < melodyRowCount / scaleSize; ++oct) {
      const row = melodyRowCount - 1 - (oct * scaleSize) - (toneDegree - 1);
      if (row >= 0 && row < melodyRowCount) rows.push(row);
    }
  }
  return rows;
}

function nearestRow(target: number[], cursor: number): number {
  return target.reduce(
    (best, r) => (Math.abs(r - cursor) < Math.abs(best - cursor) ? r : best),
    target[0],
  );
}

// ---------------------------------------------------------------------------
// Melody — markov walk that snaps toward chord tones on chord downbeats
// when a progression is provided. Without a progression (legacy callers
// + tests), it falls back to a pure random walk that just ends on the
// tonic for a closed phrase. Note count varies 6–10.
// ---------------------------------------------------------------------------
export function generateMelody(
  rowCount: number,
  rng: () => number,
  progression?: ChordProgression,
  scaleSize?: number,
): boolean[][] {
  const g = emptyGrid(rowCount);
  if (rowCount === 0) return g;

  const tonicRow = rowCount - 1;

  // Pick 6–10 distinct beat positions, sorted ascending.
  const noteCount = 6 + Math.floor(rng() * 5);
  const beats = new Set<number>();
  while (beats.size < noteCount) beats.add(Math.floor(rng() * STEPS));
  const positions = [...beats].sort((a, b) => a - b);

  // Force the first beat to be near the tonic for a stable opening, and
  // the LAST note to land on the tonic for a closed musical phrase.
  if (positions[0] !== 0 && rng() < 0.5) positions[0] = 0;

  let cursor = tonicRow - Math.floor(rng() * 2); // tonic or one above
  const stepsPerChord = progression
    ? STEPS / progression.degrees.length
    : Number.POSITIVE_INFINITY;

  for (let i = 0; i < positions.length; ++i) {
    const beat = positions[i];
    const isLast = i === positions.length - 1;

    if (isLast) {
      cursor = tonicRow;
    } else if (
      progression &&
      scaleSize &&
      beat % stepsPerChord === 0 &&
      rng() < 0.7
    ) {
      // Strong beat (chord downbeat) — bias toward a chord tone of the
      // current chord. Pick the chord-tone row closest to the current
      // cursor so we still get smooth voice leading, just constrained
      // to the harmony.
      const chordIdx = Math.floor(beat / stepsPerChord);
      const chordDegree = progression.degrees[chordIdx];
      const targets = chordToneRows(chordDegree, scaleSize, rowCount);
      if (targets.length > 0) cursor = nearestRow(targets, cursor);
    }

    g[Math.max(0, Math.min(rowCount - 1, cursor))][beat] = true;

    // Markov step: 70% step ±1, 25% leap ±2, 5% repeat.
    const r = rng();
    let delta = 0;
    if      (r < 0.70) delta = rng() < 0.5 ? -1 : 1;
    else if (r < 0.95) delta = rng() < 0.5 ? -2 : 2;
    cursor = Math.max(0, Math.min(rowCount - 1, cursor + delta));
  }

  return g;
}

// ---------------------------------------------------------------------------
// Top-level generator — drums + bass + melody together. Returns the
// chosen drum preset / chord progression / density labels so the UI can
// surface "House · I-V-vi-IV · medium" etc. as a small badge.
//
// Note: bass row count IS the scale size (one octave per row group), so
// rowCount and scaleSize are the same value at the call site.
// ---------------------------------------------------------------------------
export type GeneratedPattern = {
  drums: boolean[][];
  bass: boolean[][];
  melody: boolean[][];
  drumLabel: string;
  bassLabel: string;        // "I-V-vi-IV · medium" etc.
};

export function generatePattern(
  bassRows: number,
  melodyRows: number,
  rng: () => number = makeRng(),
  forcedProgressionId?: string,
): GeneratedPattern {
  const preset = DRUM_PRESETS[Math.floor(rng() * DRUM_PRESETS.length)];
  const scaleSize = bassRows;
  const bass = generateBass(bassRows, scaleSize, rng, forcedProgressionId);
  return {
    drums: drumGridFromPreset(preset),
    bass: bass.grid,
    // Pass progression + scale to enable chord-aware strong-beat bias.
    melody: generateMelody(melodyRows, rng, bass.progression, scaleSize),
    drumLabel: preset.label,
    bassLabel: `${bass.progression.label} · ${bass.density}`,
  };
}
