# 작곡 패드 v2 — 다양성 / 사운드 / 편집 / 연주감 일괄 확장

**작성일**: 2026-05-05
**상태**: Draft → User review
**범위**: `web-landing/src/components/studio/` 일대 + `web-landing/src/pages/StudioPage.tsx`

---

## 1. 배경

v1은 Launchpad-style 클립 런처의 "코어 루프"만 구현했다 — 3 트랙 × 8 신, 사전 생성된 24개 클립, quantized launch, 마스터 트랜스포트. ([web-landing/src/components/studio/](../../web-landing/src/components/studio/) 참조) 사용자 피드백: **다양성 / 사운드 / 편집·지속성 / 연주감 네 축이 모두 빈약**. v2는 이 네 축을 한 배치로 채워서 "데모 가능한 진짜 작곡 도구"로 만든다.

비범위(여전히 out of scope): MIDI 입출력, 멀티 사용자, AI 생성. 이 셋은 v3 이후.

---

## 2. 결정 사항 요약

| 결정 | 선택 | 사유 |
|---|---|---|
| 트랙 수 | 3 → **5** (drums, bass, lead, **pad**, **perc**) | 사운드 풍성도 ↑, 5는 한 화면에 깔끔히 들어오는 상한 |
| Pad 클립 모델 | per-step trigger w/ 1.5s 릴리즈 (chord stab) | 진짜 sustain은 스케줄 복잡도 ↑ — stab으로도 패드 느낌 충분 |
| 스케일 변경 시 | 모든 트랙 stop → 라이브러리 전체 재생성 → 사용자 재발사 | 자동 remap-by-index 보다 예측 가능 |
| 다이스 / 편집 진입 | 셀 **롱프레스(>500ms)** → 컨텍스트 메뉴 (`✨ / ✏️ / ✕`) | 짧은 탭은 launch 유지. 한 제스처 한 의미. |
| 편집기 형태 | **모달 오버레이** (단일 클립 16-step grid) | 인라인은 화면 좁음, 모달은 집중 편집에 적합 |
| 세션 저장 | localStorage **3 슬롯 + 자동저장 1** | 클라우드/계정 없이도 즉시 복귀 |
| 녹음 포맷 | **`.webm` (Opus 128kbps)** | 브라우저 네이티브, 코드 단순, 음질 transparent |
| Reverb 구현 | ConvolverNode + 합성 IR (노이즈 지수감쇄, ~1.5s) | 경량, 의존성 0 |
| XY 패드 매핑 | X = lowpass cutoff (200Hz–8kHz log), Y = Q (0.5–12) | 클래식 필터 sweep UX |
| 핀치 벤드 범위 | ±200 cents (semitone 위아래) | 표현력과 안정성의 합의점 |

---

## 3. 아키텍처

### 3.1 상태 분리

```
┌────────────────────── React state (PadGrid) ──────────────────────┐
│ scale: ScaleId   ('pentatonic' | 'major' | 'minor')                │
│ rootPc: number   (0–11)                                            │
│ swing: number    (0 | 0.25 | 0.5)                                  │
│ bpm, masterVol                                                     │
│ tracks: Record<Track, {mute, vol, send}>                           │
│ library: Record<Track, Clip[]>     ← 편집·재생성 시 갱신            │
│ recording: bool                                                    │
│ sessionSlot: 'auto' | '1' | '2' | '3'                              │
│ menu: { track, scene, anchorRect } | null   ← 컨텍스트 메뉴 위치   │
│ editor: { track, scene } | null            ← 모달 편집 대상        │
│ filter: { x, y, active }                   ← XY 패드 상태          │
│ leadBend: number (-200..+200 cents)        ← 리본 상태             │
└────────────────────────────────────────────────────────────────────┘
                ↓ refs / setters / 콜백
┌──────────────── ClipScheduler (mutable, ref) ────────────────┐
│ active/queued/pending — 트랙당                                │
│ currentStep, nextStepTime                                     │
│ bpm, swing                          ← setBpm / setSwing       │
│ leadDetuneCents                     ← setLeadBend             │
│ activeLeadOscs: Set<OscillatorNode> ← 실시간 벤드용            │
│ scheduleStep / tick — swing offset 적용, 5트랙 발음           │
└───────────────────────────────────────────────────────────────┘
                ↓ Web Audio nodes
┌────────────────────── Audio graph ──────────────────────┐
│ per-track:                                              │
│   trackBus.gain → master                                │
│              ↘ trackSend.gain → reverb → wetReturn → ...│
│ master → masterFilter (BiquadFilter, XY 제어) →         │
│   ↳ ctx.destination                                     │
│   ↳ MediaStreamDestination (recording tap)              │
└─────────────────────────────────────────────────────────┘
```

