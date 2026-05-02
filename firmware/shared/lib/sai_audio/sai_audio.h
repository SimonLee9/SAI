#pragma once

/**
 * S.A.I — I2S audio path (MAX98357A out, INMP441 in).
 *
 * Phase 1: output only. Mic input is declared but unimplemented until
 *           the active acoustic sensing work begins.
 *
 * All samples are int16_t signed PCM, interleaved stereo at SAI_SAMPLE_RATE
 * (see sai_config.h). MAX98357A is mono; the AMP combines L/R internally
 * when its SD pin is left floating (default).
 *
 * Implementation: shared/lib/sai_audio/sai_audio.cpp (added in step b).
 */

#include <stdint.h>
#include <stddef.h>

// Initialize the I2S TX path to the MAX98357A. Returns true on success.
// Idempotent: calling twice is a no-op after the first success.
bool sai_audio_init_output();

// Push interleaved stereo PCM samples (L0, R0, L1, R1, ...).
//   samples: pointer to int16_t array of length `count` (so count/2 frames).
//   count:   number of int16 values (NOT frames).
// Returns the number of int16 values actually written. Non-blocking when
// the I2S DMA queue has space; may write fewer than requested under load.
size_t sai_audio_write_samples(const int16_t* samples, size_t count);

// (Future) Initialize INMP441 mic on the I2S RX path. No-op stub for Phase 1.
bool sai_audio_init_input();
