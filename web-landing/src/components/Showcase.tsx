import { showcase } from "../data/content";

export default function Showcase() {
  return (
    <section id="showcase" className="py-24 md:py-32 bg-paper-soft border-b border-paper-deep">
      <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-12 gap-12 items-center">
        {/* Left: visual — 달항아리 silhouette in 먹/한지 inversion.
            All colors via CSS vars so light/dark mode swap automatically. */}
        <div className="md:col-span-6">
          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-paper-deep">
            {/* 한지 결 — 위에서 내려오는 옅은 빛. mark 색이라 mode 따라 swap. */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.10]"
              style={{
                background:
                  "radial-gradient(circle at 50% 25%, var(--color-ink), transparent 55%)",
                filter: "blur(20px)",
              }}
            />
            {/* 달항아리 실루엣 — paper 색을 사용해 light에선 한지 위 한지(은은한 input/output)를,
                dark에선 먹 위 먹의 농담을 만든다. inset shadow로 도자기의 배 부분 명암. */}
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 aspect-[5/6] rounded-[50%/55%]"
              style={{
                background:
                  "linear-gradient(180deg, var(--color-paper) 0%, var(--color-paper-soft) 100%)",
                boxShadow:
                  "0 30px 60px -20px color-mix(in srgb, var(--color-ink) 25%, transparent), " +
                  "inset -20px -10px 40px color-mix(in srgb, var(--color-ink) 10%, transparent), " +
                  "inset 20px 0 30px color-mix(in srgb, var(--color-paper) 50%, transparent)",
              }}
            />
            {/* 달항아리 입구 (위) — 가벼운 ink 자국 한 줄로 implied. */}
            <div
              aria-hidden
              className="absolute left-1/2 top-[18%] -translate-x-1/2 w-[10%] h-[1.5px] rounded-full opacity-30"
              style={{ background: "var(--color-ink)" }}
            />
            {/* 그림자 — 도자기 아래의 먹 wash. */}
            <div
              aria-hidden
              className="absolute left-1/2 top-[78%] -translate-x-1/2 w-[28%] h-2 rounded-full opacity-20"
              style={{ background: "var(--color-ink)", filter: "blur(8px)" }}
            />
          </div>
          <p className="mt-3 text-xs text-ink-mute font-mono text-center">
            컨셉 렌더 · 실제 양산 사양은 변경될 수 있습니다
          </p>
        </div>

        {/* Right: copy + spec table */}
        <div className="md:col-span-6">
          <p className="text-xs tracking-[0.3em] text-ink-soft uppercase">{showcase.caption}</p>
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
