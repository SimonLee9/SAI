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
#include "sai_config.h"

void setup() {
    Serial.begin(115200);
    Serial.printf("[SAT] S.A.I Satellite v%s — Phase 2 (Not yet implemented)\n",
                  SAI_FW_VERSION);
}

void loop() {
    delay(1000);
}
