import { brand } from "../data/content";

export default function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-paper-deep"
    >
      {/* Soft radial backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 480px at 70% 20%, rgba(217,119,6,0.10), transparent 60%)," +
            "radial-gradient(700px 400px at 20% 80%, rgba(132,169,140,0.10), transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-6 pt-24 pb-28 md:pt-32 md:pb-36 grid md:grid-cols-12 gap-10 items-center">
        <div className="md:col-span-7">
          <p className="text-xs tracking-[0.3em] text-amber-deep uppercase">
            Spatial Acoustic Intelligence
          </p>
          <h1 className="mt-4 text-4xl md:text-6xl font-extrabold leading-[1.1] tracking-tight">
            {brand.tagline}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-soft leading-relaxed">
            {brand.intro}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <a
              href="#waitlist"
              className="inline-flex justify-center items-center rounded-md bg-ink text-paper px-6 py-3 text-sm font-medium hover:bg-amber-deep transition-colors"
            >
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
          <div className="relative aspect-square rounded-2xl bg-paper-soft border border-paper-deep flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl" style={{
              background: "conic-gradient(from 220deg, rgba(217,119,6,0.18), rgba(132,169,140,0.18), rgba(217,119,6,0.18))",
              filter: "blur(40px)",
              opacity: 0.9,
            }} />
            <div
              className="relative grid gap-1 w-3/4 h-2/5 items-end"
              style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}
            >
              {Array.from({ length: 16 }, (_, i) => (
                <div
                  key={i}
                  className="rounded-sm bg-amber origin-bottom"
                  style={{
                    animation: `idle-bar ${1.6 + (i % 5) * 0.18}s ease-in-out ${i * 0.07}s infinite`,
                    height: "100%",
                  }}
                />
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-mute text-center">WS2812B × 16 — 실제 LED 링 시각화 미리보기</p>
        </div>
      </div>
    </section>
  );
}
