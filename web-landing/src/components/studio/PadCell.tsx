// One cell of the pad grid. Pointer Events (not onClick) so multi-touch
// works on iPad — two fingers on two cells fires two independent
// pointerdowns. touch-action stops iOS from hijacking the gesture for
// double-tap zoom or scroll.

import type { PointerEvent as ReactPointerEvent } from "react";

export type PadCellState = "empty" | "idle" | "queued" | "playing";

export type PadCellProps = {
  state: PadCellState;
  label?: string;
  ariaLabel: string;
  onTrigger: () => void;
};

const BASE =
  "relative h-14 sm:h-16 md:h-20 rounded-lg border text-[10px] font-mono " +
  "transition-colors select-none touch-manipulation " +
  "outline-none focus-visible:ring-2 focus-visible:ring-injoo " +
  // Disable iOS tap highlight + text selection.
  "[-webkit-tap-highlight-color:transparent]";

const BY_STATE: Record<PadCellState, string> = {
  empty:
    "border-paper-deep/60 bg-paper text-ink-mute/40",
  idle:
    "border-paper-deep bg-paper-soft text-ink-soft hover:border-ink",
  queued:
    "border-injoo bg-paper text-injoo animate-pulse",
  playing:
    "border-injoo bg-injoo text-paper",
};

export default function PadCell({
  state,
  label,
  ariaLabel,
  onTrigger,
}: PadCellProps) {
  const handle = (e: ReactPointerEvent<HTMLButtonElement>) => {
    // Don't capture the pointer — releasing capture lets a second finger
    // start its own gesture on a different cell concurrently.
    e.preventDefault();
    onTrigger();
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      data-state={state}
      onPointerDown={handle}
      className={`${BASE} ${BY_STATE[state]}`}
    >
      {label && (
        <span className="block px-1 text-center leading-tight tracking-tight truncate">
          {label}
        </span>
      )}
      {state === "playing" && (
        <span
          aria-hidden
          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-paper"
        />
      )}
      {state === "queued" && (
        <span
          aria-hidden
          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-injoo"
        />
      )}
    </button>
  );
}
