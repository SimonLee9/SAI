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
#include "sai_led.h"
#include "sai_audio.h"
#include "sai_bt.h"

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

    // Phase 1 wiring (implementations land in subsequent commits):
    // sai_audio_init_output();                        // step b
    // sai_bt_init("S.A.I", /*cb=*/nullptr);           // step c

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
