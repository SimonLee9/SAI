#include "sai_dsp.h"
#include "sai_config.h"

#include <Arduino.h>
#include <arduinoFFT.h>
#include <math.h>
#include <string.h>

// 256-point FFT @ 44.1 kHz: ~5.8 ms window, ~172 Hz bin width.
// Larger sizes give finer frequency resolution but cost more compute and add latency.
constexpr size_t kFftSize  = 256;
constexpr size_t kBinCount = kFftSize / 2;

static float vReal[kFftSize];
static float vImag[kFftSize];
static ArduinoFFT<float> g_fft(vReal, vImag, kFftSize, (float)SAI_SAMPLE_RATE);

static int16_t       g_ring[kFftSize];
static size_t        g_ring_pos     = 0;
static uint8_t       g_latest[SAI_DSP_BIN_COUNT];
static volatile bool g_frame_ready  = false;
static bool          g_initialized  = false;

// Auto-gain: track an exponentially-decaying running max so quiet sections
// still light up while loud peaks don't permanently saturate the display.
static float g_running_max = 1.0f;

static void run_fft_and_publish() {
    for (size_t i = 0; i < kFftSize; ++i) {
        vReal[i] = (float)g_ring[i];
        vImag[i] = 0.0f;
    }
    g_fft.windowing(FFTWindow::Hamming, FFTDirection::Forward);
    g_fft.compute(FFTDirection::Forward);
    g_fft.complexToMagnitude();

    // Group bins into SAI_DSP_BIN_COUNT bands with a quadratic mapping —
    // gives more bars to lower frequencies (perceptually richer there).
    // Skip DC (bin 0).
    float bands[SAI_DSP_BIN_COUNT];
    float current_max = 1.0f;
    for (size_t i = 0; i < SAI_DSP_BIN_COUNT; ++i) {
        const float t0 = (float)i       / SAI_DSP_BIN_COUNT;
        const float t1 = (float)(i + 1) / SAI_DSP_BIN_COUNT;
        const size_t lo = (size_t)(t0 * t0 * (kBinCount - 1)) + 1;
        size_t       hi = (size_t)(t1 * t1 * (kBinCount - 1)) + 1;
        if (hi <= lo) hi = lo + 1;
        if (hi > kBinCount) hi = kBinCount;

        float sum = 0.0f;
        for (size_t b = lo; b < hi; ++b) sum += vReal[b];
        bands[i] = log1pf(sum / (hi - lo));
        if (bands[i] > current_max) current_max = bands[i];
    }

    // Decay running max ~5%/frame; rises instantly.
    g_running_max = (g_running_max * 0.95f > current_max)
                        ? g_running_max * 0.95f
                        : current_max;
    const float inv_max = 255.0f / g_running_max;

    for (size_t i = 0; i < SAI_DSP_BIN_COUNT; ++i) {
        const int v = (int)(bands[i] * inv_max);
        g_latest[i] = (v < 0) ? 0 : (v > 255 ? 255 : (uint8_t)v);
    }
    g_frame_ready = true;
}

void sai_dsp_init() {
    if (g_initialized) return;
    g_ring_pos    = 0;
    g_running_max = 1.0f;
    g_frame_ready = false;
    memset(g_ring,   0, sizeof(g_ring));
    memset(g_latest, 0, sizeof(g_latest));
    g_initialized = true;
}

void sai_dsp_push_samples(const int16_t* samples, size_t count) {
    if (!g_initialized) sai_dsp_init();
    // Stereo → mono downmix; step by 2 to consume L/R pairs.
    for (size_t i = 0; i + 1 < count; i += 2) {
        const int32_t mono = ((int32_t)samples[i] + samples[i + 1]) >> 1;
        g_ring[g_ring_pos++] = (int16_t)mono;
        if (g_ring_pos == kFftSize) {
            g_ring_pos = 0;
            run_fft_and_publish();
        }
    }
}

bool sai_dsp_latest_spectrum(uint8_t* out) {
    if (!g_frame_ready) return false;
    g_frame_ready = false;
    memcpy(out, g_latest, SAI_DSP_BIN_COUNT);
    return true;
}
