import { Fragment, useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Pentatonic 5-tone scale — Korean 5음계 (C major pentatonic, 도레미솔라).
// All notes consonant with each other so any pattern the user draws sounds
// musical without prior theory.
// ---------------------------------------------------------------------------
type Note = { name: string; freq: number };
const PENTATONIC: ReadonlyArray<Note> = [
  { name: "라", freq: 440.00 }, // A4 — top row
  { name: "솔", freq: 392.00 }, // G4
  { name: "미", freq: 329.63 }, // E4
  { name: "레", freq: 293.66 }, // D4
  { name: "도", freq: 261.63 }, // C4 — bottom row
];

type VoiceType = "sine" | "triangle" | "square";
const VOICES: ReadonlyArray<{ value: VoiceType; label: string; hint: string }> = [
  { value: "sine",     label: "Sine",     hint: "맑은 풍경" },
  { value: "triangle", label: "Triangle", hint: "둥근 음" },
  { value: "square",   label: "Square",   hint: "단단한 합성" },
];

const ROWS              = PENTATONIC.length;       // 5
const COLS              = 16;                      // 16th-note grid
const VOL_MAX           = 0.5;                     // hearing-safety cap
const LOOKAHEAD_MS      = 25;                      // scheduler tick
const SCHEDULE_AHEAD_S  = 0.1;                     // schedule horizon
const NOTE_RELEASE_S    = 0.22;                    // per-note envelope length

type Grid = boolean[][];

function emptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array<boolean>(COLS).fill(false));
}

