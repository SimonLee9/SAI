# S.A.I — Spatial Acoustic Intelligence (사이)

> 공간과 소리, 그 **사이**를 채우는 지능

[![CI](https://github.com/SimonLee9/SAI/actions/workflows/ci.yml/badge.svg)](https://github.com/SimonLee9/SAI/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Phase](https://img.shields.io/badge/phase-0%20%E2%80%94%20brand%20setup-D97706)](docs/technical/DESIGN.md)

> 사전 알림 신청은 [web-landing/](web-landing/)의 Waitlist 섹션에서. 운영 도메인은 Phase 0 후반에 발표합니다.
> 첫 dev log: [_안녕, 사이 — 첫 한 점에서 출발하며_](content/blog/0001-안녕-사이.md).

---

## What is S.A.I?

S.A.I는 3D 프린팅 기반의 지능형 모듈러 오디오 시스템입니다.  
한국 전통 미학과 공간 인지 기술을 결합하여, 소리·빛·공간이 하나로 어우러지는 경험을 만듭니다.

### Core Features (MVP)

- 🔊 **High-Quality Audio** — ESP32 + I2S Class-D 앰프 기반 블루투스 스피커
- 💡 **Audio-Reactive LED** — 음악의 주파수에 반응하는 WS2812B 시각화
- 🏺 **K-Design** — 한국적 곡선미를 살린 3D 프린팅 인클로저
- 📡 **Modular Expansion** — 포고 핀 + 자석 결합으로 스테레오 확장 (Phase 2)

### Future Vision

- 초음파 기반 카메라 없는 공간 인식 (Active Acoustic Sensing)
- 자동 룸 캘리브레이션 (Auto Room Correction)
- 멀티채널 무선 동기화
- IoT / Smart Home 연동 (Matter, MQTT)

---

## Repository Structure

```
S.A.I/
├── firmware/          # ESP32 임베디드 펌웨어 (C++/PlatformIO)
│   ├── master/        # 마스터 노드 펌웨어
│   ├── satellite/     # 위성 노드 펌웨어
│   └── shared/        # 공유 라이브러리 (I2S, LED, Sync 등)
│
├── dsp-tools/         # 오디오 분석 및 보정 도구 (Python)
│   ├── analysis/      # FFT, 주파수 응답 분석
│   ├── calibration/   # 룸 보정 필터 계수 생성
│   └── neural/        # Neural 모델링 (Phase 3)
│
├── web-landing/      # 브랜드/제품 랜딩 (React + Vite + Tailwind v4)
│   ├── src/          # — Sound Lab 인터랙티브 데모 포함
│   └── public/
│
├── web-dashboard/    # 제품 제어 웹 UI (Phase 3, 미부트스트랩)
│
├── services/         # 백엔드 서비스
│   └── waitlist/     # Cloudflare Worker + KV — 사전 알림 수집
│
├── hardware/          # 하드웨어 설계 자료
│   ├── enclosure/     # 3D 프린팅 STL/STEP 파일
│   ├── pcb/           # 회로도 및 PCB 레이아웃
│   └── bom/           # 부품 리스트 (BOM)
│
├── docs/              # 문서
│   ├── business/      # 사업 계획서, 시장 분석
│   ├── technical/     # 기술 사양서, 아키텍처 (DESIGN.md)
│   └── brand/         # 브랜딩 가이드, 로고 자산
│
├── content/           # 콘텐츠
│   ├── blog/          # dev log / 블로그 원고
│   └── youtube/       # 영상 기획안, 스크립트
│
├── .github/workflows/ # CI (web-landing · waitlist · firmware build)
└── scripts/           # 빌드, 배포, 유틸리티 스크립트
```

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| PlatformIO | latest | ESP32 펌웨어 빌드 |
| Python | 3.10+ | DSP 분석 도구 |
| Node.js | 22+ | web-landing · services |
| Wrangler | latest | services/waitlist 배포 (`npx wrangler`) |
| Fusion 360 | — | 3D 모델링 (optional) |

### Quick Start — 펌웨어 빌드

```bash
cd firmware/master
pio run                  # 빌드
pio run -t upload        # ESP32에 업로드
pio device monitor       # 시리얼 모니터
```

### Quick Start — DSP 도구

```bash
cd dsp-tools
pip install -r requirements.txt
python analysis/sweep_generator.py            # 테스트 스윕 WAV 생성
python analysis/spectrum_simulator.py --tone 1000 --duration 1
                                              # sai_dsp.cpp 동일 알고리즘으로
                                              # LED 링이 어떻게 빛날지 미리보기
```

### Quick Start — 브랜드 랜딩 (Phase 0 활성)

```bash
cd web-landing
npm install
npm run dev              # http://localhost:5174
```

### Quick Start — 사전 알림 백엔드

```bash
cd services/waitlist
npm install
npx wrangler login        # 첫 1회
npm run dev               # http://localhost:8787 (로컬 테스트)
npm run deploy            # production
```

자세한 첫-배포 절차는 [services/waitlist/README.md](services/waitlist/README.md).

### Web Dashboard (Phase 3 — 미부트스트랩)

마스터 펌웨어가 WebSocket 서버를 노출하기 전까지는 `web-dashboard/` 디렉토리는 골격만 있고 매니페스트가 없습니다. Phase 3 진입 시 `npm create vite@latest`로 스캐폴드 예정.

---

## Development Roadmap

| Phase | Target | Status |
|-------|--------|--------|
| **Phase 0** | 레포·브랜드·인프라 셋업 | 🟢 코드 완성 (web-landing · waitlist · CI · 펌웨어 모듈) |
| **Phase 1** | 단일 BT 스피커 PoC (소리 + LED) | 🟡 펌웨어 코드 완성 · 하드웨어 bring-up 대기 |
| **Phase 2** | 스테레오 무선 확장 (Master + Satellite) | ⬜ Not Started |
| **Phase 3** | DSP 분석 툴 + web-dashboard | ⬜ Not Started |
| **Phase 4** | 콘텐츠 런칭 + 킥스타터 준비 | ⬜ Not Started |

---

## Contributing

현재 1인 프로젝트이지만, 관심 있으신 분의 기여를 환영합니다.  
Issue나 Discussion을 통해 아이디어를 공유해 주세요.

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>S.A.I</b> — 기술이 일상의 결이 되는 순간을 만듭니다.
</p>
