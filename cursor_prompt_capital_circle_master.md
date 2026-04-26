# Cursor Master-Prompt — Capital Circle Full Funnel Implementation

> **Kontext:** Plattform in Next.js 14+ (App Router) + Supabase läuft bereits. Discord OAuth, Onboarding-Flow, Kurs-System, existierendes Admin-Panel sind vorhanden. **Payments, Bewerber-Review, Email-Sequenzen, Pricing-Seite, Churn-Prevention fehlen komplett** — das wird jetzt alles neu gebaut.
>
> **Stack-Entscheidungen:**
> - **Checkout:** Stripe Embedded Checkout (inline, kein Redirect).
> - **Email:** Resend (EU-Region, React-Email-Templates, DSGVO-konform).
> - **High-Ticket (3.000 €):** KEIN Stripe — Weiterleitung zu Calendly + dedizierte Bewerbungsseite.
> - **Deployment:** Hetzner CX22 + Coolify/PM2 + Nginx.
> - **UI-Stil:** Glassmorphism (schwarz/weiß/minimal blau), Typografie Radley / DM Sans / JetBrains Mono.
>
> **Arbeitsweise:** Dieser Prompt ist in **5 Phasen** strukturiert. Arbeite Phase für Phase ab, **committe am Ende jeder Phase**, und führe die Acceptance-Checks jeder Phase durch, bevor die nächste beginnt. **Nicht alle 5 Phasen in einem Rutsch durchziehen** — nach jeder Phase Stopp für manuelles Testing.

---

## 📋 SCHRITT 0 — Ist-Stand-Analyse (MUSS vor Phase 1)

Cursor führt zuerst aus und **dokumentiert die Ergebnisse kommentiert** in einer Datei `docs/implementation-notes.md`:

```bash
git grep -l "bewerb\|applicat\|applicants\|signup\|registration" -- 'app/**' 'lib/**' 'components/**' 'supabase/**'
git grep -l "admin\|isAdmin\|is_admin" -- 'app/**' 'lib/**'
git grep -l "resend\|sendgrid\|postmark\|nodemailer" -- 'app/**' 'lib/**' 'package.json'
git grep -l "stripe" -- 'app/**' 'lib/**' 'package.json'
git grep "from('profiles'\|from(\"profiles\"\|from('users'\|from(\"users\"" -rn
```

Danach klären:
- Wie heißt die User-Tabelle? (`profiles` oder `users`?) → Platzhalter `<USER_TABLE>` im Prompt entsprechend ersetzen.
- Wie wird `isAdmin` geprüft? → Existierende Logik wiederverwenden, nicht neu bauen.
- Gibt es schon eine E-Mail-Integration? → Falls ja, wiederverwenden; falls nein, Resend neu einrichten.

**Keine Änderungen vornehmen, bevor die `implementation-notes.md` existiert und die Fragen beantwortet sind.**

---

# 🌊 PHASE 1 — Free-Funnel & Bewerber-Review (Foundation)

**Ziel der Phase:** Ein Interessent kann sich registrieren, die 3 Pflichtfragen beantworten, ein Admin sieht die Bewerbung im neu gebauten Panel, kann sie annehmen oder ablehnen, und bekommt die richtige Email zugestellt. **Kein Stripe, kein Pricing.**

## 1.1 DB-Migration `phase1_funnel_review.sql`

```sql
alter table public.<USER_TABLE>
  add column if not exists last_login_at timestamptz,
  add column if not exists role text not null default 'visitor';
  -- role: 'visitor' | 'free_applicant_pending' | 'free_member' | 'paid_member' | 'admin'

create type public.application_status as enum ('pending', 'approved', 'rejected');

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.<USER_TABLE>(id) on delete cascade,
  email text not null,
  name text,

  -- 3 Pflichtfragen laut Funnel-SVG
  experience text not null,
  biggest_problem text not null,
  goal_6_months text not null,

  status public.application_status not null default 'pending',

  reviewed_at timestamptz,
  reviewed_by uuid references public.<USER_TABLE>(id) on delete set null,
  rejection_reason text,               -- NUR intern, nicht im Email-Body
  welcome_sequence_started_at timestamptz,

  ip_address inet,
  user_agent text,

  created_at timestamptz not null default now()
);

create index applications_status_idx on public.applications(status);
create index applications_email_idx on public.applications(email);
create index applications_created_at_idx on public.applications(created_at desc);

create table if not exists public.email_sequence_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.<USER_TABLE>(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  recipient_email text not null,
  sequence text not null,
  step integer not null default 0,
  sent_at timestamptz not null default now(),
  resend_message_id text,
  opened_at timestamptz,
  clicked_at timestamptz,
  unique (recipient_email, sequence, step)
);

create index email_seq_user_idx on public.email_sequence_log(user_id);
create index email_seq_sequence_idx on public.email_sequence_log(sequence, step);

alter table public.applications enable row level security;
alter table public.email_sequence_log enable row level security;

create policy "Users read own applications" on public.applications
  for select using (auth.uid() = user_id);
-- Admin-Policies über existierende isAdmin-Logik wiederverwenden
```

## 1.2 Registrierungs-Flow

### Route `app/(marketing)/free/page.tsx` — EINGANG FREE KURS

Single-Page-Form mit drei Sektionen (progressive disclosure):

