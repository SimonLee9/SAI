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

### 2.5 자개 (Najeon) — 재질, 색이 아님

**중요**: 자개는 색 토큰이 아니라 **재질(material)**입니다. "단 한 점의 색(인주)" 원칙을 깨지 않으면서 흑백의 빈틈을 채우는 layer. 자개는 5색이 어우러져 **하나의 빛나는 표면**을 만들기 때문에 단일 색이 아닌 면(面)으로 인식된다.

### 2.5.1 4중 layer 구조

| Layer | 역할 | 색/재질 | 사용 빈도 |
|---|---|---|---|
| 먹 (ink)    | 구조 — 글자, 형태 | 검정·크림 (mode 따라) | 페이지 전반 |
| 인주 (injoo) | 위계 — "이게 중요" | 인주 1색 | 페이지당 4곳 이내 |
| 자개 (najeon) | 재질 — "정성 들인 자리" | 5-stop pearl gradient | 모든 얇은 직선 + SoundLab bars |
| 무늬 (munui) | 문화적 흔적 — surface 경계 trim | currentColor (mode 따라) | **페이지당 1–2곳** |

각 layer가 서로 다른 일을 하므로 충돌 없음. 새 layer를 추가할 때 기존 layer의 자리를 침범하지 않는지 검토 필수.

자개는 5-stop 무지갯빛 linear gradient로 구현:

| Stop | Hex | 비유 |
|---|---|---|
| 0%   | `#6FB8D1` | 청자 푸른빛 |
| 22%  | `#93C9B0` | 박하 청록 |
| 46%  | `#F4E0BC` | 진주 크림 |
| 72%  | `#C5A6CC` | 라벤더 |
| 100% | `#DCA9B8` | 장미 진주 |

라이트·다크 모드 양쪽에서 동일 gradient 사용 — pearl 톤이라 어느 캔버스에도 어울림. 자개를 "색"으로 보지 않는 이유는 5색이 어우러져 **하나의 빛나는 표면**을 만들기 때문 — `currentColor`가 아닌 SVG `<linearGradient>`로 렌더.

### 2.6 무늬 (Munui) — 4번째 layer, 문화적 trim

전통 한국 패턴을 큰 surface의 경계에 띠 형태로 한 번 두르는 layer. 자개가 "재질"이라면 무늬는 "장식 — 문화적 흔적". 한복 끝단, 단청 띠, 고려 나전칠기의 테두리에서 가져왔다.

현재 구현된 패턴: **회문 (回紋, Korean meander)** — 직각 톱니가 가로로 반복되는 단순화 fret. Goryeo 시대 나전칠기 테두리 무늬와 같은 계열이라 자개와 짝을 이룸.

**사용 규칙**:

- **Chrome trim 위주**, 페이지당 1–2곳 — 현재는 **Header 하단** + **Hero 컨텐츠 시작** 두 곳. 모두 h-[3px] / opacity ~35%로 얇게.
- **컨텐츠 안쪽엔 두지 않는다** — section 카드 사이, 본문 단락 구분 등엔 무늬를 쓰지 않는다 (BrushStroke / 농담 layer가 그 자리).
- **Footer / Sidebar에는 두지 않는다** — 한 번 시도했다가 제거. Footer는 InkSeal(낙관)이 마무리 anchor 역할을 이미 하고 있고, Sidebar는 najeon brushstroke으로 충분히 정돈됨.
- 색은 항상 `currentColor` (mode 따라 자동 swap)
- 새 패턴 변형(wave, lattice 등) 추가 시 같은 규칙 따른다.

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
| `quality` | `wet`       | 번짐 halo — 부드러운, 분위기 있는 강조 |
| `quality` | `dry`       | 갈필 (irregular dasharray) — 단호한, 직접적인 강조 |
| `quality` | `najeon`    | 자개 — 5-stop 무지갯빛 gradient 채움. **현재 production 기본값** |

### 5.2 사용 위치 (현재)

모든 섹션 헤더의 태그 라벨 아래에 `najeon underline` 1줄 (`Hero / Features / Showcase / SoundLab / Waitlist / About / FAQ`). Footer의 `EXPLORE` / `CONNECT` 라벨, Sidebar의 `사이` 라벨에도 동일 처리. 즉 페이지 모든 얇은 직선이 자개 무늬.

또한 **SoundLab 16-band visualizer**의 막대 색도 같은 자개 5-stop을 따른다 (`SoundLab.tsx`의 `najeonAt(t)` 함수 — BrushStroke의 SVG gradient와 stop 값이 일치). 위치(주파수 빈)가 색을, 음량이 투명도를 담당하는 두 직교 축. 무대(canvas bg)는 양 모드 모두 어둡게 고정 (`bg-ink dark:bg-paper`)하여 pearl 톤이 항상 빛나도록 보장.

### 5.3 사용 가이드

- 새 섹션을 추가할 때 태그 라벨 아래 `<BrushStroke quality="najeon" idSuffix="..." />`을 동봉하는 것이 표준. `idSuffix`는 SVG gradient id 충돌 방지 (페이지 내 고유 문자열).
- `wet` (currentColor) — 자개를 쓰기 부적절한 자리, 또는 의도적으로 잉크 느낌만 원할 때.
- `dry` (갈필) — 아직 production에 사용처 없음. 더 단호한 강조가 필요한 자리(예: 경고, 핵심 deadline)에 도입 검토.
- 자개 stroke은 `currentColor`를 무시하고 자체 gradient 사용 — 부모의 `text-*` 클래스는 영향 없음 (의도된 동작).

