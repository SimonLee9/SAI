"""
S.A.I — Log Sweep Signal Generator

Generates a logarithmic sine sweep from 20Hz to 20kHz
for room acoustic measurement and speaker testing.

Usage:
    python sweep_generator.py
    python sweep_generator.py --duration 5 --output my_sweep.wav
"""

import argparse
import numpy as np

SAMPLE_RATE = 48000


def generate_log_sweep(
    f_start: float = 20.0,
    f_end: float = 20000.0,
    duration: float = 3.0,
    sample_rate: int = SAMPLE_RATE,
) -> np.ndarray:
    """Generate a logarithmic sine sweep signal.

    Args:
        f_start: Start frequency in Hz
        f_end: End frequency in Hz
        duration: Duration in seconds
        sample_rate: Sample rate in Hz

    Returns:
        Numpy array of float64 samples, normalized to [-1, 1]
    """
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)

    # Logarithmic sweep formula
    k = (f_end / f_start) ** (1.0 / duration)
    phase = 2 * np.pi * f_start * (k**t - 1) / np.log(k)

    sweep = np.sin(phase).astype(np.float64)

    # Apply fade-in/out to avoid clicks (50ms each)
    fade_samples = int(0.05 * sample_rate)
    fade_in = np.linspace(0, 1, fade_samples)
    fade_out = np.linspace(1, 0, fade_samples)
    sweep[:fade_samples] *= fade_in
    sweep[-fade_samples:] *= fade_out

    return sweep


def save_wav(filepath: str, signal: np.ndarray, sample_rate: int = SAMPLE_RATE):
    """Save signal as WAV file."""
    try:
        import soundfile as sf
        sf.write(filepath, signal, sample_rate, subtype="FLOAT")
        print(f"[OK] Saved: {filepath} ({len(signal)/sample_rate:.1f}s, {sample_rate}Hz)")
    except ImportError:
        print("[ERROR] soundfile not installed. Run: pip install soundfile")


def main():
    parser = argparse.ArgumentParser(description="S.A.I Sweep Signal Generator")
    parser.add_argument("--f-start", type=float, default=20.0, help="Start frequency (Hz)")
    parser.add_argument("--f-end", type=float, default=20000.0, help="End frequency (Hz)")
    parser.add_argument("--duration", type=float, default=3.0, help="Duration (seconds)")
    parser.add_argument("--output", type=str, default="sweep_20_20k.wav", help="Output filename")
    args = parser.parse_args()

    print(f"Generating log sweep: {args.f_start}Hz → {args.f_end}Hz, {args.duration}s")
    sweep = generate_log_sweep(args.f_start, args.f_end, args.duration)
    save_wav(args.output, sweep)


if __name__ == "__main__":
    main()
