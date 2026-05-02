import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildScaleRows,
  SCALES,
  type Scale,
} from "./studio/scales";
import {
  playBass,
  playDrum,
  playMelody,
  type DrumKind,
  type MelodyOsc,
} from "./studio/synth";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const COLS              = 16;
const VOL_MAX           = 0.5;       // hearing-safety cap on master gain
const LOOKAHEAD_MS      = 25;
const SCHEDULE_AHEAD_S  = 0.1;

const BASS_ROOT_MIDI    = 36;        // C2
const BASS_OCTAVES      = 1;
const MELODY_ROOT_MIDI  = 60;        // C4
const MELODY_OCTAVES    = 2;

const DRUM_ORDER: ReadonlyArray<{ kind: DrumKind; label: string }> = [
  { kind: "kick",  label: "Kick"  },
  { kind: "snare", label: "Snare" },
  { kind: "hat",   label: "Hat"   },
  { kind: "clap",  label: "Clap"  },
];

const OSC_OPTIONS: ReadonlyArray<{ value: MelodyOsc; label: string }> = [
  { value: "sine",     label: "Sine"     },
  { value: "triangle", label: "Triangle" },
  { value: "square",   label: "Square"   },
];

type Pattern = boolean[][];

function emptyPattern(rows: number, cols = COLS): Pattern {
  return Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Sequencer() {
  // -------------------------------------------------------------------------
  // Scale + per-track row sets (row count depends on scale)
  // -------------------------------------------------------------------------
  const [scaleId, setScaleId] = useState<Scale["id"]>("pentatonic");
  const scale = useMemo(() => SCALES.find((s) => s.id === scaleId)!, [scaleId]);
  const bassRows   = useMemo(() => buildScaleRows(scale, BASS_ROOT_MIDI, BASS_OCTAVES), [scale]);
  const melodyRows = useMemo(() => buildScaleRows(scale, MELODY_ROOT_MIDI, MELODY_OCTAVES), [scale]);

  // -------------------------------------------------------------------------
  // Track patterns
  // -------------------------------------------------------------------------
  const [drums,  setDrums]  = useState<Pattern>(() => emptyPattern(DRUM_ORDER.length));
  const [bass,   setBass]   = useState<Pattern>(() => emptyPattern(bassRows.length));
  const [melody, setMelody] = useState<Pattern>(() => emptyPattern(melodyRows.length));

  // When scale changes, re-allocate bass / melody patterns to match the
  // new row count. We don't try to preserve note positions across scale
  // swaps because semantics differ (pentatonic row 2 ≠ major row 2).
  useEffect(() => {
    setBass(emptyPattern(bassRows.length));
    setMelody(emptyPattern(melodyRows.length));
  }, [scaleId, bassRows.length, melodyRows.length]);

  // -------------------------------------------------------------------------
  // Mixer + master controls
  // -------------------------------------------------------------------------
  const [drumsVol,   setDrumsVol]   = useState(0.85);
  const [bassVol,    setBassVol]    = useState(0.75);
  const [melodyVol,  setMelodyVol]  = useState(0.65);
  const [drumsMute,  setDrumsMute]  = useState(false);
  const [bassMute,   setBassMute]   = useState(false);
  const [melodyMute, setMelodyMute] = useState(false);
  const [melodyOsc,  setMelodyOsc]  = useState<MelodyOsc>("triangle");

  const [bpm,        setBpm]        = useState(108);
  const [masterVol,  setMasterVol]  = useState(0.5);

  // Transport
  const [playing, setPlaying] = useState(false);
  const [step,    setStep]    = useState(-1);

  // -------------------------------------------------------------------------
  // Scheduler refs (closures read latest state through these)
  // -------------------------------------------------------------------------
  const drumsRef       = useRef(drums);   drumsRef.current  = drums;
  const bassRef        = useRef(bass);    bassRef.current   = bass;
  const melodyRef      = useRef(melody);  melodyRef.current = melody;
  const bassRowsRef    = useRef(bassRows);   bassRowsRef.current   = bassRows;
  const melodyRowsRef  = useRef(melodyRows); melodyRowsRef.current = melodyRows;
  const oscRef         = useRef(melodyOsc); oscRef.current = melodyOsc;
  const bpmRef         = useRef(bpm);     bpmRef.current = bpm;

  // -------------------------------------------------------------------------
  // Audio graph
  //   source(s) → trackGain(perTrack) → trackBus → master → destination
  // Each track has its own bus so mute/volume mixer changes are clean.
  // -------------------------------------------------------------------------
  const ctxRef        = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const drumsBusRef   = useRef<GainNode | null>(null);
  const bassBusRef    = useRef<GainNode | null>(null);
  const melodyBusRef  = useRef<GainNode | null>(null);

  const stepRef       = useRef(0);
  const nextNoteTime  = useRef(0);
  const timerRef      = useRef<number | null>(null);

  const ensureContext = useCallback((): AudioContext => {
    if (ctxRef.current) return ctxRef.current;
    const Ctor =
      (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext) as typeof AudioContext;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = masterVol * VOL_MAX;
    master.connect(ctx.destination);
    const drumsBus  = ctx.createGain();
    drumsBus.gain.value = drumsMute ? 0 : drumsVol;
    drumsBus.connect(master);
    const bassBus   = ctx.createGain();
    bassBus.gain.value = bassMute ? 0 : bassVol;
    bassBus.connect(master);
    const melodyBus = ctx.createGain();
    melodyBus.gain.value = melodyMute ? 0 : melodyVol;
    melodyBus.connect(master);

    ctxRef.current = ctx;
    masterGainRef.current = master;
    drumsBusRef.current = drumsBus;
    bassBusRef.current  = bassBus;
    melodyBusRef.current = melodyBus;
    return ctx;
  }, [masterVol, drumsMute, drumsVol, bassMute, bassVol, melodyMute, melodyVol]);

  // Keep bus gains in sync with mixer state.
  useEffect(() => {
    const bus = drumsBusRef.current; const ctx = ctxRef.current;
    if (!bus || !ctx) return;
    bus.gain.linearRampToValueAtTime(drumsMute ? 0 : drumsVol, ctx.currentTime + 0.04);
  }, [drumsVol, drumsMute]);
  useEffect(() => {
    const bus = bassBusRef.current; const ctx = ctxRef.current;
    if (!bus || !ctx) return;
    bus.gain.linearRampToValueAtTime(bassMute ? 0 : bassVol, ctx.currentTime + 0.04);
  }, [bassVol, bassMute]);
  useEffect(() => {
    const bus = melodyBusRef.current; const ctx = ctxRef.current;
    if (!bus || !ctx) return;
    bus.gain.linearRampToValueAtTime(melodyMute ? 0 : melodyVol, ctx.currentTime + 0.04);
  }, [melodyVol, melodyMute]);
  useEffect(() => {
    const m = masterGainRef.current; const ctx = ctxRef.current;
    if (!m || !ctx) return;
    m.gain.linearRampToValueAtTime(masterVol * VOL_MAX, ctx.currentTime + 0.04);
  }, [masterVol]);

  // -------------------------------------------------------------------------
  // Scheduler
  // -------------------------------------------------------------------------
  const scheduleStep = useCallback((stepIdx: number, time: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    // Drums
    const dPat = drumsRef.current;
    DRUM_ORDER.forEach(({ kind }, row) => {
      if (dPat[row]?.[stepIdx]) {
        playDrum(kind, ctx, time, drumsBusRef.current!);
      }
    });
    // Bass — monophonic (top row wins), prevents low-end mud
    const bPat = bassRef.current;
    const bRows = bassRowsRef.current;
    for (let row = 0; row < bPat.length; ++row) {
      if (bPat[row][stepIdx]) {
        playBass(ctx, time, bRows[row].freq, bassBusRef.current!);
        break;
      }
    }
    // Melody — polyphonic, all hits at this step
    const mPat = melodyRef.current;
    const mRows = melodyRowsRef.current;
    const osc = oscRef.current;
    for (let row = 0; row < mPat.length; ++row) {
      if (mPat[row][stepIdx]) {
        playMelody(ctx, time, mRows[row].freq, melodyBusRef.current!, osc);
      }
    }
  }, []);

  const scheduler = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    while (nextNoteTime.current < ctx.currentTime + SCHEDULE_AHEAD_S) {
      const t = nextNoteTime.current;
      const s = stepRef.current;
      scheduleStep(s, t);
      const delayMs = Math.max(0, (t - ctx.currentTime) * 1000);
      window.setTimeout(() => setStep(s), delayMs);
      const secondsPerStep = 60.0 / bpmRef.current / 4;
      nextNoteTime.current += secondsPerStep;
      stepRef.current = (stepRef.current + 1) % COLS;
    }
    timerRef.current = window.setTimeout(scheduler, LOOKAHEAD_MS);
  }, [scheduleStep]);

  const start = useCallback(() => {
    const ctx = ensureContext();
    if (ctx.state === "suspended") void ctx.resume();
    stepRef.current = 0;
    nextNoteTime.current = ctx.currentTime + 0.05;
    setPlaying(true);
    scheduler();
  }, [ensureContext, scheduler]);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPlaying(false);
    setStep(-1);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  // -------------------------------------------------------------------------
  // Edits
  // -------------------------------------------------------------------------
  const toggle = useCallback(
    (track: "drums" | "bass" | "melody", row: number, col: number) => {
      const setter =
        track === "drums" ? setDrums : track === "bass" ? setBass : setMelody;
      setter((g) =>
        g.map((r, ri) => (ri === row ? r.map((c, ci) => (ci === col ? !c : c)) : r)),
      );
    },
    [],
  );

  const clearAll = useCallback(() => {
    setDrums(emptyPattern(DRUM_ORDER.length));
    setBass(emptyPattern(bassRows.length));
    setMelody(emptyPattern(melodyRows.length));
  }, [bassRows.length, melodyRows.length]);

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
  const renderTrack = (
    title: string,
    track: "drums" | "bass" | "melody",
    pattern: Pattern,
    rowLabels: string[],
    mute: boolean,
    setMute: (b: boolean) => void,
    vol: number,
    setVol: (v: number) => void,
    extra?: React.ReactNode,
  ) => (
    <section
      className={
        "rounded-xl border bg-paper p-4 md:p-5 transition-colors " +
        (mute ? "border-paper-deep opacity-70" : "border-paper-deep")
      }
    >
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>
        <button
          type="button"
          onClick={() => setMute(!mute)}
          aria-pressed={mute}
          className={
            "rounded-md border px-2 py-0.5 text-[10px] font-mono tracking-widest uppercase transition-colors " +
            (mute
              ? "border-injoo bg-injoo text-paper"
              : "border-paper-deep text-ink-soft hover:border-ink")
          }
        >
          {mute ? "Muted" : "Mute"}
        </button>
        <label className="flex items-center gap-2 text-[10px] font-mono text-ink-mute uppercase">
          Vol
          <input
            type="range" min={0} max={1} step={0.01}
            value={vol}
            onChange={(e) => setVol(Number(e.target.value))}
            className="accent-ink w-24"
            aria-label={`${title} volume`}
            disabled={mute}
          />
          <span className="tabular w-8 text-right">{Math.round(vol * 100)}</span>
        </label>
        {extra}
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid gap-1 min-w-fit"
          style={{ gridTemplateColumns: `auto repeat(${COLS}, 1.5rem)` }}
          role="grid"
          aria-label={`${title} pattern`}
        >
          {/* Header row: step numbers */}
          <span aria-hidden />
          {Array.from({ length: COLS }, (_, c) => (
            <span
              key={`${track}-h-${c}`}
              className={
                "text-[9px] font-mono text-center self-end pb-0.5 " +
                (playing && step === c ? "text-injoo font-bold" : "text-ink-mute")
              }
              aria-hidden
            >
              {c + 1}
            </span>
          ))}

          {/* Pattern rows */}
          {pattern.map((row, ri) => (
            <Fragment key={`${track}-r-${ri}`}>
              <span className="text-[11px] font-mono text-ink-soft self-center pr-2 select-none whitespace-nowrap">
                {rowLabels[ri]}
              </span>
              {row.map((on, ci) => {
                const onHead = playing && step === ci;
                return (
                  <button
                    key={`${track}-${ri}-${ci}`}
                    type="button"
                    role="gridcell"
                    aria-label={`${title} ${rowLabels[ri]} step ${ci + 1} ${on ? "on" : "off"}`}
                    aria-pressed={on}
                    onClick={() => toggle(track, ri, ci)}
                    className={
                      "relative h-6 rounded transition-colors " +
                      (on
                        ? "bg-ink hover:bg-ink-soft"
                        : "bg-paper-deep hover:bg-ink/15") +
                      (onHead ? " ring-2 ring-injoo ring-offset-1 ring-offset-paper" : "")
                    }
                  >
                    {on && (
                      <span
                        aria-hidden
                        className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-injoo"
                      />
                    )}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="mt-10 rounded-2xl border border-paper-deep bg-paper-soft p-4 md:p-6">
      {/* Master controls */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <button
          type="button"
          onClick={playing ? stop : start}
          className="rounded-md bg-ink text-paper px-6 py-2 text-sm font-medium hover:bg-ink-soft transition-colors"
        >
          {playing ? "정지" : "재생"}
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-md border border-ink/20 px-4 py-2 text-sm hover:bg-ink hover:text-paper transition-colors"
        >
          전체 초기화
        </button>

        <label className="flex items-center gap-3 text-sm text-ink-soft">
          <span className="font-mono text-xs tracking-widest text-ink-mute uppercase">BPM</span>
          <input
            type="range" min={60} max={200} step={1}
            value={bpm} onChange={(e) => setBpm(Number(e.target.value))}
            className="accent-ink w-28" aria-label="템포"
          />
          <span className="tabular text-xs w-8 text-right">{bpm}</span>
        </label>

        <label className="flex items-center gap-3 text-sm text-ink-soft flex-1 min-w-[180px]">
          <span className="font-mono text-xs tracking-widest text-ink-mute uppercase">Master</span>
          <input
            type="range" min={0} max={1} step={0.01}
            value={masterVol} onChange={(e) => setMasterVol(Number(e.target.value))}
            className="flex-1 accent-ink" aria-label="마스터 볼륨"
          />
          <span className="tabular text-xs w-10 text-right">{Math.round(masterVol * 100)}%</span>
        </label>
      </div>

      {/* Scale picker */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="font-mono text-xs tracking-widest text-ink-mute uppercase">Scale</span>
        {SCALES.map((s) => {
          const on = scale.id === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setScaleId(s.id)}
              className={
                "relative rounded-md border px-3 py-1 text-xs transition-colors " +
                (on
                  ? "border-ink bg-ink text-paper"
                  : "border-paper-deep bg-paper hover:border-ink text-ink")
              }
            >
              {on && (
                <span aria-hidden className="absolute top-1 right-1 w-1 h-1 rounded-full bg-injoo" />
              )}
              <span className="font-semibold">{s.label}</span>
              <span className={"ml-2 " + (on ? "text-paper/70" : "text-ink-mute")}>{s.hint}</span>
            </button>
          );
        })}
      </div>

      {/* Tracks */}
      <div className="space-y-4">
        {renderTrack(
          "Drums", "drums", drums,
          DRUM_ORDER.map((d) => d.label),
          drumsMute, setDrumsMute, drumsVol, setDrumsVol,
        )}
        {renderTrack(
          "Bass", "bass", bass,
          bassRows.map((r) => r.label),
          bassMute, setBassMute, bassVol, setBassVol,
        )}
        {renderTrack(
          "Melody", "melody", melody,
          melodyRows.map((r) => r.label),
          melodyMute, setMelodyMute, melodyVol, setMelodyVol,
          // Melody-only voice picker.
          <div className="flex items-center gap-1.5">
            {OSC_OPTIONS.map((o) => {
              const on = melodyOsc === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setMelodyOsc(o.value)}
                  className={
                    "rounded-md border px-2 py-0.5 text-[10px] transition-colors " +
                    (on
                      ? "border-ink bg-ink text-paper"
                      : "border-paper-deep text-ink-soft hover:border-ink")
                  }
                  aria-pressed={on}
                >
                  {o.label}
                </button>
              );
            })}
          </div>,
        )}
      </div>

      <p className="mt-4 text-xs text-ink-mute">
        세 트랙(드럼·베이스·멜로디)이 한 박자 위에서 함께 움직입니다. 스케일을 바꾸면 베이스·멜로디 행이 자동으로 재구성됩니다. 출력은 안전을 위해 50%로 제한.
      </p>
    </div>
  );
}
