# hardware/

3D 프린팅 인클로저, 회로도, 부품 리스트

## Structure

```
hardware/
├── enclosure/     # 3D 모델 (Fusion 360 → STL/STEP)
│   └── (Phase 1에서 첫 프로토타입 설계)
├── pcb/           # 회로도 (KiCad, Phase 2+)
│   └── (브레드보드 → 커스텀 PCB 전환 시)
└── bom/
    └── BOM_phase1.md   # 부품 리스트
```

## Design Principles

1. **이중벽 샌드위치 구조** — 외벽/내벽 사이에 모래 충전으로 질량 확보
2. **자이로이드 인필** — 40%+ 밀도, 내부 공명 분산
3. **PETG/ASA 소재** — 열 안정성, 진동 내구성
4. **인서트 너트** — M3 황동, 반복 분해조립 가능
5. **TPU 쇼크마운트** — 마이크 진동 격리

## Printing Settings (Recommended)

| Parameter | Value |
|-----------|-------|
| Material | PETG or ASA |
| Nozzle | 0.4mm |
| Layer Height | 0.2mm |
| Walls | 6+ lines |
| Infill | 40%+ Gyroid |
| Supports | As needed |
