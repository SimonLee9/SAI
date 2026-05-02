# S.A.I Hardware — Bill of Materials (BOM)

## Phase 1 MVP: 단일 블루투스 스피커 (마스터 1대)

| # | Component | Model | Qty | Est. Price | Notes |
|---|-----------|-------|-----|-----------|-------|
| 1 | MCU | ESP32-DevKitC-V4 (WROOM-32E, 4MB Flash) | 1 | ~$6 | A2DP 위해 Classic BT 필요 → 원조 ESP32 |
| 2 | I2S Amplifier | MAX98357A module | 1 | ~$3 | 3W Class-D |
| 3 | Speaker Driver | 2" Full-range (4Ω 3W) | 1 | ~$5 | |
| 4 | Microphone | INMP441 MEMS (I2S) | 1 | ~$3 | Omnidirectional |
| 5 | LED Strip | WS2812B (16 pixels) | 1 | ~$3 | |
| 6 | Resistor | 100kΩ | 1 | ~$0.1 | MAX98357A L/R config |
| 7 | Capacitor | 1000μF electrolytic | 1 | ~$0.5 | Power stabilization |
| 8 | Breadboard | 830-pin | 1 | ~$3 | Prototyping only |
| 9 | Jumper Wires | M-M, M-F assorted | 1 set | ~$3 | |
| 10 | USB-C Cable | Data + Power | 1 | ~$2 | ESP32 power/upload |
| | | | **Total** | **~$31** | |

## Phase 2 추가: 스테레오 확장 (위성 2대 추가)

| # | Component | Model | Qty | Notes |
|---|-----------|-------|-----|-------|
| 1 | MCU | ESP32-DevKitC-V4 (WROOM-32E) | 2 | 위성 노드용. Classic BT 불필요 — ESP32-S3로 분기 옵션 있음 |
| 2 | I2S Amplifier | MAX98357A | 2 | |
| 3 | Speaker Driver | 2" Full-range (4Ω 3W) | 2 | |
| 4 | Microphone | INMP441 | 2 | |
| 5 | LED Strip | WS2812B | 2 | |

## 3D 프린팅 소재

| Material | Type | Notes |
|----------|------|-------|
| PETG | 1.75mm filament | 내열성, 내구성 우수 |
| TPU | 1.75mm flexible | 마이크 쇼크마운트, 가스켓용 |

## 조립 부품

| Component | Spec | Notes |
|-----------|------|-------|
| Insert Nuts | M3 brass, heat-set | 인두기로 매립 |
| Gasket Tape | 3mm foam | 유닛-배플 기밀 유지 |
| Damping Material | Acoustic foam / Polyfill | 내부 흡음재 |
