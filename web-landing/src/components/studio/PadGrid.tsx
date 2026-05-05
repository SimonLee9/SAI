// Launchpad-style pad grid: 3 tracks × 8 scenes. Tap a cell to queue its
// clip — it starts on the next bar boundary, replacing whatever's
// currently playing on that track. Tap an active cell to stop the track.
// Tap a scene-launch column header to fire all three tracks at once.
//
// Audio scheduling lives in ClipScheduler (instance held in a ref).
// React state mirrors the scheduler's emitted state for visualisation.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildLibrary,
  SCENES,
  TRACKS,
  type Clip,
  type SceneLibrary,
  type Track,
} from "./clips";
import {
  ClipScheduler,
  type SchedulerState,
} from "./clipScheduler";
import PadCell from "./PadCell";

const TRACK_LABELS: Record<Track, string> = {
  drums: "Drums",
  bass:  "Bass",
  lead:  "Lead",
  pad:   "Pad",
  perc:  "Perc",
};

const VOL_MAX = 0.5;        // hearing-safety cap on master gain

const EMPTY_STATE: SchedulerState = {
  step: -1,
  active: { drums: null, bass: null, lead: null, pad: null, perc: null },
  queued: { drums: null, bass: null, lead: null, pad: null, perc: null },
};

export default function PadGrid() {
  const library = useMemo<SceneLibrary>(() => buildLibrary({ scale: "pentatonic", rootPc: 0 }), []);

  const [bpm, setBpm]             = useState(108);
  const [masterVol, setMasterVol] = useState(0.6);
  const [muted, setMuted]         = useState<Record<Track, boolean>>({
    drums: false, bass: false, lead: false, pad: false, perc: false,
  });
  const [trackVol, setTrackVol]   = useState<Record<Track, number>>({
    drums: 0.85, bass: 0.75, lead: 0.7, pad: 0.65, perc: 0.6,
  });
  const [playing, setPlaying]     = useState(false);
  const [state, setState]         = useState<SchedulerState>(EMPTY_STATE);

  // -------------------------------------------------------------- audio refs
  const ctxRef       = useRef<AudioContext | null>(null);
  const masterRef    = useRef<GainNode | null>(null);
  const busRef       = useRef<Record<Track, GainNode | null>>({
    drums: null, bass: null, lead: null, pad: null, perc: null,
  });
  const schedulerRef = useRef<ClipScheduler | null>(null);

  const ensureContext = useCallback((): ClipScheduler => {
    if (schedulerRef.current && ctxRef.current) {
      if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
      return schedulerRef.current;
    }
    const Ctor = (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext) as typeof AudioContext;
    const ctx = new Ctor();

    const master = ctx.createGain();
    master.gain.value = masterVol * VOL_MAX;
    master.connect(ctx.destination);

    const make = (vol: number, mute: boolean) => {
      const g = ctx.createGain();
      g.gain.value = mute ? 0 : vol;
      g.connect(master);
      return g;
    };
    const drumsBus = make(trackVol.drums, muted.drums);
    const bassBus  = make(trackVol.bass,  muted.bass);
    const leadBus  = make(trackVol.lead,  muted.lead);
    const padBus   = make(trackVol.pad,   muted.pad);
    const percBus  = make(trackVol.perc,  muted.perc);

    const scheduler = new ClipScheduler(
      ctx,
      { drums: drumsBus, bass: bassBus, lead: leadBus },
      (s) => setState(s),
    );
    scheduler.setBpm(bpm);

    ctxRef.current      = ctx;
    masterRef.current   = master;
    busRef.current      = { drums: drumsBus, bass: bassBus, lead: leadBus, pad: padBus, perc: percBus };
    schedulerRef.current = scheduler;
    return scheduler;
  }, [masterVol, trackVol, muted, bpm]);

  // Keep gain nodes in sync with mixer state (cheap if context not yet built).
  useEffect(() => {
    const ctx = ctxRef.current; const m = masterRef.current;
    if (!ctx || !m) return;
    m.gain.linearRampToValueAtTime(masterVol * VOL_MAX, ctx.currentTime + 0.04);
  }, [masterVol]);
  useEffect(() => {
    const ctx = ctxRef.current; if (!ctx) return;
    for (const t of TRACKS) {
      const g = busRef.current[t]; if (!g) continue;
      g.gain.linearRampToValueAtTime(muted[t] ? 0 : trackVol[t], ctx.currentTime + 0.04);
    }
  }, [trackVol, muted]);

  // BPM changes propagate to scheduler immediately (next step uses new value).
  useEffect(() => {
    schedulerRef.current?.setBpm(bpm);
  }, [bpm]);

  // -------------------------------------------------------------- transport
  const play = useCallback(() => {
    const sched = ensureContext();
    sched.start();
    setPlaying(true);
  }, [ensureContext]);

  const stop = useCallback(() => {
    schedulerRef.current?.stop();
    setPlaying(false);
  }, []);

  const stopAll = useCallback(() => {
    const sched = schedulerRef.current; if (!sched) return;
    for (const t of TRACKS) sched.stopTrack(t);
  }, []);

  // -------------------------------------------------------------- cell launch
  const triggerCell = useCallback(
    (track: Track, sceneIdx: number) => {
      const sched = ensureContext();
      if (!playing) {
        sched.start();
        setPlaying(true);
      }
      const clip = library[track][sceneIdx];
      if (state.active[track] === clip) {
        // Tap the playing cell again → stop this track at next bar.
        sched.stopTrack(track);
      } else {
        sched.launchClip(track, clip);
      }
    },
    [ensureContext, library, playing, state.active],
  );

  const triggerScene = useCallback(
    (sceneIdx: number) => {
      const sched = ensureContext();
      if (!playing) {
        sched.start();
        setPlaying(true);
      }
      sched.launchScene({
        drums: library.drums[sceneIdx],
        bass:  library.bass[sceneIdx],
        lead:  library.lead[sceneIdx],
      });
    },
    [ensureContext, library, playing],
  );

  // -------------------------------------------------------------- cleanup
  useEffect(() => {
    return () => {
      schedulerRef.current?.stop();
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  // -------------------------------------------------------------- helpers
  const cellState = (track: Track, sceneIdx: number) => {
    const clip: Clip = library[track][sceneIdx];
    const isActive = state.active[track] === clip;
    const queued = state.queued[track];
    const isQueued =
      (queued !== null && queued !== "stop" && queued === clip) ||
      // Stop is queued for this track AND this is the active clip.
      (queued === "stop" && isActive);
    if (isQueued) return "queued";
    if (isActive) return "playing";
    return "idle";
  };

  // -------------------------------------------------------------- render
  return (
    <div
      className="mt-10 rounded-2xl border border-paper-deep bg-paper-soft p-4 md:p-6"
      // touch-action none on the whole grid prevents iOS Safari from
      // interpreting two-finger gestures as page-zoom while still letting
      // page scroll work outside this container.
      style={{ touchAction: "manipulation" }}
    >
      {/* Transport row */}
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <button
          type="button"
          onClick={playing ? stop : play}
          className="rounded-md bg-ink text-paper px-6 py-2 text-sm font-medium hover:bg-ink-soft transition-colors"
        >
          {playing ? "정지" : "재생"}
        </button>
        <button
          type="button"
          onClick={stopAll}
          className="rounded-md border border-ink/30 px-4 py-2 text-sm hover:bg-ink hover:text-paper transition-colors"
        >
          전체 트랙 끄기
        </button>

        <label className="flex items-center gap-3 text-sm text-ink-soft">
          <span className="font-mono text-xs tracking-widest text-ink-mute uppercase">BPM</span>
          <input
            type="range" min={60} max={180} step={1}
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

      {/* Step progress bar */}
      <div className="mb-3 flex gap-0.5" aria-hidden>
        {Array.from({ length: 16 }, (_, i) => (
          <span
            key={i}
            className={
              "h-1 flex-1 rounded-sm transition-colors " +
              (state.step === i ? "bg-injoo" : i % 4 === 0 ? "bg-paper-deep" : "bg-paper")
            }
          />
        ))}
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `minmax(7rem, 9rem) repeat(${SCENES}, minmax(3.5rem, 1fr))`,
            minWidth: "fit-content",
          }}
        >
          {/* Header row: scene launchers */}
          <span className="font-mono text-[10px] tracking-widest text-ink-mute uppercase self-center">
            Scenes
          </span>
          {Array.from({ length: SCENES }, (_, i) => (
            <button
              key={`scene-${i}`}
              type="button"
              onPointerDown={(e) => { e.preventDefault(); triggerScene(i); }}
              className="rounded-md border border-paper-deep bg-paper text-ink-soft text-[11px] font-mono py-2 hover:border-ink hover:text-ink transition-colors touch-manipulation [-webkit-tap-highlight-color:transparent]"
              aria-label={`Scene ${i + 1} 모든 트랙 발사`}
            >
              ▶ {i + 1}
            </button>
          ))}

          {/* Track rows */}
          {TRACKS.map((track) => (
            <TrackRow
              key={track}
              track={track}
              label={TRACK_LABELS[track]}
              clips={library[track]}
              cellState={(i) => cellState(track, i)}
              onTrigger={(i) => triggerCell(track, i)}
              muted={muted[track]}
              onMuteToggle={() =>
                setMuted((m) => ({ ...m, [track]: !m[track] }))
              }
              vol={trackVol[track]}
              onVolChange={(v) => setTrackVol((tv) => ({ ...tv, [track]: v }))}
            />
          ))}
        </div>
      </div>

      <p className="mt-5 text-xs text-ink-mute leading-relaxed">
        셀을 탭하면 다음 마디 시작에서 재생이 시작됩니다 (큐잉됨 → 재생). 같은 셀을 다시 탭하면 정지.
        Scene 헤더를 누르면 세 트랙이 함께 발사됩니다. 두 손가락으로 다른 트랙의 셀을 동시에 누를 수 있어요.
        출력은 안전을 위해 50%로 제한.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One track row — label + mute + 8 cells, all on the same CSS-grid row so
// columns align across tracks.
// ---------------------------------------------------------------------------
function TrackRow({
  track,
  label,
  clips,
  cellState,
  onTrigger,
  muted,
  onMuteToggle,
  vol,
  onVolChange,
}: {
  track: Track;
  label: string;
  clips: Clip[];
  cellState: (i: number) => "idle" | "queued" | "playing";
  onTrigger: (i: number) => void;
  muted: boolean;
  onMuteToggle: () => void;
  vol: number;
  onVolChange: (v: number) => void;
}) {
  return (
    <>
      <div className={"flex flex-col gap-1 self-center pr-1 " + (muted ? "opacity-60" : "")}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">{label}</span>
          <button
            type="button"
            onClick={onMuteToggle}
            aria-pressed={muted}
            className={
              "rounded border px-1.5 text-[9px] font-mono tracking-widest uppercase transition-colors " +
              (muted
                ? "border-injoo bg-injoo text-paper"
                : "border-paper-deep text-ink-soft hover:border-ink")
            }
          >
            {muted ? "Mute" : "Mute"}
          </button>
        </div>
        <input
          type="range" min={0} max={1} step={0.01}
          value={vol} onChange={(e) => onVolChange(Number(e.target.value))}
          className="accent-ink w-full"
          aria-label={`${label} volume`}
          disabled={muted}
        />
      </div>
      {clips.map((clip, i) => (
        <PadCell
          key={`${track}-${i}`}
          state={cellState(i)}
          label={clip.name}
          ariaLabel={`${label} scene ${i + 1} ${clip.name}`}
          onTrigger={() => onTrigger(i)}
        />
      ))}
    </>
  );
}
