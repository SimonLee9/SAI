# services/waitlist

Cloudflare Worker that accepts pre-launch waitlist signups from `web-landing/` and stores them in a KV namespace. Single POST endpoint, CORS-locked to the landing origin, ~120 lines.

## API

```
POST  /
Origin: <ALLOWED_ORIGIN>
Content-Type: application/json

{ "email": "you@example.com" }
```

Responses (always JSON):

| Status | Body                                | 의미                           |
|--------|-------------------------------------|--------------------------------|
| 200    | `{ ok: true, duplicate: false }`    | 신규 등록                       |
| 200    | `{ ok: true, duplicate: true }`     | 이미 등록됨 (status는 동일하게 200) |
| 400    | `{ error: "invalid_email" }` 등     | 클라이언트 오류                 |
| 405    | `{ error: "method_not_allowed" }`   | POST 외                         |

저장 형식 (KV): `email:<lowercased>` → `{ email, createdAt, ip, ua }`.

## First-time setup

```bash
cd services/waitlist
npm install

# 1) Create the KV namespace (production + preview).
npx wrangler kv namespace create WAITLIST_KV
npx wrangler kv namespace create WAITLIST_KV --preview

# 2) Paste the returned id / preview_id into wrangler.toml — both at the
#    top level (preview/dev) and under [env.production] (deploy target).

# 3) Edit wrangler.toml: set [env.production.vars].ALLOWED_ORIGIN to the
#    real landing origin (e.g. https://sai-landing.pages.dev or your
#    custom domain).

# 4) Login + first deploy.
npx wrangler login
npm run deploy
```

After deploy you'll get a URL like `https://sai-waitlist.<account>.workers.dev`. Use that as `VITE_WAITLIST_ENDPOINT` in `web-landing/` (see `web-landing/.env.example`).

## Local development

```bash
npm run dev          # starts wrangler dev on http://localhost:8787
```

In a separate shell, set `VITE_WAITLIST_ENDPOINT=http://localhost:8787` in `web-landing/.env.local` and run `npm run dev` there. The default `ALLOWED_ORIGIN` in `wrangler.toml` already allows `http://localhost:5174`.

## Operations

```bash
npm run kv:list      # list all stored keys (production)
npm run kv:export    # dump to waitlist-keys.json (gitignored)
npm run tail         # live worker log stream
```

To read a single record: `npx wrangler kv key get --binding WAITLIST_KV --env production --remote "email:foo@bar.com"`.

## Limits & notes

- Email length capped at 254 chars (RFC 5321).
- Duplicates return 200 + `duplicate: true` — front end shows the same success UI either way (don't leak whether an address is registered).
- `CF-Connecting-IP` is captured for abuse triage; consider stripping before any public export.
- KV reads are eventually consistent (~60 s). For an admin dashboard reading right after writes, expect mild lag.
- No rate limiting yet. If abuse appears, add Cloudflare Turnstile to the form OR use Workers' `[[unsafe.bindings]]` + Durable Object for per-IP counters.
