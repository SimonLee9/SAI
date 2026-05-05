// Pad grid orchestrator. Owns: library state, audio graph (master + 5 buses
// + reverb send + master filter + recording tap), ClipScheduler instance,
// transport state, mixer state, session persistence, recording, XY/ribbon.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildLibrary, regenerateClip,
  SCENES, TRACKS, type Clip, type Track, type SceneLibrary,
  type LibraryOptions,
} from "./clips";
import {
  ClipScheduler, type ClipSchedulerBuses, type SchedulerState,
} from "./clipScheduler";
import {
  makeMasterFilter, makeReverbIR, FILTER_DEFAULTS,
} from "./audioFx";
import {
  Recorder, downloadBlob,
} from "./recorder";
import {
  save as sessionSave, load as sessionLoad, type Session, type SessionSlot,
} from "./sessionStore";
import type { ScaleId } from "./scales";

import PadCell from "./PadCell";
import CellMenu from "./CellMenu";
import ClipEditor from "./ClipEditor";
import XYPad from "./XYPad";
import Ribbon from "./Ribbon";
import TransportBar from "./TransportBar";

const TRACK_LABELS: Record<Track, string> = {
  drums: "Drums", bass: "Bass", lead: "Lead", pad: "Pad", perc: "Perc",
};
const VOL_MAX = 0.5;
const EMPTY_STATE: SchedulerState = {
  step: -1,
  active: { drums: null, bass: null, lead: null, pad: null, perc: null },
  queued: { drums: null, bass: null, lead: null, pad: null, perc: null },
};

const DEFAULT_TRACK_MIX = {
  drums: { mute: false, vol: 0.85, send: 0.08 },
  bass:  { mute: false, vol: 0.75, send: 0.08 },
  lead:  { mute: false, vol: 0.7,  send: 0.18 },
  pad:   { mute: false, vol: 0.6,  send: 0.30 },
  perc:  { mute: false, vol: 0.5,  send: 0.10 },
} as const;