### 3.2 컴포넌트 트리

```
StudioPage
└─ PadGrid                       (오케스트레이터 + audio graph 소유)
   ├─ TransportBar               (재생/BPM/Master/Scale/Key/Swing/세션/녹음)
   ├─ stepProgressBar            (16-step indicator)
   ├─ SceneHeaders               (▶ 1..8)
   ├─ TrackRow × 5
   │  └─ PadCell × 8             (롱프레스 → onMenuRequest)
   ├─ CellMenu                   (포털, anchorRect 기준 floating)
   ├─ ClipEditor                 (모달, editor state 기준 표시)
   ├─ XYPad                      (왼쪽 하단 고정 영역)
   └─ Ribbon                     (오른쪽 하단 고정 영역)
```

### 3.3 데이터 흐름 — 시나리오별

**(a) 클립 발사**: PadCell pointerdown(짧음) → PadGrid.triggerCell → scheduler.launchClip → scheduler.emit → setState → cell `data-state="queued"`.

**(b) 다이스 재생성**: PadCell pointerdown 500ms 유지 → PadCell.onMenuRequest(rect) → PadGrid menu state 설정 → CellMenu 렌더 → `✨` 클릭 → PadGrid.regenerate(track, scene) → 새 시드로 generators 호출 → setLibrary → 다음 발사부터 새 클립.

**(c) 스케일 변경**: TransportBar dropdown → setScale → useEffect: scheduler.stopAll + setLibrary(buildLibrary({scale, rootPc})). 사용자 재발사.

**(d) 편집**: CellMenu `✏️` → PadGrid editor state → ClipEditor 모달 → 저장 → setLibrary 부분 갱신 → 모달 닫힘.

**(e) XY 필터**: XYPad pointermove → setFilter → useEffect: masterFilter.frequency/Q .linearRamp. 손가락 떼면 cutoff → 8kHz, Q → 0.5 (effectively bypass).

**(f) 리본**: Ribbon pointermove → setLeadBend → useEffect: scheduler.setLeadBend(cents). 스케줄러는 (i) 신규 lead osc 만들 때 detune 설정, (ii) activeLeadOscs 전부 detune.value 업데이트.

**(g) 녹음**: Recorder.start → MediaRecorder.start(MediaStreamDestination.stream) → 토글 정지 시 blob → URL.createObjectURL → 자동 다운로드 (`sai-{ISO timestamp}.webm`) → revokeObjectURL.

**(h) 세션 저장**: 라이브러리 / 트랜스포트 / 믹서 변화 → debounce 500ms → sessionStore.save('auto', state). 슬롯 1/2/3은 명시적 저장 버튼.

---

## 4. 모듈별 상세

### 4.1 `synth.ts` (확장)

**신규 함수:**

```ts
// Pad — 사인+사각 layered chord, 1.5s exponential release.
// freqs는 동시 발음 (chord). gain은 monolithic, 보이스 수와 무관하게 정규화.
export function playPad(
  ctx: AudioContext, time: number, freqs: number[], dest: AudioNode,
): void;

// Perc — 4 voices, 드럼처럼 lane 단위.
export type PercKind = "shaker" | "rim" | "tom" | "cowbell";
export function playPerc(
  kind: PercKind, ctx: AudioContext, time: number, dest: AudioNode,
): void;
```

**`playMelody` 변경:**
- 시그니처에 `detuneCents?: number` 추가
- 생성된 OscillatorNode는 호출자(scheduler)에 반환 (활성 osc 트래킹용)
- 시그니처: `playMelody(...): OscillatorNode`

### 4.2 `clips.ts` (대폭 확장)

