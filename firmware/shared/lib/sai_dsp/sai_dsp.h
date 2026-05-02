#pragma once

/**
 * S.A.I — Audio DSP for visualization.
 *
 * Phase 1: real-time FFT of incoming PCM samples, exposed as a
 * SAI_LED_COUNT-band spectrum suitable for sai_led_set_spectrum().
 *
 * Pipeline (master node):
 *   on_bt_audio (A2DP task) → sai_dsp_push_samples → ring buffer
 *                                                  ↓ (every kFftSize frames)
 *                                                  FFT + magnitude + log binning
 *                                                  ↓
 *   loop() → sai_dsp_latest_spectrum → sai_led_set_spectrum + sai_led_show
 *
 * Implementation: shared/lib/sai_dsp/sai_dsp.cpp (uses kosme/arduinoFFT v2).
 */

#include <stdint.h>
#include <stddef.h>
#include "sai_config.h"

// One bin per LED — caller-side assumption baked in.
#define SAI_DSP_BIN_COUNT  SAI_LED_COUNT

// Idempotent. Optional: push_samples will lazy-init if you skip this.
void sai_dsp_init();

// Feed interleaved stereo int16 PCM. Internally downmixed to mono and
// accumulated in a ring buffer; once kFftSize mono frames have arrived,
// an FFT is computed inline and the spectrum is published.
//   count: number of int16 values delivered (NOT frames). count must be even.
// Safe to call from the BT/A2DP callback context; one FFT costs <1 ms on S3.
void sai_dsp_push_samples(const int16_t* samples, size_t count);

// Read the latest computed spectrum into `out` (length must be
// SAI_DSP_BIN_COUNT, values 0..255).
// Returns true if a fresh frame has been computed since the last call;
// false otherwise (out untouched).
bool sai_dsp_latest_spectrum(uint8_t* out);
