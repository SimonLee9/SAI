import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ClipEditor from "./ClipEditor";
import type { DrumClip } from "./clips";

const drumClip: DrumClip = {
  kind: "drums", name: "Test",
  steps: [
    [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, true,  false, false, false, false, false, false, false, true,  false, false, false],
    [false, true, false, true,  false, true,  false, true,  false, true,  false, true,  false, true,  false, true],
    [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  ],
};

describe("ClipEditor — drums", () => {
  it("renders 4 lanes × 16 cells for a drum clip", () => {
    render(<ClipEditor clip={drumClip} onSave={() => {}} onCancel={() => {}} />);
    const cells = screen.getAllByRole("button", { name: /step/i });
    expect(cells).toHaveLength(4 * 16);
  });

  it("clicking a cell toggles its aria-pressed", () => {
    render(<ClipEditor clip={drumClip} onSave={() => {}} onCancel={() => {}} />);
    const cell = screen.getByRole("button", { name: /^lane 1 step 1$/i });
    expect(cell).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(cell);
    expect(cell).toHaveAttribute("aria-pressed", "false");
  });

  it("Save calls onSave with the edited clip", () => {
    const onSave = vi.fn();
    render(<ClipEditor clip={drumClip} onSave={onSave} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /^lane 1 step 2$/i }));
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));
    expect(onSave).toHaveBeenCalled();
    const next = onSave.mock.calls[0][0] as DrumClip;
    expect(next.steps[0][1]).toBe(true);
  });

  it("Cancel calls onCancel", () => {
    const onCancel = vi.fn();
    render(<ClipEditor clip={drumClip} onSave={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: /취소/ }));
    expect(onCancel).toHaveBeenCalled();
  });
});
