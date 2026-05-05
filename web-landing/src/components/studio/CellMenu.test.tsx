import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CellMenu from "./CellMenu";

const rect = { top: 100, left: 100, bottom: 140, right: 180, width: 80, height: 40, x: 100, y: 100, toJSON: () => ({}) } as DOMRect;

describe("CellMenu", () => {
  it("renders re-roll / edit / clear buttons", () => {
    render(
      <CellMenu
        anchorRect={rect}
        onRegen={() => {}} onEdit={() => {}} onClear={() => {}} onDismiss={() => {}}
      />,
    );
    expect(screen.getByRole("menuitem", { name: /재생성/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /편집/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /비우기/ })).toBeInTheDocument();
  });

  it("invokes the right callback on click", () => {
    const onRegen = vi.fn();
    render(
      <CellMenu
        anchorRect={rect}
        onRegen={onRegen} onEdit={() => {}} onClear={() => {}} onDismiss={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("menuitem", { name: /재생성/ }));
    expect(onRegen).toHaveBeenCalledOnce();
  });

  it("dismisses on Escape key", () => {
    const onDismiss = vi.fn();
    render(
      <CellMenu
        anchorRect={rect}
        onRegen={() => {}} onEdit={() => {}} onClear={() => {}} onDismiss={onDismiss}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalled();
  });
});