**Sektion 1 — Account:** Name, Email, Passwort → `supabase.auth.signUp()` → Email-Verify.
**Sektion 2 — 3 Pflichtfragen:**
- "Wie viel Erfahrung hast du im Trading?" (Textarea, min 30 Zeichen)
- "Was ist aktuell dein größtes Problem?" (min 50 Zeichen)
- "Was willst du in den nächsten 6 Monaten erreichen?" (min 50 Zeichen)
- Submit → `POST /api/applications/create` → `status='pending'`, `role='free_applicant_pending'`.

**Sektion 3 — Thank-You:** "Wir prüfen innerhalb 24–48h, du hörst von uns per Email." Kein Plattform-Zugang vor Approve.

### API `app/api/applications/create/route.ts`

- Auth-Check, eingeloggter User.
- Rate-Limit: max 1 pro Email (DB-Unique oder Pre-Check).
- Validierung aller 3 Fragen + Mindestlängen.
- Insert in `applications`, Update `role='free_applicant_pending'`.
- IP + User-Agent mitloggen (Anti-Spam).
- **KEINE Email versenden** — das macht erst der Admin-Approve.
- Response: `{ ok: true, applicationId }`.

## 1.3 Admin-Panel für Bewerber-Review (komplett neu)

### Route `app/(admin)/admin/applications/page.tsx`

**Gate:** Existierende `isAdmin()`-Logik prüfen, non-Admin → 404.

**UI-Struktur:**

```
┌─────────────────────────────────────────────────────────┐
│  Bewerbungen                                            │
│  [Pending 12] [Approved 45] [Rejected 8] [All]          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 🟡 Max Mustermann · max@example.com · vor 2h    │    │
│  │ Erfahrung: 2 Jahre Daytrading, meist mit Indize…│    │
│  │ Problem: Verliere Disziplin bei großen Trades   │    │
│  │ Ziel: Konsistent 5% Monatsrendite schaffen      │    │
│  │                       [ ✓ Annehmen ] [ ✗ Ablehnen ] │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Komponenten:**
- Tabs mit Counter: Pending (Default) / Approved / Rejected / All.
- Expandable Cards: zugeklappt = Name/Email/Datum; aufgeklappt = 3 Antworten voll.
- Zwei Buttons pro pending Card:
  - **✓ Annehmen** (grün Primary) → direkte POST.
  - **✗ Ablehnen** (rot Ghost) → öffnet Modal mit optionalem Grund-Feld (intern, nicht im Email-Body).
- Approved/Rejected Cards: Buttons ausgeblendet, stattdessen Badge "✓ Angenommen am X durch Y".
- Filter: Email-Suche, Datum-Range.
- **Kein Bulk-Review** im MVP — jede Bewerbung bewusst einzeln.

### API `app/api/admin/applications/[id]/approve/route.ts`

```
- isAdmin-Check
- Transaction:
  1. UPDATE applications SET status='approved', reviewed_at=now(),
     reviewed_by=auth.uid(), welcome_sequence_started_at=now()
     WHERE id=$1 AND status='pending'
  2. Wenn 0 rows → 409 Conflict
  3. UPDATE <USER_TABLE> SET role='free_member' WHERE id=application.user_id
- Nach Commit (async):
  - Resend: welcome-free-course.tsx
  - email_sequence_log: step=0, sequence='free_course_welcome'
- Response: { ok: true }
```

### API `app/api/admin/applications/[id]/reject/route.ts`

```
- isAdmin-Check
- Body: { reason?: string }  // intern
- UPDATE applications SET status='rejected', reviewed_at=now(),
  reviewed_by=auth.uid(), rejection_reason=reason WHERE id=$1 AND status='pending'
- 0 rows → 409
- Nach Commit:
  - Resend: application-rejected.tsx  (höflich, OHNE Grund im Body)
  - email_sequence_log: step=0, sequence='application_rejected'
- Response: { ok: true }
```

**Beide Routen idempotent.** Doppel-Click = 409, nie zweite Mail.

## 1.4 Resend Setup

### `lib/email/resend.ts`

```ts
import { Resend } from 'resend';
if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY missing');
export const resend = new Resend(process.env.RESEND_API_KEY);
export const FROM = `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`;
```

### Templates (React-Email) `lib/email/templates/`

Einheitliches Layout: schwarzer BG `#0a0a0a`, weißer Text, blauer Akzent, Radley/DM Sans, Footer mit **Unsubscribe-Link + Impressum** (DSGVO).

**Phase-1-Templates:**

| Datei | Trigger | Inhalt |
|---|---|---|
| `welcome-free-course.tsx` | Admin "Annehmen" | Willkommen + Login-Link + erste Schritte |
| `application-rejected.tsx` | Admin "Ablehnen" | Höflich, kein Grund, "Gern später erneut bewerben" |
| `free-course-day-1.tsx` | Cron Tag 1 | Content |
| `free-course-day-2.tsx` | Cron Tag 2 | Content |
| `free-course-day-3.tsx` | Cron Tag 3 | Content |
| `free-course-day-5.tsx` | Cron Tag 5 | Soft-Pitch → `/pricing` |

Content der 5 Mails: Platzhalter-Copy mit `{{firstName}}` und klarer Struktur (Hook / Value / CTA), Emre ersetzt später nur Text.

