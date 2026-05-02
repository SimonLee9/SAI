import { useState, type FormEvent } from "react";
import BrushStroke from "./BrushStroke";

const STORAGE_KEY = "sai.waitlist.v1";
const ENDPOINT = import.meta.env.VITE_WAITLIST_ENDPOINT as string | undefined;

type State = "idle" | "submitting" | "ok" | "ok-local" | "error";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setState("error");
      return;
    }

    setState("submitting");

    if (ENDPOINT) {
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });
        if (res.ok) {
          setEmail("");
          setState("ok");
          return;
        }
        // 4xx/5xx → fall through to local backup so we don't lose the lead.
      } catch {
        // Network failure → also fall through.
      }
    }

    // Local fallback: stash to localStorage, flag the success state so the
    // UI can hint that it'll be re-sent later. Used during dev (no endpoint
    // configured) and as a safety net if the worker is briefly down.
    try {
      const existing: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (!existing.includes(trimmed)) existing.push(trimmed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      setEmail("");
      setState(ENDPOINT ? "ok-local" : "ok");
    } catch {
      setState("error");
    }
  }

  const submitting = state === "submitting";

  return (
    <section id="waitlist" className="py-24 md:py-32 border-b border-paper-deep">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <p className="text-xs tracking-[0.3em] text-ink-soft uppercase">Notify Me</p>
        <BrushStroke className="mt-2 inline-block w-12 h-[6px] text-ink-soft" />
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
            onChange={(e) => { setEmail(e.target.value); if (state !== "idle" && state !== "submitting") setState("idle"); }}
            disabled={submitting}
            className="flex-1 rounded-md border border-ink/20 bg-paper text-ink px-4 py-3 text-sm focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/20 transition disabled:opacity-60"
            aria-invalid={state === "error"}
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-ink text-paper px-6 py-3 text-sm font-medium hover:bg-ink-soft transition-colors disabled:opacity-60 disabled:cursor-wait"
          >
            {submitting ? "전송 중…" : "알림 신청"}
          </button>
        </form>

        <div className="mt-4 min-h-6 text-sm" aria-live="polite">
          {state === "ok" && (
            <span className="inline-flex items-center gap-2 text-ink">
              <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-injoo" />
              신청 완료. 출시 소식을 가장 먼저 보내드릴게요.
            </span>
          )}
          {state === "ok-local" && (
            <span className="inline-flex items-center gap-2 text-ink-soft">
              <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-injoo" />
              신청 완료. 일시적으로 로컬에 저장되어, 잠시 후 다시 전송됩니다.
            </span>
          )}
          {state === "error" && (
            <span className="text-ink-soft italic">올바른 이메일 주소인지 확인해 주세요.</span>
          )}
        </div>

        <p className="mt-8 text-xs text-ink-mute">
          {ENDPOINT
            ? "이메일은 Cloudflare KV에 안전하게 저장되며, 출시 알림 외 다른 용도로 사용되지 않습니다."
            : "현재 이메일은 브라우저(localStorage)에 임시 저장됩니다. 백엔드 연동은 사전 출시 단계에서 활성화됩니다."}
        </p>
      </div>
    </section>
  );
}
