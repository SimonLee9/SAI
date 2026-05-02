# S.A.I — Technical Design

> 작성일: 2026-05-02 · Status: **Draft (Phase 0)**

본 문서는 Phase 0~1 진입 시점의 기술 설계 초안이다. 결정 사항은 확정 표시(✅)를, 미결정 항목은 TBD로 마크한다.

---

## 1. System overview

S.A.I는 ESP32-S3를 두뇌로 하는 블루투스 스피커이다. Phase 1은 단일 노드(모노 또는 스테레오 1.0)로 시작하고, Phase 2에서 마스터 + 위성 무선 동기화로 확장한다.

```
[Phone/PC] ──BT/A2DP──▶ [Master ESP32-S3] ──ESP-NOW──▶ [Satellite ESP32-S3]
                             │                                │
                             ├─ I2S ──▶ Class-D AMP ──▶ Driver
                             └─ RMT ──▶ WS2812B LED ring     (동일 구조)
```

핵심 가치 제안:

1. 한국적 미감의 인클로저 (달항아리·곡선 모티브, PETG/PLA 3D 인쇄)
2. 음악 반응형 LED 시각화 (FFT 기반 주파수 매핑)
3. 모듈식 무선 확장 (포고 핀 + 자석으로 위성 결합)

---

## 2. Hardware

핀맵·샘플레이트 등 펌웨어 측 상수의 단일 출처는 [`firmware/shared/lib/sai_config.h`](../../firmware/shared/lib/sai_config.h)이다. 본 문서는 그 결정을 요약한다.

| Component | 선택 | Phase | 비고 |
|---|---|---|---|
| Board | ESP32-S3-DevKitC-1 (N8R8: 8MB Flash, 8MB PSRAM, qio_opi) | 1 | ✅ |
| DAC/AMP | MAX98357A (I2S, 모노 3W) | 1 | ✅ |
| Driver | 풀레인지 2", 4Ω, 3W | 1 | ✅ |
| Mic (측정/액티브 센싱) | INMP441 (I2S MEMS) | 1 | ✅ |
| LED | WS2812B ring 16개 (`SAI_LED_COUNT`로 모듈별 조정) | 1 | ✅ |
| Power | USB-C 5V | 1 | ✅ Phase 1 USB-only |
| Battery | 18650 + BMS | 2+ | TBD |
| Enclosure | PETG vs PLA | 1 | TBD: 인쇄 품질 vs 내열 |

핀맵 (sai_config.h):

| 신호 | GPIO |
|---|---|
| I2S AMP BCLK / LRC / DOUT | 5 / 4 / 6 |
| INMP441 SCK / WS / SD | 16 / 15 / 17 |
| WS2812B DATA | 21 |

오디오 파라미터: 44.1 kHz · 16-bit · stereo. 자세한 BOM은 [hardware/bom/](../../hardware/bom/) (Phase 1 진입 시 작성).

---

## 3. Firmware architecture

### 3.1 Build framework

- **Arduino-ESP32** (PlatformIO `framework = arduino`) 확정. 라이브러리 생태계(ESP32-A2DP, FastLED)와 프로토타이핑 속도를 우선시한다.
- 향후 I2S DMA 정밀 제어가 필요해지면 ESP-IDF 컴포넌트를 부분 도입 검토 (마스터 노드의 `audio/` 모듈 한정).
- 빌드 시스템: PlatformIO. 환경: `master`, `satellite` (각각 자체 `platformio.ini`).

### 3.2 모듈 구성 (`firmware/shared/lib/`)

각 모듈은 PlatformIO 라이브러리 서브디렉토리이며, 헤더 이름만으로 include 한다 (`#include "sai_led.h"` 등). 빌드 환경의 `lib_extra_dirs = ../shared/lib`이 자동 검색을 담당.

| 라이브러리 | 헤더 | 책임 | Phase | 상태 |
|---|---|---|---|---|
| `sai_config/` | `sai_config.h` | 핀맵·오디오 파라미터·노드 역할 상수 | 1 | ✅ |
| `sai_led/` | `sai_led.h` | WS2812B ring 구동 (FastLED) | 1 | ✅ 구현 |
| `sai_audio/` | `sai_audio.h` | I2S TX (MAX98357A), 추후 RX (INMP441) | 1 | ✅ 구현 (TX) / ⬜ RX |
| `sai_bt/` | `sai_bt.h` | A2DP sink (master only) | 1 | ✅ 구현 |
| `sai_dsp/` | `sai_dsp.h` | FFT 시각화 (256-pt, log-binned 16-band), 추후 EQ/보정 | 1 → 3 | ✅ 구현 (FFT) |
| `sai_sync/` | — | ESP-NOW 마스터↔위성 동기화 | 2 | ⬜ |
| `sai_ota/` | — | Wi-Fi OTA 업데이트 | 3 | ⬜ |

Phase 1 모듈 셋은 모두 구현 완료. 마스터 노드의 데이터 플로우:

