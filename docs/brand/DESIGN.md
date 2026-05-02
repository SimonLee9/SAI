# S.A.I — Visual Design System

> 작성: 2026-05-02 · Status: Living document
> Brand persona·voice는 [identity_guide.md](identity_guide.md)에, 기술 아키텍처는 [../technical/DESIGN.md](../technical/DESIGN.md)에 있습니다. 이 문서는 **시각 디자인의 단일 출처(single source of truth)**입니다.

---

## 1. 한 줄 원칙

> **흰 종이와 검은 먹의 관계 — 라이트 모드는 한지 위 먹, 다크 모드는 그 반전. 같은 붓 언어, 두 개의 종이.**

먹은 단순한 검정이 아니라 종이와의 관계입니다. 우리 UI의 모든 시각 결정은 이 관계에서 나옵니다 — 색은 둘(먹·한지), 농담은 다섯, 강조는 한 점(인주).

---

## 2. 색 (Color Tokens)

CSS 변수로 정의되며, `:root` (라이트)와 `:root.dark` (다크)에서 값이 swap. Tailwind 유틸리티(`bg-paper`, `text-ink-heavy` 등)는 두 모드에서 자동으로 올바른 값으로 해석.

### 2.1 한지 (Paper) — 캔버스

| 토큰 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| `paper`        | `#FAF7F2` | `#0E0F11` | 페이지 기본 배경 |
| `paper-soft`   | `#F5F0E8` | `#16181B` | 카드, 섹션 보조 면 |
| `paper-deep`   | `#ECE5D9` | `#20242A` | 구분선, 테두리, active 하이라이트 |

다크의 `#0E0F11`은 푸른빛이 살짝 도는 검정 — 품질 좋은 먹의 색감을 모사. 순흑 `#000000`은 사용하지 않는다 (cold tech aesthetic이 됨).

### 2.2 먹 (Ink) — 5-tier 농담 시스템

전통 한국화의 농담(濃淡) 5단계를 그대로 토큰화. 같은 색, 다른 무게.

| 토큰 | 한자 | 라이트 | 다크 | 용도 |
|---|---|---|---|---|
| `ink-heavy`   | 초묵 (超墨) | `#050402` | `#FFFCF6` | **Hero 헤드라인 1곳** — 페이지에서 가장 진한 한 점 |
| `ink`         | 농묵 (濃墨) | `#1A1814` | `#F0EBE0` | 본문, 카드 제목, primary 마크 |
| `ink-medium`  | 중묵 (中墨) | `#322C24` | `#DAD3C5` | 부제, 리드 카피 |
| `ink-soft`    | 담묵 (淡墨) | `#4A453E` | `#C5C0B6` | 섹션 태그 라벨, 보조 텍스트 |
| `ink-mute`    | 청묵 (淸墨) | `#8A8278` | `#7A766E` | 메타 정보, hint, 비활성 |

**사용 규칙**:
- 한 페이지에 `ink-heavy`는 최대 1곳 — 보통 가장 큰 헤드라인. 두 곳 이상 쓰면 강조의 의미가 무너짐.
- 새 컴포넌트를 만들 때 의식적으로 어느 티어에 두어야 할지 결정. 디폴트는 `ink`.

### 2.3 인주 (印朱) — 단일 accent

| 토큰 | 라이트 | 다크 |
|---|---|---|
| `injoo`      | `#A03525` | `#C04638` |
| `injoo-soft` | `#C45F4D` | `#D87567` |

**원칙**: 인주는 "단 한 점의 색"이다. 흑백만으로는 부족한 강조를 만드는 유일한 색이며, **빈도가 의미를 만든다**. 사용처가 늘어날수록 효과가 약해진다.

**사용처 (총 4곳, 신규 추가 시 기존 한 곳을 빼야 함)**:

1. **Footer 낙관** — 브랜드 시그니처. `<InkSeal />` 컴포넌트 전체가 인주.
2. **Primary CTA의 dot** — Hero "사전 알림 받기" 버튼 안의 1.5×1.5px 점. hover 시 `injoo-soft`로 약간 밝아짐.
3. **SoundLab active preset** — 재생 중인 프리셋 카드 우상단의 1.5×1.5px 점.
4. **Sidebar active route** — 좌측 트리에서 현재 페이지 라벨 옆 1.5×1.5px 점.
5. **Waitlist 성공 메시지** — 신청 완료 (`ok`/`ok-local`) 메시지 앞 dot.

