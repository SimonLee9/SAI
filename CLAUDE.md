# CLAUDE.md

S.A.I (Spatial Acoustic Intelligence, "사이") — 3D 프린팅 기반 모듈러 오디오 시스템. ESP32 + I2S Class-D 앰프, WS2812B LED 시각화를 결합한 블루투스 스피커. Phase 2에서 포고 핀 + 자석으로 스테레오 확장. (보드는 원래 ESP32-S3였으나 A2DP에 필요한 Classic BT가 없어 원조 ESP32로 전환 — 자세한 사유는 [docs/technical/DESIGN.md](docs/technical/DESIGN.md) §2.)

## Repository layout

- `firmware/` — ESP32 펌웨어 (C++/PlatformIO). `master/`, `satellite/`, 공유 라이브러리는 `shared/lib/`.
- `dsp-tools/` — 오디오 분석·보정 (Python 3.10+). `analysis/`, `calibration/`, `neural/`.
- `web-landing/` — 브랜드/제품 랜딩 페이지 (Vite + React + TS + Tailwind v4). Sound Lab 데모와 사전 알림 폼. **Phase 0에서 활성**.
- `web-dashboard/` — 제품 제어 UI (계획 단계, **Phase 3** — 마스터 펌웨어 WebSocket 서버 후 부트스트랩).
- `services/` — 백엔드 서비스. 현재 `waitlist/` (Cloudflare Worker + KV).
- `hardware/` — `enclosure/` (STL/STEP), `pcb/`, `bom/`.
- `docs/` — `business/`, `technical/` (설계 문서: `docs/technical/DESIGN.md`), `brand/`.
- `content/` — 블로그·유튜브 원고.
- `scripts/` — 빌드·유틸리티 스크립트.

## Build & run

| Subproject | Setup | Run |
|---|---|---|
| `firmware/master` (또는 `satellite`) | (PlatformIO 자동 의존성 설치) | `pio run -t upload && pio device monitor` |
| `dsp-tools` | `pip install -r requirements.txt` | `python analysis/sweep_generator.py --duration 5` |
| `web-landing` | `npm install` | `npm run dev` (→ http://localhost:5174) |
| `services/waitlist` | `npm install` | `npm run dev` (wrangler → http://localhost:8787) · `npm run deploy` |
| `web-dashboard` | (Phase 3에 부트스트랩) | — |

`firmware/shared/lib/`는 PlatformIO 라이브러리 storage이며, 각 모듈은 자체 서브디렉토리를 가진다 (`sai_config/`, `sai_led/`, `sai_audio/`, `sai_bt/`). 두 펌웨어 환경에 `lib_extra_dirs = ../shared/lib`이 설정되어 있어, `#include "sai_config.h"`처럼 헤더 이름만으로 include 가능. 새 모듈 추가 시 같은 패턴으로 디렉토리만 만들면 된다 (별도 매니페스트 불필요).

## Conventions

- 문서·주석: 제품/UX 카피는 한국어, 기술 식별자(함수명, 변수명, 로그)는 영어.
- 라이선스: MIT. 파일별 헤더는 추가하지 않는다.
- 브랜치: `main` 트렁크 기반. 큰 작업만 feature 브랜치.
- 커밋: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:` ...). 예시는 `git log`.
- 코드 스타일: 펌웨어는 Arduino-ESP32 (PlatformIO `framework = arduino`), Python은 PEP 8, 웹은 React 18 함수형 컴포넌트 + Tailwind v4 (`@theme` CSS 토큰). ESLint/Prettier는 추후 도입.
- 브랜드 톤: 차분하고 단정한 한국어, 약간의 시적 여운. 색은 화선지/먹/단청/청자 팔레트 (web-landing의 `src/index.css` `@theme` 블록이 single source of truth).

## Current phase

**Phase 0 — 레포·브랜드 셋업** (in progress, 2026-05-02 기준).
전체 로드맵은 [README.md](README.md), 기술 세부는 [docs/technical/DESIGN.md](docs/technical/DESIGN.md).

## Deployment topology (Phase 0)

- **web-landing** → Cloudflare Pages. Build command `npm run build`, output `dist/`. SPA, 모든 route를 `/index.html`로 fallback (필요 시 `public/_redirects` 추가).
- **services/waitlist** → Cloudflare Workers + KV namespace `WAITLIST_KV`. CORS는 `wrangler.toml`의 `ALLOWED_ORIGIN`으로 landing origin에 락. 첫 배포 절차는 [services/waitlist/README.md](services/waitlist/README.md).
- 두 surface 사이 결합은 `web-landing/.env`의 `VITE_WAITLIST_ENDPOINT`만으로 — endpoint 미설정 시 `Waitlist.tsx`는 자동으로 localStorage 폴백.

## CI

`.github/workflows/ci.yml`은 push/PR(main 브랜치)마다 세 잡을 병렬 실행:
1. **web-landing build** — `npm ci` + `npm run build` (tsc -b 포함). dist artifact 업로드.
2. **waitlist typecheck** — `npm ci` + `npx tsc --noEmit`.
3. **firmware build** — PlatformIO 캐시 + master/satellite 매트릭스. **첫 device bring-up 전까지는 advisory** (`continue-on-error: true`). 실 보드 한 번 빌드/플래시 성공 후 required로 승격.

## Working with Claude Code on this repo

- 사용 가능한 스킬: `init`(CLAUDE.md 갱신), `review`(PR 리뷰), `security-review`, `simplify`(변경 사항 코드 품질 점검), `claude-api`(SDK 코드 작성). `/skill-name` 형식으로 호출.
- 자동 메모리는 `~/.claude/projects/-home-lee-code-SAI/memory/`에 저장된다 (Claude Code 내부, 레포에는 들어가지 않음).
- 큰 변경 전에는 `EnterPlanMode`로 계획 합의 후 실행.
