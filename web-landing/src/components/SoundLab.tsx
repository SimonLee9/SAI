import { useCallback, useEffect, useRef, useState } from "react";
import { soundPresets, type SoundPreset } from "../data/content";

const ANALYSER_FFT  = 256;          // → 128 frequency bins
const BAR_COUNT     = 16;           // mirrors WS2812B ring on the device
const VOL_MAX       = 0.5;          // hard ceiling on master gain (hearing safety)
const PINK_DURATION = 2;            // looped buffer length (s)

export default function SoundLab() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [volume,   setVolume]   = useState(0.35);

  const ctxRef        = useRef<AudioContext | null>(null);
  const gainRef       = useRef<GainNode | null>(null);
  const analyserRef   = useRef<AnalyserNode | null>(null);
  const sourceRef     = useRef<AudioScheduledSourceNode | null>(null);

  const canvasRef     = useRef<HTMLCanvasElement | null>(null);
  const rafRef        = useRef<number | null>(null);
  const activeIdRef   = useRef<string | null>(null);
  activeIdRef.current = activeId;

  const ensureContext = useCallback((): AudioContext => {
    if (ctxRef.current) return ctxRef.current;
    const Ctor =
      (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext) as typeof AudioContext;
    const ctx = new Ctor();
    const gain = ctx.createGain();
    gain.gain.value = volume * VOL_MAX;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = ANALYSER_FFT;
    analyser.smoothingTimeConstant = 0.78;
    gain.connect(analyser);
    analyser.connect(ctx.destination);
    ctxRef.current = ctx;
    gainRef.current = gain;
    analyserRef.current = analyser;
    return ctx;
  }, [volume]);

  const stopSource = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* already stopped */ }
      try { sourceRef.current.disconnect(); } catch { /* already disconnected */ }
      sourceRef.current = null;
    }
  }, []);

  const play = useCallback((preset: SoundPreset) => {
    const ctx = ensureContext();
    if (ctx.state === "suspended") void ctx.resume();
    stopSource();

    if (preset.kind === "tone") {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = preset.freq!;
      osc.connect(gainRef.current!);
      osc.start();
      sourceRef.current = osc;
    } else if (preset.kind === "sweep") {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const t0 = ctx.currentTime;
      const t1 = t0 + (preset.durationSec ?? 8);
      osc.frequency.setValueAtTime(preset.fromHz!, t0);
      // exponentialRamp can't pass through 0; both endpoints are positive.
      osc.frequency.exponentialRampToValueAtTime(preset.toHz!, t1);
      osc.connect(gainRef.current!);
      osc.start(t0);
      osc.stop(t1);
      osc.onended = () => {
        sourceRef.current = null;
        setActiveId(null);
      };
      sourceRef.current = osc;
    } else if (preset.kind === "noise") {
      const buf = generatePinkNoise(ctx, PINK_DURATION);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(gainRef.current!);
      src.start();
      sourceRef.current = src;
    }
    setActiveId(preset.id);
  }, [ensureContext, stopSource]);

  const stop = useCallback(() => {
    stopSource();
    setActiveId(null);
  }, [stopSource]);

  // Volume → gain ramp (avoids clicks)
  useEffect(() => {
    const gain = gainRef.current;
    const ctx = ctxRef.current;
    if (!gain || !ctx) return;
    gain.gain.linearRampToValueAtTime(volume * VOL_MAX, ctx.currentTime + 0.05);
  }, [volume]);

  // Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width  = Math.floor(rect.width  * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const freqData = new Uint8Array(ANALYSER_FFT / 2);

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx2d.clearRect(0, 0, W, H);

      const playing = activeIdRef.current !== null;
      const analyser = analyserRef.current;

      if (playing && analyser) {
        analyser.getByteFrequencyData(freqData);
      }

      const gap = 4 * dpr;
      const barW = (W - gap * (BAR_COUNT - 1)) / BAR_COUNT;
      const totalBins = freqData.length;

      for (let i = 0; i < BAR_COUNT; ++i) {
        let amp: number;
        if (playing && analyser) {
          // Logarithmic grouping: more bars in low end.
          const lo = Math.floor(Math.pow(i / BAR_COUNT, 2) * totalBins);
          const hi = Math.max(lo + 1, Math.ceil(Math.pow((i + 1) / BAR_COUNT, 2) * totalBins));
          let sum = 0;
          for (let b = lo; b < hi && b < totalBins; ++b) sum += freqData[b];
          amp = Math.min(1, sum / (hi - lo) / 200);
        } else {
          // Idle: gentle traveling sine
          const t = performance.now() / 1000;
          amp = 0.18 + 0.18 * Math.sin(t * 1.5 + i * 0.45);
        }

        const h = Math.max(2 * dpr, amp * H);
        const x = i * (barW + gap);
        const y = H - h;

        // Hue ramp: low → 단청 amber, high → 청자 sage.
        const t = i / (BAR_COUNT - 1);
        const r = Math.round(217 - (217 - 132) * t);
        const g = Math.round(119 + (169 - 119) * t);
        const b = Math.round(  6 + (140 -   6) * t);
        ctx2d.fillStyle = `rgb(${r}, ${g}, ${b})`;
        roundRect(ctx2d, x, y, barW, h, 3 * dpr);
        ctx2d.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSource();
      ctxRef.current?.close().catch(() => {});
    };
  }, [stopSource]);

  return (
    <section id="lab" className="py-24 md:py-32 border-b border-paper-deep">
      <div className="mx-auto max-w-5xl px-6">
        <p className="text-xs tracking-[0.3em] text-amber-deep uppercase">Sound Lab</p>
        <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
          음원별로, 사용하는 음역대가 다릅니다
        </h2>
        <p className="mt-4 max-w-2xl text-ink-soft leading-relaxed">
          베이스 라인의 80 Hz, 보컬의 1 kHz, 심벌의 10 kHz — 음악마다 강조되는 결이 다릅니다. 직접 합성한 신호를 들어보고, 실제 LED 링이 그릴 16-band 스펙트럼을 그대로 미러링한 비주얼라이저로 확인해 보세요.
        </p>

        <div className="mt-10 rounded-2xl border border-paper-deep bg-paper-soft p-4 md:p-6">
          <canvas
            ref={canvasRef}
            className="block w-full h-40 md:h-56 rounded-lg bg-ink"
            aria-label="실시간 16-band 스펙트럼"
          />

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {soundPresets.map((p) => {
              const on = p.id === activeId;
              return (
                <button
                  key={p.id}
                  onClick={() => (on ? stop() : play(p))}
                  className={
                    "rounded-lg border p-4 text-left transition-colors " +
                    (on
                      ? "border-amber bg-amber text-paper"
                      : "border-paper-deep bg-paper hover:border-amber text-ink")
                  }
                >
                  <p className="text-sm font-semibold">{p.label}</p>
                  <p className={"mt-1 text-xs font-mono " + (on ? "text-paper/80" : "text-ink-mute")}>
                    {p.hint}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="flex items-center gap-3 text-sm text-ink-soft flex-1">
              <span className="font-mono text-xs tracking-widest text-ink-mute uppercase">Volume</span>
              <input
                type="range"
                min={0} max={1} step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 accent-amber"
                aria-label="Volume"
              />
              <span className="tabular text-xs w-10 text-right">{Math.round(volume * 100)}%</span>
            </label>
            <button
              onClick={stop}
              disabled={!activeId}
              className="rounded-md border border-ink/20 px-4 py-2 text-sm hover:bg-ink hover:text-paper transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              정지
            </button>
          </div>

          <p className="mt-4 text-xs text-ink-mute">
            ⚠ 이어폰 사용 시 볼륨을 30% 이하로 시작하세요. 출력은 안전을 위해 50%로 제한됩니다. 실제 스피커의 응답은 개별 측정값에 따릅니다.
          </p>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Helpers
// ============================================================================

// Paul Kellet pink noise approximation — flat perceptual energy across the
// audible band. ~0.11x scale leaves headroom; loop a 2 s buffer indefinitely.
function generatePinkNoise(ctx: AudioContext, durationSec: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * durationSec);
  const buf = ctx.createBuffer(1, length, sampleRate);
  const data = buf.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; ++i) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buf;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y,     x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x,     y + h, rr);
  ctx.arcTo(x,     y + h, x,     y,     rr);
  ctx.arcTo(x,     y,     x + w, y,     rr);
  ctx.closePath();
}