## 1.5 Cron-Endpoint für 5-Tage-Sequenz

### `app/api/cron/free-course-sequence/route.ts`

```
- Bearer-Check: Authorization: Bearer $CRON_SECRET
- Für jeden step in [1, 2, 3, 5]:
    - SELECT approved applications WHERE welcome_sequence_started_at + interval '{step} days' < now()
      AND NOT EXISTS (email_sequence_log WHERE recipient_email=a.email
                        AND sequence='free_course_welcome' AND step={step})
    - Pro Treffer: Resend senden, email_sequence_log einfügen (UNIQUE verhindert Doppel)
- Response: { sent: { step1: X, step2: Y, step3: Z, step5: W } }
```

**Crontab:**
```
0 5 * * *  curl -sf -H "Authorization: Bearer $CRON_SECRET" https://app.capitalcircle.xx/api/cron/free-course-sequence
```

## 1.6 Plattform-Zugang nach Role

- `visitor` → nur `/`, `/free`, `/apply`, `/pricing` zugänglich.
- `free_applicant_pending` → Login möglich, aber nur `/pending-review` (Wartehinweis), kein Dashboard.
- `free_member` → abgespeckte Plattform: Daily Bias + Live-Banner + Module gelockt mit Overlay "Upgrade auf Paid" → `/pricing`.
- `paid_member` → volle Plattform (existierende Logik).

## 1.7 Acceptance Criteria Phase 1

1. Neuer User via `/free` → Account erstellt, `role='visitor'`, keine Email außer Supabase-Verify.
2. User beantwortet 3 Fragen → `applications.status='pending'`, `role='free_applicant_pending'`.
3. User ohne Review loggt ein → `/pending-review`-Seite, kein Dashboard.
4. Admin sieht Application im Panel Tab "Pending".
5. Admin klickt "Annehmen" → Welcome-Mail < 30s, User `role='free_member'`, Application `approved`.
6. Doppel-Click "Annehmen" → 409, keine zweite Mail.
7. Admin klickt "Ablehnen" mit Grund → Rejection-Mail kommt (Grund **nicht** im Body), Application `rejected`.
8. Cron `free-course-sequence` → Mail 1/2/3/5 nur an User mit passendem Intervall, UNIQUE verhindert Dopplungen.
9. Unsubscribe-Link funktioniert (setzt `<USER_TABLE>.unsubscribed_at`, Cron prüft Feld).
10. Non-Admin auf `/admin/applications` → 404.

**✅ Commit Phase 1, manuell testen, dann Phase 2.**

---

# 💳 PHASE 2 — Stripe & Pricing-Seite

**Ziel:** Free-Member kann auf `/pricing` zwischen Monthly und Lifetime wählen, Stripe Embedded Checkout durchlaufen, und landet als Paid-Member auf der Plattform. High-Ticket-Button leitet zu Calendly.

## 2.1 Stripe-Setup

| Produkt | Preis | Typ | ENV |
|---|---|---|---|
| Capital Circle Monthly | 97 € / Monat | recurring | `STRIPE_PRICE_MONTHLY` |
| Capital Circle Lifetime | 699 € einmalig | one_time | `STRIPE_PRICE_LIFETIME` |

HT 3.000 € = kein Stripe-Produkt, Flow: Calendly → Closer Call → manuelle Invoice → Admin setzt `membership_tier='ht_1on1'` + `role='paid_member'`.

Currency EUR, Stripe Tax aktiv, automatische Rechnungen an.

## 2.2 DB-Migration `phase2_stripe.sql`

```sql
create type public.membership_tier as enum ('free', 'monthly', 'lifetime', 'ht_1on1');
create type public.subscription_status as enum (
  'active', 'trialing', 'past_due', 'canceled', 'incomplete',
  'incomplete_expired', 'unpaid', 'paused'
);

alter table public.<USER_TABLE>
  add column if not exists stripe_customer_id text unique,
  add column if not exists membership_tier public.membership_tier not null default 'free',
  add column if not exists access_until timestamptz,
  add column if not exists lifetime_purchased_at timestamptz;

create index <USER_TABLE>_stripe_customer_id_idx on public.<USER_TABLE>(stripe_customer_id);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.<USER_TABLE>(id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,
  stripe_price_id text not null,
  status public.subscription_status not null,
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions(user_id);
create index subscriptions_status_idx on public.subscriptions(status);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.<USER_TABLE>(id) on delete set null,
  stripe_payment_intent_id text unique,
  stripe_invoice_id text unique,
  stripe_charge_id text,
  amount_cents integer not null,
  currency text not null default 'eur',
  status text not null,
  failure_reason text,
  attempt_count integer default 1,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index payments_user_id_idx on public.payments(user_id);

create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  received_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.stripe_webhook_events enable row level security;

create policy "Users read own subs" on public.subscriptions for select using (auth.uid() = user_id);
create policy "Users read own payments" on public.payments for select using (auth.uid() = user_id);

create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();
```

## 2.3 Stripe-Client & Checkout-Session

### `lib/stripe/server.ts`

```ts
import Stripe from 'stripe';
if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY missing');
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
  appInfo: { name: 'Capital Circle', version: '1.0.0' },
});
```

### API `app/api/stripe/create-checkout-session/route.ts`

