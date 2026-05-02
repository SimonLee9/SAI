import { features } from "../data/content";
import BrushStroke from "./BrushStroke";

export default function Features() {
  return (
    <section id="features" className="py-24 md:py-32 border-b border-paper-deep">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs tracking-[0.3em] text-ink-soft uppercase">Features</p>
          <BrushStroke quality="najeon" idSuffix="features" className="mt-2 block w-12 h-[6px]" />
          <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
            소리·빛·형태·확장. 네 개의 결.
          </h2>
          <p className="mt-4 text-ink-soft leading-relaxed">
            S.A.I는 네 가지 결을 한 점에 모았습니다. 각각이 독립적으로 작동하면서, 서로를 보완합니다.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <article
              key={f.tag}
              className="group rounded-xl bg-paper-soft border border-paper-deep p-6 hover:border-ink transition-colors"
            >
              <p className="text-xs font-mono tracking-widest text-ink-mute">{f.tag}</p>
              <h3 className="mt-3 text-lg font-semibold leading-snug">{f.title}</h3>
              <p className="mt-3 text-sm text-ink-soft leading-relaxed">{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