export default function Sequencer() {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const [grid,     setGrid]     = useState<Grid>(emptyGrid);
  const [playing,  setPlaying]  = useState(false);
  const [step,     setStep]     = useState(-1);
  const [bpm,      setBpm]      = useState(120);
  const [voice,    setVoice]    = useState<VoiceType>("sine");
  const [volume,   setVolume]   = useState(0.35);

  // Refs the scheduler (closure-bound) reads instead of capturing stale state.
  const gridRef    = useRef(grid);     gridRef.current  = grid;
  const voiceRef   = useRef(voice);    voiceRef.current = voice;
  const bpmRef     = useRef(bpm);      bpmRef.current   = bpm;

  // Audio + scheduler state.
  const ctxRef        = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const stepRef       = useRef(0);
  const nextNoteTime  = useRef(0);
  const timerRef      = useRef<number | null>(null);

  // -------------------------------------------------------------------------
  // Audio engine
  // -------------------------------------------------------------------------
  const ensureContext = useCallback((): AudioContext => {
    if (ctxRef.current) return ctxRef.current;
    const Ctor =
      (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext) as typeof AudioContext;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = volume * VOL_MAX;
    master.connect(ctx.destination);
    ctxRef.current = ctx;
    masterGainRef.current = master;
    return ctx;
  }, [volume]);

  const playNote = useCallback((freq: number, time: number, voiceType: VoiceType) => {
    const ctx = ctxRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;

    const osc = ctx.createOscillator();
    osc.type = voiceType;
    osc.frequency.value = freq;

    const env = ctx.createGain();
    // 5 ms attack, exponential release. Gain stays well below 1 so combined
    // notes don't clip even when several rows fire simultaneously.
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.55, time + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, time + NOTE_RELEASE_S);

    osc.connect(env);
    env.connect(master);
    osc.start(time);
    osc.stop(time + NOTE_RELEASE_S + 0.02);
  }, []);

  const scheduleStep = useCallback((stepIdx: number, time: number) => {
    const g = gridRef.current;
    const v = voiceRef.current;
    for (let row = 0; row < ROWS; ++row) {
      if (g[row][stepIdx]) playNote(PENTATONIC[row].freq, time, v);
    }
  }, [playNote]);

  const scheduler = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    while (nextNoteTime.current < ctx.currentTime + SCHEDULE_AHEAD_S) {
      const t = nextNoteTime.current;
      const s = stepRef.current;
      scheduleStep(s, t);

      // Light up the UI step right when audio fires.
      const delayMs = Math.max(0, (t - ctx.currentTime) * 1000);
      window.setTimeout(() => setStep(s), delayMs);

      // Advance.
      const secondsPerStep = 60.0 / bpmRef.current / 4; // 16th notes
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

  // Volume → master gain ramp (avoids clicks).
  useEffect(() => {
    const gain = masterGainRef.current;
    const ctx = ctxRef.current;
    if (!gain || !ctx) return;
    gain.gain.linearRampToValueAtTime(volume * VOL_MAX, ctx.currentTime + 0.05);
  }, [volume]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  // -------------------------------------------------------------------------
  // Grid edits
  // -------------------------------------------------------------------------
  const toggleCell = useCallback((row: number, col: number) => {
    setGrid((g) =>
      g.map((r, ri) => (ri === row ? r.map((c, ci) => (ci === col ? !c : c)) : r)),
    );
  }, []);

  const clearGrid = useCallback(() => {
    setGrid(emptyGrid());
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="mt-10 rounded-2xl border border-paper-deep bg-paper-soft p-4 md:p-6">
      {/* Voice selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs tracking-widest text-ink-mute uppercase">Voice</span>
        {VOICES.map((v) => {
          const on = voice === v.value;
          return (
            <button
              key={v.value}
              type="button"
              onClick={() => setVoice(v.value)}
              className={
                "relative rounded-md border px-3 py-1.5 text-xs transition-colors " +
                (on
                  ? "border-ink bg-ink text-paper"
                  : "border-paper-deep bg-paper hover:border-ink text-ink")
              }
            >
              {on && (
                <span aria-hidden className="absolute top-1 right-1 w-1 h-1 rounded-full bg-injoo" />
              )}
              <span className="font-semibold">{v.label}</span>
              <span className={"ml-2 " + (on ? "text-paper/70" : "text-ink-mute")}>{v.hint}</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="mt-6 overflow-x-auto">
        <div
          className="grid gap-1 min-w-fit"
          style={{ gridTemplateColumns: `auto repeat(${COLS}, 1.75rem)` }}
          role="grid"
          aria-label="5음계 16-step sequencer"
        >
          {/* Column header row — beat numbers, current step in 인주 */}
          <span aria-hidden />
          {Array.from({ length: COLS }, (_, c) => {
            const onHead = playing && step === c;
            return (
              <span
                key={`head-${c}`}
                className={
                  "text-[10px] font-mono text-center self-end pb-1 " +
                  (onHead ? "text-injoo font-bold" : "text-ink-mute")
                }
                aria-hidden
              >
                {c + 1}
              </span>
            );
          })}

          {/* Note rows */}
          {PENTATONIC.map((note, row) => (
            <Fragment key={`row-${row}`}>
              <span className="text-sm font-mono text-ink-soft self-center pr-2 select-none">
                {note.name}
              </span>
              {Array.from({ length: COLS }, (_, col) => {
                const active = grid[row][col];
                const onHead = playing && step === col;
                return (
                  <button
                    key={`cell-${row}-${col}`}
                    type="button"
                    role="gridcell"
                    aria-label={`${note.name} ${col + 1}번 칸 ${active ? "켜짐" : "꺼짐"}`}
                    aria-pressed={active}
                    onClick={() => toggleCell(row, col)}
                    className={
                      "relative h-7 rounded transition-colors " +
                      (active
                        ? "bg-ink hover:bg-ink-soft"
                        : "bg-paper-deep hover:bg-ink/15") +
                      (onHead ? " ring-2 ring-injoo ring-offset-1 ring-offset-paper-soft" : "")
                    }
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute top-1 right-1 w-1 h-1 rounded-full bg-injoo"
                      />
                    )}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={playing ? stop : start}
          className="rounded-md bg-ink text-paper px-6 py-2 text-sm font-medium hover:bg-ink-soft transition-colors"
        >
          {playing ? "정지" : "재생"}
        </button>
        <button
          type="button"
          onClick={clearGrid}
          className="rounded-md border border-ink/20 px-4 py-2 text-sm hover:bg-ink hover:text-paper transition-colors"
        >
          초기화
        </button>

        <label className="flex items-center gap-3 text-sm text-ink-soft">
          <span className="font-mono text-xs tracking-widest text-ink-mute uppercase">BPM</span>
          <input
            type="range"
            min={60}
            max={160}
            step={1}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="accent-ink w-28"
            aria-label="템포"
          />
          <span className="tabular text-xs w-8 text-right">{bpm}</span>
        </label>

        <label className="flex items-center gap-3 text-sm text-ink-soft flex-1 min-w-[180px]">
          <span className="font-mono text-xs tracking-widest text-ink-mute uppercase">Vol</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1 accent-ink"
            aria-label="볼륨"
          />
          <span className="tabular text-xs w-10 text-right">{Math.round(volume * 100)}%</span>
        </label>
      </div>

      <p className="mt-4 text-xs text-ink-mute">
        이어폰 사용 시 볼륨을 30% 이하로 시작하세요. 5음계라 어떤 칸을 눌러도 음악으로 떨어집니다 — 비전공자도 부담 없이 그려보세요.
      </p>
    </div>
  );
}