```
- Auth-Check
- Body: { plan: 'monthly' | 'lifetime' }
- Falls stripe_customer_id fehlt → stripe.customers.create({ email, metadata: { user_id } }) → speichern
- stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    mode: plan === 'monthly' ? 'subscription' : 'payment',
    customer: stripeCustomerId,
    line_items: [{ price: ENV[price_id_for_plan], quantity: 1 }],
    return_url: ${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID},
    automatic_tax: { enabled: true },
    allow_promotion_codes: true,
    metadata: { user_id, plan }
  })
- Response: { clientSecret }
```

## 2.4 Pricing-Seite `app/(marketing)/pricing/page.tsx`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│                   HEADLINE / TAGLINE                    │
│              (Radley, ~48px, weiß)                      │
│                                                         │
│         ┌────────────────────────────────────┐          │
│         │        SALES VIDEO (16:9)          │          │
│         │   Mux / Cloudflare Stream          │          │
│         │   autoplay muted + Poster          │          │
│         └────────────────────────────────────┘          │
│                                                         │
│   ┌──────────────────┐    ┌──────────────────┐          │
│   │                  │    │ ⭐ BELIEBTESTE   │          │
│   │    MONATLICH     │    │                  │          │
│   │      97 €        │    │     LIFETIME     │          │
│   │    pro Monat     │    │     699 €        │          │
│   │                  │    │    einmalig      │          │
│   │  ✓ Feature 1     │    │  ✓ Alles aus     │          │
│   │  ✓ Feature 2     │    │    Monatlich     │          │
│   │                  │    │  ✓ Lebenslanger  │          │
│   │ [ Jetzt starten ]│    │    Zugang        │          │
│   │                  │    │  ✓ Spare 465 €   │          │
│   │                  │    │[ Lifetime sichern]│          │
│   └──────────────────┘    └──────────────────┘          │
│                                                         │
│          ─── oder ───                                   │
│                                                         │
│     Du willst 1:1-Betreuung von Emre persönlich?        │
│     [ Kostenloses Strategie-Gespräch buchen → ]         │
└─────────────────────────────────────────────────────────┘
```

**Card-Details:**

- Beide: `backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8`, gleiche Höhe via flex.
- **Lifetime hervorgehoben:**
  - Badge `absolute -top-3 left-1/2 -translate-x-1/2`, "⭐ BELIEBTESTE WAHL", JetBrains Mono, uppercase, blauer BG.
  - `border-2 border-blue-400/40`.
  - `shadow-[0_0_60px_rgba(59,130,246,0.15)]`.
  - `md:scale-105`.
  - Primary-Button (solid blau); Monthly = Ghost (outlined).
  - "Spare 465 € im 1. Jahr" als prominente Subline.

**Click-Verhalten:**
- → `POST /api/stripe/create-checkout-session`
- Nicht eingeloggt → `/login?next=/pricing&plan=<plan>` → nach Login direkt Checkout.
- Mit aktivem Monthly → Monthly-Button disabled "Dein aktueller Plan", Lifetime klickbar (Upgrade).
- Mit Lifetime → beide disabled "Du hast Lifetime ⚡".

**High-Ticket-CTA:**
- Trenner "─── oder ───"
- Copy: "Du willst 1:1-Betreuung von Emre persönlich? Buch dir ein kostenloses Strategie-Gespräch."
- Ghost-Button → `NEXT_PUBLIC_CALENDLY_URL` in **neuem Tab** (`target="_blank" rel="noopener"`).
- **Kein Embed.**

**Video:** Mux oder Cloudflare Stream, **NICHT YouTube**. `NEXT_PUBLIC_PRICING_VIDEO_URL`. 16:9, `max-w-3xl`, `rounded-2xl overflow-hidden`.

**Responsive <768px:** Cards untereinander, Lifetime zuerst (oben), scale weg.

## 2.5 Embedded Checkout

### `app/(app)/checkout/page.tsx`

```tsx
'use client';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// fetch clientSecret aus ?plan=
// <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
//   <EmbeddedCheckout />
// </EmbeddedCheckoutProvider>
```

Glassmorphism-Container drumrum, kein Übermalen des Iframes.

### `app/(app)/checkout/success/page.tsx`

- Server Component, liest `session_id`.
- `stripe.checkout.sessions.retrieve(sessionId)` für Anzeige.
- Polling alle 2s auf `<USER_TABLE>.membership_tier != 'free'` (Webhook-verarbeitet).
- Nach max 20s → Redirect `/dashboard` oder Fehlerhinweis.

## 2.6 Stripe Webhook

### `app/api/stripe/webhook/route.ts`

```ts
export const runtime = 'nodejs';  // KEIN edge — raw body
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const sig = (await headers()).get('stripe-signature');
  if (!sig) return new Response('No signature', { status: 400 });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return new Response(`Signature failed: ${(err as Error).message}`, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from('stripe_webhook_events')
    .select('id, processed_at').eq('id', event.id).maybeSingle();
  if (existing?.processed_at) return new Response('already processed', { status: 200 });

  await supabase.from('stripe_webhook_events').upsert({
    id: event.id, type: event.type, payload: event as any
  });

  try {
    await handleStripeEvent(event, supabase);
    await supabase.from('stripe_webhook_events')
      .update({ processed_at: new Date().toISOString() }).eq('id', event.id);
    return new Response('ok', { status: 200 });
  } catch (err) {
    await supabase.from('stripe_webhook_events')
      .update({ error: (err as Error).message }).eq('id', event.id);
    return new Response('handler error', { status: 500 });
  }
}
```

**Event-Handler** in `lib/stripe/webhooks/handler.ts`:

| Event | Aktion |
|---|---|
| `checkout.session.completed` (mode=payment) | Lifetime: `membership_tier='lifetime'`, `lifetime_purchased_at=now()`, `access_until=null`, `role='paid_member'`. Welcome-Paid-Mail. |
| `checkout.session.completed` (mode=subscription) | No-op (→ subscription-Event handled). |
| `customer.subscription.created/updated` | `subscriptions`-Row upsert. Wenn `status ∈ ('active','trialing')`: `membership_tier='monthly'`, `access_until=current_period_end`, `role='paid_member'`. |
| `customer.subscription.deleted` | `membership_tier='free'`, `access_until=now()`, `role='free_member'`. Cancellation-Survey-Mail. |
| `invoice.paid` | `payments`-Row (succeeded). `access_until = sub.current_period_end`. Reset aller `payment_failed_email_X`. |
| `invoice.payment_failed` | `payments`-Row (failed, attempt_count, failure_reason). **48h Grace:** `access_until = now() + 48h`. Payment-Failed-1-Mail sofort. |
| `customer.subscription.paused` | `membership_tier='free'`, `role='free_member'`. |

## 2.7 Access-Control

### `lib/access-control/has-access.ts`

```ts
export async function hasActivePaidAccess(userId: string) {
  // Lifetime → immer true
  // Monthly → access_until > now()  (deckt: aktive Subs, 48h Grace, cancel_at_period_end)
  // Sonst → false
  return { hasAccess, tier, reason, accessUntil };
}
```

In Middleware einbinden für alle `(app)/`-Routes außer `/pending-review` und `/checkout`.

## 2.8 Billing-Page & Customer Portal

### `app/(app)/billing/page.tsx`
- Aktuelles Abo (Tier, nächste Abbuchung, Betrag).
- `payments`-History letzte 12 Monate mit Stripe-Invoice-PDF-Link.
- Button "Abo verwalten" → `POST /api/stripe/create-portal-session` → Stripe Portal.

Portal-Konfig in Stripe Dashboard:
- Cancellation = "at period end"
- Feedback-Reasons aktivieren
- Pausieren deaktivieren
- Payment-Method-Update aktivieren

## 2.9 ENV-Variablen

```
# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_LIFETIME=price_...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@capitalcircle.xx
RESEND_FROM_NAME=Capital Circle

