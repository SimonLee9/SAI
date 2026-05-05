// Modal editor for a single clip. Renders the grid that matches the
// clip's kind. Save returns a new Clip; Cancel discards changes.

import { useState } from "react";
import type { Clip, DrumClip, BassClip, LeadClip, PadClip, PercClip } from "./clips";
import { COLS } from "./clips";
import { PROGRESSIONS } from "./generators";

export type ClipEditorProps = {
  clip: Clip;
  onSave: (next: Clip) => void;
  onCancel: () => void;
};

export default function ClipEditor({ clip, onSave, onCancel }: ClipEditorProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/60 p-4"
      role="dialog"
      aria-modal="true"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-3xl rounded-xl border border-paper-deep bg-paper p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink">
            클립 편집 — <span className="font-mono text-ink-soft">{clip.name}</span>
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-ink/30 px-3 py-1 text-xs hover:bg-ink hover:text-paper"
            >
              취소
            </button>
          </div>
        </div>
        {clip.kind === "drums" || clip.kind === "perc" ? (
          <GridEditor
            clip={clip}
            laneLabels={
              clip.kind === "drums"
                ? ["Kick", "Snare", "Hat", "Clap"]
                : ["Shaker", "Rim", "Tom", "Cowbell"]
            }
            onSave={onSave}
          />
        ) : clip.kind === "bass" || clip.kind === "lead" ? (
          <GridEditor
            clip={clip}
            laneLabels={clip.steps.map((_, i) => `Row ${i + 1}`)}
            onSave={onSave}
          />
        ) : (
          <PadEditor clip={clip} onSave={onSave} />
        )}
      </div>
    </div>
  );
}

function GridEditor({
  clip,
  laneLabels,
  onSave,
}: {
  clip: DrumClip | BassClip | LeadClip | PercClip;
  laneLabels: string[];
  onSave: (next: Clip) => void;
}) {
  const [steps, setSteps] = useState<boolean[][]>(() => clip.steps.map((r) => [...r]));

  const toggle = (lane: number, step: number) => {
    setSteps((g) => g.map((r, ri) => (ri === lane ? r.map((c, ci) => (ci === step ? !c : c)) : r)));
  };

  return (
    <>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `auto repeat(${COLS}, minmax(1.5rem, 1fr))` }}
      >
        {steps.map((row, lane) => (
          <RowFragment
            key={lane}
            label={laneLabels[lane] ?? `Row ${lane + 1}`}
            row={row}
            lane={lane}
            onToggle={toggle}
          />
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => onSave({ ...clip, steps } as Clip)}
          className="rounded-md bg-ink text-paper px-4 py-1.5 text-xs font-medium hover:bg-ink-soft"
        >
          저장
        </button>
      </div>
    </>
  );
}

function RowFragment({
  label, row, lane, onToggle,
}: {
  label: string; row: boolean[]; lane: number; onToggle: (lane: number, step: number) => void;
}) {
  return (
    <>
      <span className="text-[11px] font-mono text-ink-soft self-center pr-1 select-none whitespace-nowrap">
        {label}
      </span>
      {row.map((on, step) => (
        <button
          key={step}
          type="button"
          aria-label={`lane ${lane + 1} step${step < 9 ? " " : " "}${step + 1}`}
          aria-pressed={on}
          onClick={() => onToggle(lane, step)}
          className={
            "h-6 rounded transition-colors " +
            (on ? "bg-ink hover:bg-ink-soft" : "bg-paper-deep hover:bg-ink/15")
          }
        />
      ))}
    </>
  );
}

function PadEditor({ clip, onSave }: { clip: PadClip; onSave: (next: Clip) => void }) {
  const [progId, setProgId] = useState(clip.progression.id);
  const [stabs, setStabs] = useState<boolean[]>(() => {
    const s = Array<boolean>(COLS).fill(false);
    for (const i of clip.stabs) if (i >= 0 && i < COLS) s[i] = true;
    return s;
  });

  const toggle = (i: number) => setStabs((s) => s.map((on, idx) => (idx === i ? !on : on)));

  const save = () => {
    const prog = PROGRESSIONS.find((p) => p.id === progId) ?? clip.progression;
    const stabsArr = stabs.map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
    onSave({ ...clip, progression: prog, stabs: stabsArr });
  };

  return (
    <>
      <label className="flex items-center gap-2 mb-3 text-xs">
        <span className="font-mono text-ink-mute">진행</span>
        <select
          value={progId}
          onChange={(e) => setProgId(e.target.value)}
          className="rounded border border-paper-deep bg-paper px-2 py-1"
        >
          {PROGRESSIONS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </label>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(1.5rem, 1fr))` }}>
        {stabs.map((on, i) => (
          <button
            key={i}
            type="button"
            aria-label={`stab step ${i + 1}`}
            aria-pressed={on}
            onClick={() => toggle(i)}
            className={"h-6 rounded " + (on ? "bg-ink hover:bg-ink-soft" : "bg-paper-deep hover:bg-ink/15")}
          />
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={save}
          className="rounded-md bg-ink text-paper px-4 py-1.5 text-xs font-medium hover:bg-ink-soft"
        >
          저장
        </button>
      </div>
    </>
  );
}
