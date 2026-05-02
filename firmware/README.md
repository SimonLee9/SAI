# firmware/

ESP32-S3 임베디드 펌웨어 (PlatformIO + Arduino Framework)

## Structure

```
firmware/
├── master/          # 마스터 노드 — BT 수신, 오디오 분배, LED 제어
│   ├── platformio.ini
│   └── src/main.cpp
├── satellite/       # 위성 노드 — ESP-NOW 수신, 로컬 재생 (Phase 2)
│   ├── platformio.ini
│   └── src/main.cpp
└── shared/          # 공유 코드
    └── lib/
        └── sai_config.h   # 핀맵, 상수 정의
```

## Hardware Pin Map (ESP32-S3-DevKitC-1)

| Function | Component | ESP32 Pin | Notes |
|----------|-----------|-----------|-------|
| I2S BCLK | MAX98357A | GPIO 5 | Bit Clock |
| I2S LRC | MAX98357A | GPIO 4 | Word Select |
| I2S DOUT | MAX98357A | GPIO 6 | Audio Data |
| MIC SCK | INMP441 | GPIO 16 | Serial Clock |
| MIC WS | INMP441 | GPIO 15 | Word Select |
| MIC SD | INMP441 | GPIO 17 | Serial Data |
| LED DATA | WS2812B | GPIO 21 | NeoPixel data |

## Build & Upload

```bash
cd firmware/master
pio run -t upload
pio device monitor
```
