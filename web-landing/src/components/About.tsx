import { about } from "../data/content";
import BrushStroke from "./BrushStroke";

export default function About() {
  return (
    <section id="about" className="py-24 md:py-32 bg-paper-soft border-b border-paper-deep">
      <div className="mx-auto max-w-3xl px-6">
        <p className="text-xs tracking-[0.3em] text-ink-soft uppercase">About</p>
        <BrushStroke quality="najeon" idSuffix="about" className="mt-2 block w-12 h-[6px]" />
        <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">{about.title}</h2>
        <div className="mt-8 space-y-5 text-lg leading-relaxed text-ink-soft">
          {about.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <p className="mt-12 text-sm text-ink-mute font-mono">
          — Founder, S.A.I · Seoul
        </p>
      </div>
    </section>
  );
}
