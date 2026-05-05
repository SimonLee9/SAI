import BrushStroke from "../components/BrushStroke";
import PadGrid from "../components/studio/PadGrid";

export default function StudioPage() {
  return (
    <section id="studio" className="py-24 md:py-32 border-b border-paper-deep">
      <div className="mx-auto max-w-5xl px-6">
        <p className="text-xs tracking-[0.3em] text-ink-soft uppercase">Studio</p>
        <BrushStroke
          quality="najeon"
          idSuffix="studio"
          className="mt-2 block w-12 h-[6px]"
        />
        <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
          작곡 패드
        </h2>
        <p className="mt-4 max-w-2xl text-ink-soft leading-relaxed">
          드럼·베이스·리드·패드·퍼커션 다섯 트랙 × 8개의 클립 슬롯. 셀 짧은 탭은 다음 마디
          시작에서 발사 (Ableton Live Session View 방식), 길게 누르면 ✨ 재생성 / ✏️ 편집 /
          ✕ 비우기. 스케일·키·스윙을 골라서 분위기를 바꾸고, XY 패드로 마스터 필터를 쓸고,
          리본으로 리드 음정을 벤드. 만든 잼은 webm으로 녹음, 세션은 자동 저장됩니다.
        </p>

        <PadGrid />
      </div>
    </section>
  );
}
