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
 *   - ESP32-S3-DevKitC-1 (N8R8)
 *   - MAX98357A I2S amplifier module
 *   - WS2812B LED strip
 *   - 2" full-range speaker driver (4Ω, 3W)
 *
 * Pin map and audio parameters live in shared/lib/sai_config.h.
 */

#include <Arduino.h>
#include "sai_config.h"

// ============================================
// Forward declarations
// ============================================
void setup_bluetooth();
void setup_i2s();
void setup_led();
void update_led_from_audio();

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

    // TODO Phase 1: Implement each subsystem
    // setup_i2s();    // uses SAI_I2S_BCLK / LRC / DOUT
    // setup_led();    // uses SAI_LED_PIN, SAI_LED_COUNT
    // setup_bluetooth();

    Serial.println("[BOOT] System ready. Waiting for BT connection...");
}

// ============================================
// Main Loop
// ============================================
void loop() {
    // TODO Phase 1: Audio-reactive LED update
    // update_led_from_audio();

    delay(10);
}
