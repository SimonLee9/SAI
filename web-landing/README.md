# web-landing/

S.A.I 브랜드·제품 랜딩 페이지. Phase 0 마케팅 surface 및 사전 알림(이메일) 수집 채널.

## Stack

- **Vite 6** + **React 18** + **TypeScript 5**
- **Tailwind CSS v4** (`@tailwindcss/vite`, CSS-first 설정 — `src/index.css`의 `@theme` 블록)
- **Pretendard Variable** via jsDelivr CDN (한국어 본문/제목용)
- **Web Audio API** — Sound Lab 섹션의 음원 합성과 실시간 16-band 스펙트럼 비주얼라이저

## Run

```bash
cd web-landing
npm install
npm run dev         # http://localhost:5174
npm run build       # → dist/
npm run preview     # 빌드 결과 로컬 미리보기
npm test            # vitest 한 번 실행 (CI에서 동일하게 사용)
npm run test:watch  # vitest watch 모드 (개발 중)
```

> 포트 5174는 `web-dashboard`(5173)와 겹치지 않도록 의도적으로 분리.

## Structure

```
web-landing/
├── index.html           # SEO/OG 메타, Pretendard CDN, favicon
├── vite.config.ts       # React + Tailwind 플러그인
├── tsconfig*.json
├── public/
│   └── favicon.svg      # 브랜드 마크 (외곽 원 + 단청 점)
└── src/
    ├── main.tsx
    ├── App.tsx          # 9개 섹션 조립
    ├── index.css        # 브랜드 토큰 (@theme), 글로벌 스타일
    ├── data/
    │   └── content.ts   # 모든 카피 single source of truth
    └── components/
        ├── Logo.tsx
        ├── Header.tsx     # sticky nav
        ├── Hero.tsx       # 태그라인 + 16-bar idle 시각화
        ├── Features.tsx   # AUDIO / LIGHT / FORM / MODULAR
        ├── Showcase.tsx   # 달항아리 실루엣 + spec 표
        ├── SoundLab.tsx   # Web Audio 음원 합성 + 실시간 비주얼라이저
        ├── Waitlist.tsx   # 이메일 수집 (localStorage)
        ├── About.tsx
        ├── FAQ.tsx
        └── Footer.tsx
```

## Brand tokens

| Token             | Hex       | 의도                  |
|-------------------|-----------|-----------------------|
| `paper`           | `#FAF7F2` | 화선지 (메인 배경)    |
| `paper-soft`      | `#F5F0E8` | 보조 면              |
| `paper-deep`      | `#ECE5D9` | 구분선 / 테두리       |
| `ink`             | `#1A1814` | 먹 (본문 텍스트)      |
| `ink-soft`        | `#4A453E` | 보조 텍스트           |
| `ink-mute`        | `#8A8278` | 메타 정보             |
| `amber`           | `#D97706` | 단청 (CTA, 강조)      |
| `amber-deep`      | `#B45309` | hover/active          |
| `sage`            | `#84A98C` | 청자 (성공/긍정)      |

토큰 변경은 `src/index.css`의 `@theme` 한 곳에서만 수정.

## Sound Lab 동작 메모

- 6개 프리셋: Sub-bass 50 Hz · Bass 100 Hz · Reference 1 kHz · Treble 10 kHz · Log sweep 20 Hz → 20 kHz · Pink noise (Voss/Kellet 근사).
- 출력은 `GainNode`로 **최대 0.5**로 하드 캡 (`VOL_MAX`). UI 슬라이더는 그 안에서 0~100%.
- 비주얼라이저: `AnalyserNode.fftSize = 256` → 128 bin을 **로그 스케일**로 16개 막대에 그룹화. 색상은 저역 단청 amber → 고역 청자 sage 그라데이션 (LED 링 매핑 컨셉 미러).
- 미재생 상태에서도 캔버스가 idle 사인파를 그려 "살아 있는" 인상을 유지.

## Backend wiring (사전 알림)

`Waitlist.tsx`는 `import.meta.env.VITE_WAITLIST_ENDPOINT`가 설정돼 있으면 그 URL로 `POST { email }`을 전송합니다. 미설정이거나 네트워크가 실패하면 자동으로 `localStorage`에 폴백 저장하고 UI에 그 사실을 표시합니다 — 어느 경우에도 리드는 잃지 않음.

```bash
cp .env.example .env.local
# .env.local 편집:
#   VITE_WAITLIST_ENDPOINT=http://localhost:8787   # 로컬 worker
# 혹은
#   VITE_WAITLIST_ENDPOINT=https://sai-waitlist.<account>.workers.dev
```

Worker 셋업 절차는 [services/waitlist/README.md](../services/waitlist/README.md).

## Deploy (Cloudflare Pages)

GitHub 연동을 권장:

| 설정 | 값 |
|---|---|
| Build command   | `npm run build` |
| Build output    | `dist` |
| Root directory  | `web-landing` |
| Env var (Production) | `VITE_WAITLIST_ENDPOINT` = 운영 worker URL |

`public/_headers`는 자동으로 `dist/_headers`로 복사되어 edge에서 적용됩니다 (immutable asset 캐시 + 보안 헤더).

CLI로:

```bash
npm run build
npx wrangler pages deploy dist --project-name sai-landing
```

## Tests

`vitest` + `@testing-library/react` + `jsdom`. 핵심 인터랙티브 컴포넌트의 상태 전이를 단위 테스트로 보호 — 특히 SoundLab의 play/stop/preset 전환은 Pink Noise 누수 같은 quirk가 다시 들어오지 못하게 회귀 테스트로 잡혀 있습니다.

- `src/test/audio-mock.ts` — 최소 Web Audio API mock. 모든 source/gain을 `audioRegistry`에 기록해 테스트가 stop/disconnect/gain ramp까지 검증 가능.
- `src/test/setup.ts` — 매 테스트 전에 mock 설치, jsdom의 미구현 `getContext` 스텁.
- `src/components/SoundLab.test.tsx` — 4개 회귀: 첫 프리셋 시작 / 프리셋 전환 시 직전 source 침묵 / "정지" 버튼 / active 프리셋 토글 off.

새 인터랙티브 컴포넌트를 추가할 때는 같은 패턴으로 최소 한 개의 상태 전이 테스트를 동봉해 주세요.

## Known limits (Phase 0)

- Hero·Showcase 비주얼은 CSS 합성 (실제 제품 사진은 Phase 1 후반에 교체).
- 다국어 미지원: 한국어 우선, 영문은 기술 라벨에만.
- 다크 모드 미지원.
- Pretendard CDN 의존 — 첫 페인트가 CDN 응답에 묶임. 추후 self-host로 전환 검토.

## License

MIT — see repo root [LICENSE](../LICENSE).
