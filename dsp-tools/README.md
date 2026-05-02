# dsp-tools/

오디오 분석, 룸 보정, 필터 설계를 위한 Python 도구 모음

## Structure

```
dsp-tools/
├── analysis/          # 측정 및 분석
│   └── sweep_generator.py   # 스윕 신호 생성
├── calibration/       # 룸 보정 (Phase 2)
│   └── (IIR/FIR 필터 계수 생성기)
├── neural/            # Neural 모델링 (Phase 3)
│   └── (비선형 공간 보정 모델)
└── requirements.txt
```

## Quick Start

```bash
pip install -r requirements.txt
python analysis/sweep_generator.py --duration 5
```

## External Tools

| Tool | Purpose | Install |
|------|---------|---------|
| REW (Room EQ Wizard) | 공간 음향 측정/분석 | [roomeqwizard.com](https://www.roomeqwizard.com/) |
| MiniDSP UMIK-1 | 측정용 교정 마이크 | 별도 구매 |
