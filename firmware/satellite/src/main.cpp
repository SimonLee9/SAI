/**
 * S.A.I — Satellite Node Firmware (Phase 2)
 *
 * Receives audio data from Master via ESP-NOW
 * and outputs to local I2S amplifier + LED.
 *
 * NOTE: This is a Phase 2 component.
 *       Complete the Master node (Phase 1) first.
 */

#include <Arduino.h>

void setup() {
    Serial.begin(115200);
    Serial.println("[SAT] S.A.I Satellite Node — Phase 2 (Not yet implemented)");
}

void loop() {
    delay(1000);
}
