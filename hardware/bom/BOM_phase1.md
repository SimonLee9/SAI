# S.A.I Hardware — Bill of Materials (BOM)

## Phase 1 MVP: 단일 블루투스 스피커 (마스터 1대)

> **확정 (2026-11-11)** — 앰프 MAX98357A, 보드는 USB-C 단자의 WROOM-32E 호환 DevKit, LED는 WS2812B 16픽셀 링, 마이크 INMP441은 선택 부품으로 포함. 다음 단계는 부품 주문.

| # | Component | Model | Qty | Est. Price | Notes |
|---|-----------|-------|-----|-----------|-------|
| 1 | MCU | ESP32 WROOM-32E DevKit, USB-C 단자 (DevKitC-V4 호환, 4MB Flash) | 1 | ~$6 | A2DP 위해 Classic BT 필요 → 원조 ESP32. 정품 DevKitC-V4는 micro-USB라 USB-C 호환 보드로 |
| 2 | I2S Amplifier | MAX98357A module | 1 | ~$3 | 3W 모노 Class-D. I2S 디지털 입력 바로 앰프 (PCM5102+PAM8403 대비 부품·배선 적음) |
| 3 | Speaker Driver | 2" Full-range (4Ω 3W) | 1 | ~$5 | |
| 4 | Microphone | INMP441 MEMS (I2S) | 1 | ~$3 | Omnidirectional. **선택** — A2DP 음원 FFT엔 불필요, 이후 룸 보정용 |
| 5 | LED Ring | WS2812B 16-pixel ring | 1 | ~$3 | `SAI_LED_COUNT` = 16, 데이터 GPIO21 |
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
