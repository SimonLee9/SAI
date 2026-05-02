# S.A.I — Spatial Acoustic Intelligence (사이)

> 공간과 소리, 그 **사이**를 채우는 지능

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## What is S.A.I?

S.A.I는 3D 프린팅 기반의 지능형 모듈러 오디오 시스템입니다.  
한국 전통 미학과 공간 인지 기술을 결합하여, 소리·빛·공간이 하나로 어우러지는 경험을 만듭니다.

### Core Features (MVP)

- 🔊 **High-Quality Audio** — ESP32-S3 + I2S Class-D 앰프 기반 블루투스 스피커
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
├── firmware/          # ESP32-S3 임베디드 펌웨어 (C++/PlatformIO)
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
│   ├── src/
│   └── public/
│
├── hardware/          # 하드웨어 설계 자료
│   ├── enclosure/     # 3D 프린팅 STL/STEP 파일
│   ├── pcb/           # 회로도 및 PCB 레이아웃
│   └── bom/           # 부품 리스트 (BOM)
│
├── docs/              # 문서
│   ├── business/      # 사업 계획서, 시장 분석
│   ├── technical/     # 기술 사양서, 아키텍처
│   └── brand/         # 브랜딩 가이드, 로고 자산
│
├── content/           # 콘텐츠 마케팅 자료
│   ├── blog/          # 블로그 포스팅 원고
│   └── youtube/       # 영상 기획안, 스크립트
│
└── scripts/           # 빌드, 배포, 유틸리티 스크립트
```

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| PlatformIO | latest | ESP32 펌웨어 빌드 |
| Python | 3.10+ | DSP 분석 도구 |
| Node.js | 18+ | 웹 대시보드 |
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
python analysis/sweep_generator.py   # 테스트 스윕 신호 생성
```

### Quick Start — 브랜드 랜딩 (Phase 0 활성)

```bash
cd web-landing
npm install
npm run dev              # http://localhost:5174
```

### Quick Start — 웹 대시보드 (Phase 3, 미부트스트랩)

```bash
cd web-dashboard
npm install
npm run dev              # http://localhost:5173
```

---

## Development Roadmap

| Phase | Target | Status |
|-------|--------|--------|
| **Phase 0** | 레포 구조 세팅, 브랜드 계정 개설 | 🟢 In Progress |
| **Phase 1** | 단일 BT 스피커 PoC (소리 + LED) | ⬜ Not Started |
| **Phase 2** | 스테레오 무선 확장 (Master + Satellite) | ⬜ Not Started |
| **Phase 3** | DSP 분석 툴 + 웹 대시보드 | ⬜ Not Started |
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
