// Wide horizontal touch ribbon emitting x ∈ [-1, +1]. Releases call
// onRelease so the caller can return pitch bend to 0 cents.

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export type RibbonProps = {
  label: string;
  onChange: (x: number) => void;
  onRelease?: () => void;
};

export default function Ribbon({ label, onChange, onRelease }: RibbonProps) {
  const [x, setX] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const update = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const norm = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const clamped = Math.max(-1, Math.min(1, norm));
    setX(clamped);
    onChange(clamped);
  }, [onChange]);

  const handleDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    update(e);
  }, [update]);

  const handleMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!ref.current?.hasPointerCapture(e.pointerId)) return;
    update(e);
  }, [update]);

  const handleUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setX(null);
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
        className="relative w-full h-14 rounded-xl border border-paper-deep bg-paper-soft touch-none select-none [-webkit-tap-highlight-color:transparent]"
        style={{ touchAction: "none" }}
      >
        <span aria-hidden className="absolute top-0 left-1/2 w-px h-full bg-paper-deep" />
        {x !== null && (
          <span
            aria-hidden
            className="absolute top-0 h-full w-1 bg-injoo"
            style={{ left: `${((x + 1) / 2) * 100}%` }}
          />
        )}
      </div>
    </div>
  );
}
