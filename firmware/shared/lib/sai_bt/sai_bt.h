#pragma once

/**
 * S.A.I — Bluetooth A2DP audio sink (master node only).
 *
 * Wraps the ESP32-A2DP library so the rest of the codebase sees a clean
 * "samples in, sample callback fires" interface. The callback receives
 * decoded interleaved stereo int16 PCM at the SBC-decoded sample rate
 * (typically 44.1 kHz for A2DP).
 *
 * Implementation: shared/lib/sai_bt/sai_bt.cpp (added in step c).
 */

#include <stdint.h>
#include <stddef.h>

// Audio data callback signature.
//   samples: int16 PCM, interleaved stereo (L,R,L,R,...).
//   count:   number of int16 values delivered (not frames).
// Called from the BT/A2DP task context — keep work minimal and non-blocking.
typedef void (*sai_bt_audio_cb_t)(const int16_t* samples, size_t count);

// Initialize A2DP sink. `device_name` is what shows up in the phone's
// pairing list (e.g., "S.A.I"). `cb` is invoked for every decoded PCM block;
// pass nullptr if audio data is not needed (e.g., pairing-only test).
// Returns true on success.
bool sai_bt_init(const char* device_name, sai_bt_audio_cb_t cb);

// True when a phone is currently paired AND streaming.
bool sai_bt_is_connected();
