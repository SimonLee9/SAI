import { faqs } from "../data/content";
import BrushStroke from "./BrushStroke";

export default function FAQ() {
  return (
    <section id="faq" className="py-24 md:py-32 border-b border-paper-deep">
      <div className="mx-auto max-w-3xl px-6">
        <p className="text-xs tracking-[0.3em] text-ink-soft uppercase">FAQ</p>
        <BrushStroke className="mt-2 block w-12 h-[6px] text-ink-soft" />
        <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">자주 묻는 질문</h2>

        <div className="mt-10 divide-y divide-paper-deep border-y border-paper-deep">
          {faqs.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex items-start justify-between gap-4 cursor-pointer list-none">
                <span className="font-medium text-ink">{item.q}</span>
                <span
                  aria-hidden
                  className="mt-1 text-ink-soft text-xl leading-none transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-ink-soft leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