```ts
export const TRACKS = ["drums", "bass", "lead", "pad", "perc"] as const;

export type PadClip = {
  kind: "pad"; name: string;
  // 코드 진행 + 어느 step에 stab을 칠지.
  // 발음 시: stabs의 각 step에서, progression.degrees[Math.floor(step / stepsPerChord)] 의
  // 코드(루트+3+5)를 chord-tone-rows로 풀어 freq 배열로 변환 → playPad(freqs).
  progression: ChordProgression;
  stabs: number[]; // 0..15 step indices where chord fires
};

export type PercClip = {
  kind: "perc"; name: string;
  steps: boolean[][]; // [4 lanes][16] — shaker/rim/tom/cowbell
};

export type Clip = DrumClip | BassClip | LeadClip | PadClip | PercClip;

export type LibraryOptions = {
  scale: ScaleId;     // 'pentatonic' | 'major' | 'minor'
  rootPc: number;     // 0..11 (C..B)
  seed?: number;      // 기본은 0xPAD2 — 결정성 보장
};

export function buildLibrary(opts: LibraryOptions): SceneLibrary;

// 단일 셀만 새 시드로 교체. 호출 시점의 wall-clock을 시드 베이스로 사용.
export function regenerateClip(
  track: Track, sceneIdx: number, opts: LibraryOptions, seed?: number,
): Clip;

// scale + rootPc → BASS_ROWS, LEAD_ROWS 동적 계산
export function rowsFor(opts: LibraryOptions): {
  bass: ReturnType<typeof buildScaleRows>;
  lead: ReturnType<typeof buildScaleRows>;
};
```

### 4.3 `clipScheduler.ts` (확장)

- 5 트랙 (drums, bass, lead, pad, perc) 발음 경로
- `setSwing(swing: number)` — 0/0.25/0.5
- 스텝 시간 계산:
  ```
  baseStepDur = 60 / bpm / 4
  if (step % 2 === 1) {            // odd 16ths within 8th-pair
    swingOffset = swing * (baseStepDur / 2)
  }
  nextStepTime += baseStepDur + swingOffset (this step) - swingOffset (prev step)
  ```
  실제로는 각 step의 absolute time을 swing-aware하게 계산하는 게 더 안전 — `stepTime(step) = barStartTime + step * baseStepDur + (step % 2 === 1 ? swingOffset : 0)`.
- `setLeadBend(cents: number)`:
  - `this.leadDetuneCents = cents`
  - `for (const osc of this.activeLeadOscs) osc.detune.value = cents`
- `playMelody` 호출 시 `detuneCents` 인자 + 반환된 osc를 `activeLeadOscs`에 추가, `osc.onended = () => activeLeadOscs.delete(osc)`.
- `scheduleStep`에서 PadClip / PercClip 분기 추가.

### 4.4 `audioFx.ts` (신규)

```ts
// Synthesised reverb impulse — exponential noise decay.
// Returns a stereo AudioBuffer ready for ConvolverNode.buffer.
export function makeReverbIR(
  ctx: AudioContext, durationSec: number, decay: number,
): AudioBuffer;

// Wires master → filter → destination, returns the filter for live param control.
export function makeMasterFilter(ctx: AudioContext): BiquadFilterNode;

// Helpful default: cutoff 8kHz, Q 0.5 (effectively transparent).
export const FILTER_DEFAULTS = { cutoff: 8000, q: 0.5 };
```

### 4.5 `sessionStore.ts` (신규)

```ts
export type Session = {
  version: 1;
  scale: ScaleId; rootPc: number; swing: number;
  bpm: number; masterVol: number;
  tracks: Record<Track, { mute: boolean; vol: number; send: number }>;
  library: SerializableLibrary;   // Clip 객체들 plain JSON 직렬화
};

export function save(slot: 'auto' | '1' | '2' | '3', s: Session): void;
export function load(slot: 'auto' | '1' | '2' | '3'): Session | null;
export function listSlots(): { slot: string; savedAt: string; bpm: number }[];
```

저장 키: `sai.studio.session.{slot}`. 직렬화는 `JSON.stringify` — Clip 객체는 모두 plain data (boolean[][], 숫자, 문자열). ChordProgression은 PROGRESSIONS 배열에서 id로 참조 → 역직렬화 시 재해석.

자동 저장: PadGrid `useEffect`에서 [scale, rootPc, swing, bpm, masterVol, tracks, library] 변화에 debounce 500ms.

### 4.6 `recorder.ts` (신규)

