// Single source of truth for landing-page copy. Korean primary, English
// secondary for technical terms. Voice: calm, premium, slightly poetic.

export const brand = {
  short: "S.A.I",
  hangul: "사이",
  full: "Spatial Acoustic Intelligence",
  tagline: "공간과 소리, 그 사이를 채우는 지능",
  intro:
    "한국 전통의 결과 현대 음향 기술이 만나는 자리. 한 점에서 시작해 무선으로 확장되는 모듈러 블루투스 스피커.",
} as const;

export type Feature = {
  tag: string;
  title: string;
  body: string;
};

export const features: Feature[] = [
  {
    tag: "AUDIO",
    title: "결을 잃지 않는 소리",
    body: "ESP32와 I2S Class-D 앰프로 44.1 kHz · 16-bit 무손실 블루투스 스트리밍. 페어링은 빠르고, 출력은 정확합니다.",
  },
  {
    tag: "LIGHT",
    title: "음악의 결을 빛으로",
    body: "WS2812B 16-LED 링이 실시간 FFT 분석으로 주파수 대역을 색으로 옮깁니다. 베이스는 단청 빛으로, 고역은 청자 빛으로.",
  },
  {
    tag: "FORM",
    title: "달항아리에서 길어 올린 형태",
    body: "조선 백자의 비례를 3D로 재해석한 인클로저. PETG 출력 표면의 미세한 결이 음과 빛을 부드럽게 흩뜨립니다.",
  },
  {
    tag: "MODULAR",
    title: "둘이 모여 더 넓은 공간으로",
    body: "포고 핀과 자석으로 결합되는 무선 스테레오 확장. 한 점에서 시작해 좌우로, 다시 룸 단위로 늘려 갑니다.",
  },
];

export const showcase = {
  caption: "PHASE 1 — SINGLE NODE",
  title: "한 점의 빛, 한 켤레의 소리",
  body: "달항아리의 비례를 가져와 3D로 다듬은 외관. 청자의 차분한 색감과 단청의 따뜻한 포인트가 만나, 책상 위든 거실 한편이든 공간에 자연스럽게 녹아듭니다. 안에는 ESP32의 두뇌, MAX98357A의 심장, INMP441의 귀가 들어 있습니다.",
  specs: [
    { label: "MCU",       value: "ESP32 · WROOM-32E · 4MB Flash" },
    { label: "Amplifier", value: "MAX98357A · I²S Class-D · 3W" },
    { label: "Driver",    value: "Full-range 2\" · 4Ω · 3W" },
    { label: "Light",     value: "WS2812B · 16 LED ring" },
    { label: "Format",    value: "44.1 kHz · 16-bit · Stereo" },
    { label: "Wireless",  value: "Bluetooth Classic · A2DP sink" },
  ],
} as const;

export type SoundPreset = {
  id: string;
  label: string;
  hint: string;
  kind: "tone" | "sweep" | "noise";
  freq?: number;        // for "tone"
  fromHz?: number;      // for "sweep"
  toHz?: number;        // for "sweep"
  durationSec?: number; // for "sweep"
};

export const soundPresets: SoundPreset[] = [
  { id: "sub",    label: "Sub-bass",   hint: "50 Hz",            kind: "tone",  freq: 50    },
  { id: "bass",   label: "Bass",       hint: "100 Hz",           kind: "tone",  freq: 100   },
  { id: "ref",    label: "Reference",  hint: "1 kHz",            kind: "tone",  freq: 1000  },
  { id: "treble", label: "Treble",     hint: "10 kHz",           kind: "tone",  freq: 10000 },
  { id: "sweep",  label: "Log Sweep",  hint: "20 Hz → 20 kHz",   kind: "sweep", fromHz: 20, toHz: 20000, durationSec: 8 },
  { id: "pink",   label: "Pink Noise", hint: "Voss-McCartney",   kind: "noise" },
];

export const about = {
  title: "1인의 결, 모두의 사이",
  body: [
    "S.A.I는 한 사람의 손에서 시작되었습니다.",
    "하드웨어 설계, 펌웨어, DSP, 인클로저 디자인, 브랜드까지 — 자기 시간의 결을 깎아 만들어가고 있습니다.",
    "기술이 일상의 결이 되는 순간, 그 사이를 채우는 지능을 함께 만들어 가고 싶습니다.",
  ],
} as const;

export type FAQ = { q: string; a: string };

export const faqs: FAQ[] = [
  {
    q: "언제 출시되나요?",
    a: "2026년 4분기 킥스타터 런칭을 목표로 진행 중입니다. 가장 빠른 소식은 사전 알림 신청 시 받아보실 수 있습니다.",
  },
  {
    q: "스테레오로 사용할 수 있나요?",
    a: "Phase 2부터 가능합니다. 마스터와 위성 노드를 포고 핀과 자석으로 결합하는 무선 스테레오를 개발 중입니다.",
  },
  {
    q: "스마트홈과 연동되나요?",
    a: "Phase 4에서 Matter와 MQTT 기반 IoT 연동을 계획하고 있습니다.",
  },
  {
    q: "직접 인클로저를 출력할 수 있나요?",
    a: "STL 파일을 GitHub에 공개할 예정입니다 (MIT). 자체 출력·개조·리믹스를 적극 권장합니다.",
  },
  {
    q: "어디서 만들어지나요?",
    a: "서울에서 설계, 한국 내 PCB 제조와 SMT를 통해 양산을 준비합니다.",
  },
  {
    q: "왜 이름이 '사이'인가요?",
    a: "공간과 소리, 사람과 기술 — 그 모든 '사이'를 채우는 지능을 만들고 싶었기 때문입니다.",
  },
];
