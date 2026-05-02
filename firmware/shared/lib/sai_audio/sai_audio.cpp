#include "sai_audio.h"
#include "sai_config.h"

#include <Arduino.h>
#include <driver/i2s_std.h>

// Targets ESP-IDF 5+ / Arduino-ESP32 v3+ (new I2S "std" API).
// On older platform-espressif32 versions this header will not exist; pin the
// platform to ^6.7.0 or later in platformio.ini if the build fails to find it.

static i2s_chan_handle_t g_tx_handle = nullptr;
static bool g_initialized = false;

bool sai_audio_init_output() {
    if (g_initialized) return true;

    i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
    if (i2s_new_channel(&chan_cfg, &g_tx_handle, nullptr) != ESP_OK) {
        Serial.println("[AUDIO] i2s_new_channel failed");
        return false;
    }

    i2s_std_config_t std_cfg = {
        .clk_cfg  = I2S_STD_CLK_DEFAULT_CONFIG(SAI_SAMPLE_RATE),
        .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_16BIT,
                                                       I2S_SLOT_MODE_STEREO),
        .gpio_cfg = {
            .mclk = I2S_GPIO_UNUSED,
            .bclk = (gpio_num_t)SAI_I2S_BCLK,
            .ws   = (gpio_num_t)SAI_I2S_LRC,
            .dout = (gpio_num_t)SAI_I2S_DOUT,
            .din  = I2S_GPIO_UNUSED,
            .invert_flags = { .mclk_inv = false, .bclk_inv = false, .ws_inv = false },
        },
    };

    if (i2s_channel_init_std_mode(g_tx_handle, &std_cfg) != ESP_OK) {
        Serial.println("[AUDIO] i2s_channel_init_std_mode failed");
        return false;
    }

    if (i2s_channel_enable(g_tx_handle) != ESP_OK) {
        Serial.println("[AUDIO] i2s_channel_enable failed");
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

    if (i2s_channel_write(g_tx_handle, samples, bytes_total, &bytes_written, timeout) != ESP_OK) {
        return 0;
    }
    return bytes_written / sizeof(int16_t);
}

bool sai_audio_init_input() {
    // Phase 1.5+ — INMP441 RX path. Stub for now.
    return false;
}