```ts
export class Recorder {
  constructor(ctx: AudioContext, sourceTap: AudioNode);
  start(): void;        // MediaRecorder.start, throws if MediaRecorder unsupported
  stop(): Promise<Blob>; // resolves with audio/webm blob
  isSupported(): boolean; // checks typeof MediaRecorder
}
```

PadGrid에서: master → MediaStreamDestination 분기 추가 → Recorder 생성 → 녹음 토글 버튼이 start/stop 호출.

iOS 14.3+ 검출: `if (!Recorder.isSupported()) 버튼 disabled + 툴팁`.

### 4.7 `CellMenu.tsx` (신규)

- React Portal로 `document.body`에 렌더 (z-index 위)
- props: `{ anchorRect: DOMRect; onRegen, onEdit, onClear, onDismiss }`
- 위치: anchor 셀의 `top + height + 4px`, `left = anchor.left`. 화면 끝에서 잘리면 좌측/위로 flip.
- 외부 클릭 → onDismiss
- ESC → onDismiss
- 3 개 큰 버튼 (44pt 이상): `✨ 재생성` / `✏️ 편집` / `✕ 비우기`

### 4.8 `ClipEditor.tsx` (신규)

- Modal: 어두운 backdrop + 중앙 카드
- 클립 종류별 편집 UI:
  - **Drums / Perc**: 4 lane × 16 step grid (boolean toggle)
  - **Bass / Lead**: rows × 16 (현재 scale의 행 라벨 표시, 5/7행 × 16/32셀)
  - **Pad**: 코드 진행 dropdown 선택만 (간소화) + stab step 토글
- props: `{ clip, onSave(newClip), onCancel, onDelete }`
- 저장 시 PadGrid의 setLibrary로 부분 갱신

### 4.9 `XYPad.tsx` (신규)

- props: `{ onChange(x, y), onRelease(), label }`
- 200×200 박스 (모바일 ≥ sm 에서 visible). pointerdown/move/up.
- 시각화: 현재 위치 작은 dot + (선택) trail.
- 좌표 정규화: `[0, 1]`, 호출자가 cutoff/Q로 매핑.

### 4.10 `Ribbon.tsx` (신규)

- props: `{ onChange(centsNorm), onRelease(), label }`
- 풀-폭 × 60px. pointermove 시 `(x / width) * 2 - 1`.
- 호출자가 ±200 cents로 스케일.
- 시각: 중앙 0 라인 + 손가락 위치 마커.

### 4.11 `PadCell.tsx` (수정)

- 롱프레스 감지: pointerdown 시 `setTimeout(500ms, () => onMenuRequest(rect))`. 이 임계 전 pointerup이면 짧은 탭 → onTrigger.
- 롱프레스 발동된 후의 pointerup은 onTrigger를 발사하지 **않음** (메뉴만 열림).
- 휠/우클릭 (`onContextMenu`)으로도 메뉴 트리거.
- 새 props: `state`, `label`, `ariaLabel`, `onTrigger`, `onMenuRequest(rect)`, `disabled?`

### 4.12 `PadGrid.tsx` (대폭 확장)

- 라이브러리를 `useState`로 보관 (`useMemo` 폐기)
- 새 state: scale, rootPc, swing, tracks(per-track), recording, sessionSlot, menu, editor, filter, leadBend
- 새 effects:
  - scale/rootPc 변화 → scheduler.stopAll + library 재생성 (debounce 없음 — 즉시)
  - swing 변화 → scheduler.setSwing
  - filter 변화 → masterFilter param 업데이트
  - leadBend 변화 → scheduler.setLeadBend
  - 자동저장 useEffect (debounce 500ms)
- 마운트 시: sessionStore.load('auto') 시도, 없으면 default
- 렌더: TransportBar / progress / 5 track rows / CellMenu / ClipEditor / XYPad / Ribbon

### 4.13 `TransportBar.tsx` (신규, 추출)

PadGrid에서 분리해서 가독성 확보. props: 모든 트랜스포트 state + setter들. 현재 PadGrid에 인라인된 상단 바를 그대로 옮김 + scale/key/swing/session/recording 컨트롤 추가.

---

## 5. 테스트 전략

### 5.1 단위 (vitest)

