#include "sai_bt.h"
#include "sai_config.h"

#include <Arduino.h>
#include <BluetoothA2DPSink.h>

// ESP32-A2DP (pschatzmann) provides A2DP sink + SBC decode. We use the
// stream-reader callback only (i2s_active=false) so this module never owns
// I2S — sai_audio remains the single I2S authority. This matters because
// the BT library's internal I2S path uses the legacy driver/i2s.h API,
// which would conflict with sai_audio's i2s_std.h channel.

static BluetoothA2DPSink g_a2dp_sink;
static sai_bt_audio_cb_t g_user_cb       = nullptr;
static bool              g_initialized   = false;

static void on_a2dp_stream(const uint8_t* data, uint32_t length) {
    if (!g_user_cb) return;
    // A2DP/SBC decoder output is interleaved stereo signed 16-bit PCM.
    g_user_cb(reinterpret_cast<const int16_t*>(data),
              length / sizeof(int16_t));
}

bool sai_bt_init(const char* device_name, sai_bt_audio_cb_t cb) {
    if (g_initialized) return true;

    g_user_cb = cb;
    // is_active=false: callback-only, library does not push to I2S.
    g_a2dp_sink.set_stream_reader(on_a2dp_stream, /*is_active=*/false);
    g_a2dp_sink.start(device_name ? device_name : "S.A.I");

    g_initialized = true;
    return true;
}

bool sai_bt_is_connected() {
    return g_a2dp_sink.is_connected();
}