### 5.4 무늬 띠 (`<TraditionalBand />`)

큰 surface 경계에 두르는 한국 전통 패턴 띠. SVG `<pattern>`을 가로로 tile하여 thin-band trim을 만든다.

**Props**:
- `pattern` — `"fret"` (현재 유일, 회문). 향후 `wave` (파도), `lattice` (창살) 등 추가 가능.
- `idSuffix` — 페이지 내 고유 문자열 (SVG pattern id 충돌 방지)
- `className` — 보통 `block w-full h-1.5 text-paper/35` 류로 높이·색·투명도 제어

**현재 위치 (총 2곳)**:
- Header 하단 — full-width chrome trim, h-[3px], `text-ink-soft/35`. 이전의 `border-b border-paper-deep`을 대체.
- Hero 컨텐츠 시작 — content-scale 두루마리 cap, h-[3px] w-20, `text-ink-soft/35`. "Spatial Acoustic Intelligence" 라벨 위.

다른 자리 추가 전 §2.6 사용 규칙 참고. Footer / Sidebar에는 두지 않는다 (이미 시도 후 제거).

---

## 6. 레이아웃

### 6.1 라우트 + 트리 사이드바

| 경로 | 페이지 | 콘텐츠 |
|---|---|---|
| `/` | Home | Hero + About |
| `/features` | Features | 4 features 카드 |
| `/product` | Product | Showcase + spec |
| `/lab` | Sound Lab | 6 프리셋 신호 시험기 |
| `/studio` | Studio | 5음계 16-step sequencer |
| `/tuner` | Tuner | 5밴드 비주얼 EQ (drag-on-curve) |
| `/faq` | FAQ | 자주 묻는 질문 |

각 페이지 하단에는 항상 `<Waitlist />` (전환 surface). Footer는 layout 차원에서 모든 페이지에 표시.

**3개 audio 도구의 분담**: 모두 스피커를 다루지만 역할이 다르다.

| 페이지 | 행위 | 입력 → 출력 |
|---|---|---|
| Sound Lab | **측정** | 신호(톤·스윕·노이즈) → 들어보기 |
| Studio    | **연주** | 그리드 패턴 → 5음계 음악 |
| Tuner     | **조형** | 음원 + EQ 곡선 → 결을 깎은 출력 |

세 페이지가 함께 있어 "스피커가 어떤 신호를 통과시키나"(Lab), "스피커가 어떤 음악을 만들 수 있나"(Studio), "스피커의 결을 어떻게 깎을 것인가"(Tuner) — 측정·연주·조형 세 각도에서 제품을 평가할 수 있다. 향후 Phase 3 web-dashboard에서 Tuner는 실 디바이스의 EQ를 직접 컨트롤하는 인터페이스로 재사용될 계획.

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
5. ✅ 새 섹션의 태그 라벨에는 `<BrushStroke quality="najeon" idSuffix="..." />` underline을 동봉한다 — `idSuffix`는 페이지 내 고유 문자열로.
6. ✅ `<TraditionalBand />`는 페이지당 1–2곳, chrome 경계에서만 사용 (현재 Header 하단 + Hero 시작). Footer / Sidebar / content 안쪽엔 두지 않는다.
7. ✅ `prefers-reduced-motion` 사용자에게 큰 애니메이션을 강요하지 않는다.
8. ✅ 한국어 본문은 차분한 voice를 유지 (느낌표·이모지 남용 금지).

---

## 9. 한국 문화 참조

이 시스템은 다음 전통 요소를 디지털 UI 언어로 옮긴 것:

- **한지 (韓紙)** — 따뜻한 크림 톤, 약간의 결이 보이는 종이. 우리 `paper` 토큰의 정신.
- **먹 (墨)** — 푸른빛이 살짝 도는 깊은 검정. 우리 `ink` 토큰.
- **농담 (濃淡)** — 같은 먹을 물에 풀어 만드는 5단계 농도. 우리 5-tier 시스템.
- **번짐 (滲) / 갈필 (渴筆)** — 젖은 붓 / 마른 붓의 표현. `BrushStroke`의 두 quality.
- **여백 (餘白)** — 빈 공간이 의미의 일부가 되는 구성. 충분한 padding과 max-width.
- **인주 (印朱) / 낙관 (落款)** — 도장의 빨간색이 모노톤 그림에 단 하나의 색이 되는 전통. 우리 `injoo` 토큰.
- **자개 (螺鈿) / 나전칠기 (螺鈿漆器)** — 옻칠한 검정 표면 위에 얇게 갈아 박은 진주층 조각의 무지갯빛. 고려 시대에 정점을 이룬 한국 공예. 우리 `najeon` brushstroke quality — 색이 아닌 재질로서, 얇은 직선 자리에 정성과 빛을 입힘.
- **회문 (回紋)** — 단청 띠와 고려 나전칠기 테두리에 쓰인 직각 fret 무늬. 우리 `<TraditionalBand pattern="fret" />` — 한복 끝단처럼 surface 경계에 한 번 두른다.
- **달항아리 (月壺)** — 비대칭의 비례, 단정한 곡선. Showcase 비주얼 모티프.

이 참조는 **장식이 아니라 구조** — UI의 모든 결정이 이 어휘에서 파생된다.
