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
// Bass — three groove variants. Bottom row = tonic. A "5th-ish" row is
// chosen as middle of the row stack since exact 5ths depend on scale; the
// approximation reads as "groove bass" in any of the supported scales.
// ---------------------------------------------------------------------------
export function generateBass(rowCount: number, rng: () => number): boolean[][] {
  const g = emptyGrid(rowCount);
  if (rowCount === 0) return g;

  const tonicRow = rowCount - 1;                  // bottom = lowest = tonic
  const fifthRow = Math.max(0, Math.floor(rowCount / 2));
  const v = Math.floor(rng() * 3);                // 0 / 1 / 2

  if (v === 0) {
    // Four-on-the-floor — sub kick under every quarter.
    for (const b of [0, 4, 8, 12]) g[tonicRow][b] = true;
  } else if (v === 1) {
    // Tonic on quarters + 5th on the and-of-2 / and-of-4.
    for (const b of [0, 4, 8, 12])  g[tonicRow][b] = true;
    for (const b of [6, 14])         g[fifthRow][b] = true;
  } else {
    // Rolling 8ths — busier groove. Tonic + 5th alternating.
    for (let b = 0; b < STEPS; b += 2) {
      (b % 4 === 0 ? g[tonicRow] : g[fifthRow])[b] = true;
    }
  }
  return g;
}

// ---------------------------------------------------------------------------
// Melody — random walk on scale rows with strong bias toward stepwise
// motion (smoother contour) and a guaranteed return to the tonic on the
// last note of the bar. Note count varies 6–10.
// ---------------------------------------------------------------------------
export function generateMelody(rowCount: number, rng: () => number): boolean[][] {
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

  for (let i = 0; i < positions.length; ++i) {
    const isLast = i === positions.length - 1;
    if (isLast) cursor = tonicRow;
    g[Math.max(0, Math.min(rowCount - 1, cursor))][positions[i]] = true;

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
// Top-level generator — drums + bass + melody together. Returns the chosen
// drum preset's label so the UI can surface "this beat is House" etc.
// ---------------------------------------------------------------------------
export type GeneratedPattern = {
  drums: boolean[][];
  bass: boolean[][];
  melody: boolean[][];
  drumLabel: string;
};

export function generatePattern(
  bassRows: number,
  melodyRows: number,
  rng: () => number = makeRng(),
): GeneratedPattern {
  const preset = DRUM_PRESETS[Math.floor(rng() * DRUM_PRESETS.length)];
  return {
    drums: drumGridFromPreset(preset),
    bass: generateBass(bassRows, rng),
    melody: generateMelody(melodyRows, rng),
    drumLabel: preset.label,
  };
}
