/**
 * S.A.I — Spatial Acoustic Intelligence
 * Master Node Firmware (Phase 1 MVP)
 *
 * Features:
 *   - Bluetooth A2DP audio sink (smartphone → speaker)
 *   - I2S output to MAX98357A amplifier
 *   - Audio-reactive WS2812B LED visualization
 *
 * Hardware:
 *   - ESP32 (original — ESP32-DevKitC-V4 / WROOM-32E module).
 *     A2DP needs Classic Bluetooth, which only the original ESP32 has.
 *   - MAX98357A I2S amplifier module
 *   - WS2812B LED strip
 *   - 2" full-range speaker driver (4Ω, 3W)
 *
 * Pin map and audio parameters live in shared/lib/sai_config.h.
 */

#include <Arduino.h>
#include <math.h>
#include "sai_config.h"
#include "sai_led.h"
#include "sai_audio.h"
#include "sai_bt.h"
#include "sai_dsp.h"

// ============================================
// Bring-up state
// ============================================
static volatile uint32_t g_bt_samples_received = 0;

static void on_bt_audio(const int16_t* samples, size_t count) {
    // Forward decoded PCM straight to the I2S TX path. sai_audio's write
    // is non-blocking with a short timeout, so this stays safe to call
    // from the A2DP task. Dropped samples (returned < count) just mean
    // the speaker briefly underran — preferable to blocking BT.
    sai_audio_write_samples(samples, count);
    // Tee into DSP for the audio-reactive LED ring; FFT runs inline once
    // every kFftSize mono frames (~5.8 ms at 44.1 kHz, < 1 ms compute).
    sai_dsp_push_samples(samples, count);
    g_bt_samples_received += count;
}

// ============================================
// Bring-up helpers (will be removed once BT audio is live)
// ============================================
static void play_test_tone(float freq_hz, uint32_t duration_ms) {
    constexpr size_t kFramesPerChunk = 256;
    int16_t buf[kFramesPerChunk * 2];                // interleaved stereo
    const uint32_t total_frames = (uint32_t)SAI_SAMPLE_RATE * duration_ms / 1000;
    const float    phase_inc    = 2.0f * (float)M_PI * freq_hz / SAI_SAMPLE_RATE;
    float          phase        = 0.0f;

    for (uint32_t emitted = 0; emitted < total_frames; ) {
        const size_t this_chunk =
            (total_frames - emitted < kFramesPerChunk) ? (total_frames - emitted)
                                                       : kFramesPerChunk;
        for (size_t i = 0; i < this_chunk; ++i) {
            const int16_t s = (int16_t)(sinf(phase) * 16000.0f);  // ~-6 dBFS
            buf[i * 2 + 0] = s;
            buf[i * 2 + 1] = s;
            phase += phase_inc;
        }
        sai_audio_write_samples(buf, this_chunk * 2);
        emitted += this_chunk;
    }
}

// ============================================
// Setup
// ============================================
void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("=================================");
    Serial.printf ("  S.A.I — Master Node v%s\n", SAI_FW_VERSION);
    Serial.println("  Spatial Acoustic Intelligence");
    Serial.println("=================================");

    sai_led_init();
    // Boot LED self-test: R → G → B → off. Verifies wiring and all 3 channels.
    sai_led_set_solid(255, 0, 0); sai_led_show(); delay(250);
    sai_led_set_solid(0, 255, 0); sai_led_show(); delay(250);
    sai_led_set_solid(0, 0, 255); sai_led_show(); delay(250);
    sai_led_clear();
    Serial.println("[BOOT] LED self-test complete");

    if (sai_audio_init_output()) {
        Serial.println("[BOOT] I2S init OK — playing 1kHz tone for 500ms");
        play_test_tone(1000.0f, 500);
        Serial.println("[BOOT] Test tone done");
    } else {
        Serial.println("[BOOT] I2S init FAILED — skipping test tone");
    }

    sai_dsp_init();

    if (sai_bt_init("S.A.I", on_bt_audio)) {
        Serial.println("[BOOT] BT A2DP sink up — pair phone with 'S.A.I'");
    } else {
        Serial.println("[BOOT] BT init FAILED");
    }

    Serial.println("[BOOT] System ready. Waiting for BT connection...");
}

// ============================================
// Main Loop
// ============================================
void loop() {
    // 5-second status heartbeat.
    static uint32_t last_log_ms = 0;
    const uint32_t now = millis();
    if (now - last_log_ms >= 5000) {
        last_log_ms = now;
        Serial.printf("[STAT] BT %s, samples=%lu\n",
                      sai_bt_is_connected() ? "connected" : "idle",
                      (unsigned long)g_bt_samples_received);
    }

    // Audio-reactive LED ring: pull the latest spectrum frame (if any new
    // FFT was computed since last loop iteration) and push to the LEDs.
    uint8_t spectrum[SAI_DSP_BIN_COUNT];
    if (sai_dsp_latest_spectrum(spectrum)) {
        sai_led_set_spectrum(spectrum, SAI_DSP_BIN_COUNT);
        sai_led_show();
    }

    delay(5);
}
