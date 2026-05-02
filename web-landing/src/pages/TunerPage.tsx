import BrushStroke from "../components/BrushStroke";
import Tuner from "../components/Tuner";

export default function TunerPage() {
  return (
    <section id="tuner" className="py-24 md:py-32 border-b border-paper-deep">
      <div className="mx-auto max-w-5xl px-6">
        <p className="text-xs tracking-[0.3em] text-ink-soft uppercase">Tuner</p>
        <BrushStroke
          quality="najeon"
          idSuffix="tuner"
          className="mt-2 block w-12 h-[6px]"
        />
        <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
          소리의 결을 깎다
        </h2>
        <p className="mt-4 max-w-2xl text-ink-soft leading-relaxed">
          5밴드 비주얼 EQ. 자개 곡선 위의 점을 끌어 주파수와 게인을 직접 조정하고,
          음원이 그 위를 어떻게 통과하는지 들어볼 수 있습니다. 향후 실제 스피커의
          EQ를 조형할 때 쓰일 인터페이스의 미리보기 — 지금은 웹에서, 나중엔 디바이스에서.
        </p>

        <Tuner />
      </div>
    </section>
  );
}
