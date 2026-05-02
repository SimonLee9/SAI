import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Constants — kept in sync with SoundLab / Tuner najeon palette so the
// visualizer reads as "the same material" across all four audio tools.
// ---------------------------------------------------------------------------
const ANALYSER_FFT = 256;
const BAR_COUNT = 16;
const VOL_MAX = 0.8;        // higher than synthesis tools — captured audio is already shaped

const NAJEON_STOPS: ReadonlyArray<readonly [number, readonly [number, number, number]]> = [
  [0.00, [111, 184, 209]] as const,
  [0.22, [147, 201, 176]] as const,
  [0.46, [244, 224, 188]] as const,
  [0.72, [197, 166, 204]] as const,
  [1.00, [220, 169, 184]] as const,
];

function najeonAt(t: number): [number, number, number] {
  const u = Math.max(0, Math.min(1, t));
  for (let i = 0; i < NAJEON_STOPS.length - 1; ++i) {
    const [t0, c0] = NAJEON_STOPS[i];
    const [t1, c1] = NAJEON_STOPS[i + 1];
    if (u >= t0 && u <= t1) {
      const k = (u - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * k),
        Math.round(c0[1] + (c1[1] - c0[1]) * k),
        Math.round(c0[2] + (c1[2] - c0[2]) * k),
      ];
    }
  }
  const last = NAJEON_STOPS[NAJEON_STOPS.length - 1][1];
  return [last[0], last[1], last[2]];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SourceKind = "mic" | "tab";
type SourceState = "idle" | "requesting" | "active" | "error";

// ---------------------------------------------------------------------------
// Audio graph (built on first source request):
//   stream → splitter ┬→ [L]──→ bypassMix ──→
//                     │      ↗
//                     └→ [R]──→ invert(-1) ──→ karaokeMix ──→
//                                  bypassMix and karaokeMix crossfade based
//                                  on `karaoke` state. The merge feeds the
//                                  3-band EQ → analyser → optional monitor.
//
// Karaoke: subtracting R from L cancels stereo-centred content (typically
// the vocal). It's an approximation — works well on dry, centred vocals,
// poorly on wide reverb tails or instruments that share the centre.
// ---------------------------------------------------------------------------

