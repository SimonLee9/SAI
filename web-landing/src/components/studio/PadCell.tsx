// Pad cell button. Short tap → onTrigger; long press (>500ms) → onMenuRequest
// with the cell's bounding rect (used to anchor the floating CellMenu).
// Pointer Events for true multi-touch on iPad.

import { useRef, useCallback, type PointerEvent as ReactPointerEvent } from "react";

export type PadCellState = "empty" | "idle" | "queued" | "playing";

export type PadCellProps = {
  state: PadCellState;
  label?: string;
  ariaLabel: string;
  onTrigger: () => void;
  onMenuRequest: (rect: DOMRect) => void;
};

const LONG_PRESS_MS = 500;

const BASE =
  "relative h-14 sm:h-16 md:h-20 rounded-lg border text-[10px] font-mono " +
  "transition-colors select-none touch-manipulation " +
  "outline-none focus-visible:ring-2 focus-visible:ring-injoo " +
  "[-webkit-tap-highlight-color:transparent]";

const BY_STATE: Record<PadCellState, string> = {
  empty:   "border-paper-deep/60 bg-paper text-ink-mute/40",
  idle:    "border-paper-deep bg-paper-soft text-ink-soft hover:border-ink",
  queued:  "border-injoo bg-paper text-injoo animate-pulse",
  playing: "border-injoo bg-injoo text-paper",
};

export default function PadCell({
  state, label, ariaLabel, onTrigger, onMenuRequest,
}: PadCellProps) {
  const timer = useRef<number | null>(null);
  const longFired = useRef(false);

  const cancelTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const handleDown = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    longFired.current = false;
    const rect = e.currentTarget.getBoundingClientRect();
    timer.current = window.setTimeout(() => {
      longFired.current = true;
      onMenuRequest(rect);
    }, LONG_PRESS_MS);
  }, [onMenuRequest]);

  const handleUp = useCallback(() => {
    cancelTimer();
    if (!longFired.current) onTrigger();
  }, [onTrigger]);

  const handleCancel = useCallback(() => {
    cancelTimer();
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onMenuRequest(e.currentTarget.getBoundingClientRect());
  }, [onMenuRequest]);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      data-state={state}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleCancel}
      onPointerLeave={handleCancel}
      onContextMenu={handleContextMenu}
      className={`${BASE} ${BY_STATE[state]}`}
    >
      {label && (
        <span className="block px-1 text-center leading-tight tracking-tight truncate">
          {label}
        </span>
      )}
      {state === "playing" && (
        <span aria-hidden className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-paper" />
      )}
      {state === "queued" && (
        <span aria-hidden className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-injoo" />
      )}
    </button>
  );
}
