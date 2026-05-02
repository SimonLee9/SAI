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
});

afterEach(() => {
  cleanup();
  audioRegistry.reset();
});
