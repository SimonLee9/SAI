# S.A.I — Technical Design

> 작성일: 2026-05-02 · Status: **Draft (Phase 0)**

본 문서는 Phase 0~1 진입 시점의 기술 설계 초안이다. 결정 사항은 확정 표시(✅)를, 미결정 항목은 TBD로 마크한다.

---

## 1. System overview

S.A.I는 ESP32를 두뇌로 하는 블루투스 스피커이다. Phase 1은 단일 노드(모노 또는 스테레오 1.0)로 시작하고, Phase 2에서 마스터 + 위성 무선 동기화로 확장한다.

```
[Phone/PC] ──BT/A2DP──▶ [Master ESP32] ──ESP-NOW──▶ [Satellite ESP32]
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
| Board | ESP32 (원조, ESP32-DevKitC-V4 / WROOM-32E) | 1 | ✅ |
| DAC/AMP | MAX98357A (I2S, 모노 3W) | 1 | ✅ |
| Driver | 풀레인지 2", 4Ω, 3W | 1 | ✅ |
| Mic (측정/액티브 센싱) | INMP441 (I2S MEMS) | 1 | ✅ |
| LED | WS2812B ring 16개 (`SAI_LED_COUNT`로 모듈별 조정) | 1 | ✅ |
| Power | USB-C 5V | 1 | ✅ Phase 1 USB-only |
| Battery | 18650 + BMS | 2+ | TBD |
| Enclosure | PETG vs PLA | 1 | TBD: 인쇄 품질 vs 내열 |

**보드 선택 결정 (2026-05-02)**: 처음에 ESP32-S3로 잡혀 있었으나, ESP32-S3는 BLE 5.0만 가지고 **Bluetooth Classic이 없어 A2DP 불가능**. A2DP는 폰→스피커 음악 스트리밍의 표준이라 포기하면 사용성이 무너지므로, **원조 ESP32 (Classic BT 보유)**로 전환. PSRAM/연산력은 줄지만 Phase 1의 16-band FFT + LED 시각화는 충분히 처리. Phase 2에서 satellite는 BT가 필요 없으므로 ESP32-S3로 분기 가능 (PSRAM 활용 여지 남김).

핀맵 (sai_config.h):

| 신호 | GPIO |
|---|---|
| I2S AMP BCLK / LRC / DOUT | 5 / 4 / **22** |
| INMP441 SCK / WS / SD | 16 / 15 / 17 |
| WS2812B DATA | 21 |

> GPIO 6–11은 원조 ESP32의 SPI flash에 예약되어 있어, 기존 S3-era SAI_I2S_DOUT=6은 22로 이전.

오디오 파라미터: 44.1 kHz · 16-bit · stereo. 자세한 BOM은 [hardware/bom/](../../hardware/bom/) (Phase 1 진입 시 작성).

---

## 3. Firmware architecture

### 3.1 Build framework

- **Arduino-ESP32 v2** (`framework = arduino`, `platform = espressif32` 공식 레지스트리) + ESP-IDF 4.x.
- 보드: `esp32dev` (원조 ESP32, ESP32-WROOM-32E 모듈 기준). S3 → 원조 ESP32 전환 사유는 §2 참고 (A2DP를 위한 Classic BT 필요).
- sai_audio: legacy `driver/i2s.h` API (`i2s_driver_install` / `i2s_set_pin` / `i2s_write`). 새 `driver/i2s_std.h`는 IDF 5에서만 제공되지만, IDF 5 전환은 ESP32-A2DP가 Arduino-ESP32 v3을 지원할 때까지 보류.
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
- **사전 알림**: `VITE_WAITLIST_ENDPOINT`가 설정되어 있으면 `services/waitlist` Worker로 POST. 미설정/네트워크 실패 시 `localStorage`로 폴백 (리드 손실 방지). UI 메시지로 두 경로를 구분 안내.
- **배포**: Cloudflare Pages — `npm run build` → `dist/`, `public/_headers`가 자동 ship되어 immutable assets와 보안 헤더(X-Content-Type-Options, Referrer-Policy, Permissions-Policy 등) 적용.
- **자세한 사항**: [web-landing/README.md](../../web-landing/README.md).

### 5.1b `services/waitlist/` — 사전 알림 백엔드

- **스택**: Cloudflare Workers (TypeScript) + KV.
- **API**: 단일 `POST /` 엔드포인트, `{ email }` 검증→KV에 `email:<lowercased>` 키로 `{ email, createdAt, ip, ua }` 저장. 중복은 200 + `duplicate: true`로 반환 (etcetera로 가입 여부 누설 방지).
- **CORS**: `ALLOWED_ORIGIN` 변수로 landing origin에만 허용.
- **운영**: `wrangler kv key list/get`로 조회·내보내기. 필요 시 Turnstile + Durable Object 카운터로 rate limiting 추가.
- **자세한 사항**: [services/waitlist/README.md](../../services/waitlist/README.md).

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
