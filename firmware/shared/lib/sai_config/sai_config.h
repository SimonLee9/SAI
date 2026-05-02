#pragma once

/**
 * S.A.I — Shared Hardware Configuration
 *
 * Common pin definitions and constants used by
 * both Master and Satellite nodes.
 */

// ============================================
// I2S Audio Output (MAX98357A)
// ============================================
// GPIO 6–11 are reserved for the SPI flash chip on the original ESP32, so
// SAI_I2S_DOUT moved from GPIO 6 (S3-era pin) to GPIO 22.
#define SAI_I2S_BCLK        5       // Bit Clock
#define SAI_I2S_LRC         4       // Word Select (L/R Clock)
#define SAI_I2S_DOUT        22      // Data Out

// ============================================
// I2S Audio Input (INMP441 Microphone)
// ============================================
#define SAI_MIC_SCK         16      // Serial Clock
#define SAI_MIC_WS          15      // Word Select
#define SAI_MIC_SD          17      // Serial Data

// ============================================
// LED (WS2812B)
// ============================================
#define SAI_LED_PIN         21
#define SAI_LED_COUNT       16      // Adjust per module design

// ============================================
// Audio Parameters
// ============================================
#define SAI_SAMPLE_RATE     44100
#define SAI_BITS_PER_SAMPLE 16
#define SAI_CHANNELS        2       // Stereo

// ============================================
// Node Roles
// ============================================
#define SAI_ROLE_MASTER     0
#define SAI_ROLE_SATELLITE  1

// ============================================
// Version
// ============================================
#define SAI_FW_VERSION      "0.1.0"
