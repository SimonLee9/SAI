# S.A.I Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                   User's Smartphone                  │
│                  (Bluetooth A2DP)                     │
└──────────────────────┬──────────────────────────────┘
                       │ BT Audio Stream
                       ▼
┌─────────────────────────────────────────────────────┐
│              MASTER NODE (ESP32)                   │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ BT A2DP  │→│ Audio DSP │→│ I2S → MAX98357A   │  │
│  │ Sink     │  │ (FFT,EQ) │  │ → Speaker Driver  │  │
│  └──────────┘  └────┬─────┘  └──────────────────┘  │
│                     │                                 │
│                     ▼                                 │
│              ┌──────────┐   ┌──────────────────┐    │
│              │ FFT Data │→ │ WS2812B LED Ctrl  │    │
│              └──────────┘   └──────────────────┘    │
│                                                       │
│  [Phase 2]  ┌──────────────────────────────────┐    │
│             │ ESP-NOW → Satellite Nodes         │    │
│             └──────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
                       │ ESP-NOW (Phase 2)
                       ▼
┌─────────────────────────────────────────────────────┐
│            SATELLITE NODE (ESP32)                  │
│                                                       │
│  ┌───────────┐  ┌──────────────────┐                │
│  │ ESP-NOW   │→│ I2S → MAX98357A   │                │
│  │ Receiver  │  │ → Speaker Driver  │                │
│  └───────────┘  └──────────────────┘                │
│                                                       │
│  ┌──────────────────┐                                │
│  │ WS2812B LED Ctrl  │                                │
│  └──────────────────┘                                │
└─────────────────────────────────────────────────────┘
```

## Phase Breakdown

### Phase 1 — Single BT Speaker (MVP)

- ESP32 receives BT audio via A2DP profile
- Outputs to MAX98357A via I2S bus
- Performs FFT on audio buffer for LED visualization
- WS2812B reacts to frequency bands

### Phase 2 — Stereo Wireless Expansion

- Master splits L/R channels
- Transmits via ESP-NOW to satellite nodes
- Buffered playback with timestamp synchronization
- Known limitation: ~32KB/s bandwidth requires SBC codec

### Phase 3 — DSP Tools + Web Dashboard

- Python-based room analysis (sweep → FFT → filter design)
- ESP32 serves WebSocket for browser-based control
- React dashboard for visualization and mode switching

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| MCU | ESP32 (WROOM-32E) | A2DP needs Classic BT — only the original ESP32 has it; S3/C3/C6 are BLE-only. PSRAM dropped (was an S3 feature); 4 MB flash is sufficient for Phase 1. |
| Amplifier | MAX98357A | I2S input, no DAC needed, 3W sufficient for MVP |
| LED protocol | WS2812B | Single-pin control, wide library support |
| Wireless sync | ESP-NOW | No router needed, low latency (~5ms) |
| 3D print material | PETG | Heat resistance, less brittle than PLA |
| Audio codec | SBC (Phase 2) | Required for ESP-NOW bandwidth constraint |