# Cron
CRON_SECRET=<32+ random chars>

# App
NEXT_PUBLIC_APP_URL=https://app.capitalcircle.xx
NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/emre-capitalcircle/strategiegespraech
NEXT_PUBLIC_PRICING_VIDEO_URL=https://cdn.capitalcircle.xx/pricing-video.mp4
```

## 2.10 Acceptance Criteria Phase 2

11. Monthly: `4242...` → Checkout → Webhook → `subscriptions` + `membership_tier='monthly'` + `access_until` + Welcome-Mail.
12. Lifetime: Test-Karte → `membership_tier='lifetime'`, `access_until=null`.
13. Payment-Failed: `4000 0000 0000 9995` → `access_until = now()+48h` + Mail 1.
14. Cancellation: Portal → Periodenende → `cancel_at_period_end=true`, Zugang bleibt. Nach period_end: `subscription.deleted` → `free` + Umfrage-Mail.
15. Idempotenz: Event 2× → kein Doppel-Write, keine Doppel-Mail.
16. Signatur-Fail: 400.
17. RLS: User A kann Subs/Payments von B nicht lesen.
18. `stripe listen` grün für alle 7 Events.
19. Pricing-UI Desktop: 2 Cards, Lifetime Badge/Border/Glow/scale-105/Savings.
20. Pricing-UI Mobile: untereinander, Lifetime oben.
21. Calendly-CTA: neuer Tab, kein Embed.
22. Bereits-Abo: Monthly → Monthly disabled, Lifetime klickbar. Lifetime → beide disabled.
23. Not-logged-in: Login-Redirect mit `?plan=` → nach Login direkt Checkout.

**✅ Commit Phase 2, End-to-End testen, dann Phase 3.**

---

# 🔁 PHASE 3 — Churn-Prevention (3 Szenarien)

**Ziel:** Die 3 Churn-Szenarien aus dem SVG automatisieren.

## 3.1 DB-Migration `phase3_churn.sql`

```sql
alter table public.<USER_TABLE>
  add column if not exists churn_email_1_sent_at timestamptz,
  add column if not exists churn_email_2_sent_at timestamptz,
  add column if not exists payment_failed_email_1_sent_at timestamptz,
  add column if not exists payment_failed_email_2_sent_at timestamptz,
  add column if not exists payment_failed_email_3_sent_at timestamptz,
  add column if not exists ht_upsell_email_sent_at timestamptz;

create table if not exists public.cancellations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.<USER_TABLE>(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  reason text,
  structured_reason text,  -- 'too_expensive' | 'not_enough_value' | 'tech_issues' | 'other'
  feedback text,
  canceled_at timestamptz not null default now()
);

alter table public.cancellations enable row level security;
create policy "Users read own cancellations" on public.cancellations
  for select using (auth.uid() = user_id);