| 파일 | 무엇을 |
|---|---|
| `clipScheduler.test.ts` (확장) | swing offset 계산, 5트랙 발음, leadDetune 적용 |
| `clips.test.ts` (신규) | buildLibrary({scale, rootPc}) — pentatonic vs major 행 수, regenerateClip이 결정성 (같은 시드 → 같은 클립) |
| `sessionStore.test.ts` (신규) | save/load 라운드트립, version mismatch 시 null, slot 격리 |
| `audioFx.test.ts` (신규) | makeReverbIR 길이/채널, makeMasterFilter 노드 연결 검증 |

### 5.2 통합 (vitest + Testing Library)

| 파일 | 무엇을 |
|---|---|
| `PadGrid.test.tsx` (확장) | 5 트랙 × 8 셀 = 40 cells, 스케일 변경 시 라이브러리 재생성, 셀 컨텍스트 메뉴 열림, 다이스 시 클립 교체 |
| `ClipEditor.test.tsx` (신규) | 모달 열림/닫힘, 셀 토글, 저장 시 onSave 호출 |
| `CellMenu.test.tsx` (신규) | Portal 렌더, ESC dismiss, 외부 클릭 dismiss |

### 5.3 jsdom 한계 → 수동 검증

- 멀티터치 동시 입력 (XY pad + ribbon + cell launch)
- MediaRecorder 실제 녹음 + 다운로드 — `recorder.ts`는 얇은 래퍼라 단위 테스트 가성비 낮음, 수동 확인으로 갈음
- XYPad / Ribbon — 터치 이벤트 시뮬레이션이 jsdom에서 부정확
- 롱프레스 타이밍 감각
- iOS Safari에서 더블탭 줌 차단, audio unlock
- iPad LAN: `npm run dev -- --host`

---

## 6. 마이그레이션

기존 v1 데이터 (없음 — v1은 localStorage 미사용). 새로 만든 v2 세션은 `version: 1`. 추후 schema 변경 시 `version: 2`로 올리고 `load()` 안에서 마이그레이션.

---

## 7. 빌드 / 디플로이 영향

- 번들 크기 증가 추정: +~15–20 KB gzip (audioFx, sessionStore, recorder, 4개 새 컴포넌트)
- 새 의존성 없음 — 모두 Web Audio + DOM API 표준
- CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) 기존 web-landing build job 그대로

---

## 8. Verification

엔드 투 엔드 절차:

1. `npm test` — 모든 단위/통합 테스트 통과
2. `npm run build` — tsc + vite 빌드 통과
3. `npm run dev` → `http://localhost:5174/studio`:
   - 5 트랙 × 8 셀 = 40 셀 + 8 신 헤더 + 트랜스포트 + XY 패드 + 리본 모두 표시
   - 짧은 탭으로 셀 발사, 다음 마디에서 swap 확인
   - 셀 길게 누르면 메뉴 → ✨ 다이스 → 같은 셀이 새 라벨로 교체
   - 메뉴 → ✏️ 편집 → 모달에서 셀 토글 → 저장 → 다음 발사 시 변경 반영
   - 스케일을 5음계 → Major로 변경 → 모든 트랙 정지됨, 라이브러리 새로 생성 (셀 라벨 변화)
   - 키 C → F 변경 → bass/lead가 새 키에서 발음
   - 스윙 50% 토글 → 그루브감 차이 청취
   - reverb send 슬라이더 → 잔향 증가
   - XY 패드 손가락 sweep → 마스터 필터 sweep 청취
   - 리본 손가락 → 리드 음정 변화 (다른 트랙 영향 없음)
   - 녹음 시작 → 5초 잼 → 정지 → `.webm` 자동 다운로드, 재생 확인
   - 세션 슬롯 1에 저장 → 페이지 새로고침 → 자동 복원 확인 (auto slot)
4. iPad Safari 실기기 (LAN):
   - 두 손가락으로 다른 트랙 셀 동시 launch
   - XY 패드와 리본 동시 조작 (다른 손가락)
   - 더블탭 줌이 일어나지 않음
   - 녹음 → 갤러리 다운로드 가능

---

## 9. 후속 (이번 범위 X, 백로그)

- v3 후보: MIDI 입출력, 클라우드 세션 (계정), AI 기반 다이스 (Magenta), 마이크 입력 → 라이브 처리
- 알려진 미흡: 진짜 sustain pad (현재는 stab), 복잡한 폴리리듬 (3 vs 4 등)
