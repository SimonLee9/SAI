# dsp-tools/

오디오 분석, 룸 보정, 필터 설계를 위한 Python 도구 모음

## Structure

```
dsp-tools/
├── analysis/                  # 측정 및 분석
│   ├── sweep_generator.py     # 스윕 WAV 생성
│   └── spectrum_simulator.py  # sai_dsp.cpp 동일 알고리즘 Python 포팅
├── calibration/               # 룸 보정 (Phase 2)
│   └── (IIR/FIR 필터 계수 생성기)
├── neural/                    # Neural 모델링 (Phase 3)
│   └── (비선형 공간 보정 모델)
└── requirements.txt
```

## Quick Start

```bash
pip install -r requirements.txt
python analysis/sweep_generator.py --duration 5
```

## Spectrum simulator (펌웨어 검증용)

`analysis/spectrum_simulator.py`는 펌웨어의 [`sai_dsp.cpp`](../firmware/shared/lib/sai_dsp/sai_dsp.cpp)와 **동일한** 알고리즘(256-pt FFT · Hamming window · 16-band 2차 그룹화 · 0.95 decay 자동 게인)을 Python으로 이식한 reference implementation. 하드웨어가 없어도 실제 LED 링에 어떤 결이 그려질지 미리 시각화·검증할 수 있습니다.

```bash
# WAV 입력
python analysis/spectrum_simulator.py path/to/song.wav

# 합성 신호 — 디버깅·튜닝용
python analysis/spectrum_simulator.py --tone 1000 --duration 1
python analysis/spectrum_simulator.py --sweep --duration 8
python analysis/spectrum_simulator.py --noise pink --duration 2

# 실시간 16-bar 애니메이션 (디스플레이 필요)
python analysis/spectrum_simulator.py path/to/song.wav --live

# 분석용 CSV 덤프
python analysis/spectrum_simulator.py path/to/song.wav --csv frames.csv
```

기본 출력은 `spectrum.png` 히트맵 (시간 × 16 밴드 강도). 알고리즘 상수를 바꿀 때는 이 파일과 `sai_dsp.cpp`의 상수를 함께 갱신하세요 (FFT_SIZE, BIN_COUNT, DECAY).

## External Tools

| Tool | Purpose | Install |
|------|---------|---------|
| REW (Room EQ Wizard) | 공간 음향 측정/분석 | [roomeqwizard.com](https://www.roomeqwizard.com/) |
| MiniDSP UMIK-1 | 측정용 교정 마이크 | 별도 구매 |
