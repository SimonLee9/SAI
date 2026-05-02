#include "sai_audio.h"
#include "sai_config.h"

#include <Arduino.h>
#include <driver/i2s.h>

// Targets Arduino-ESP32 v2 / ESP-IDF 4 (legacy I2S driver). This is the
// v2-compatible path so we can co-exist with ESP32-A2DP, which currently
// refuses to build under Arduino-ESP32 v3. When that library catches up,
// migrate this module to driver/i2s_std.h on the pioarduino platform.

static constexpr i2s_port_t kPort = I2S_NUM_0;

static bool g_initialized = false;

bool sai_audio_init_output() {
    if (g_initialized) return true;

    i2s_config_t cfg = {};
    cfg.mode                 = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX);
    cfg.sample_rate          = SAI_SAMPLE_RATE;
    cfg.bits_per_sample      = I2S_BITS_PER_SAMPLE_16BIT;
    cfg.channel_format       = I2S_CHANNEL_FMT_RIGHT_LEFT;     // interleaved stereo
    cfg.communication_format = I2S_COMM_FORMAT_STAND_I2S;
    cfg.intr_alloc_flags     = ESP_INTR_FLAG_LEVEL1;
    cfg.dma_buf_count        = 8;                              // 8 × 256 frames buffer
    cfg.dma_buf_len          = 256;
    cfg.use_apll             = false;
    cfg.tx_desc_auto_clear   = true;                           // pad underruns with silence
    cfg.fixed_mclk           = 0;

    if (i2s_driver_install(kPort, &cfg, 0, nullptr) != ESP_OK) {
        Serial.println("[AUDIO] i2s_driver_install failed");
        return false;
    }

    i2s_pin_config_t pins = {};
    pins.mck_io_num   = I2S_PIN_NO_CHANGE;
    pins.bck_io_num   = SAI_I2S_BCLK;
    pins.ws_io_num    = SAI_I2S_LRC;
    pins.data_out_num = SAI_I2S_DOUT;
    pins.data_in_num  = I2S_PIN_NO_CHANGE;

    if (i2s_set_pin(kPort, &pins) != ESP_OK) {
        Serial.println("[AUDIO] i2s_set_pin failed");
        i2s_driver_uninstall(kPort);
        return false;
    }

    g_initialized = true;
    return true;
}

size_t sai_audio_write_samples(const int16_t* samples, size_t count) {
    if (!g_initialized || count == 0) return 0;

    const size_t bytes_total = count * sizeof(int16_t);
    size_t bytes_written = 0;
    const TickType_t timeout = pdMS_TO_TICKS(100);

    if (i2s_write(kPort, samples, bytes_total, &bytes_written, timeout) != ESP_OK) {
        return 0;
    }
    return bytes_written / sizeof(int16_t);
}

bool sai_audio_init_input() {
    // Phase 1.5+ — INMP441 RX path. Stub for now.
    return false;
}
