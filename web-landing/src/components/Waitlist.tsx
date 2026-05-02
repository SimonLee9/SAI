import { useState, type FormEvent } from "react";

const STORAGE_KEY = "sai.waitlist.v1";

type State = "idle" | "ok" | "error";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    // Minimal validation — server will re-check.
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setState("error");
      return;
    }
    try {
      const existing: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (!existing.includes(trimmed)) existing.push(trimmed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      setState("ok");
      setEmail("");
    } catch {
      setState("error");
    }
  }

  return (
    <section id="waitlist" className="py-24 md:py-32 border-b border-paper-deep">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <p className="text-xs tracking-[0.3em] text-amber-deep uppercase">Notify Me</p>
        <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
          가장 먼저 만나보세요
        </h2>
        <p className="mt-4 text-ink-soft leading-relaxed">
          출시·킥스타터 일정과 얼리버드 가격을 가장 먼저 안내드립니다. 스팸은 보내지 않습니다.
        </p>

        <form onSubmit={onSubmit} className="mt-10 flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (state !== "idle") setState("idle"); }}
            className="flex-1 rounded-md border border-ink/20 bg-paper px-4 py-3 text-sm focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/30 transition"
            aria-invalid={state === "error"}
          />
          <button
            type="submit"
            className="rounded-md bg-ink text-paper px-6 py-3 text-sm font-medium hover:bg-amber-deep transition-colors"
          >
            알림 신청
          </button>
        </form>

        <div className="mt-4 min-h-6 text-sm">
          {state === "ok"    && <span className="text-sage">신청 완료. 출시 소식을 가장 먼저 보내드릴게요.</span>}
          {state === "error" && <span className="text-amber-deep">올바른 이메일 주소인지 확인해 주세요.</span>}
        </div>

        <p className="mt-8 text-xs text-ink-mute">
          현재 이메일은 브라우저(localStorage)에 임시 저장됩니다. 백엔드 연동은 사전 출시 단계에서 활성화됩니다.
        </p>
      </div>
    </section>
  );
}
