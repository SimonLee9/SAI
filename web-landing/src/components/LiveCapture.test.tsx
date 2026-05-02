import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import LiveCapture from "./LiveCapture";

// State-machine tests for LiveCapture. The actual mic / tab-audio
// permission flow is browser-only and intentionally not exercised here;
// we cover what we can — initial render, idle copy, EQ slider state, and
// the absence of crashes when buttons are pressed without a real stream.

describe("LiveCapture — surface and idle state", () => {
  it("renders both source buttons and starts in idle with guidance copy", () => {
    render(<LiveCapture />);
    expect(screen.getByRole("button", { name: /Microphone/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tab Audio/ })).toBeInTheDocument();
    expect(
      screen.getByText(/마이크 또는 PC의 탭 오디오를 선택해 시작하세요/),
    ).toBeInTheDocument();
  });

  it("EQ sliders begin at 0 dB and update via change event", () => {
    render(<LiveCapture />);
    const lowSlider = screen.getByRole("slider", { name: /Low band/ }) as HTMLInputElement;
    expect(lowSlider.value).toBe("0");
    fireEvent.change(lowSlider, { target: { value: "5" } });
    expect(lowSlider.value).toBe("5");
  });

  it("Karaoke toggle and Monitor button are disabled before a source connects", () => {
    render(<LiveCapture />);
    const monitor = screen.getByRole("button", { name: /Monitor:/ });
    expect(monitor).toBeDisabled();
    // Karaoke is only disabled until source is active AND mono — initial
    // disabled state is fine to assert.
    expect(screen.getByRole("button", { name: /Karaoke/ })).toBeDisabled();
  });

  it("Recording button is disabled until a source is active", () => {
    render(<LiveCapture />);
    const rec = screen.getByRole("button", { name: /녹음 시작/ });
    expect(rec).toBeDisabled();
  });

  it("clicking Microphone with no permission surfaces an error message", async () => {
    const user = userEvent.setup();
    render(<LiveCapture />);
    await user.click(screen.getByRole("button", { name: /Microphone/ }));
    // The setup-stub rejects with "not implemented"; the component should
    // surface that text in its error region.
    expect(await screen.findByText(/⚠.*not implemented/)).toBeInTheDocument();
  });
});
