#pragma once

/**
 * S.A.I — LED ring control (WS2812B via FastLED).
 *
 * Phase 1: solid color + spectrum-driven visualization on a single ring.
 * Pin and LED count come from sai_config.h (SAI_LED_PIN, SAI_LED_COUNT).
 *
 * Implementation: shared/lib/sai_led/sai_led.cpp (added in step a).
 */

#include <stdint.h>

// One-time init. Allocates the FastLED controller and clears the ring.
void sai_led_init();

// Set every LED to the same RGB color (0-255 per channel). Does not push.
void sai_led_set_solid(uint8_t r, uint8_t g, uint8_t b);

// Drive the ring from a normalized spectrum array.
//   bins:  pointer to `count` uint8 values (0..255). bins[i] maps to LED i.
//   count: must equal SAI_LED_COUNT; values past the ring length are ignored.
// Color mapping is implementation-defined (e.g., hue ramp by index, value=brightness).
void sai_led_set_spectrum(const uint8_t* bins, uint8_t count);

// Push the current frame to the LEDs (FastLED.show()).
void sai_led_show();

// Black out the ring and push immediately.
void sai_led_clear();
