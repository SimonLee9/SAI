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
      clearRect:  () => {},
      beginPath:  () => {},
      moveTo:     () => {},
      arcTo:      () => {},
      closePath:  () => {},
      fill:       () => {},
      fillStyle:  "",
    };
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

afterEach(() => {
  cleanup();
  audioRegistry.reset();
});
