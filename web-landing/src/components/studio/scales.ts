// Scale definitions for Studio.
//
// Each scale is a sequence of semitone offsets from the root. Given a
// MIDI root note, we expand into a row list spanning N octaves so the
// sequencer can paint a grid where every row is a "safe" pitch within
// the chosen scale.

export type ScaleId = "pentatonic" | "major" | "minor";

export type Scale = {
  id: ScaleId;
  label: string;
  hint: string;
  /** Semitone offsets within one octave from the root (0 to 11). */
  intervals: number[];
};

export const SCALES: ReadonlyArray<Scale> = [
  {
    id: "pentatonic",
    label: "5음계",
    hint: "어떤 칸을 눌러도 듣기 좋게",
    intervals: [0, 2, 4, 7, 9],   // C major pentatonic — Korean 평조 친근형
  },
  {
    id: "major",
    label: "Major",
    hint: "밝은 7음계",
    intervals: [0, 2, 4, 5, 7, 9, 11],
  },
  {
    id: "minor",
    label: "Minor",
    hint: "어두운 7음계",
    intervals: [0, 2, 3, 5, 7, 8, 10],
  },
];

const NOTE_NAMES_KO: Record<number, string> = {
  0: "도", 1: "도♯", 2: "레", 3: "미♭", 4: "미", 5: "파",
  6: "파♯", 7: "솔", 8: "솔♯", 9: "라", 10: "시♭", 11: "시",
};

/** MIDI note → frequency (A4 = 440 Hz). */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Hangul-friendly note label for a MIDI pitch (with octave digit). */
export function midiToLabel(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES_KO[pc]}${oct}`;
}

/**
 * Build a row list for a track in the given scale.
 *   rootMidi = MIDI number of the lowest note (e.g. 36 = C2 for bass,
 *              60 = C4 for melody).
 *   octaves  = how many octaves to span (1 for bass, 2 for melody).
 *
 * Rows are returned high-to-low (row 0 = top of UI = highest pitch),
 * matching how piano-roll grids read.
 */
export function buildScaleRows(
  scale: Scale,
  rootMidi: number,
  octaves: number,
): { midi: number; freq: number; label: string }[] {
  const rows: { midi: number; freq: number; label: string }[] = [];
  for (let o = 0; o < octaves; ++o) {
    for (const semis of scale.intervals) {
      const midi = rootMidi + o * 12 + semis;
      rows.push({ midi, freq: midiToFreq(midi), label: midiToLabel(midi) });
    }
  }
  // High-to-low so row 0 is the top.
  return rows.reverse();
}
