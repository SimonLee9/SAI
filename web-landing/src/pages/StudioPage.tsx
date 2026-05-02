import BrushStroke from "../components/BrushStroke";
import Sequencer from "../components/Sequencer";

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
          5음계로 그리는 짧은 패턴
        </h2>
        <p className="mt-4 max-w-2xl text-ink-soft leading-relaxed">
          한국 전통 5음계 (도·레·미·솔·라) 그리드입니다. 어떤 칸을 눌러도 듣기 좋은
          음으로 떨어지므로, 음악 이론 없이 그림을 그리듯 짧은 패턴을 만들어 볼 수
          있습니다. 실제 스피커가 멜로디·리듬·하모니를 어떻게 다루는지를 신호 시험이
          아닌 음악 시험으로 들어보는 자리.
        </p>

        <Sequencer />
      </div>
    </section>
  );
}
