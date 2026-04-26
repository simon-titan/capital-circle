# Agent-Paket 1 — DB-Migrations

> **Voraussetzung:** Paket 0 muss abgeschlossen sein (`docs/implementation-notes.md` existiert).
> **Kann parallel zu Paket 2 ausgeführt werden.**
> **Verbindliche Source-of-Truth:** `docs/implementation-notes.md`

---

## Mission

Erstelle 5 neue Supabase-Migrations-Dateien unter `supabase/migrations/`.
Die letzte bestehende Migration ist `040_learning_seconds_accumulation.sql`.
Neue Migrationen starten bei **`041_*`**.

**Schreibe KEINE Anwendungslogik. Nur SQL-Migrationen + anschließend TypeScript-Types generieren.**

---

## Cross-Cutting-Regeln (für alle Pakete)

1. **Stack:** Next.js 16.2.1, React 19.2.4, Chakra UI v2, Supabase SSR
2. **Tabelle:** `profiles` (NICHT `users`). Bestehende Spalten `is_admin` (bool) und `is_paid` (bool) **bleiben unangetastet**
3. **Admin-Check:** `requireAdmin()` aus `lib/supabase/admin-auth.ts` — nicht neu bauen
4. **Hosting:** Vercel — Middleware ist `proxy.ts` im Repo-Root
5. **Idempotenz:** Alle Statements mit `IF NOT EXISTS` / `IF EXISTS` — Migrations müssen safe re-runnable sein
6. **Design:** Gold #D4AF37, kein Blau

---

## 1. Migration `041_phase1_funnel_review.sql`

```sql
-- 041_phase1_funnel_review.sql

-- Neue Spalten in profiles (additiv — is_admin/is_paid bleiben)
alter table public.profiles
  add column if not exists application_status text
    check (application_status in ('pending', 'approved', 'rejected')),
  add column if not exists last_login_at timestamptz,
  add column if not exists unsubscribed_at timestamptz;

-- Bewerbungen
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  email text not null,
  name text,

  -- 3 Pflichtfragen
  experience text not null,
  biggest_problem text not null,
  goal_6_months text not null,

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),

  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  rejection_reason text,
  welcome_sequence_started_at timestamptz,

  ip_address inet,
  user_agent text,

  created_at timestamptz not null default now()
);

create index if not exists applications_status_idx on public.applications(status);
create index if not exists applications_email_idx on public.applications(email);
create index if not exists applications_created_at_idx on public.applications(created_at desc);
create index if not exists applications_user_id_idx on public.applications(user_id);

-- Email-Sequenz-Log
create table if not exists public.email_sequence_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
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

create index if not exists email_seq_user_idx on public.email_sequence_log(user_id);
create index if not exists email_seq_sequence_idx on public.email_sequence_log(sequence, step);

-- RLS
alter table public.applications enable row level security;
alter table public.email_sequence_log enable row level security;

-- User kann eigene Bewerbung lesen
drop policy if exists "Users read own applications" on public.applications;
create policy "Users read own applications" on public.applications
  for select using (auth.uid() = user_id);

-- Admin kann alles (Service-Role-Key im Backend, kein separates Policy nötig für Server-Side)
-- Explizite Admin-Policy für direkten Client-Zugriff im Admin-Panel:
drop policy if exists "Admin full access applications" on public.applications;
create policy "Admin full access applications" on public.applications
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

drop policy if exists "Admin full access email_sequence_log" on public.email_sequence_log;
create policy "Admin full access email_sequence_log" on public.email_sequence_log
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

drop policy if exists "Users read own email_sequence_log" on public.email_sequence_log;
create policy "Users read own email_sequence_log" on public.email_sequence_log
  for select using (auth.uid() = user_id);
```

---

## 2. Migration `042_phase2_stripe.sql`

```sql
-- 042_phase2_stripe.sql

-- Neue Spalten in profiles
alter table public.profiles
  add column if not exists stripe_customer_id text unique,
  add column if not exists membership_tier text not null default 'free'
    check (membership_tier in ('free', 'monthly', 'lifetime', 'ht_1on1')),
  add column if not exists access_until timestamptz,
  add column if not exists lifetime_purchased_at timestamptz;

create index if not exists profiles_stripe_customer_id_idx on public.profiles(stripe_customer_id);
create index if not exists profiles_membership_tier_idx on public.profiles(membership_tier);

-- Subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,
  stripe_price_id text not null,
  status text not null
    check (status in ('active','trialing','past_due','canceled','incomplete','incomplete_expired','unpaid','paused')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists subscriptions_status_idx on public.subscriptions(status);
create index if not exists subscriptions_stripe_id_idx on public.subscriptions(stripe_subscription_id);

-- Payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
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

create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_created_at_idx on public.payments(created_at desc);

-- Webhook-Idempotenz
create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  received_at timestamptz not null default now()
);

-- updated_at-Trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- RLS
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists "Users read own subs" on public.subscriptions;
create policy "Users read own subs" on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "Users read own payments" on public.payments;
create policy "Users read own payments" on public.payments
  for select using (auth.uid() = user_id);

drop policy if exists "Admin full access subscriptions" on public.subscriptions;
create policy "Admin full access subscriptions" on public.subscriptions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Admin full access payments" on public.payments;
create policy "Admin full access payments" on public.payments
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
```

