// Floating context menu rendered via Portal to document.body so it isn't
// clipped by the grid's overflow-x. Positioned just below the anchoring
// cell, flipping above if it would overflow the viewport.

import { useEffect } from "react";
import { createPortal } from "react-dom";

export type CellMenuProps = {
  anchorRect: DOMRect;
  onRegen: () => void;
  onEdit: () => void;
  onClear: () => void;
  onDismiss: () => void;
};

const MENU_HEIGHT = 56;

export default function CellMenu({
  anchorRect, onRegen, onEdit, onClear, onDismiss,
}: CellMenuProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    const onClickOutside = (e: MouseEvent) => {
      const inMenu = (e.target as HTMLElement).closest("[data-cellmenu]");
      if (!inMenu) onDismiss();
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => window.addEventListener("pointerdown", onClickOutside), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onClickOutside);
      clearTimeout(t);
    };
  }, [onDismiss]);

  const fitsBelow = anchorRect.bottom + MENU_HEIGHT + 8 < window.innerHeight;
  const top = fitsBelow ? anchorRect.bottom + 4 : anchorRect.top - MENU_HEIGHT - 4;
  const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - 220));

  const wrap = (fn: () => void) => () => { fn(); onDismiss(); };

  return createPortal(
    <div
      data-cellmenu
      style={{ position: "fixed", top, left, zIndex: 50 }}
      className="flex gap-1 rounded-lg border border-ink bg-paper p-1 shadow-lg"
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        onClick={wrap(onRegen)}
        className="rounded-md bg-paper-soft hover:bg-ink hover:text-paper px-3 py-2 text-xs"
      >
        ✨ 재생성
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={wrap(onEdit)}
        className="rounded-md bg-paper-soft hover:bg-ink hover:text-paper px-3 py-2 text-xs"
      >
        ✏️ 편집
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={wrap(onClear)}
        className="rounded-md bg-paper-soft hover:bg-injoo hover:text-paper px-3 py-2 text-xs"
      >
        ✕ 비우기
      </button>
    </div>,
    document.body,
  );
}
