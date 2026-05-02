"""
S.A.I — Spectrum Simulator

Python reference implementation of the device-side audio-reactive LED
visualization. The algorithm here is a faithful port of
firmware/shared/lib/sai_dsp/sai_dsp.cpp — same FFT size, same Hamming
window, same quadratic bin grouping, same exponentially-decaying
running max, same 0..255 output range.

Use it to:
  1. Pre-flight new audio material before hardware exists — see what the
     LED ring will show without burning a real device boot.
  2. Tune algorithm constants (FFT_SIZE, DECAY, BIN_COUNT) by editing
     here and observing the visual result, then propagating the same
     changes to sai_dsp.cpp.
  3. Cross-validate the firmware against ground truth: run the same WAV
     through this and a device boot, compare output frames.

Inputs:
  - WAV file (any sample rate; mono/stereo handled).
  - Or synthesized: pure tones (`--tone HZ`), log sweeps (`--sweep`),
    pink noise (`--noise pink`), white noise (`--noise white`).

Outputs:
  - Default: a heatmap PNG showing time × 16-band intensity, plus a
    summary line of per-band peak. Headless-friendly (matplotlib Agg).
  - `--live`: an animated 16-bar plot that mimics the LED ring in
    real time (matplotlib FuncAnimation).
  - `--csv PATH`: per-frame band values to CSV for further analysis.

Usage:
    python spectrum_simulator.py path/to/song.wav
    python spectrum_simulator.py path/to/song.wav --live
    python spectrum_simulator.py --tone 1000 --duration 3
    python spectrum_simulator.py --sweep --duration 8 --output sweep.png
    python spectrum_simulator.py --noise pink --duration 2 --csv pink.csv
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np

# ---------------------------------------------------------------------------
# Constants — keep in sync with firmware/shared/lib/sai_dsp/sai_dsp.cpp
# ---------------------------------------------------------------------------
FFT_SIZE: int = 256
BIN_COUNT: int = 16     # SAI_DSP_BIN_COUNT == SAI_LED_COUNT
DECAY: float = 0.95     # running-max decay per frame
DEFAULT_SAMPLE_RATE: int = 44100  # SAI_SAMPLE_RATE


# ---------------------------------------------------------------------------
# Algorithm
# ---------------------------------------------------------------------------
def quadratic_groups(n_bands: int = BIN_COUNT, n_bins: int = FFT_SIZE // 2):
    """Return (lo, hi) bin index pairs per band — mirrors sai_dsp.cpp.

    Uses t² mapping so lower frequencies get more bands (perceptually
    richer there). Skips DC (bin 0). The integer truncation here matches
    C++ `(size_t)(t * t * (n_bins - 1)) + 1`.
    """
    groups = []
    for i in range(n_bands):
        t0 = i / n_bands
        t1 = (i + 1) / n_bands
        lo = int(t0 * t0 * (n_bins - 1)) + 1
        hi = int(t1 * t1 * (n_bins - 1)) + 1
        if hi <= lo:
            hi = lo + 1
        if hi > n_bins:
            hi = n_bins
        groups.append((lo, hi))
    return groups


@dataclass
class SpectrumState:
    """Mutable state across frames — matches the static globals in C."""
    running_max: float = 1.0


def process_frame(samples: np.ndarray, state: SpectrumState) -> np.ndarray:
    """Run one FFT frame and return 16 band values in [0, 255].

    Args:
        samples: mono int16 (or float in [-32768, 32767]), length FFT_SIZE.
        state:   carried across calls for the running-max auto-gain.
    """
    assert samples.shape == (FFT_SIZE,), f"expected {FFT_SIZE} samples, got {samples.shape}"

    # Hamming window + FFT magnitude. arduinoFFT's Hamming uses the symmetric
    # form (matches numpy.hamming).
    windowed = samples.astype(np.float32) * np.hamming(FFT_SIZE).astype(np.float32)
    spectrum = np.abs(np.fft.rfft(windowed))   # length FFT_SIZE//2 + 1

    # Use the first FFT_SIZE/2 bins (excluding the Nyquist bin) so the index
    # space matches the C++ kBinCount = kFftSize / 2.
    mag = spectrum[: FFT_SIZE // 2]

    bands = np.zeros(BIN_COUNT, dtype=np.float32)
    current_max = 1.0
    for i, (lo, hi) in enumerate(quadratic_groups()):
        avg = float(np.mean(mag[lo:hi]))
        bands[i] = np.log1p(avg)
        if bands[i] > current_max:
            current_max = bands[i]

    # Decay rule: drop ~5%/frame, but rise instantly to a new peak.
    state.running_max = max(state.running_max * DECAY, current_max)
    inv_max = 255.0 / state.running_max

    out = np.clip(bands * inv_max, 0, 255).astype(np.uint8)
    return out


def stream_frames(samples: np.ndarray):
    """Yield 16-band uint8 vectors, one per FFT_SIZE-sample frame.

    No overlap (matches the firmware's ring-buffer cadence).
    """
    state = SpectrumState()
    n_frames = len(samples) // FFT_SIZE
    for f in range(n_frames):
        chunk = samples[f * FFT_SIZE : (f + 1) * FFT_SIZE]
        yield process_frame(chunk, state)


# ---------------------------------------------------------------------------
# Input loading / synthesis
# ---------------------------------------------------------------------------
def load_wav(path: Path) -> tuple[np.ndarray, int]:
    """Load a WAV, downmix to mono int16. Returns (samples, sample_rate)."""
    try:
        import soundfile as sf
    except ImportError:
        sys.exit("[ERROR] soundfile not installed. Run: pip install -r requirements.txt")
    data, sr = sf.read(str(path), dtype="int16", always_2d=True)
    mono = data.mean(axis=1).astype(np.int32)
    return np.clip(mono, -32768, 32767).astype(np.int16), sr


def synth_tone(freq_hz: float, duration_s: float, sr: int = DEFAULT_SAMPLE_RATE) -> np.ndarray:
    t = np.linspace(0, duration_s, int(sr * duration_s), endpoint=False, dtype=np.float64)
    return (np.sin(2 * np.pi * freq_hz * t) * 16000).astype(np.int16)


def synth_sweep(f_start: float, f_end: float, duration_s: float,
                sr: int = DEFAULT_SAMPLE_RATE) -> np.ndarray:
    t = np.linspace(0, duration_s, int(sr * duration_s), endpoint=False, dtype=np.float64)
    k = (f_end / f_start) ** (1.0 / duration_s)
    phase = 2 * np.pi * f_start * (k**t - 1) / np.log(k)
    return (np.sin(phase) * 16000).astype(np.int16)


def synth_noise(kind: str, duration_s: float, sr: int = DEFAULT_SAMPLE_RATE) -> np.ndarray:
    n = int(sr * duration_s)
    if kind == "white":
        return (np.random.uniform(-1, 1, n) * 16000).astype(np.int16)
    if kind == "pink":
        # Voss-McCartney via Paul Kellet coefficients (matches SoundLab.tsx).
        b = np.zeros(7, dtype=np.float64)
        out = np.zeros(n, dtype=np.float64)
        for i in range(n):
            white = np.random.uniform(-1, 1)
            b[0] = 0.99886 * b[0] + white * 0.0555179
            b[1] = 0.99332 * b[1] + white * 0.0750759
            b[2] = 0.96900 * b[2] + white * 0.1538520
            b[3] = 0.86650 * b[3] + white * 0.3104856
            b[4] = 0.55000 * b[4] + white * 0.5329522
            b[5] = -0.7616 * b[5] - white * 0.0168980
            out[i] = (b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + white * 0.5362) * 0.11
            b[6] = white * 0.115926
        return (out * 16000).astype(np.int16)
    raise ValueError(f"unknown noise kind: {kind!r}")


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
def write_heatmap(frames: np.ndarray, sr: int, output: Path) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    duration_s = frames.shape[0] * FFT_SIZE / sr
    fig, ax = plt.subplots(figsize=(12, 3.5), dpi=120)
    im = ax.imshow(frames.T, aspect="auto", origin="lower", cmap="magma",
                   interpolation="nearest", vmin=0, vmax=255,
                   extent=[0, duration_s, 0, BIN_COUNT])
    ax.set_xlabel("time (s)")
    ax.set_ylabel("band (low → high)")
    ax.set_title("S.A.I — 16-band spectrum (sai_dsp reference)")
    fig.colorbar(im, ax=ax, label="intensity (0–255)")
    fig.tight_layout()
    fig.savefig(output)
    plt.close(fig)


def run_live(frames: np.ndarray, sr: int) -> None:
    import matplotlib.pyplot as plt
    from matplotlib.animation import FuncAnimation

    fig, ax = plt.subplots(figsize=(10, 4))
    bars = ax.bar(range(BIN_COUNT), [0] * BIN_COUNT, color="#D97706")
    ax.set_xlim(-0.5, BIN_COUNT - 0.5)
    ax.set_ylim(0, 255)
    ax.set_xlabel("band")
    ax.set_ylabel("intensity")
    ax.set_title("S.A.I — live spectrum (Esc/close to quit)")

    # Hue ramp: low → amber, high → sage. Mirrors sai_led_set_spectrum.
    hue = np.linspace(0, 1, BIN_COUNT)
    colors = np.column_stack([
        217 - (217 - 132) * hue,
        119 + (169 - 119) * hue,
          6 + (140 -   6) * hue,
    ]) / 255.0
    for bar, color in zip(bars, colors):
        bar.set_color(color)

    frame_period_ms = max(1, int(FFT_SIZE / sr * 1000))

    def update(i):
        if i >= len(frames):
            ani.event_source.stop()
            return bars
        for bar, h in zip(bars, frames[i]):
            bar.set_height(h)
        return bars

    ani = FuncAnimation(fig, update, frames=len(frames), interval=frame_period_ms, blit=False)
    plt.show()


def write_csv(frames: np.ndarray, output: Path) -> None:
    header = ",".join(f"band_{i:02d}" for i in range(BIN_COUNT))
    np.savetxt(output, frames, fmt="%d", delimiter=",", header=header, comments="")


def report(frames: np.ndarray, sr: int) -> None:
    if frames.size == 0:
        print("[!] no frames produced (input shorter than FFT_SIZE)")
        return
    duration = frames.shape[0] * FFT_SIZE / sr
    peak = frames.max(axis=0)
    print(f"[OK] {frames.shape[0]} frames · {duration:.2f} s @ {sr} Hz · peak/band: {list(peak)}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> None:
    p = argparse.ArgumentParser(description="S.A.I sai_dsp reference simulator")
    p.add_argument("input", nargs="?", help="WAV file path (omit to synthesize)")
    p.add_argument("--tone", type=float, help="synthesize a pure sine at HZ")
    p.add_argument("--sweep", action="store_true", help="synthesize a 20 Hz → 20 kHz log sweep")
    p.add_argument("--noise", choices=["pink", "white"], help="synthesize noise")
    p.add_argument("--duration", type=float, default=3.0, help="synth duration (s, default 3)")
    p.add_argument("--sample-rate", type=int, default=DEFAULT_SAMPLE_RATE,
                   help=f"sample rate for synthesis (default {DEFAULT_SAMPLE_RATE})")
    p.add_argument("--live", action="store_true", help="live animated bars (needs a display)")
    p.add_argument("--csv", type=Path, help="dump per-frame bands to CSV")
    p.add_argument("--output", type=Path, default=Path("spectrum.png"),
                   help="heatmap PNG path (default spectrum.png; ignored with --live)")
    args = p.parse_args()

    if args.input:
        samples, sr = load_wav(Path(args.input))
        label = Path(args.input).name
    elif args.tone is not None:
        samples = synth_tone(args.tone, args.duration, args.sample_rate)
        sr = args.sample_rate
        label = f"tone_{int(args.tone)}Hz_{args.duration}s"
    elif args.sweep:
        samples = synth_sweep(20.0, 20000.0, args.duration, args.sample_rate)
        sr = args.sample_rate
        label = f"sweep_20-20k_{args.duration}s"
    elif args.noise:
        samples = synth_noise(args.noise, args.duration, args.sample_rate)
        sr = args.sample_rate
        label = f"{args.noise}-noise_{args.duration}s"
    else:
        p.error("provide a WAV path or one of --tone / --sweep / --noise")
        return  # unreachable; keeps the type checker happy

    frames = np.array(list(stream_frames(samples)), dtype=np.uint8)
    print(f"[--] input: {label}")
    report(frames, sr)

    if args.csv:
        write_csv(frames, args.csv)
        print(f"[OK] CSV → {args.csv}")

    if args.live:
        run_live(frames, sr)
    else:
        write_heatmap(frames, sr, args.output)
        print(f"[OK] heatmap → {args.output}")


if __name__ == "__main__":
    main()
