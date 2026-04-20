# Capital Circle — Sub-Agenten-Pakete

Diese Dateien sind eigenständige Cursor-Prompts für je einen Sub-Agenten.
Jeder Prompt enthält: Mission, Cross-Cutting-Regeln, exakte Dateilisten, Code-Snippets und Acceptance-Criteria.

## Verbindliche Source-of-Truth

**Vor dem Start jedes Pakets lesen:** [`../implementation-notes.md`](../implementation-notes.md)

## Wellen-Reihenfolge

```
Welle A (allein):
  └── Paket 0 — Foundation (DONE: docs, deps, vercel.json, .env.example)

Welle B (parallel, nach A):
  ├── Paket 1 — DB-Migrations
  └── Paket 2 — Email-Infrastruktur

Welle C (parallel, nach B):
  ├── Paket 3 — Free-Funnel + Bewerber-Review
  └── Paket 4 — Stripe-Backend

Welle D (parallel, nach C):
  ├── Paket 5 — Pricing + Checkout + Billing UI
  ├── Paket 6 — Churn-Prevention
  └── Paket 7 — High-Ticket Bewerbung

Welle E (allein, nach D):
  └── Paket 8 — Admin-Analytics & Polishing
```

## Dateien

| Datei | Paket | Welle |
|-------|-------|-------|
| [paket-1-db-migrations.md](paket-1-db-migrations.md) | DB-Migrations 041–045, RLS, Types | B |
| [paket-2-email-infrastruktur.md](paket-2-email-infrastruktur.md) | React-Email Layout, 15 Templates, Unsubscribe | B |
| [paket-3-free-funnel-bewerber-review.md](paket-3-free-funnel-bewerber-review.md) | /free, Admin-Review, Cron | C |
| [paket-4-stripe-backend.md](paket-4-stripe-backend.md) | Stripe API, Webhooks, Access-Control | C |
| [paket-5-pricing-checkout-ui.md](paket-5-pricing-checkout-ui.md) | Pricing-Seite, Checkout, Billing | D |
| [paket-6-churn-prevention.md](paket-6-churn-prevention.md) | 4 Crons, Login-Tracking, Survey | D |
| [paket-7-high-ticket-bewerbung.md](paket-7-high-ticket-bewerbung.md) | /apply Multi-Step, Thanks-Pages, Admin-HT | D |
| [paket-8-admin-analytics.md](paket-8-admin-analytics.md) | Analytics-Dashboard, Resend-Webhook, Tier-Override | E |

## Cross-Cutting-Regeln (für jeden Agenten)

1. **Stack:** Next.js 16.2.1, React 19.2.4, Chakra UI v2, Supabase SSR. Middleware = `proxy.ts`
2. **Design:** Gold `#D4AF37`, aus `DESIGN.json`. **Niemals Blau** (deprecated Alias)
3. **Tabelle:** `profiles` (nicht `users`). Admin via `requireAdmin()` aus `lib/supabase/admin-auth.ts`
4. **Hosting:** Vercel — Cron via `vercel.json`, Webhooks mit `export const runtime = 'nodejs'`
5. **DSGVO:** Jede Email mit Unsubscribe-Link, öffentliche Forms mit Turnstile + Rate-Limit
6. **Idempotenz:** Webhooks + Crons müssen doppelt getriggert werden ohne Schaden
7. **Commit-Format:** `feat(paketN): kurzbeschreibung`

## Wichtige Korrekturen vs. Master-Prompt

| Master-Prompt sagt | Tatsächlich |
|--------------------|-------------|
| Next.js 14+ | Next.js 16.2.1 |
| `middleware.ts` | `proxy.ts` (Repo-Root) |
| Hetzner CX22 + Coolify | Vercel (App-Hosting) |
| Hetzner Cron | Vercel Cron Jobs (`vercel.json`) |
| „minimal blau" | Gold `#D4AF37` (DESIGN.json) |
| `<USER_TABLE>` / `users` | `profiles` |
| neues `role`-Enum | `is_admin` (bool) + `is_paid` (bool) bleiben, nur 2 neue Spalten |
| `@react-email/components` | deprecated → `@react-email/render` + eigene Komponenten |
| Mux / Cloudflare Stream | HTML5 `<video>` mit Hetzner-S3 MP4 |
| `2025-02-24.acacia` Stripe API | aktuelle Version aus `stripe@22` |
| `(app)` Route-Group | `(platform)` Route-Group |
