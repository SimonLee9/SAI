// Minimal Web Audio API mock for component tests.
//
// Records every node ever created in `audioRegistry` so tests can introspect
// the lifecycle: was a source's stop() called? did its parent gain get
// muted? — exactly the kind of state-transition checking that would have
// caught the Pink Noise persistence bug.
//
// This is *not* a full Web Audio implementation; it has just enough surface
// for SoundLab.tsx to exercise its play/stop branches without crashing.

import { vi } from "vitest";

export interface MockAudioParam {
  value: number;
  setValueAtTime: ReturnType<typeof vi.fn>;
  cancelScheduledValues: ReturnType<typeof vi.fn>;
  linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
}

export interface MockAudioNode {
  id: number;
  nodeType: string;
  context: MockAudioContext;
  connections: MockAudioNode[];
  disconnected: boolean;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

export interface MockSourceNode extends MockAudioNode {
  started: boolean;
  stopped: boolean;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
}

export interface MockGainNode extends MockAudioNode {
  gain: MockAudioParam;
}

export interface MockOscillatorNode extends MockSourceNode {
  // OscillatorNode.type in real Web Audio — set by callers.
  type: OscillatorType;
  frequency: MockAudioParam;
}

export interface MockBufferSourceNode extends MockSourceNode {
  buffer: { length: number; getChannelData(): Float32Array } | null;
  loop: boolean;
}

export interface MockAnalyserNode extends MockAudioNode {
  fftSize: number;
  smoothingTimeConstant: number;
  frequencyBinCount: number;
  getByteFrequencyData: ReturnType<typeof vi.fn>;
}

export interface AudioRegistry {
  contexts: MockAudioContext[];
  nodes: MockAudioNode[];
  sources: MockSourceNode[];
  gains: MockGainNode[];
  reset(): void;
}

export const audioRegistry: AudioRegistry = {
  contexts: [],
  nodes: [],
  sources: [],
  gains: [],
  reset() {
    this.contexts = [];
    this.nodes = [];
    this.sources = [];
    this.gains = [];
  },
};

let nextId = 0;

function makeAudioParam(initial: number): MockAudioParam {
  const param: MockAudioParam = {
    value: initial,
    setValueAtTime: vi.fn((v: number) => { param.value = v; return param; }),
    cancelScheduledValues: vi.fn(() => param),
    linearRampToValueAtTime: vi.fn((v: number) => { param.value = v; return param; }),
    exponentialRampToValueAtTime: vi.fn((v: number) => { param.value = v; return param; }),
  };
  return param;
}

function makeBaseNode<T extends MockAudioNode>(
  ctx: MockAudioContext,
  nodeType: string,
  extra: Omit<T, keyof MockAudioNode>,
): T {
  const node = {
    id: nextId++,
    nodeType,                    // tracker key — distinct from Web Audio's OscillatorNode.type
    context: ctx,
    connections: [],
    disconnected: false,
    connect: vi.fn(function (this: MockAudioNode, target: MockAudioNode) {
      this.connections.push(target);
      return target;
    }),
    disconnect: vi.fn(function (this: MockAudioNode) {
      this.connections = [];
      this.disconnected = true;
    }),
    ...extra,
  } as unknown as T;

  // Bind connect/disconnect to the node instance.
  const self = node as unknown as MockAudioNode;
  self.connect = vi.fn((target: MockAudioNode) => {
    self.connections.push(target);
    return target;
  });
  self.disconnect = vi.fn(() => {
    self.connections = [];
    self.disconnected = true;
  });

  audioRegistry.nodes.push(self);
  return node;
}

export class MockAudioContext {
  state: AudioContextState = "running";
  currentTime = 0;
  sampleRate = 48000;
  destination: MockAudioNode;

  constructor() {
    audioRegistry.contexts.push(this);
    this.destination = makeBaseNode(this, "destination", {});
  }

  createGain(): MockGainNode {
    const node = makeBaseNode<MockGainNode>(this, "gain", {
      gain: makeAudioParam(1),
    });
    audioRegistry.gains.push(node);
    return node;
  }

  createOscillator(): MockOscillatorNode {
    const node = makeBaseNode<MockOscillatorNode>(this, "oscillator", {
      type: "sine",
      frequency: makeAudioParam(440),
      started: false,
      stopped: false,
      onended: null,
      start: vi.fn(),
      stop: vi.fn(),
    });
    node.start = vi.fn(() => { node.started = true; });
    node.stop = vi.fn(() => { node.stopped = true; });
    audioRegistry.sources.push(node);
    return node;
  }

  createBufferSource(): MockBufferSourceNode {
    const node = makeBaseNode<MockBufferSourceNode>(this, "buffer-source", {
      buffer: null,
      loop: false,
      started: false,
      stopped: false,
      onended: null,
      start: vi.fn(),
      stop: vi.fn(),
    });
    node.start = vi.fn(() => { node.started = true; });
    node.stop = vi.fn(() => { node.stopped = true; });
    audioRegistry.sources.push(node);
    return node;
  }

  createAnalyser(): MockAnalyserNode {
    return makeBaseNode<MockAnalyserNode>(this, "analyser", {
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      frequencyBinCount: 1024,
      getByteFrequencyData: vi.fn(),
    });
  }

  createBuffer(_channels: number, length: number, _sampleRate: number) {
    return {
      length,
      getChannelData: () => new Float32Array(length),
    };
  }

  resume() { this.state = "running"; return Promise.resolve(); }
  close()  { this.state = "closed";  return Promise.resolve(); }
}

export function installAudioMock(): void {
  audioRegistry.reset();
  // @ts-expect-error — overriding for test environment
  globalThis.AudioContext = MockAudioContext;
  // @ts-expect-error — webkit fallback path used by SoundLab
  globalThis.webkitAudioContext = MockAudioContext;
}
