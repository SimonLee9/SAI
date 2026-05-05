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
          드럼·베이스·리드 세 트랙, 트랙마다 8개의 클립. 셀을 탭하면 다음 마디 시작에서
          그 클립이 재생됩니다 (Ableton Live Session View 방식). 같은 셀을 다시 탭하면 정지,
          상단 Scene 헤더를 누르면 세 트랙이 함께 발사됩니다. 두 손가락으로 다른 트랙의
          셀을 동시에 누를 수도 있어요 (멀티터치) — 즉흥에 가까운 작곡을 위해.
        </p>

        <PadGrid />
      </div>
    </section>
  );
}