여기 외에는 **절대** 인주를 쓰지 말 것. 에러 상태, 단순 호버, 카드 boundary 등은 모두 ink 농담으로 처리.

### 2.4 Legacy 토큰

`amber` / `amber-deep` / `amber-soft` / `sage` / `sage-light`는 토큰 정의에는 남아 있으나 **production UI에서 사용 금지**. 향후 removal 후보. 새 코드에서 절대 참조하지 말 것.

---

## 3. 타이포그래피

- **본문 + 헤드라인**: Pretendard Variable (jsDelivr CDN, 가변 폰트)
- **모노스페이스 (라벨, 사양표 숫자)**: JetBrains Mono / SFMono-Regular / Menlo

### Weight 사용

| Weight | 용도 |
|---|---|
| 800 (extrabold) | Hero h1 |
| 700 (bold)      | 섹션 h2, 카드 제목 |
| 600 (semibold)  | active 사이드바 라벨, 강조 inline |
| 500 (medium)    | 버튼, 링크 |
| 400 (regular)   | 본문 |

### Tracking

- 섹션 태그 라벨 (`Features`, `FAQ` 등): `tracking-[0.3em] uppercase` — 한국 전통 인쇄·도장의 자간감
- 헤드라인: `tracking-tight` — 글자가 단단하게 모이도록
- 메타: `tracking-widest` — 작은 라벨에 숨 주기

### 한국어/영문 처리

- 본문은 한국어 우선. 영문 기술 용어(ESP32, A2DP, FFT 등)는 그대로 표기.
- 한국어 본문에 영문이 섞일 때 폰트는 동일 — Pretendard가 두 글자체를 함께 처리.
- 카피 voice: 차분, 단정, 약간의 시적 여운.

---

## 4. 브랜드 마크

### 4.1 로고 (`<Logo />`)

```svg
[ ⊙ ]   외곽 원 — 공간 (여백)
        안쪽 점 — 소리 (mark)
```

- 외곽: 1.5px stroke, `currentColor` (mode 따라 자동 inversion)
- 내부: 채워진 점, `currentColor` (이전 amber에서 변경됨)
- 가장 작은 모양으로 가장 많은 의미를 담는다 — 브랜드 핵심 모티프.

### 4.2 낙관 (`<InkSeal />`)

전통 도장의 재해석. 약간 떨리는 직사각형 외곽 + 사이 한글 + 번짐 echo.

- 항상 `text-injoo` 색으로 사용 (브랜드 시그니처 = 인주의 자리)
- Footer 좌측 브랜드 컬럼에만 등장
- 크기 기본 56px, 작아도 40px 이하로 가지 않음

---

## 5. 붓 자국 (`<BrushStroke />`)

### 5.1 변형

| 축 | 옵션 | 의미 |
|---|---|---|
| `variant` | `underline` | 짧은 stroke (48×6 viewBox) — 섹션 태그 라벨 아래 |
| `variant` | `divider`   | 긴 stroke (240×8 viewBox) — 섹션 사이 부드러운 구분 |
| `quality` | `wet` (기본) | 번짐 halo — 부드러운, 분위기 있는 강조 |
| `quality` | `dry`       | 갈필 (irregular dasharray) — 단호한, 직접적인 강조 |

### 5.2 사용 위치 (현재)

모든 섹션 헤더의 태그 라벨 아래에 `wet underline` 1줄 (`Hero / Features / Showcase / SoundLab / Waitlist / About / FAQ`). Footer의 `EXPLORE` / `CONNECT` 라벨에도. Sidebar의 `사이` 라벨 아래에도.

### 5.3 사용 가이드

- 새 섹션을 추가할 때 태그 라벨 아래 `BrushStroke`을 함께 두는 것이 표준.
- `dry` quality는 아직 production에 사용처 없음 — 더 단호한 강조가 필요한 자리(예: 경고, 핵심 deadline)에 도입 검토.
- 색은 항상 `currentColor` — 부모의 `text-*` 클래스를 따라간다.

---

## 6. 레이아웃

### 6.1 라우트 + 트리 사이드바

| 경로 | 페이지 | 콘텐츠 |
|---|---|---|
| `/` | Home | Hero + About |
| `/features` | Features | 4 features 카드 |
| `/product` | Product | Showcase + spec |
| `/lab` | Sound Lab | SoundLab |
| `/faq` | FAQ | 자주 묻는 질문 |

각 페이지 하단에는 항상 `<Waitlist />` (전환 surface). Footer는 layout 차원에서 모든 페이지에 표시.

### 6.2 사이드바 (`<Sidebar />`)