export default function PadGrid() {
  // ---------------------------------------------------------- core state
  const [scale, setScale] = useState<ScaleId>("pentatonic");
  const [rootPc, setRootPc] = useState(0);
  const [swing, setSwing] = useState(0);
  const [bpm, setBpm] = useState(108);
  const [masterVol, setMasterVol] = useState(0.6);
  const [tracks, setTracks] = useState<Record<Track, { mute: boolean; vol: number; send: number }>>(
    DEFAULT_TRACK_MIX,
  );
  const [library, setLibrary] = useState<SceneLibrary>(() => buildLibrary({ scale, rootPc }));
  const [playing, setPlaying] = useState(false);
  const [state, setState] = useState<SchedulerState>(EMPTY_STATE);

  const [menu, setMenu] = useState<{ track: Track; sceneIdx: number; rect: DOMRect } | null>(null);
  const [editor, setEditor] = useState<{ track: Track; sceneIdx: number } | null>(null);

  const [recording, setRecording] = useState(false);
  const [sessionSlot, setSessionSlot] = useState<SessionSlot>("auto");

  const opts: LibraryOptions = useMemo(() => ({ scale, rootPc }), [scale, rootPc]);

  // ---------------------------------------------------------- audio refs
  const ctxRef       = useRef<AudioContext | null>(null);
  const masterRef    = useRef<GainNode | null>(null);
  const filterRef    = useRef<BiquadFilterNode | null>(null);
  const reverbRef    = useRef<ConvolverNode | null>(null);
  const reverbReturnRef = useRef<GainNode | null>(null);
  const busRef       = useRef<Record<Track, GainNode | null>>({
    drums: null, bass: null, lead: null, pad: null, perc: null,
  });
  const sendRef      = useRef<Record<Track, GainNode | null>>({
    drums: null, bass: null, lead: null, pad: null, perc: null,
  });
  const recorderRef  = useRef<Recorder | null>(null);
  const recordTapRef = useRef<MediaStreamAudioDestinationNode | null>(null);
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

    const filter = makeMasterFilter(ctx);
    const master = ctx.createGain();
    master.gain.value = masterVol * VOL_MAX;
    master.connect(filter);
    filter.connect(ctx.destination);

    let recordTap: MediaStreamAudioDestinationNode | null = null;
    try {
      recordTap = ctx.createMediaStreamDestination();
      filter.connect(recordTap);
    } catch {
      // jsdom or unsupported; recording stays disabled.
    }

    const reverb = ctx.createConvolver();
    reverb.buffer = makeReverbIR(ctx, 1.5, 3);
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.6;
    reverb.connect(reverbReturn);
    reverbReturn.connect(master);

    const buses: Partial<ClipSchedulerBuses> = {};
    for (const t of TRACKS) {
      const bus = ctx.createGain();
      bus.gain.value = tracks[t].mute ? 0 : tracks[t].vol;
      bus.connect(master);
      const send = ctx.createGain();
      send.gain.value = tracks[t].send;
      bus.connect(send); send.connect(reverb);
      busRef.current[t] = bus;
      sendRef.current[t] = send;
      buses[t] = bus;
    }

    const scheduler = new ClipScheduler(
      ctx, buses as ClipSchedulerBuses, (s) => setState(s),
    );
    scheduler.setBpm(bpm);
    scheduler.setSwing(swing);
    scheduler.setLibraryOpts(opts);

    ctxRef.current = ctx;
    masterRef.current = master;
    filterRef.current = filter;
    reverbRef.current = reverb;
    reverbReturnRef.current = reverbReturn;
    recordTapRef.current = recordTap;
    schedulerRef.current = scheduler;
    return scheduler;
  }, [masterVol, tracks, bpm, swing, opts]);

  // ---------------------------------------------------------- effects: keep audio in sync
  useEffect(() => {
    const ctx = ctxRef.current; const m = masterRef.current;
    if (!ctx || !m) return;
    m.gain.linearRampToValueAtTime(masterVol * VOL_MAX, ctx.currentTime + 0.04);
  }, [masterVol]);

  useEffect(() => {
    const ctx = ctxRef.current; if (!ctx) return;
    for (const t of TRACKS) {
      const g = busRef.current[t]; const s = sendRef.current[t];
      if (g) g.gain.linearRampToValueAtTime(tracks[t].mute ? 0 : tracks[t].vol, ctx.currentTime + 0.04);
      if (s) s.gain.linearRampToValueAtTime(tracks[t].send, ctx.currentTime + 0.04);
    }
  }, [tracks]);

  useEffect(() => { schedulerRef.current?.setBpm(bpm); }, [bpm]);
  useEffect(() => { schedulerRef.current?.setSwing(swing); }, [swing]);
  useEffect(() => { schedulerRef.current?.setLibraryOpts(opts); }, [opts]);

  useEffect(() => {
    if (schedulerRef.current) {
      TRACKS.forEach((t) => schedulerRef.current!.stopTrack(t));
    }
    setLibrary(buildLibrary({ scale, rootPc }));
  }, [scale, rootPc]);

  // ---------------------------------------------------------- transport
  const playToggle = useCallback(() => {
    if (playing) {
      schedulerRef.current?.stop();
      setPlaying(false);
    } else {
      const sched = ensureContext();
      sched.start();
      setPlaying(true);
    }
  }, [playing, ensureContext]);

  const stopAll = useCallback(() => {
    const sched = schedulerRef.current; if (!sched) return;
    for (const t of TRACKS) sched.stopTrack(t);
  }, []);

  // ---------------------------------------------------------- cell launching
  const triggerCell = useCallback(
    (track: Track, sceneIdx: number) => {
      const sched = ensureContext();
      if (!playing) { sched.start(); setPlaying(true); }
      const clip = library[track][sceneIdx];
      if (!clip) return;
      if (state.active[track] === clip) sched.stopTrack(track);
      else sched.launchClip(track, clip);
    },
    [ensureContext, library, playing, state.active],
  );

  const triggerScene = useCallback((sceneIdx: number) => {
    const sched = ensureContext();
    if (!playing) { sched.start(); setPlaying(true); }
    const scene: Partial<Record<Track, Clip | "stop">> = {};
    for (const t of TRACKS) {
      const c = library[t][sceneIdx];
      if (c) scene[t] = c;
    }
    sched.launchScene(scene);
  }, [ensureContext, library, playing]);

  // ---------------------------------------------------------- cell menu actions
  const onCellRegen = useCallback(() => {
    if (!menu) return;
    const fresh = regenerateClip(menu.track, menu.sceneIdx, opts, Date.now() + Math.random());
    setLibrary((lib) => {
      const next = { ...lib, [menu.track]: [...lib[menu.track]] };
      next[menu.track][menu.sceneIdx] = fresh;
      return next;
    });
  }, [menu, opts]);

  const onCellClear = useCallback(() => {
    if (!menu) return;
    const fresh = makeEmpty(menu.track);
    setLibrary((lib) => {
      const next = { ...lib, [menu.track]: [...lib[menu.track]] };
      next[menu.track][menu.sceneIdx] = fresh;
      return next;
    });
  }, [menu]);

  const onCellEdit = useCallback(() => {
    if (!menu) return;
    setEditor({ track: menu.track, sceneIdx: menu.sceneIdx });
  }, [menu]);

  const onEditorSave = useCallback((next: Clip) => {
    if (!editor) return;
    setLibrary((lib) => {
      const arr = [...lib[editor.track]];
      arr[editor.sceneIdx] = next;
      return { ...lib, [editor.track]: arr };
    });
    setEditor(null);
  }, [editor]);

  // ---------------------------------------------------------- XY filter + ribbon
  const onFilterChange = useCallback((x: number, y: number) => {
    const ctx = ctxRef.current; const f = filterRef.current;
    if (!ctx || !f) return;
    // X = cutoff (200Hz–8kHz log), Y = Q (0.5–12)
    const cutoff = 200 * Math.pow(40, x);
    const q = 0.5 + (1 - y) * 11.5;
    f.frequency.setTargetAtTime(cutoff, ctx.currentTime, 0.01);
    f.Q.setTargetAtTime(q, ctx.currentTime, 0.01);
  }, []);
  const onFilterRelease = useCallback(() => {
    const ctx = ctxRef.current; const f = filterRef.current;
    if (!ctx || !f) return;
    f.frequency.linearRampToValueAtTime(FILTER_DEFAULTS.cutoff, ctx.currentTime + 0.3);
    f.Q.linearRampToValueAtTime(FILTER_DEFAULTS.q, ctx.currentTime + 0.3);
  }, []);
  const onRibbon = useCallback((x: number) => {
    schedulerRef.current?.setLeadBend(x * 200);
  }, []);
  const onRibbonRelease = useCallback(() => {
    schedulerRef.current?.setLeadBend(0);
  }, []);

  // ---------------------------------------------------------- recording
  const onToggleRecord = useCallback(async () => {
    if (recording) {
      const blob = await recorderRef.current?.stop();
      setRecording(false);
      if (blob && blob.size > 0) {
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        downloadBlob(blob, `sai-${stamp}.webm`);
      }
      recorderRef.current = null;
      return;
    }
    const sched = ensureContext();
    void sched;
    const tap = recordTapRef.current;
    if (!tap || !Recorder.isSupported()) return;
    const r = new Recorder(tap.stream);
    try { r.start(); recorderRef.current = r; setRecording(true); }
    catch { /* ignored */ }
  }, [recording, ensureContext]);

  // ---------------------------------------------------------- session
  const sessionSnapshot = useCallback((): Session => ({
    version: 1, scale, rootPc, swing, bpm, masterVol, tracks, library,
  }), [scale, rootPc, swing, bpm, masterVol, tracks, library]);

  const onSessionSave = useCallback((slot: SessionSlot) => {
    sessionSave(slot, sessionSnapshot());
  }, [sessionSnapshot]);

  const onSessionLoad = useCallback((slot: SessionSlot) => {
    setSessionSlot(slot);
    const s = sessionLoad(slot);
    if (!s) return;
    setScale(s.scale); setRootPc(s.rootPc); setSwing(s.swing);
    setBpm(s.bpm); setMasterVol(s.masterVol);
    setTracks(s.tracks); setLibrary(s.library);
  }, []);

  // Auto-save (debounced 500ms) into 'auto' slot.
  useEffect(() => {
    const t = setTimeout(() => sessionSave("auto", sessionSnapshot()), 500);
    return () => clearTimeout(t);
  }, [sessionSnapshot]);

  // Restore from 'auto' on first mount + cleanup on unmount.
  useEffect(() => {
    const s = sessionLoad("auto");
    if (s) {
      setScale(s.scale); setRootPc(s.rootPc); setSwing(s.swing);
      setBpm(s.bpm); setMasterVol(s.masterVol);
      setTracks(s.tracks); setLibrary(s.library);
    }
    return () => {
      schedulerRef.current?.stop();
      ctxRef.current?.close().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------- helpers
  const cellState = (track: Track, sceneIdx: number) => {
    const clip = library[track][sceneIdx];
    if (!clip) return "empty" as const;
    const isActive = state.active[track] === clip;
    const queued = state.queued[track];
    const isQueued =
      (queued !== null && queued !== "stop" && queued === clip) ||
      (queued === "stop" && isActive);
    if (isQueued) return "queued" as const;
    if (isActive) return "playing" as const;
    return "idle" as const;
  };

  // ---------------------------------------------------------- render
  return (
    <div
      className="mt-10 rounded-2xl border border-paper-deep bg-paper-soft p-4 md:p-6"
      style={{ touchAction: "manipulation" }}
    >
      <TransportBar
        playing={playing}
        onPlayToggle={playToggle}
        onStopAll={stopAll}
        bpm={bpm} onBpmChange={setBpm}
        masterVol={masterVol} onMasterVolChange={setMasterVol}
        scale={scale} onScaleChange={setScale}
        rootPc={rootPc} onRootChange={setRootPc}
        swing={swing} onSwingChange={setSwing}
        recording={recording} onToggleRecord={onToggleRecord}
        sessionSlot={sessionSlot}
        onSessionLoad={onSessionLoad}
        onSessionSave={onSessionSave}
      />

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

          {TRACKS.map((track) => (
            <TrackRow
              key={track}
              track={track}
              label={TRACK_LABELS[track]}
              clips={library[track]}
              cellState={(i) => cellState(track, i)}
              onTrigger={(i) => triggerCell(track, i)}
              onMenu={(i, rect) => setMenu({ track, sceneIdx: i, rect })}
              mix={tracks[track]}
              onMixChange={(m) => setTracks((tv) => ({ ...tv, [track]: m }))}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-6">
        <XYPad label="Filter (X cutoff · Y resonance)"
          onChange={onFilterChange} onRelease={onFilterRelease} />
        <div className="flex-1 min-w-[240px]">
          <Ribbon label="Lead bend (±200¢)" onChange={onRibbon} onRelease={onRibbonRelease} />
        </div>
      </div>

      <p className="mt-5 text-xs text-ink-mute leading-relaxed">
        셀 짧은 탭 = 다음 마디부터 발사. 길게 누르면 ✨ 재생성 / ✏️ 편집 / ✕ 비우기 메뉴.
        Scene 헤더는 5트랙 동시 발사. XY 패드 = 마스터 필터 sweep, 리본 = 리드 ±200¢ 벤드.
        세션은 슬롯 1–3에 저장 가능 + 페이지를 닫아도 'auto' 슬롯에서 자동 복원.
      </p>

      {menu && (
        <CellMenu
          anchorRect={menu.rect}
          onRegen={onCellRegen}
          onEdit={onCellEdit}
          onClear={onCellClear}
          onDismiss={() => setMenu(null)}
        />
      )}

      {editor && library[editor.track][editor.sceneIdx] && (
        <ClipEditor
          clip={library[editor.track][editor.sceneIdx]}
          onSave={onEditorSave}
          onCancel={() => setEditor(null)}
        />
      )}
    </div>
  );
}

function TrackRow({
  track, label, clips, cellState, onTrigger, onMenu, mix, onMixChange,
}: {
  track: Track;
  label: string;
  clips: Clip[];
  cellState: (i: number) => "empty" | "idle" | "queued" | "playing";
  onTrigger: (i: number) => void;
  onMenu: (i: number, rect: DOMRect) => void;
  mix: { mute: boolean; vol: number; send: number };
  onMixChange: (m: { mute: boolean; vol: number; send: number }) => void;
}) {
  return (
    <>
      <div className={"flex flex-col gap-1 self-center pr-1 " + (mix.mute ? "opacity-60" : "")}>
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-ink">{label}</span>
          <button
            type="button"
            onClick={() => onMixChange({ ...mix, mute: !mix.mute })}
            aria-pressed={mix.mute}
            className={
              "rounded border px-1.5 text-[9px] font-mono tracking-widest uppercase " +
              (mix.mute
                ? "border-injoo bg-injoo text-paper"
                : "border-paper-deep text-ink-soft hover:border-ink")
            }
          >
            Mute
          </button>
        </div>
        <input
          type="range" min={0} max={1} step={0.01}
          value={mix.vol} onChange={(e) => onMixChange({ ...mix, vol: Number(e.target.value) })}
          className="accent-ink w-full"
          aria-label={`${label} volume`}
          disabled={mix.mute}
        />
        <input
          type="range" min={0} max={1} step={0.01}
          value={mix.send} onChange={(e) => onMixChange({ ...mix, send: Number(e.target.value) })}
          className="accent-injoo w-full"
          aria-label={`${label} reverb send`}
        />
      </div>
      {clips.map((clip, i) => (
        <PadCell
          key={`${track}-${i}`}
          state={cellState(i)}
          label={clip?.name ?? "—"}
          ariaLabel={`${label} scene ${i + 1} ${clip?.name ?? "empty"}`}
          onTrigger={() => onTrigger(i)}
          onMenuRequest={(rect) => onMenu(i, rect)}
        />
      ))}
    </>
  );
}

function makeEmpty(track: Track): Clip {
  const empty16 = () => Array<boolean>(16).fill(false);
  switch (track) {
    case "drums": return { kind: "drums", name: "—", steps: [empty16(), empty16(), empty16(), empty16()] };
    case "bass":  return { kind: "bass",  name: "—", steps: [empty16(), empty16(), empty16(), empty16(), empty16()],
                            progression: { id: "1-4-5-4", label: "—", degrees: [1, 4, 5, 4] } };
    case "lead":  return { kind: "lead",  name: "—",
                            steps: Array.from({ length: 10 }, () => empty16()) };
    case "pad":   return { kind: "pad",   name: "—",
                            progression: { id: "1-4-5-4", label: "—", degrees: [1, 4, 5, 4] }, stabs: [] };
    case "perc":  return { kind: "perc",  name: "—", steps: [empty16(), empty16(), empty16(), empty16()] };
  }
}
