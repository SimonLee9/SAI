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
          드럼·베이스·멜로디, 한 박자 위에서
        </h2>
        <p className="mt-4 max-w-2xl text-ink-soft leading-relaxed">
          세 개의 트랙이 동기화된 16-step 시퀀서입니다. 드럼은 4가지 합성 보이스
          (kick·snare·hat·clap), 베이스는 saw + lowpass envelope, 멜로디는
          sine·triangle·square 중에서 고를 수 있습니다. 스케일은 5음계·Major·Minor —
          어떤 칸을 누르든 음악으로 떨어지도록.
        </p>

        <Sequencer />
      </div>
    </section>
  );
}