- **데스크톱 전용** (`md:` 이상). 모바일은 Header에 가로 스크롤 nav fallback.
- ASCII 트리 글리프(`├─` / `└─`) **사용 금지** — terminal 느낌이 나서 브랜드와 충돌.
- active 표시는 **인주 1점 + ink-heavy + bg-paper-deep** 3축으로. 인주 점이 핵심 시그널.
- 비활성 row는 인주 점 자리를 투명하게 유지하여 layout shift 방지.
- 하단에 `v0.1.0` / `Phase 0` 작은 stamp.

### 6.3 모드 전환

- Header 우측의 해/달 SVG 토글.
- 시스템 prefers-color-scheme 자동 감지가 기본, localStorage(`sai.theme`) override가 우선.
- 첫 페인트 무플래시 — `index.html`의 inline 스크립트가 React 마운트 전에 `.dark` 클래스 적용.
- SoundLab 비주얼라이저 등 캔버스 색은 `MutationObserver`로 클래스 변경을 감지해 즉시 갱신.

---

## 7. 컴포넌트 패턴

### Primary CTA

```html
class="bg-ink text-paper px-6 py-3 hover:bg-ink-soft"
```

내부에 인주 1.5×1.5px dot (Hero CTA만 해당). 다른 CTA에는 인주 dot 추가하지 말 것.

### Card

```html
class="bg-paper-soft border border-paper-deep p-6 hover:border-ink"
```

태그 라벨은 `text-ink-mute font-mono tracking-widest`. 본문은 `text-ink-soft`. 호버 시 border만 변경 — bg는 건드리지 않는다.

### Input

```html
class="border border-ink/20 bg-paper text-ink focus:border-ink focus:ring-2 focus:ring-ink/20"
```

focus 상태도 인주 사용 안 함 — ink 농묵으로 충분.

### 헤드라인 위계

```html
<p class="text-xs tracking-[0.3em] text-ink-soft uppercase">SECTION TAG</p>
<BrushStroke className="mt-2 w-12 h-[6px] text-ink-soft" />
<h2 class="mt-3 text-3xl md:text-4xl font-bold tracking-tight">한국어 제목</h2>
<p class="mt-4 text-ink-soft leading-relaxed">리드 카피.</p>
```

이 4-요소 stack이 모든 섹션의 시작 패턴이다.

---

## 8. 받아들임 기준 (Acceptance Criteria for new UI)

새 컴포넌트나 화면을 만들 때 아래를 통과하지 못하면 브랜드에 어긋난 것:

1. ✅ amber·sage·sky·blue 등 **legacy 색을 0개** 사용한다.
2. ✅ 명도/위계는 5-tier 농담 토큰으로 표현한다 (절대 임의 hex 사용 안 함).
3. ✅ 인주 사용처는 §2.3의 4곳 외에는 추가 안 한다.
4. ✅ 다크 모드에서 figure-ground가 의도대로 inversion 되는지 토글로 확인한다.
5. ✅ 새 섹션의 태그 라벨에는 `<BrushStroke />` underline을 동봉한다.
6. ✅ `prefers-reduced-motion` 사용자에게 큰 애니메이션을 강요하지 않는다.
7. ✅ 한국어 본문은 차분한 voice를 유지 (느낌표·이모지 남용 금지).

---

## 9. 한국 문화 참조

이 시스템은 다음 전통 요소를 디지털 UI 언어로 옮긴 것:

- **한지 (韓紙)** — 따뜻한 크림 톤, 약간의 결이 보이는 종이. 우리 `paper` 토큰의 정신.
- **먹 (墨)** — 푸른빛이 살짝 도는 깊은 검정. 우리 `ink` 토큰.
- **농담 (濃淡)** — 같은 먹을 물에 풀어 만드는 5단계 농도. 우리 5-tier 시스템.
- **번짐 (滲) / 갈필 (渴筆)** — 젖은 붓 / 마른 붓의 표현. `BrushStroke`의 두 quality.
- **여백 (餘白)** — 빈 공간이 의미의 일부가 되는 구성. 충분한 padding과 max-width.
- **인주 (印朱) / 낙관 (落款)** — 도장의 빨간색이 모노톤 그림에 단 하나의 색이 되는 전통. 우리 `injoo` 토큰.
- **달항아리 (月壺)** — 비대칭의 비례, 단정한 곡선. Showcase 비주얼 모티프.

이 참조는 **장식이 아니라 구조** — UI의 모든 결정이 이 어휘에서 파생된다.
