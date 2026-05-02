import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

// ---------------------------------------------------------------------------
// Constants — domain bounds + brand palette stops kept in sync with
// BrushStroke.tsx and SoundLab.tsx.
// ---------------------------------------------------------------------------
const FREQ_MIN       = 20;
const FREQ_MAX       = 20000;
const GAIN_MIN       = -12;
const GAIN_MAX       = 12;
const RESPONSE_BINS  = 256;
const VOL_MAX        = 0.5;
const ANALYSER_FFT   = 1024;

const NAJEON_STOPS: ReadonlyArray<readonly [number, readonly [number, number, number]]> = [
  [0.00, [111, 184, 209]] as const,
  [0.22, [147, 201, 176]] as const,
  [0.46, [244, 224, 188]] as const,
  [0.72, [197, 166, 204]] as const,
  [1.00, [220, 169, 184]] as const,
];

type Band = { freq: number; gain: number; q: number };

const INITIAL_BANDS: ReadonlyArray<Band> = [
  { freq: 60,    gain: 0, q: 1.0 },
  { freq: 250,   gain: 0, q: 1.0 },
  { freq: 1000,  gain: 0, q: 1.0 },
  { freq: 4000,  gain: 0, q: 1.0 },
  { freq: 12000, gain: 0, q: 1.0 },
];

type SourceType = "pink" | "ref" | "sweep";
const SOURCES: ReadonlyArray<{ value: SourceType; label: string; hint: string }> = [
  { value: "pink",  label: "Pink Noise", hint: "전 대역 균등" },
  { value: "ref",   label: "Reference",  hint: "1 kHz 사인" },
  { value: "sweep", label: "Sweep",      hint: "20 Hz → 20 kHz" },
];

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
const LOG_FMIN = Math.log10(FREQ_MIN);
const LOG_FMAX = Math.log10(FREQ_MAX);

function freqToX(freq: number, width: number): number {
  const t = (Math.log10(freq) - LOG_FMIN) / (LOG_FMAX - LOG_FMIN);
  return t * width;
}
function xToFreq(x: number, width: number): number {
  const t = Math.max(0, Math.min(1, x / width));
  return Math.pow(10, LOG_FMIN + t * (LOG_FMAX - LOG_FMIN));
}
function gainToY(gain: number, height: number): number {
  const t = (GAIN_MAX - gain) / (GAIN_MAX - GAIN_MIN);
  return t * height;
}
function yToGain(y: number, height: number): number {
  const t = Math.max(0, Math.min(1, y / height));
  return GAIN_MAX - t * (GAIN_MAX - GAIN_MIN);
}

function generatePinkNoise(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const n = Math.floor(sr * durationSec);
  const buf = ctx.createBuffer(1, n, sr);
  const data = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; ++i) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.96900 * b2 + w * 0.1538520;
    b3 = 0.86650 * b3 + w * 0.3104856;
    b4 = 0.55000 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return buf;
}

function generateSweepBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const n = Math.floor(sr * durationSec);
  const buf = ctx.createBuffer(1, n, sr);
  const data = buf.getChannelData(0);
  const fStart = 20;
  const fEnd   = 20000;
  const k      = Math.pow(fEnd / fStart, 1 / durationSec);
  const lnK    = Math.log(k);
  for (let i = 0; i < n; ++i) {
    const t = i / sr;
    const phase = 2 * Math.PI * fStart * (Math.pow(k, t) - 1) / lnK;
    data[i] = Math.sin(phase) * 0.5;
  }
  return buf;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Tuner() {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const [bands,  setBands]  = useState<Band[]>(() => INITIAL_BANDS.map((b) => ({ ...b })));
  const [source, setSource] = useState<SourceType>("pink");
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const [drag, setDrag] = useState<number | null>(null);

  // Refs the audio code reads to dodge stale closures.
  const bandsRef = useRef(bands);   bandsRef.current = bands;
  const sourceRef_ = useRef(source); sourceRef_.current = source;

  // -------------------------------------------------------------------------
  // Audio graph
  // -------------------------------------------------------------------------
  const ctxRef         = useRef<AudioContext | null>(null);
  const masterGainRef  = useRef<GainNode | null>(null);
  const analyserRef    = useRef<AnalyserNode | null>(null);
  const filtersRef     = useRef<BiquadFilterNode[]>([]);
  const sourceNodeRef  = useRef<AudioScheduledSourceNode | null>(null);
  const pinkBufRef     = useRef<AudioBuffer | null>(null);
  const sweepBufRef    = useRef<AudioBuffer | null>(null);

  const sampleFreqs = useMemo(() => {
    // Cast through ArrayBuffer so the Web Audio types match — TS 5.8 made
    // Float32Array generic in its underlying buffer kind.
    const arr = new Float32Array(new ArrayBuffer(RESPONSE_BINS * 4));
    for (let i = 0; i < RESPONSE_BINS; ++i) {
      const t = i / (RESPONSE_BINS - 1);
      arr[i] = Math.pow(10, LOG_FMIN + t * (LOG_FMAX - LOG_FMIN));
    }
    return arr;
  }, []);

  const ensureContext = useCallback((): AudioContext => {
    if (ctxRef.current) return ctxRef.current;
    const Ctor =
      (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext) as typeof AudioContext;
    const ctx = new Ctor();

    // Build the filter chain.
    const filters = bandsRef.current.map((band) => {
      const f = ctx.createBiquadFilter();
      f.type = "peaking";
      f.frequency.value = band.freq;
      f.Q.value = band.q;
      f.gain.value = band.gain;
      return f;
    });
    for (let i = 0; i < filters.length - 1; ++i) {
      filters[i].connect(filters[i + 1]);
    }

    const master = ctx.createGain();
    master.gain.value = volume * VOL_MAX;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = ANALYSER_FFT;
    analyser.smoothingTimeConstant = 0.78;

    filters[filters.length - 1].connect(master);
    master.connect(analyser);
    analyser.connect(ctx.destination);

    ctxRef.current = ctx;
    masterGainRef.current = master;
    analyserRef.current = analyser;
    filtersRef.current = filters;
    return ctx;
  }, [volume]);

  // Sync filter params when bands state changes.
  useEffect(() => {
    const ctx = ctxRef.current;
    const fs = filtersRef.current;
    if (!ctx || fs.length === 0) return;
    const t = ctx.currentTime;
    bands.forEach((band, i) => {
      const f = fs[i];
      f.frequency.setTargetAtTime(band.freq, t, 0.01);
      f.Q.setTargetAtTime(band.q, t, 0.01);
      f.gain.setTargetAtTime(band.gain, t, 0.01);
    });
  }, [bands]);

  // Volume → master gain ramp.
  useEffect(() => {
    const gain = masterGainRef.current;
    const ctx  = ctxRef.current;
    if (!gain || !ctx) return;
    gain.gain.linearRampToValueAtTime(volume * VOL_MAX, ctx.currentTime + 0.05);
  }, [volume]);

  // -------------------------------------------------------------------------
  // Source playback
  // -------------------------------------------------------------------------
  const stopSource = useCallback(() => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch { /* already stopped */ }
      try { sourceNodeRef.current.disconnect(); } catch { /* already disconnected */ }
      sourceNodeRef.current = null;
    }
  }, []);

  const startSource = useCallback((kind: SourceType) => {
    const ctx = ensureContext();
    if (ctx.state === "suspended") void ctx.resume();
    stopSource();

    let node: AudioScheduledSourceNode;
    if (kind === "ref") {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 1000;
      node = osc;
    } else if (kind === "pink") {
      const buf = pinkBufRef.current ?? (pinkBufRef.current = generatePinkNoise(ctx, 2));
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      node = src;
    } else {
      const buf = sweepBufRef.current ?? (sweepBufRef.current = generateSweepBuffer(ctx, 8));
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      node = src;
    }

    node.connect(filtersRef.current[0]);
    node.start();
    sourceNodeRef.current = node;
  }, [ensureContext, stopSource]);

  const play = useCallback(() => {
    startSource(sourceRef_.current);
    setPlaying(true);
  }, [startSource]);

  const stop = useCallback(() => {
    stopSource();
    setPlaying(false);
  }, [stopSource]);

  // If user changes source while playing, restart with new source.
  useEffect(() => {
    if (playing) startSource(source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      stopSource();
      ctxRef.current?.close().catch(() => {});
    };
  }, [stopSource]);

  // -------------------------------------------------------------------------
  // Canvas + draw loop
  // -------------------------------------------------------------------------
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [size, setSize] = useState({ w: 1, h: 1 });

  // Track wrapper size for handle positioning.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Persistent draw arrays (allocated once).
  // Float32Array<ArrayBuffer> explicitly — TS 5.8's stricter typed-array
  // generic defaults to ArrayBufferLike, but Web Audio's getFrequencyResponse
  // signature requires the concrete ArrayBuffer variant.
  const magBuffersRef = useRef<Float32Array<ArrayBuffer>[]>([]);
  const phaseBuffersRef = useRef<Float32Array<ArrayBuffer>[]>([]);
  useEffect(() => {
    magBuffersRef.current   = INITIAL_BANDS.map(
      () => new Float32Array(new ArrayBuffer(RESPONSE_BINS * 4)),
    );
    phaseBuffersRef.current = INITIAL_BANDS.map(
      () => new Float32Array(new ArrayBuffer(RESPONSE_BINS * 4)),
    );
  }, []);

  // RAF draw — grid, output spectrum (faint area), EQ response curve.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width  = Math.floor(r.width  * dpr);
      canvas.height = Math.floor(r.height * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const freqData = new Uint8Array(ANALYSER_FFT / 2);

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx2d.clearRect(0, 0, W, H);

      // ----- Grid: dB lines (every 6 dB) and a few freq labels -----
      ctx2d.strokeStyle = "rgba(138,130,120,0.18)";
      ctx2d.lineWidth = 1;
      for (let dB = GAIN_MIN; dB <= GAIN_MAX; dB += 6) {
        const y = gainToY(dB, H);
        ctx2d.beginPath();
        ctx2d.moveTo(0, y);
        ctx2d.lineTo(W, y);
        ctx2d.stroke();
      }
      const decadeFreqs = [100, 1000, 10000];
      for (const f of decadeFreqs) {
        const x = freqToX(f, W);
        ctx2d.beginPath();
        ctx2d.moveTo(x, 0);
        ctx2d.lineTo(x, H);
        ctx2d.stroke();
      }
      // 0 dB centre line, slightly stronger.
      ctx2d.strokeStyle = "rgba(138,130,120,0.32)";
      ctx2d.beginPath();
      const yMid = gainToY(0, H);
      ctx2d.moveTo(0, yMid);
      ctx2d.lineTo(W, yMid);
      ctx2d.stroke();

      // ----- Output spectrum (faint area fill behind the curve) -----
      const analyser = analyserRef.current;
      if (analyser && playing) {
        analyser.getByteFrequencyData(freqData);
        ctx2d.beginPath();
        ctx2d.moveTo(0, H);
        const sr = ctxRef.current?.sampleRate ?? 48000;
        const nyquist = sr / 2;
        for (let i = 0; i < freqData.length; ++i) {
          const f = (i / freqData.length) * nyquist;
          if (f < FREQ_MIN || f > FREQ_MAX) continue;
          const x = freqToX(f, W);
          // Map 0..255 to a 0..GAIN_MAX height; just a visual amplitude.
          const norm = freqData[i] / 255;
          const y = gainToY(norm * GAIN_MAX, H);
          ctx2d.lineTo(x, y);
        }
        ctx2d.lineTo(W, H);
        ctx2d.closePath();
        const grad = ctx2d.createLinearGradient(0, 0, W, 0);
        for (const [stop, [r, g, b]] of NAJEON_STOPS) {
          grad.addColorStop(stop, `rgba(${r},${g},${b},0.18)`);
        }
        ctx2d.fillStyle = grad;
        ctx2d.fill();
      }

      // ----- EQ response curve (najeon stroke) -----
      const fs = filtersRef.current;
      if (fs.length > 0) {
        const mags   = magBuffersRef.current;
        const phases = phaseBuffersRef.current;
        for (let b = 0; b < fs.length; ++b) {
          fs[b].getFrequencyResponse(sampleFreqs, mags[b], phases[b]);
        }
        // Stroke gradient — left-to-right najeon, exactly the BrushStroke palette.
        const grad = ctx2d.createLinearGradient(0, 0, W, 0);
        for (const [stop, [r, g, b]] of NAJEON_STOPS) {
          grad.addColorStop(stop, `rgb(${r},${g},${b})`);
        }
        ctx2d.strokeStyle = grad;
        ctx2d.lineWidth = 2.2 * dpr;
        ctx2d.lineCap = "round";
        ctx2d.lineJoin = "round";
        ctx2d.beginPath();
        for (let i = 0; i < RESPONSE_BINS; ++i) {
          let totalDB = 0;
          for (let b = 0; b < fs.length; ++b) totalDB += 20 * Math.log10(mags[b][i] || 1e-9);
          const x = freqToX(sampleFreqs[i], W);
          const y = gainToY(Math.max(GAIN_MIN, Math.min(GAIN_MAX, totalDB)), H);
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
        }
        ctx2d.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [sampleFreqs, playing]);

  // -------------------------------------------------------------------------
  // Drag handlers
  // -------------------------------------------------------------------------
  const onHandleDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>, i: number) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag(i);
    },
    [],
  );

  const onHandleMove = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>, i: number) => {
      if (drag !== i) return;
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const r = wrapper.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const newFreq = xToFreq(x, r.width);
      const newGain = yToGain(y, r.height);
      setBands((prev) =>
        prev.map((b, bi) =>
          bi === i ? { ...b, freq: newFreq, gain: newGain } : b,
        ),
      );
    },
    [drag],
  );

  const onHandleUp = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>, _i: number) => {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
      setDrag(null);
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Reset / Q control
  // -------------------------------------------------------------------------
  const reset = useCallback(() => {
    setBands(INITIAL_BANDS.map((b) => ({ ...b })));
  }, []);

  const setBandQ = useCallback((idx: number, q: number) => {
    setBands((prev) => prev.map((b, i) => (i === idx ? { ...b, q } : b)));
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="mt-10 rounded-2xl border border-paper-deep bg-paper-soft p-4 md:p-6">
      {/* Source picker */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs tracking-widest text-ink-mute uppercase">Source</span>
        {SOURCES.map((s) => {
          const on = source === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => setSource(s.value)}
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
              <span className="font-semibold">{s.label}</span>
              <span className={"ml-2 " + (on ? "text-paper/70" : "text-ink-mute")}>{s.hint}</span>
            </button>
          );
        })}
      </div>

      {/* EQ canvas + drag handles */}
      <div
        ref={wrapperRef}
        className="relative mt-6 w-full rounded-lg bg-ink dark:bg-paper select-none touch-none"
        style={{ aspectRatio: "16 / 7" }}
        aria-label="EQ frequency response"
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full rounded-lg" />

        {/* dB axis labels (overlay, top-left) */}
        <div className="absolute top-2 left-2 text-[10px] font-mono text-paper/40 dark:text-ink/40 tabular pointer-events-none">
          +12 dB
        </div>
        <div className="absolute bottom-2 left-2 text-[10px] font-mono text-paper/40 dark:text-ink/40 tabular pointer-events-none">
          −12 dB
        </div>
        <div
          className="absolute left-2 text-[10px] font-mono text-paper/40 dark:text-ink/40 tabular pointer-events-none"
          style={{ top: "calc(50% - 6px)" }}
        >
          0
        </div>
        {/* Frequency labels */}
        {[
          { f: 100,   label: "100" },
          { f: 1000,  label: "1k"  },
          { f: 10000, label: "10k" },
        ].map((x) => (
          <div
            key={x.f}
            className="absolute bottom-2 text-[10px] font-mono text-paper/40 dark:text-ink/40 tabular pointer-events-none"
            style={{ left: `calc(${(freqToX(x.f, 1) * 100).toFixed(2)}% - 8px)` }}
          >
            {x.label}
          </div>
        ))}

        {/* Drag handles */}
        {bands.map((band, i) => {
          const left = (freqToX(band.freq, 1) * 100).toFixed(2);
          const top  = (gainToY(band.gain, 1) * 100).toFixed(2);
          const active = drag === i;
          return (
            <button
              key={i}
              type="button"
              role="slider"
              aria-label={`Band ${i + 1}: ${band.freq.toFixed(0)} Hz, ${band.gain.toFixed(1)} dB`}
              aria-valuenow={Math.round(band.gain)}
              aria-valuemin={GAIN_MIN}
              aria-valuemax={GAIN_MAX}
              onPointerDown={(e) => onHandleDown(e, i)}
              onPointerMove={(e) => onHandleMove(e, i)}
              onPointerUp={(e)   => onHandleUp(e, i)}
              onPointerCancel={(e) => onHandleUp(e, i)}
              className={
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper border-2 transition-transform " +
                (active
                  ? "w-5 h-5 border-injoo ring-2 ring-injoo/40 cursor-grabbing"
                  : "w-4 h-4 border-ink hover:scale-110 cursor-grab")
              }
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <span className="sr-only">Band {i + 1}</span>
            </button>
          );
        })}

        {/* Hidden size sentinel for ResizeObserver fallback */}
        <span className="sr-only">{`${size.w}×${size.h}`}</span>
      </div>

      {/* Band info + Q sliders */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {bands.map((band, i) => (
          <div
            key={i}
            className={
              "rounded-md border p-3 transition-colors " +
              (drag === i ? "border-injoo bg-paper" : "border-paper-deep bg-paper")
            }
          >
            <p className="text-[10px] font-mono tracking-widest text-ink-mute uppercase">
              Band {i + 1}
            </p>
            <p className="mt-1 text-sm tabular text-ink">
              {band.freq < 1000 ? `${band.freq.toFixed(0)} Hz` : `${(band.freq / 1000).toFixed(2)} kHz`}
            </p>
            <p className="text-xs tabular text-ink-soft">
              {band.gain >= 0 ? "+" : ""}{band.gain.toFixed(1)} dB
            </p>
            <label className="mt-2 flex items-center gap-2 text-[10px] font-mono text-ink-mute">
              Q
              <input
                type="range"
                min={0.3}
                max={4}
                step={0.05}
                value={band.q}
                onChange={(e) => setBandQ(i, Number(e.target.value))}
                className="flex-1 accent-ink"
                aria-label={`Band ${i + 1} Q`}
              />
              <span className="tabular w-8 text-right">{band.q.toFixed(1)}</span>
            </label>
          </div>
        ))}
      </div>

      {/* Transport */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={playing ? stop : play}
          className="rounded-md bg-ink text-paper px-6 py-2 text-sm font-medium hover:bg-ink-soft transition-colors"
        >
          {playing ? "정지" : "재생"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-ink/20 px-4 py-2 text-sm hover:bg-ink hover:text-paper transition-colors"
        >
          초기화
        </button>

        <label className="flex items-center gap-3 text-sm text-ink-soft flex-1 min-w-[180px]">
          <span className="font-mono text-xs tracking-widest text-ink-mute uppercase">Vol</span>
          <input
            type="range"
            min={0} max={1} step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1 accent-ink"
            aria-label="볼륨"
          />
          <span className="tabular text-xs w-10 text-right">{Math.round(volume * 100)}%</span>
        </label>
      </div>

      <p className="mt-4 text-xs text-ink-mute">
        곡선 위 점을 끌어 주파수와 게인을 직접 조정하세요. 자개 곡선은 5밴드 BiquadFilter 응답의 합이며, 음원이 그 위를 통과하는 모습이 옅은 spectrum으로 비칩니다. 출력은 안전을 위해 50%로 제한.
      </p>
    </div>
  );
}
