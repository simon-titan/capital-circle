# Implementation Notes — Capital Circle Full Funnel

> Erstellt: 2026-04-20 | Quelle: IST-Stand-Analyse + Master-Prompt-Review
> Diese Datei ist die **verbindliche Source-of-Truth** für alle Sub-Agenten-Pakete.
> Bei Widerspruch zwischen `cursor_prompt_capital_circle_master.md` und dieser Datei
> gilt **diese Datei**.

---

## 1. Stack & Versionen (IST)

| Paket | Version | Hinweis |
|-------|---------|---------|
| Next.js | **16.2.1** | Prompt sagt fälschlich „14+" |
| React | **19.2.4** | |
| Chakra UI | **v2** (`@chakra-ui/react ^2.10.9`) | NICHT v3 |
| Supabase JS | `@supabase/supabase-js` + `@supabase/ssr` | SSR-Client vorhanden |
| resend | **^6.10.0** | bereits installiert |
| stripe | **^22.0.2** | ab 2026-04-20 neu installiert |
| @stripe/stripe-js | **^9.2.0** | neu |
| @stripe/react-stripe-js | **^6.2.0** | neu |
| @react-email/render | **^2.0.7** | neu (`@react-email/components` deprecated → react-email nutzen) |
| react-email | aktuell | neu (CLI + Komponenten) |

**Middleware-Datei:** `proxy.ts` (Repo-Root) — in Next.js 16 heißt die Datei `middleware.ts` 
aber dieses Projekt nutzt `proxy.ts` mit manuellem Export. **Alle Auth-Redirects hier anpassen.**

---

## 2. Hosting (IST)

- **App:** **Vercel** (kein Dockerfile, kein Coolify, kein PM2 vorhanden)
- **Object-Storage:** Hetzner S3-kompatibel (Presigned PUT via `app/api/admin/presign-upload/`)
- **Cron Jobs:** → **Vercel Cron Jobs** via `vercel.json` (Bearer-Auth gegen `CRON_SECRET` bleibt)
- **Webhook-Routes:** müssen `export const runtime = 'nodejs'` haben (raw body für Stripe-Signatur)

**Crontab-Äquivalent in `vercel.json`:**
```json
{
  "crons": [
    { "path": "/api/cron/free-course-sequence",   "schedule": "0 5 * * *" },
    { "path": "/api/cron/check-inactive-users",   "schedule": "0 5 * * *" },
    { "path": "/api/cron/process-dunning",        "schedule": "0 */6 * * *" },
    { "path": "/api/cron/reactivation-offers",    "schedule": "0 6 * * *" },
    { "path": "/api/cron/ht-upsell-60d",          "schedule": "0 7 * * *" }
  ]
}
```

---

## 3. Datenbank (IST)

### 3.1 User-Tabelle

- **Name:** `profiles` (NICHT `users`)
- **Bestehende Admin-Spalte:** `is_admin` (boolean)
- **Bestehende Paid-Spalte:** `is_paid` (boolean)
- **Migrations bisher:** `001_schema.sql` bis `040_learning_seconds_accumulation.sql`
- **Neue Migrationen starten bei:** `041_*`

### 3.2 Schema-Strategie (minimal — vom User bestätigt)

**Kein neues `role`-Enum einführen.**

Stattdessen **nur 2 neue Spalten** in `profiles`:
- `application_status text` → `'pending' | 'approved' | 'rejected' | NULL`
- `membership_tier text` → `'free' | 'monthly' | 'lifetime' | 'ht_1on1'` (DEFAULT `'free'`)

Der bestehende Code, der `is_admin`/`is_paid` liest, **bleibt unverändert funktional**.

**Synchronisierungsregel:** Schreib-Operationen (Approve, Stripe-Webhook, Admin-Override)
müssen BEIDE Felder konsistent halten:
- Approve → `application_status='approved'` + (noch kein membership_tier-Change)
- Stripe `checkout.session.completed` (Lifetime) → `membership_tier='lifetime'` + `is_paid=true`
- Stripe `customer.subscription.created/updated` (active) → `membership_tier='monthly'` + `is_paid=true`
- Stripe `customer.subscription.deleted` → `membership_tier='free'` + `is_paid=false`
- Admin-Override → `membership_tier=X` + `is_paid=(X !== 'free')`

### 3.3 Admin-Prüfung

```ts
// lib/supabase/admin-auth.ts — bereits vorhanden, WIEDERVERWENDEN
import { requireAdmin } from "@/lib/supabase/admin-auth";
```

### 3.4 Access-Control-Logik (Proxy-Erweiterung)

In `proxy.ts` muss die bestehende Profil-Select-Query um neue Spalten erweitert werden:

```ts
.select("codex_accepted,intro_video_watched,usage_agreement_accepted,is_admin,is_paid,application_status,membership_tier,access_until")
```

**Gating-Regeln (nach Onboarding-Check):**
- `application_status = 'pending'` → redirect `/pending-review`
- `is_paid = false` AND `membership_tier = 'free'` → Plattform teilweise zugänglich (free_member)
- `access_until` abgelaufen → redirect `/pricing`