---

## 3. Migration `043_phase3_churn.sql`

```sql
-- 043_phase3_churn.sql

-- Neue Spalten in profiles für Churn-Tracking
alter table public.profiles
  add column if not exists churn_email_1_sent_at timestamptz,
  add column if not exists churn_email_2_sent_at timestamptz,
  add column if not exists payment_failed_email_1_sent_at timestamptz,
  add column if not exists payment_failed_email_2_sent_at timestamptz,
  add column if not exists payment_failed_email_3_sent_at timestamptz,
  add column if not exists ht_upsell_email_sent_at timestamptz;

-- Cancellations / Offboarding-Survey
create table if not exists public.cancellations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  reason text,
  structured_reason text
    check (structured_reason in ('too_expensive','not_enough_value','tech_issues','other', null)),
  feedback text,
  canceled_at timestamptz not null default now()
);

create index if not exists cancellations_user_id_idx on public.cancellations(user_id);
create index if not exists cancellations_created_at_idx on public.cancellations(canceled_at desc);

alter table public.cancellations enable row level security;

drop policy if exists "Users read own cancellations" on public.cancellations;
create policy "Users read own cancellations" on public.cancellations
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own cancellations" on public.cancellations;
create policy "Users insert own cancellations" on public.cancellations
  for insert with check (auth.uid() = user_id);

drop policy if exists "Admin full access cancellations" on public.cancellations;
create policy "Admin full access cancellations" on public.cancellations
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
```

---

## 4. Migration `044_phase4_ht.sql`

```sql
-- 044_phase4_ht.sql

create table if not exists public.high_ticket_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  name text,
  whatsapp_number text,
  answers jsonb not null,
  budget_tier text not null
    check (budget_tier in ('under_2000', 'over_2000')),
  contacted_at timestamptz,
  call_scheduled_at timestamptz,
  outcome text
    check (outcome in ('closed_won','closed_lost','no_show','pending', null))
    default 'pending',
  internal_notes text,
  created_at timestamptz not null default now()
);

create index if not exists ht_applications_budget_idx on public.high_ticket_applications(budget_tier);
create index if not exists ht_applications_created_at_idx on public.high_ticket_applications(created_at desc);
create index if not exists ht_applications_outcome_idx on public.high_ticket_applications(outcome);

alter table public.high_ticket_applications enable row level security;

drop policy if exists "Admin full access ht_applications" on public.high_ticket_applications;
create policy "Admin full access ht_applications" on public.high_ticket_applications
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
```

---

## 5. Migration `045_phase5_audit.sql`

```sql
-- 045_phase5_audit.sql

create table if not exists public.user_audit_log (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid references public.profiles(id) on delete cascade,
  admin_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  field text,
  old_value text,
  new_value text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_target_user_idx on public.user_audit_log(target_user_id);
create index if not exists audit_log_admin_user_idx on public.user_audit_log(admin_user_id);
create index if not exists audit_log_created_at_idx on public.user_audit_log(created_at desc);

alter table public.user_audit_log enable row level security;

drop policy if exists "Admin full access audit_log" on public.user_audit_log;
create policy "Admin full access audit_log" on public.user_audit_log
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
```

---

## 6. TypeScript-Types regenerieren

Nach allen Migrationen (in Supabase angewendet):

```bash
npx supabase gen types typescript --project-id <PROJECT_ID> > lib/supabase/types.ts
```

Falls der Supabase-CLI nicht konfiguriert ist: Types manuell in `lib/supabase/types.ts` ergänzen.
Alle neuen Tabellen + Spalten müssen im `Database`-Type erscheinen.

---

## Acceptance-Criteria

1. Alle 5 `.sql`-Dateien unter `supabase/migrations/` vorhanden und syntaktisch korrekt
2. `profiles` hat neue Spalten: `application_status`, `membership_tier`, `stripe_customer_id`, `access_until`, `lifetime_purchased_at`, `last_login_at`, `unsubscribed_at`, `churn_email_*`, `payment_failed_email_*`, `ht_upsell_email_sent_at`
3. Neue Tabellen: `applications`, `email_sequence_log`, `subscriptions`, `payments`, `stripe_webhook_events`, `cancellations`, `high_ticket_applications`, `user_audit_log`
4. RLS auf allen neuen Tabellen aktiv mit expliziten Policies
5. `set_updated_at()`-Trigger auf `subscriptions` funktioniert
6. `lib/supabase/types.ts` enthält alle neuen Tabellen/Spalten

---

## Commit

```
feat(paket1): add db migrations 041-045 (funnel, stripe, churn, ht, audit)
```