```

## 3.2 Last-Login-Tracking

In Auth-Middleware: bei jedem authentifizierten Request einmal pro Stunde `last_login_at = now()` updaten (Pre-Check `< now() - 1h` verhindert DB-Spam).

**Login-Reset:** Wenn User sich einloggt und `churn_email_1_sent_at` oder `churn_email_2_sent_at` gesetzt → auf NULL (SVG: "wenn er sich einloggt szenario abgeschlossen").

## 3.3 Szenario 1: Inaktivität 7 / 14 Tage

### Cron `app/api/cron/check-inactive-users/route.ts` (täglich)

```
- Bearer-Check
- Tag 7: paid_members WHERE last_login_at < now() - 7d AND churn_email_1_sent_at IS NULL
  → Mail "Du verpasst gerade …" (spezifisch, aktueller Call-Inhalt + neues Video)
  → churn_email_1_sent_at = now()
- Tag 14: paid_members WHERE last_login_at < now() - 14d AND churn_email_2_sent_at IS NULL
  → Mail "Hey {name}, alles okay bei dir? Wie läuft dein Trading?" (persönlich, kurz, kein Verkauf)
  → churn_email_2_sent_at = now()
- Response: { sent: { tag7: X, tag14: Y } }
```

Templates: `churn-inactive-7d.tsx` (Content muss vom Admin wöchentlich befüllbar sein → Admin-Panel-Feld "Aktuelle Woche Content"), `churn-inactive-14d.tsx`.

## 3.4 Szenario 2: Payment-Failed Dunning

Webhook aus Phase 2 setzt `payment_failed_email_1_sent_at` sofort.

### Cron `app/api/cron/process-dunning/route.ts` (alle 6h)

```
- +24h nach Fail: WHERE payment_failed_email_1_sent_at + 24h < now()
  AND payment_failed_email_2_sent_at IS NULL AND latest sub.status='past_due'
  → Mail 2 "Du verlierst bald deinen exklusiven Zugang"
- +48h: Mail 3 "Dein Zugang ist pausiert — hier reaktivieren"
  (Zugang ist bereits gesperrt durch access_until aus Webhook)
- +7d: Admin-Benachrichtigung (Slack-Webhook oder Admin-Panel-Flag) "Closer DM nötig"
```

Reset: Webhook `invoice.paid` nach `payment_failed` → alle `payment_failed_email_X` auf NULL.

## 3.5 Szenario 3: Kündigung-Offboarding

Webhook `customer.subscription.deleted` triggert:
1. `membership_tier='free'`, `role='free_member'`, `access_until=now()`.
2. Email `cancellation-survey.tsx` mit Token-Link zu `/survey/cancellation?token=XXX`.
3. Survey-Formular: "Was hat gefehlt?", "Was hätte besser sein können?", Dropdown-Grund, Freitext.
4. Submit → `cancellations`-Row.
5. Cron (täglich): nach 14 Tagen `reactivation-offer.tsx` mit Stripe-Promo-Code.

## 3.6 60-Tage HT-Upsell

Cron `app/api/cron/ht-upsell-60d/route.ts` (täglich):

```
- SELECT paid_members WHERE membership_tier='monthly'
  AND created_at + interval '60 days' < now()
  AND ht_upsell_email_sent_at IS NULL
  AND NOT EXISTS (HT-Bewerbung vom User)
  → Mail "Bereit für den nächsten Schritt?" mit Calendly-Link
  → ht_upsell_email_sent_at = now()
```

## 3.7 Crontab

```
0 5 * * *    /api/cron/check-inactive-users
0 */6 * * *  /api/cron/process-dunning
0 6 * * *    /api/cron/reactivation-offers
0 7 * * *    /api/cron/ht-upsell-60d
```

## 3.8 Acceptance Criteria Phase 3

24. Inaktiv > 7d → Mail 1 kommt → `churn_email_1_sent_at` gesetzt.
25. Einloggen nach Mail 1 → `churn_email_1_sent_at` auf NULL.
26. Payment-Failed: +24h Mail 2, +48h Mail 3 + Zugang gesperrt.
27. Nachzahlung → `access_until` verlängert, alle `payment_failed_email_X` NULL.
28. Kündigung → Umfrage-Mail → Survey-Submit → `cancellations`-Row → nach 14d Reaktivierungs-Mail.
29. 60-Tage-Monthly → HT-Upsell-Mail einmalig.

**✅ Commit Phase 3.**

---

# 🎯 PHASE 4 — High-Ticket Bewerbungsseite

**Ziel:** Dedizierte `/apply` mit Video + 8 Fragen + Budget-Split → getrennte Danke-Seiten.

## 4.1 DB-Migration `phase4_ht.sql`

```sql
create table if not exists public.high_ticket_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.<USER_TABLE>(id) on delete set null,
  email text not null,
  name text,
  whatsapp_number text,
  answers jsonb not null,              -- flexibel, 8 Fragen
  budget_tier text not null,           -- 'under_2000' | 'over_2000'
  contacted_at timestamptz,
  call_scheduled_at timestamptz,
  outcome text,                        -- 'closed_won' | 'closed_lost' | 'no_show' | 'pending'
  internal_notes text,
  created_at timestamptz not null default now()
);

