/**
 * S.A.I — Waitlist Worker
 *
 * Single endpoint for `web-landing/`'s pre-launch email signup form.
 * Stores `{ email, createdAt, ip }` in a Cloudflare KV namespace.
 *
 * Routes:
 *   OPTIONS *      → CORS preflight
 *   POST    /      → submit { email: string }
 *
 * Responses (always JSON):
 *   200 { ok: true, duplicate: boolean }   — accepted (or already on the list)
 *   400 { error: "invalid_email" | ... }   — client error
 *   405 { error: "method_not_allowed" }    — wrong verb
 *
 * The duplicate case still returns 200 so an attacker can't enumerate
 * registered addresses by status code; the front end shows the same
 * "감사합니다" message either way.
 */

export interface Env {
  WAITLIST_KV: KVNamespace;
  // Origin allowed by CORS. Set per-environment in wrangler.toml. Use "*"
  // only for local development.
  ALLOWED_ORIGIN: string;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EMAIL_MAX = 254; // RFC 5321 SMTP path limit

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(env.ALLOWED_ORIGIN, req);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (req.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405, cors);
    }

    let email: string;
    try {
      const body = (await req.json()) as { email?: unknown };
      if (typeof body.email !== "string") {
        return json({ error: "missing_email" }, 400, cors);
      }
      email = body.email.trim().toLowerCase();
    } catch {
      return json({ error: "bad_json" }, 400, cors);
    }

    if (!EMAIL_RE.test(email) || email.length > EMAIL_MAX) {
      return json({ error: "invalid_email" }, 400, cors);
    }

    const key = `email:${email}`;
    const existing = await env.WAITLIST_KV.get(key);
    if (existing) {
      return json({ ok: true, duplicate: true }, 200, cors);
    }

    const record = JSON.stringify({
      email,
      createdAt: new Date().toISOString(),
      ip: req.headers.get("CF-Connecting-IP") ?? "",
      ua: req.headers.get("User-Agent") ?? "",
    });
    await env.WAITLIST_KV.put(key, record);

    return json({ ok: true, duplicate: false }, 200, cors);
  },
} satisfies ExportedHandler<Env>;

function json(body: unknown, status: number, cors: HeadersInit): Response {
  const headers = new Headers(cors);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

function corsHeaders(allowedOrigin: string, req: Request): Headers {
  const origin = req.headers.get("Origin") ?? "";
  const h = new Headers();
  // Only echo Origin when it matches; default to no-CORS otherwise.
  if (allowedOrigin === "*" || origin === allowedOrigin) {
    h.set("Access-Control-Allow-Origin", allowedOrigin === "*" ? "*" : origin);
    h.set("Vary", "Origin");
  }
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type");
  h.set("Access-Control-Max-Age", "86400");
  return h;
}
