import { showcase } from "../data/content";

export default function Showcase() {
  return (
    <section id="showcase" className="py-24 md:py-32 bg-paper-soft border-b border-paper-deep">
      <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-12 gap-12 items-center">
        {/* Left: visual placeholder — gradient + silhouette */}
        <div className="md:col-span-6">
          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-paper-deep">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 50% 35%, rgba(252,217,168,0.6), transparent 50%)," +
                  "linear-gradient(180deg, #ECE5D9 0%, #C8D9CC 100%)",
              }}
            />
            {/* 달항아리 silhouette (CSS-only) */}
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 aspect-[5/6] rounded-[50%/55%]"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.85), rgba(236,229,217,0.95))",
                boxShadow:
                  "0 30px 60px -20px rgba(26,24,20,0.25)," +
                  "inset -20px -10px 40px rgba(74,69,62,0.12)," +
                  "inset 20px 0 30px rgba(255,255,255,0.5)",
              }}
            />
            <div
              aria-hidden
              className="absolute left-1/2 top-[58%] -translate-x-1/2 w-1/3 h-2 rounded-full"
              style={{ background: "rgba(217,119,6,0.6)", filter: "blur(6px)" }}
            />
          </div>
          <p className="mt-3 text-xs text-ink-mute font-mono text-center">
            컨셉 렌더 · 실제 양산 사양은 변경될 수 있습니다
          </p>
        </div>

        {/* Right: copy + spec table */}
        <div className="md:col-span-6">
          <p className="text-xs tracking-[0.3em] text-amber-deep uppercase">{showcase.caption}</p>
          <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">{showcase.title}</h2>
          <p className="mt-6 text-ink-soft leading-relaxed">{showcase.body}</p>

          <dl className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 tabular">
            {showcase.specs.map((s) => (
              <div key={s.label} className="border-t border-paper-deep pt-3">
                <dt className="text-xs text-ink-mute font-mono tracking-widest">{s.label.toUpperCase()}</dt>
                <dd className="mt-1 text-sm text-ink">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