export default function LiveCapture() {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const [sourceKind, setSourceKind]   = useState<SourceKind | null>(null);
  const [sourceState, setSourceState] = useState<SourceState>("idle");
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);

  const [low,  setLow]    = useState(0);  // dB, lowshelf @ 250 Hz
  const [mid,  setMid]    = useState(0);  // dB, peaking  @ 1 kHz
  const [high, setHigh]   = useState(0);  // dB, highshelf @ 4 kHz

  const [karaoke, setKaraoke] = useState(false);
  const [monitor, setMonitor] = useState(false); // play filtered output to speakers
  const [volume,  setVolume]  = useState(0.5);

  const [recording, setRecording]   = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Refs
  // -------------------------------------------------------------------------
  const ctxRef          = useRef<AudioContext | null>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const sourceNodeRef   = useRef<MediaStreamAudioSourceNode | null>(null);

  const bypassMixRef    = useRef<GainNode | null>(null);
  const karaokeMixRef   = useRef<GainNode | null>(null);
  const lowFilterRef    = useRef<BiquadFilterNode | null>(null);
  const midFilterRef    = useRef<BiquadFilterNode | null>(null);
  const highFilterRef   = useRef<BiquadFilterNode | null>(null);
  const monitorGainRef  = useRef<GainNode | null>(null);
  const analyserRef     = useRef<AnalyserNode | null>(null);
  const recorderRef     = useRef<MediaRecorder | null>(null);
  const recorderDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);

  // Stereo-detection: tab audio is usually 2-channel, mic usually 1.
  const isStereo = (sourceNodeRef.current?.channelCount ?? 1) >= 2;

  // -------------------------------------------------------------------------
  // Source acquisition
  // -------------------------------------------------------------------------
  const requestSource = useCallback(async (kind: SourceKind) => {
    setErrorMsg(null);
    setSourceState("requesting");
    setSourceKind(kind);
    try {
      let stream: MediaStream;
      if (kind === "mic") {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } else {
        // getDisplayMedia requires `video: true` for Chrome's screen-share
        // prompt; the audio track is what we actually want. Stop any video
        // track immediately to free the camera/screen capture overhead.
        stream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: true,
        });
        for (const t of stream.getVideoTracks()) t.stop();
        if (stream.getAudioTracks().length === 0) {
          throw new Error("선택한 탭/창에서 오디오를 캡처할 수 없습니다. " +
            "공유 시 '오디오 공유' 옵션을 켜고 다시 시도해 주세요.");
        }
      }
      streamRef.current = stream;
      buildAudioGraph(stream);
      setSourceState("active");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setSourceState("error");
      setSourceKind(null);
    }
  }, []);

  const stopSource = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try { recorderRef.current.stop(); } catch { /* not started */ }
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    sourceNodeRef.current = null;
    setSourceKind(null);
    setSourceState("idle");
    setRecording(false);
  }, []);

  // -------------------------------------------------------------------------
  // Graph construction
  // -------------------------------------------------------------------------
  function buildAudioGraph(stream: MediaStream) {
    const Ctor =
      (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext) as typeof AudioContext;
    const ctx = new Ctor();
    const src = ctx.createMediaStreamSource(stream);

    const splitter = ctx.createChannelSplitter(2);
    const invert   = ctx.createGain(); invert.gain.value = -1;
    const bypassMix  = ctx.createGain(); bypassMix.gain.value  = 1;   // active when karaoke off
    const karaokeMix = ctx.createGain(); karaokeMix.gain.value = 0;   // active when karaoke on
    const sumNode    = ctx.createGain(); sumNode.gain.value    = 1;   // mixes both paths

    src.connect(splitter);

    // Bypass path — sum L + R (passthrough mono of input).
    splitter.connect(bypassMix, 0); // L
    splitter.connect(bypassMix, 1); // R (will be 0 channel internally)
    bypassMix.connect(sumNode);

    // Karaoke path — L + (-R) = side channel only.
    splitter.connect(karaokeMix, 0); // L
    splitter.connect(invert, 1);      // R → invert
    invert.connect(karaokeMix);
    karaokeMix.connect(sumNode);

    // 3-band EQ
    const lf = ctx.createBiquadFilter();
    lf.type = "lowshelf"; lf.frequency.value = 250; lf.gain.value = 0;
    const mf = ctx.createBiquadFilter();
    mf.type = "peaking"; mf.frequency.value = 1000; mf.Q.value = 1; mf.gain.value = 0;
    const hf = ctx.createBiquadFilter();
    hf.type = "highshelf"; hf.frequency.value = 4000; hf.gain.value = 0;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = ANALYSER_FFT;
    analyser.smoothingTimeConstant = 0.78;

    // Monitor gain (output to speakers; default off)
    const monitorGain = ctx.createGain();
    monitorGain.gain.value = 0;

    // Recorder destination (separate from monitor so recording works
    // regardless of whether monitoring is enabled).
    const recDest = ctx.createMediaStreamDestination();

    // Wire chain: sum → low → mid → high → analyser → branch
    sumNode.connect(lf).connect(mf).connect(hf).connect(analyser);
    analyser.connect(monitorGain);
    monitorGain.connect(ctx.destination);
    analyser.connect(recDest);

    ctxRef.current        = ctx;
    sourceNodeRef.current = src;
    bypassMixRef.current  = bypassMix;
    karaokeMixRef.current = karaokeMix;
    lowFilterRef.current  = lf;
    midFilterRef.current  = mf;
    highFilterRef.current = hf;
    analyserRef.current   = analyser;
    monitorGainRef.current = monitorGain;
    recorderDestRef.current = recDest;
  }

  // -------------------------------------------------------------------------
  // Parameter sync — push state into Web Audio nodes when they change.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const ctx = ctxRef.current; const lf = lowFilterRef.current;
    if (!ctx || !lf) return;
    lf.gain.setTargetAtTime(low, ctx.currentTime, 0.01);
  }, [low]);
  useEffect(() => {
    const ctx = ctxRef.current; const mf = midFilterRef.current;
    if (!ctx || !mf) return;
    mf.gain.setTargetAtTime(mid, ctx.currentTime, 0.01);
  }, [mid]);
  useEffect(() => {
    const ctx = ctxRef.current; const hf = highFilterRef.current;
    if (!ctx || !hf) return;
    hf.gain.setTargetAtTime(high, ctx.currentTime, 0.01);
  }, [high]);

  useEffect(() => {
    const ctx = ctxRef.current;
    const b = bypassMixRef.current; const k = karaokeMixRef.current;
    if (!ctx || !b || !k) return;
    const t = ctx.currentTime;
    b.gain.linearRampToValueAtTime(karaoke ? 0 : 1, t + 0.05);
    k.gain.linearRampToValueAtTime(karaoke ? 1 : 0, t + 0.05);
  }, [karaoke]);

  useEffect(() => {
    const ctx = ctxRef.current; const m = monitorGainRef.current;
    if (!ctx || !m) return;
    m.gain.linearRampToValueAtTime(monitor ? volume * VOL_MAX : 0, ctx.currentTime + 0.05);
  }, [monitor, volume]);

  // -------------------------------------------------------------------------
  // Recording
  // -------------------------------------------------------------------------
  const startRecording = useCallback(() => {
    const dest = recorderDestRef.current;
    if (!dest) return;
    if (recordingUrl) {
      try { URL.revokeObjectURL(recordingUrl); } catch { /* already revoked */ }
      setRecordingUrl(null);
    }
    recordChunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const r = new MediaRecorder(dest.stream, { mimeType: mime });
    r.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordChunksRef.current.push(e.data);
    };
    r.onstop = () => {
      const blob = new Blob(recordChunksRef.current, { type: mime });
      setRecordingUrl(URL.createObjectURL(blob));
    };
    r.start();
    recorderRef.current = r;
    setRecording(true);
  }, [recordingUrl]);

  const stopRecording = useCallback(() => {
    const r = recorderRef.current;
    if (!r || r.state === "inactive") return;
    r.stop();
    recorderRef.current = null;
    setRecording(false);
  }, []);

  // -------------------------------------------------------------------------
  // Cleanup on unmount
  // -------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      stopSource();
      if (recordingUrl) {
        try { URL.revokeObjectURL(recordingUrl); } catch { /* gone */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Visualizer
  // -------------------------------------------------------------------------
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c2d = canvas.getContext("2d");
    if (!c2d) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width  = Math.floor(r.width * dpr);
      canvas.height = Math.floor(r.height * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const barColours: Array<[number, number, number]> = Array.from(
      { length: BAR_COUNT },
      (_, i) => najeonAt(i / (BAR_COUNT - 1)),
    );
    const freqData = new Uint8Array(ANALYSER_FFT / 2);

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      c2d.clearRect(0, 0, W, H);

      const analyser = analyserRef.current;
      if (analyser) analyser.getByteFrequencyData(freqData);

      const gap = 4 * dpr;
      const barW = (W - gap * (BAR_COUNT - 1)) / BAR_COUNT;
      const totalBins = freqData.length;

      for (let i = 0; i < BAR_COUNT; ++i) {
        let amp = 0;
        if (analyser) {
          const lo = Math.floor(Math.pow(i / BAR_COUNT, 2) * totalBins);
          const hi = Math.max(lo + 1, Math.ceil(Math.pow((i + 1) / BAR_COUNT, 2) * totalBins));
          let sum = 0;
          for (let b = lo; b < hi && b < totalBins; ++b) sum += freqData[b];
          amp = Math.min(1, sum / (hi - lo) / 200);
        }
        const h = Math.max(2 * dpr, amp * H);
        const x = i * (barW + gap);
        const y = H - h;
        const [r, g, b] = barColours[i];
        const alpha = Math.max(amp, 0.08);
        c2d.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        roundRect(c2d, x, y, barW, h, 3 * dpr);
        c2d.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const active = sourceState === "active";
  const requesting = sourceState === "requesting";

  return (
    <div className="mt-10 rounded-2xl border border-paper-deep bg-paper-soft p-4 md:p-6">
      {/* Source picker */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs tracking-widest text-ink-mute uppercase">Source</span>
        <button
          type="button"
          onClick={() => requestSource("mic")}
          disabled={requesting}
          className={
            "relative rounded-md border px-3 py-1.5 text-xs transition-colors " +
            (sourceKind === "mic" && active
              ? "border-ink bg-ink text-paper"
              : "border-paper-deep bg-paper hover:border-ink text-ink disabled:opacity-50")
          }
        >
          {sourceKind === "mic" && active && (
            <span aria-hidden className="absolute top-1 right-1 w-1 h-1 rounded-full bg-injoo" />
          )}
          <span className="font-semibold">Microphone</span>
          <span className={"ml-2 " + (sourceKind === "mic" && active ? "text-paper/70" : "text-ink-mute")}>
            마이크 (모노)
          </span>
        </button>
        <button
          type="button"
          onClick={() => requestSource("tab")}
          disabled={requesting}
          className={
            "relative rounded-md border px-3 py-1.5 text-xs transition-colors " +
            (sourceKind === "tab" && active
              ? "border-ink bg-ink text-paper"
              : "border-paper-deep bg-paper hover:border-ink text-ink disabled:opacity-50")
          }
        >
          {sourceKind === "tab" && active && (
            <span aria-hidden className="absolute top-1 right-1 w-1 h-1 rounded-full bg-injoo" />
          )}
          <span className="font-semibold">Tab Audio</span>
          <span className={"ml-2 " + (sourceKind === "tab" && active ? "text-paper/70" : "text-ink-mute")}>
            YouTube · 음원 탭 (스테레오)
          </span>
        </button>
        {active && (
          <button
            type="button"
            onClick={stopSource}
            className="rounded-md border border-ink/20 px-3 py-1.5 text-xs hover:bg-ink hover:text-paper transition-colors"
          >
            연결 해제
          </button>
        )}
      </div>

      {errorMsg && (
        <p className="mt-3 text-xs text-injoo">⚠ {errorMsg}</p>
      )}
      {sourceState === "idle" && !errorMsg && (
        <p className="mt-3 text-xs text-ink-mute">
          마이크 또는 PC의 탭 오디오를 선택해 시작하세요. 탭 오디오는 Chrome/Edge에서 가장 잘 동작하며, 공유 대화상자에서 <strong className="text-ink-soft">"오디오 공유" 체크박스</strong>를 반드시 켜야 합니다.
        </p>
      )}

      {/* Visualizer */}
      <canvas
        ref={canvasRef}
        className="mt-6 block w-full h-32 md:h-40 rounded-lg bg-ink dark:bg-paper"
        aria-label="실시간 16-band 스펙트럼"
      />

      {/* EQ + transforms */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Low",  value: low,  set: setLow,  hint: "250 Hz" },
          { label: "Mid",  value: mid,  set: setMid,  hint: "1 kHz"  },
          { label: "High", value: high, set: setHigh, hint: "4 kHz"  },
        ].map((band) => (
          <label
            key={band.label}
            className="rounded-md border border-paper-deep bg-paper p-3 flex flex-col gap-1"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-mono tracking-widest text-ink-mute uppercase">
                {band.label} <span className="text-ink-mute/70">· {band.hint}</span>
              </span>
              <span className="tabular text-xs text-ink-soft">
                {band.value >= 0 ? "+" : ""}{band.value.toFixed(0)} dB
              </span>
            </div>
            <input
              type="range" min={-12} max={12} step={1}
              value={band.value}
              onChange={(e) => band.set(Number(e.target.value))}
              className="accent-ink"
              aria-label={`${band.label} band`}
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setKaraoke(!karaoke)}
          aria-pressed={karaoke}
          disabled={!isStereo && !active}
          title={!isStereo && active ? "마이크는 모노라 카라오케 효과 없음" : undefined}
          className={
            "relative rounded-md border px-3 py-1.5 text-xs transition-colors disabled:opacity-50 " +
            (karaoke
              ? "border-injoo bg-injoo text-paper"
              : "border-paper-deep bg-paper hover:border-ink text-ink")
          }
        >
          {karaoke && (
            <span aria-hidden className="absolute top-1 right-1 w-1 h-1 rounded-full bg-paper" />
          )}
          <span className="font-semibold">Karaoke</span>
          <span className={"ml-2 " + (karaoke ? "text-paper/70" : "text-ink-mute")}>
            보컬 약화 (L−R 트릭)
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMonitor(!monitor)}
          aria-pressed={monitor}
          disabled={!active}
          className={
            "rounded-md border px-3 py-1.5 text-xs transition-colors disabled:opacity-50 " +
            (monitor
              ? "border-ink bg-ink text-paper"
              : "border-paper-deep bg-paper hover:border-ink text-ink")
          }
        >
          {monitor ? "Monitor: ON" : "Monitor: OFF"}
        </button>
        <label className="flex items-center gap-2 text-xs text-ink-soft">
          <span className="font-mono tracking-widest text-ink-mute uppercase">Vol</span>
          <input
            type="range" min={0} max={1} step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="accent-ink w-24"
            aria-label="모니터 볼륨"
            disabled={!monitor}
          />
          <span className="tabular w-10 text-right">{Math.round(volume * 100)}%</span>
        </label>
      </div>

      {/* Recording */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={!active}
            className="rounded-md bg-ink text-paper px-4 py-2 text-sm font-medium hover:bg-ink-soft transition-colors disabled:opacity-50"
          >
            ● 녹음 시작
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="relative rounded-md bg-injoo text-paper px-4 py-2 text-sm font-medium hover:bg-injoo-soft transition-colors"
          >
            <span aria-hidden className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-paper animate-pulse" />
            ■ 녹음 중지
          </button>
        )}
        {recordingUrl && (
          <>
            <audio
              src={recordingUrl}
              controls
              className="h-10"
            />
            <a
              href={recordingUrl}
              download="sai-live-capture.webm"
              className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
            >
              다운로드
            </a>
          </>
        )}
      </div>

      <p className="mt-4 text-xs text-ink-mute leading-relaxed">
        <strong className="text-ink-soft">정직한 메모</strong>: Karaoke는 ML 기반 음원 분리가 아니라 스테레오 L−R 트릭입니다. 보컬이 정중앙에 있으면 잘 약화되고, 와이드 리버브가 많거나 보컬이 한쪽에 치우치면 효과가 줄어듭니다. 녹음은 EQ + Karaoke가 적용된 출력을 캡처합니다 (오리지널 입력이 아님). 출력은 모니터 ON일 때만 스피커로 흘러갑니다 — 마이크 사용 시 헤드폰을 권장합니다 (피드백 방지).
      </p>
    </div>
  );
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
