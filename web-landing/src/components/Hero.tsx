import { brand } from "../data/content";
import BrushStroke from "./BrushStroke";

export default function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-paper-deep"
    >
      {/* Soft 먹 wash backdrop — uses the page's mark color so it inverts
          cleanly: a faint ink halo on cream in light, a faint paper halo
          on dark in dark mode. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          background:
            "radial-gradient(900px 480px at 70% 20%, var(--color-ink), transparent 60%)," +
            "radial-gradient(700px 400px at 20% 80%, var(--color-ink), transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-6 pt-24 pb-28 md:pt-32 md:pb-36 grid md:grid-cols-12 gap-10 items-center">
        <div className="md:col-span-7">
          <p className="text-xs tracking-[0.3em] text-ink-soft uppercase">
            Spatial Acoustic Intelligence
          </p>
          <BrushStroke className="mt-2 block w-12 h-[6px] text-ink-soft" />
          <h1 className="mt-4 text-4xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-ink-heavy">
            {brand.tagline}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-soft leading-relaxed">
            {brand.intro}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <a
              href="#waitlist"
              className="group inline-flex justify-center items-center gap-2 rounded-md bg-ink text-paper px-6 py-3 text-sm font-medium hover:bg-ink-soft transition-colors"
            >
              {/* 인주 dot — small vermilion mark beside the primary action. */}
              <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-injoo group-hover:bg-injoo-soft transition-colors" />
              사전 알림 받기
            </a>
            <a
              href="#lab"
              className="inline-flex justify-center items-center rounded-md border border-ink text-ink px-6 py-3 text-sm font-medium hover:bg-ink hover:text-paper transition-colors"
            >
              음원 실험실 열기 →
            </a>
          </div>

          <p className="mt-10 text-xs text-ink-mute font-mono">
            v0.1.0 · Phase 0 · 2026 Q4 launch target
          </p>
        </div>

        {/* Hero visual: 16-bar idle ring */}
        <div className="md:col-span-5">
          <div className="relative aspect-square rounded-2xl bg-paper-soft border border-paper-deep flex items-center justify-center overflow-hidden">
            {/* 먹 그림자 — bars 뒤로 살짝 퍼지는 잉크 wash. mode 따라 자동 inversion. */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-2xl opacity-[0.10]"
              style={{
                background: "radial-gradient(circle at 50% 70%, var(--color-ink), transparent 65%)",
                filter: "blur(28px)",
              }}
            />
            <div
              className="relative grid gap-1 w-3/4 h-2/5 items-end"
              style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}
            >
              {Array.from({ length: 16 }, (_, i) => {
                // 농묵 → 담묵: 가운데 막대일수록 진하고, 가장자리는 옅음.
                const center = (16 - 1) / 2;
                const dist = Math.abs(i - center) / center; // 0..1
                const opacity = 1 - dist * 0.55;
                return (
                  <div
                    key={i}
                    className="rounded-sm bg-ink origin-bottom"
                    style={{
                      opacity,
                      animation: `idle-bar ${1.6 + (i % 5) * 0.18}s ease-in-out ${i * 0.07}s infinite`,
                      height: "100%",
                    }}
                  />
                );
              })}
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-mute text-center">WS2812B × 16 — 실제 LED 링 시각화 미리보기</p>
        </div>
      </div>
    </section>
  );
}