---

## 4. Bestehende Routen & Komponenten

### 4.1 Route-Groups
| Gruppe | Pfad | Status |
|--------|------|--------|
| `(admin)` | `app/(admin)/admin/` | vorhanden |
| `(auth)` | `app/(auth)/` | vorhanden (login, register) |
| `(onboarding)` | `app/(onboarding)/` | vorhanden (einsteig, intro-video) |
| `(platform)` | `app/(platform)/` | vorhanden (dashboard, etc.) |
| `(marketing)` | `app/(marketing)/` | **NEU** — für /free, /apply, /pricing |

**Wichtig:** Im Master-Prompt wird `(app)` als Group-Name erwähnt — im Repo heißt diese Gruppe **`(platform)`**.

### 4.2 Wichtige Bestehende Dateien
| Datei | Zweck |
|-------|-------|
| `proxy.ts` | Auth/Onboarding-Middleware |
| `lib/supabase/admin-auth.ts` | `requireAdmin()` — wiederverwenden |
| `lib/supabase/middleware.ts` | Supabase SSR-Client-Factory |
| `lib/email/welcome-mail.ts` | Bestehende Welcome-Mail (HTML-String) → migrieren |
| `lib/server-data.ts` | `userCanAccessAcademyModule()`, `userCanAccessTradingJournal()` |
| `components/platform/WelcomeCard.tsx` | Hero-Stil-Referenz |
| `components/ui/GlassCard.tsx` | GlassCard-Komponente |

### 4.3 Existierende Admin-Routen
`/admin`, `/admin/mitglieder`, `/admin/kurse`, `/admin/events`, `/admin/discord`,
`/admin/hausaufgaben`, `/admin/live-sessions`, `/admin/quiz`, `/admin/analysis`, `/admin/arsenal`

---

## 5. Design-System (verbindlich)

**Single Source of Truth:** `DESIGN.json` + `HERO-UI-SPEZIFIKATION.md`

| Farbe | Token | Hex |
|-------|-------|-----|
| Primär-Hintergrund | `--color-bg-primary` | `#07080A` |
| Akzent (einziger Farbakzent) | `--color-accent` | `#D4AF37` (Gold) |
| Text primär | `--color-text-primary` | `#F0F0F2` |
| Text sekundär | `--color-text-secondary` | `#9A9AA4` |

**⚠️ Master-Prompt-Header sagt „minimal blau" — das ist VERALTET.**
Alle neuen UI-Komponenten nutzen **Gold** als Akzentfarbe.
`--color-accent-blue` in `globals.css` ist ein Legacy-Alias auf `#D4AF37` — niemals direkt nutzen.

**Fonts:**
- Überschriften: `'Radley', serif` (class: `.radley-regular`)
- UI/Text: `'Inter', sans-serif` (class: `.inter`)
- Zahlen/Preise: `'JetBrains Mono', monospace` (class: `.jetbrains-mono`)

**Glassmorphism (für Cards/Modals):**
```css
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(16px);
border: 1px solid rgba(255, 255, 255, 0.09);
box-shadow: 0 8px 32px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.07);
border-radius: 16px;
```

---

## 6. Email-Infrastruktur

- **Provider:** Resend (API-Key via `RESEND_API_KEY`)
- **Entry-Point (bestehend):** `lib/email/welcome-mail.ts` (HTML-String) → wird zu React-Email migriert
- **Neue Templates:** unter `lib/email/templates/` mit `@react-email/render`
- **React-Email deprecated Packages:** `@react-email/components` ist deprecated.
  Stattdessen: eigene Komponenten + `@react-email/render` für das Rendering.
  Alternativ: direktes JSX-Rendering via `render()` aus `@react-email/render`.

---

## 7. Captcha & Rate-Limiting

- **Provider:** **Cloudflare Turnstile** (DSGVO-konform, kostenlos)
  - Server-Side-Key: `TURNSTILE_SECRET_KEY`
  - Client-Side-Key: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- **Rate-Limiting:** Für MVP — einfaches In-Memory-Map oder Supabase-Pre-Check (1 Bewerbung / Email).
  Wenn verfügbar: Upstash Redis (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).

---

## 8. Stripe API-Version

Prompt nennt `2025-02-24.acacia` — das ist veraltet.
**→ Immer die aktuell von `stripe@latest` vorgeschlagene Version übernehmen** (steht in `lib/stripe/server.ts` als Kommentar-Hinweis).

---

## 9. Offene Fragen (beim jeweiligen Paket zu klären)

| Frage | Paket |
|-------|-------|
| `/einsteig` bestehender Flow vs. neuer `/free` Flow — beide parallel halten? | P3 |
| Slack-Workspace für Notifications vorhanden? Alternativ: Admin-Panel-Flag | P6, P7 |
| Welche 8 Fragen für HT-Bewerbung? (Platzhalter in `config/ht-questions.ts`) | P7 |
| Resend-Webhook-Signing-Secret vorhanden? | P8 |
