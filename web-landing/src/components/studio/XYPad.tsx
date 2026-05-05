// Square touch surface emitting normalised (x, y) ∈ [0, 1] on pointer
// move while pressed. Releases trigger onRelease so callers can fade
// the underlying parameter back to a neutral default.

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export type XYPadProps = {
  label: string;
  onChange: (x: number, y: number) => void;
  onRelease?: () => void;
};

export default function XYPad({ label, onChange, onRelease }: XYPadProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const update = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setPos({ x, y });
    onChange(x, y);
  }, [onChange]);

  const handleDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    update(e);
  }, [update]);

  const handleMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.buttons === 0 && e.pointerType === "mouse") return;
    if (!ref.current?.hasPointerCapture(e.pointerId)) return;
    update(e);
  }, [update]);

  const handleUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setPos(null);
    onRelease?.();
  }, [onRelease]);

  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] tracking-widest text-ink-mute uppercase">{label}</span>
      <div
        ref={ref}
        role="application"
        aria-label={label}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-xl border border-paper-deep bg-paper-soft touch-none select-none [-webkit-tap-highlight-color:transparent]"
        style={{ touchAction: "none" }}
      >
        {pos && (
          <span
            aria-hidden
            className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full bg-injoo"
            style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
          />
        )}
      </div>
    </div>
  );
}
