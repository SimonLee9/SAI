import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { audioRegistry, installAudioMock } from "./audio-mock";

beforeEach(() => {
  installAudioMock();

  // jsdom *does* expose getContext but the implementation throws "Not
  // implemented" — we always override with a no-op stub so SoundLab's
  // visualizer effect runs cleanly under tests.
  HTMLCanvasElement.prototype.getContext = (function () {
    return {
      // 2D context surface — every method used by our components stubbed.
      clearRect:           () => {},
      beginPath:            () => {},
      moveTo:               () => {},
      lineTo:               () => {},
      arcTo:                () => {},
      closePath:            () => {},
      fill:                 () => {},
      stroke:               () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fillStyle:            "",
      strokeStyle:          "",
      lineWidth:            1,
      lineCap:              "butt",
      lineJoin:             "miter",
    };
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  // jsdom doesn't ship ResizeObserver; stub with a no-op so components
  // that observe layout don't crash. Tests don't depend on size callbacks.
  if (typeof window.ResizeObserver === "undefined") {
    class ResizeObserverStub {
      observe()    { /* noop */ }
      unobserve()  { /* noop */ }
      disconnect() { /* noop */ }
    }
    (window as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
      ResizeObserverStub;
  }

  // jsdom has no MediaDevices / MediaRecorder. Stub both so LiveCapture's
  // initial render doesn't throw; tests that need real behaviour can
  // override navigator.mediaDevices on a per-test basis.
  if (!("mediaDevices" in navigator)) {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia:    () => Promise.reject(new Error("not implemented")),
        getDisplayMedia: () => Promise.reject(new Error("not implemented")),
      },
    });
  }
  if (typeof (window as unknown as { MediaRecorder?: unknown }).MediaRecorder === "undefined") {
    class MediaRecorderStub {
      static isTypeSupported() { return true; }
      state = "inactive";
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start()  { this.state = "recording"; }
      stop()   { this.state = "inactive"; this.onstop?.(); }
    }
    (window as unknown as { MediaRecorder: typeof MediaRecorderStub }).MediaRecorder =
      MediaRecorderStub;
  }
  if (typeof URL.createObjectURL === "undefined") {
    URL.createObjectURL = () => "blob:mock";
    URL.revokeObjectURL = () => {};
  }
});

afterEach(() => {
  cleanup();
  audioRegistry.reset();
});
