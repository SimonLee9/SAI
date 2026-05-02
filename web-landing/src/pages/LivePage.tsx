import BrushStroke from "../components/BrushStroke";
import LiveCapture from "../components/LiveCapture";

export default function LivePage() {
  return (
    <section id="live" className="py-24 md:py-32 border-b border-paper-deep">
      <div className="mx-auto max-w-5xl px-6">
        <p className="text-xs tracking-[0.3em] text-ink-soft uppercase">Live</p>
        <BrushStroke
          quality="najeon"
          idSuffix="live"
          className="mt-2 block w-12 h-[6px]"
        />
        <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
          외부 음원을 받아들이고, 결을 깎다
        </h2>
        <p className="mt-4 max-w-2xl text-ink-soft leading-relaxed">
          마이크 또는 PC 탭 오디오 (YouTube 등) 를 캡처해 16-band 스펙트럼을 보고,
          3-band EQ와 카라오케 트릭으로 변형하여 녹음·다운로드까지 한 자리에서.
          진짜 음원 분리(보컬만 추출, 멜로디만 추출)는 ML 모델이 필요해 별도 라운드로
          미루지만, 이 페이지의 트릭만으로도 스피커가 실제 음악을 어떻게 다루는지를
          꽤 깊이 들여다볼 수 있습니다.
        </p>

        <LiveCapture />
      </div>
    </section>
  );
}
