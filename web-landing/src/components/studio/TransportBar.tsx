// All transport / scale / session / record controls. Pure controlled
// component — every value is a prop, every change emits via setter.

import { Recorder } from "./recorder";
import type { ScaleId } from "./scales";
import { SCALES } from "./scales";
import type { SessionSlot } from "./sessionStore";

const ROOTS: { pc: number; label: string }[] = [
  { pc: 0,  label: "C" },
  { pc: 2,  label: "D" },
  { pc: 3,  label: "E♭" },
  { pc: 5,  label: "F" },
  { pc: 7,  label: "G" },
  { pc: 9,  label: "A" },
  { pc: 10, label: "B♭" },
];

const SWING_OPTIONS = [
  { value: 0,    label: "0%" },
  { value: 0.25, label: "25%" },
  { value: 0.5,  label: "50%" },
];

export type TransportBarProps = {
  playing: boolean;
  onPlayToggle: () => void;
  onStopAll: () => void;

  bpm: number;
  onBpmChange: (n: number) => void;
  masterVol: number;
  onMasterVolChange: (n: number) => void;

  scale: ScaleId;
  onScaleChange: (s: ScaleId) => void;
  rootPc: number;
  onRootChange: (n: number) => void;
  swing: number;
  onSwingChange: (n: number) => void;

  recording: boolean;
  onToggleRecord: () => void;

  sessionSlot: SessionSlot;
  onSessionLoad: (slot: SessionSlot) => void;
  onSessionSave: (slot: SessionSlot) => void;
};

export default function TransportBar(p: TransportBarProps) {
  const recordSupported = Recorder.isSupported();

  return (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      <button
        type="button"
        onClick={p.onPlayToggle}
        className="rounded-md bg-ink text-paper px-5 py-2 text-sm font-medium hover:bg-ink-soft"
      >
        {p.playing ? "정지" : "재생"}
      </button>
      <button
        type="button"
        onClick={p.onStopAll}
        className="rounded-md border border-ink/30 px-3 py-2 text-xs hover:bg-ink hover:text-paper"
      >
        전체 끄기
      </button>

      <button
        type="button"
        onClick={p.onToggleRecord}
        disabled={!recordSupported}
        title={recordSupported ? "" : "이 브라우저는 녹음 미지원"}
        className={
          "rounded-md border px-3 py-2 text-xs flex items-center gap-1.5 " +
          (p.recording
            ? "border-injoo bg-injoo text-paper"
            : "border-ink/30 hover:border-injoo hover:text-injoo") +
          (recordSupported ? "" : " opacity-40 cursor-not-allowed")
        }
      >
        <span className={"w-2 h-2 rounded-full " + (p.recording ? "bg-paper animate-pulse" : "bg-injoo")} />
        {p.recording ? "녹음 중" : "녹음"}
      </button>

      <Picker label="Scale" value={p.scale} onChange={(v) => p.onScaleChange(v as ScaleId)}>
        {SCALES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </Picker>

      <Picker label="Key" value={String(p.rootPc)} onChange={(v) => p.onRootChange(Number(v))}>
        {ROOTS.map((r) => <option key={r.pc} value={r.pc}>{r.label}</option>)}
      </Picker>

      <Picker label="Swing" value={String(p.swing)} onChange={(v) => p.onSwingChange(Number(v))}>
        {SWING_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </Picker>

      <Slider label="BPM" min={60} max={180} step={1}
        value={p.bpm} onChange={p.onBpmChange} ariaLabel="템포" />

      <Slider label="Master" min={0} max={1} step={0.01}
        value={p.masterVol} onChange={p.onMasterVolChange} ariaLabel="마스터 볼륨" pct />

      <div className="flex items-center gap-1">
        <span className="font-mono text-[10px] tracking-widest text-ink-mute uppercase">Session</span>
        <select
          value={p.sessionSlot}
          onChange={(e) => p.onSessionLoad(e.target.value as SessionSlot)}
          className="rounded border border-paper-deep bg-paper px-2 py-1 text-xs"
          aria-label="세션 슬롯"
        >
          <option value="auto">auto</option>
          <option value="1">슬롯 1</option>
          <option value="2">슬롯 2</option>
          <option value="3">슬롯 3</option>
        </select>
        <button
          type="button"
          onClick={() => p.onSessionSave(p.sessionSlot)}
          className="rounded border border-paper-deep px-2 py-1 text-xs hover:border-ink"
        >
          저장
        </button>
      </div>
    </div>
  );
}

function Picker({
  label, value, onChange, children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="font-mono text-[10px] tracking-widest text-ink-mute uppercase">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-paper-deep bg-paper px-2 py-1 text-xs"
        aria-label={label}
      >
        {children}
      </select>
    </label>
  );
}

function Slider({
  label, min, max, step, value, onChange, ariaLabel, pct,
}: {
  label: string;
  min: number; max: number; step: number;
  value: number;
  onChange: (n: number) => void;
  ariaLabel: string;
  pct?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-ink-soft">
      <span className="font-mono text-[10px] tracking-widest text-ink-mute uppercase">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-ink w-24" aria-label={ariaLabel}
      />
      <span className="tabular w-8 text-right">
        {pct ? `${Math.round(value * 100)}%` : value}
      </span>
    </label>
  );
}