```
[Phone]──A2DP──▶ sai_bt ──┬──▶ sai_audio ──I2S──▶ MAX98357A ──▶ Driver
                          │
                          └──▶ sai_dsp ──FFT(256)──▶ 16-band ──▶ sai_led ──▶ WS2812B ring
```

마스터/위성은 `platformio.ini`의 env로 분기, 공통 코드는 위 라이브러리들을 재사용 (Satellite는 `sai_bt`를 링크하지 않는다).

### 3.3 Critical constraints

- Phase 2 마스터↔위성 오디오 동기화 오차 **< 1 ms**. ESP-NOW + PTP-유사 동기화 검토 필요.
- LED 갱신은 오디오 인터럽트 우선순위 아래로 묶어 글리치 방지.

---

## 4. DSP toolchain (`dsp-tools/`)

| Subdir | 목적 | Phase |
|---|---|---|
| `analysis/` | 측정 마이크 → FFT → 주파수/위상 응답 (matplotlib) | 1 |
| `calibration/` | 측정 응답 → 역필터 계수(FIR/IIR) → 펌웨어 헤더로 export | 3 |
| `neural/` | NN 기반 룸 보정·음색 추천 | 3+ |

측정 마이크: **UMIK-1 가정** (보정 파일 제공). 자체 마이크 개발은 미정.

---

## 5. Web surfaces

레포는 두 개의 독립적인 웹 surface를 가진다:

### 5.1 `web-landing/` — 브랜드·제품 사이트 (Phase 0, 현재 활성)

- **스택**: Vite 6 + React 18 + TypeScript 5 + Tailwind v4 (CSS-first, `@theme` 토큰).
- **타이포**: Pretendard Variable (jsDelivr CDN), 한국어 본문/제목.
- **섹션**: Header / Hero / Features / Showcase / SoundLab / Waitlist / About / FAQ / Footer.
- **핵심 기능 — Sound Lab**: Web Audio API로 6개 프리셋(50 Hz / 100 Hz / 1 kHz / 10 kHz / 20 Hz→20 kHz 로그 스윕 / Voss-Kellet 핑크 노이즈)을 클라이언트에서 합성. `AnalyserNode` (fftSize=256)를 16 막대로 로그 스케일 그룹화하여, 실제 WS2812B 링의 시각화를 그대로 미러링. 출력은 `GainNode`로 `VOL_MAX = 0.5` 하드 캡 (청력 안전).
- **사전 알림**: 이메일을 `localStorage`에만 보관 (`sai.waitlist.v1`). 백엔드는 사전 출시 단계에서 연결.
- **자세한 사항**: [web-landing/README.md](../../web-landing/README.md).

### 5.2 `web-dashboard/` — 제품 제어 UI (Phase 3)

- 마스터 펌웨어에 WebSocket 서버가 들어간 후 착수.
- **스택 (예정)**: React + TypeScript + Vite, Tailwind CSS, WebSocket.
- **기능 (예정)**: 노드 자동 탐색, 공간 맵 시각화, 룸 보정 위저드, 실시간 스펙트럼, 음향/조명 프리셋, Matter/MQTT 브리지.
- Phase 1·2 동안에는 부트스트랩하지 않는다.

---

## 6. Phase roadmap

| Phase | 결과물 | 핵심 리스크 |
|---|---|---|
| 0 | 레포·브랜드 셋업 | — |
| 1 | 단일 BT 스피커 PoC (소리 + LED) | I2S 클럭 정확도, 인클로저 음향 튜닝 |
| 2 | 스테레오 무선 확장 (Master + Satellite) | ESP-NOW 동기화 오차 < 1 ms |
| 3 | DSP 측정 툴 + 웹 대시보드 | 측정 마이크 보정, OTA 안정성 |
| 4 | 콘텐츠 런칭 + 킥스타터 | 마케팅, 양산 BOM, 안전 인증 |

---

## 7. Open questions

Phase 1 진입 전:

1. 인클로저 재질 (PETG vs PLA) — 인쇄 테스트 후 결정.
2. 샘플레이트 일관성 — `sai_config.h`는 44.1 kHz, `dsp-tools/analysis/sweep_generator.py`는 48 kHz. 측정 신호는 별도 SR이어도 무방하지만, 의도(상위 SR로 측정 → 다운샘플) 명시 필요.

Phase 2+ :

3. 배터리 포함 여부 — Phase 1 USB-only, Phase 2부터 18650 + BMS 검토.
4. 측정 마이크 — UMIK-1을 외부 측정에, INMP441을 노드 내장 액티브 센싱에 분리 운용. UMIK 외 자체 캘리브레이션 마이크 개발 여부 미정.
5. ESP-NOW 동기화 정확도 PoC — 마스터/위성 간 < 1 ms 달성 가능성을 Phase 1 후반에 검증 필요.

---

## 8. References

- [README.md](../../README.md) — 프로젝트 개요, 빌드 빠른 시작
- [CLAUDE.md](../../CLAUDE.md) — Claude Code 협업 가이드