create index ht_applications_budget_idx on public.high_ticket_applications(budget_tier);
create index ht_applications_created_at_idx on public.high_ticket_applications(created_at desc);

alter table public.high_ticket_applications enable row level security;
```

## 4.2 Route `app/(marketing)/apply/page.tsx`

**Inhalt:**
- Video (2–3 min, "Was erwartet dich im 1:1").
- 8 Fragen als Multi-Step-Form — Fragen-Inhalte aus `config/ht-questions.ts` (anpassbar ohne Deploy).
- Letzte Frage = **Budget:** "Wie viel kannst du aktuell investieren?" → Radio `under_2000` / `over_2000`.

### Submit
```
- POST /api/ht-applications/create
- Insert in high_ticket_applications
- Redirect je nach budget_tier:
  - over_2000  → /apply/thanks-high-ticket
  - under_2000 → /apply/thanks-membership
```

### `/apply/thanks-high-ticket/page.tsx`
- Video "Ich melde mich persönlich!"
- **Kein Kauf-Button.**
- Hinweis: "Ich melde mich per WhatsApp innerhalb von 2h" + WhatsApp-Link als Fallback.
- **Admin-Benachrichtigung bei neuer over_2000-Bewerbung** (Slack-Webhook oder in-app Notification) — Priority-Flag im Admin-Panel.

### `/apply/thanks-membership/page.tsx`
- Video "Du hast bestanden".
- Plattform-Vorschau-Video (kurz).
- Sales-Copy (Style SNTTRADES).
- **CTA-Buttons:** `97 € / Monat` + `699 € Lifetime` → leiten auf `/checkout?plan=...`.
- Sekundärer Button: "Doch lieber Fragen? → Calendly" am Ende, unauffällig.

## 4.3 Admin-Panel HT-Bewerbungen

Neue Route `app/(admin)/admin/ht-applications/page.tsx`:
- Liste mit Filter `budget_tier` / `outcome` / Datum.
- `over_2000`-Bewerbungen oben mit 🔥-Badge.
- Detail-View: alle 8 Antworten, WhatsApp-Link, Notes-Feld.
- Outcome-Dropdown: `closed_won | closed_lost | no_show | pending`.
- Bei `closed_won`: Admin setzt User manuell auf `membership_tier='ht_1on1'` + `role='paid_member'`.

## 4.4 Acceptance Criteria Phase 4

30. `/apply` zeigt Video + 8 Fragen als Multi-Step.
31. Submit `over_2000` → `/apply/thanks-high-ticket` (kein Kaufbutton).
32. Submit `under_2000` → `/apply/thanks-membership` (mit Stripe-CTAs).
33. Admin-Panel zeigt neue HT-Bewerbung, `over_2000` mit Priority-Badge.
34. Admin kann Outcome setzen und User manuell auf `ht_1on1` upgraden.

**✅ Commit Phase 4.**

---

# 📊 PHASE 5 — Admin-Panel Analytics & Polishing

## 5.1 Dashboard `app/(admin)/admin/dashboard/page.tsx`

- **MRR-Karte:** `COUNT(active monthly subs) × 97 + sum(lifetime revenue last 30d)`.
- **Churn-Rate:** `canceled last 30d / active at start of 30d`.
- **Funnel-Konversion:**
  - Registrierungen (7d/30d)
  - Approval-Rate (approved / (approved + rejected))
  - Paid-Konversion (approved → paid innerhalb 30d)
- **Payments-Log** letzte 30 Tage mit Filter.
- **Cancellations-Inbox** (Umfrage-Antworten, sortiert nach Datum).
- **Email-Performance** aus `email_sequence_log`: Open-Rate pro Template (benötigt Resend-Webhook).

## 5.2 Resend-Webhook `app/api/resend/webhook/route.ts`

- Signatur via Resend-Webhook-Secret prüfen.
- Events `email.opened` / `email.clicked` → `email_sequence_log.opened_at` / `clicked_at` via `resend_message_id`.

## 5.3 Manueller User-Override

Im Admin pro User:
- Tier manuell setzen (Dropdown).
- `access_until` überschreiben.
- Rolle ändern.
- **Audit-Log** Tabelle `user_audit_log`: wer hat was wann geändert.

## 5.4 Acceptance Criteria Phase 5

35. Dashboard zeigt aktuelle MRR, aktualisiert sich bei neuer Zahlung.
36. Churn-Rate manuell nachgerechnet stimmt.
37. Funnel-Konversion: Registrierungen → Approvals → Paid.
38. Resend-Webhook empfängt `email.opened` und setzt Flag.
39. Admin-Tier-Override landet im Audit-Log.

**✅ Commit Phase 5.**

---

# 🔐 Globale Sicherheits-Checks (über alle Phasen)

- **RLS auf allen neuen Tabellen** mit expliziten Policies.
- **Service-Role-Key nur in API-Routes** / Webhooks, nie im Client-Bundle.
- **CRON_SECRET Bearer-Header** prüfen, 401 bei Fail.
- **Stripe-Webhook-Signatur** via `constructEvent`, 400 bei Fail.
- **Resend-Webhook-Signatur** prüfen.
- **Idempotenz** überall wo Webhooks / Crons arbeiten.
- **Rate-Limit** auf `/free` und `/apply` Submit (max 5 / IP / Stunde).
- **Captcha** auf öffentlichen Forms (Turnstile oder hCaptcha — DSGVO-konform).
- **Unsubscribe-Link in jeder Email** (DSGVO + E-Mail-Reputation).

---

# ❓ Rückfragen die Cursor VOR Schritt 0 klären sollte

1. Wie heißt die User-Tabelle? (`profiles` vs. `users`)
2. Wie wird `isAdmin` geprüft? (Spalte, Claim, Discord-Role?)
3. Existiert schon ein Email-Provider? (Resend wiederverwenden oder neu)
4. Existiert schon eine Bewerbungs-Tabelle? (Additiv erweitern oder `applications` frisch neu)
5. Coolify oder PM2/Nginx? (Cron-Setup)
6. Supabase Edge-Functions genutzt, oder alles in Next.js API-Routes?
7. Welche Wochen-Content-Struktur hat Emre für Churn-Inactive-Mail? (Admin-Feld-Struktur)

---

# 📦 Neue NPM-Dependencies

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
npm install resend @react-email/components @react-email/render
npm install @mux/mux-player-react      # oder Cloudflare Stream SDK
```

---

# 🗺️ Finale Projektstruktur (Ziel)

```
app/
├── (marketing)/
│   ├── free/page.tsx                        # Phase 1
│   ├── apply/                               # Phase 4
│   │   ├── page.tsx
│   │   ├── thanks-membership/page.tsx
│   │   └── thanks-high-ticket/page.tsx
│   └── pricing/
│       ├── page.tsx                         # Phase 2
│       └── _components/
│           ├── PricingVideo.tsx
│           ├── PricingCard.tsx
│           └── CalendlyCTA.tsx
├── (app)/
│   ├── pending-review/page.tsx              # Phase 1
│   ├── dashboard/                           # existiert bereits
│   ├── checkout/
│   │   ├── page.tsx                         # Phase 2
│   │   └── success/page.tsx
│   ├── billing/page.tsx                     # Phase 2
│   └── survey/
│       └── cancellation/page.tsx            # Phase 3
├── (admin)/admin/
│   ├── applications/page.tsx                # Phase 1
│   ├── ht-applications/page.tsx             # Phase 4
│   └── dashboard/page.tsx                   # Phase 5
├── api/
│   ├── applications/
│   │   ├── create/route.ts                  # Phase 1
│   │   └── admin/[id]/{approve,reject}/route.ts
│   ├── ht-applications/create/route.ts      # Phase 4
│   ├── stripe/                              # Phase 2
│   │   ├── create-checkout-session/route.ts
│   │   ├── create-portal-session/route.ts
│   │   └── webhook/route.ts
│   ├── resend/webhook/route.ts              # Phase 5
│   └── cron/
│       ├── free-course-sequence/route.ts    # Phase 1
│       ├── check-inactive-users/route.ts    # Phase 3
│       ├── process-dunning/route.ts         # Phase 3
│       ├── reactivation-offers/route.ts     # Phase 3
│       └── ht-upsell-60d/route.ts           # Phase 3
lib/
├── stripe/                                  # Phase 2
│   ├── server.ts
│   ├── client.ts
│   └── webhooks/
│       ├── handler.ts
│       ├── checkout-completed.ts
│       ├── invoice-paid.ts
│       ├── invoice-payment-failed.ts
│       ├── subscription-updated.ts
│       └── subscription-deleted.ts
├── access-control/has-access.ts             # Phase 2
├── email/
│   ├── resend.ts                            # Phase 1
│   └── templates/
│       ├── welcome-free-course.tsx
│       ├── application-rejected.tsx
│       ├── free-course-day-{1,2,3,5}.tsx
│       ├── welcome-paid.tsx
│       ├── payment-failed-{1,2,3}.tsx
│       ├── churn-inactive-{7d,14d}.tsx
│       ├── cancellation-survey.tsx
│       ├── reactivation-offer.tsx
│       └── ht-upsell-60d.tsx
└── auth/middleware-last-login.ts            # Phase 3
supabase/migrations/
├── YYYYMMDDHHMMSS_phase1_funnel_review.sql
├── YYYYMMDDHHMMSS_phase2_stripe.sql
├── YYYYMMDDHHMMSS_phase3_churn.sql
└── YYYYMMDDHHMMSS_phase4_ht.sql
config/
└── ht-questions.ts                          # Phase 4
docs/
└── implementation-notes.md                  # Schritt 0
```

---

# ⚠️ Wichtige Hinweise für Cursor

1. **Nicht im YOLO-Mode durchrauschen.** Jede Phase hat eigene Acceptance-Criteria — das sind die Stopp-Punkte.
2. **Bestehende Plattform-Logik respektieren.** Nichts umbauen was schon funktioniert (Discord-OAuth, Onboarding, Kurs-System). Nur erweitern.
3. **Bei Unklarheiten fragen**, nicht raten. Besonders bei Tabellennamen und bestehender Admin-Logik.
4. **Stripe zuerst im Test-Mode.** Erst wenn Phase 2 grün ist, Live-Keys.
5. **Alle Emails mit Unsubscribe-Link** (DSGVO).
6. **Rate-Limit + Captcha** auf öffentlichen Forms, sonst Spam-Sturm.
7. **Commit-Format:** `feat(phase1): add applications table + review panel` — Phase im Commit, damit Rollback pro Phase möglich.
