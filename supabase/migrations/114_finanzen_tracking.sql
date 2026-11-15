-- 114 · Tracking & Finanzen P0 (Emres „Tracking & Finanzen Playbook 1.0", Entscheidung Simon 08.11.2026)
--
-- 1. `finanz_buchung`: das Finanz-Ledger. Jede erfolgreiche Zahlung eines
--    Mentoring-Kaufs, einer Rate oder des Live-Abos ist eine Zeile; Erstattungen
--    und verlorene Chargebacks sind eigene, negative Zeilen mit Bezug auf die
--    Originalzahlung (Playbook 10.1, 13.1: Historie wird nie überschrieben).
--    Eindeutig über die Stripe-Objekt-ID (Rechnung, PaymentIntent, Refund,
--    Dispute) — eine wiederholte Zustellung ändert nichts. Das Event-Log mit
--    eindeutiger Stripe-Event-ID gibt es seit Migration 043
--    (`stripe_webhook_events`); jede Buchung merkt sich ihre Event-ID.
--    Steuer kommt aus Stripe (`steuer_quelle = 'stripe'`); nur wenn Stripe keine
--    liefert, rechnet der Code 19 % inklusive heraus und kennzeichnet das
--    (`fallback_19_inkl`). Zahlungen ohne zuordenbaren Kauf stehen mit
--    `status = 'quarantaene'` da und zählen nirgends mit.
-- 2. `finanz_dispute`: Chargebacks mit Status opened/won/lost und Verlauf.
--    Finanzwirkung erst bei „lost" (eigene Zeile in `finanz_buchung`).
-- 3. `finanz_live_abo`: echte 99-€-Live-Abos mit Status und Zeitraum — Basis
--    für Netto-MRR und Churn (Playbook 11). Inklusiv-Zugänge aus Main/Premium
--    stehen hier nie.
-- 4. `provision`: Provisionsbuch der Closer, 15 % vom tatsächlich eingegangenen
--    Netto je Zahlung (10.3/10.4). Eine Zeile je Ledger-Buchung; Erstattung und
--    verlorener Chargeback erzeugen negative Zeilen. Status accrued → approved
--    → paid (reversed für stornierte Ansprüche).
-- 5. Verkaufs-Credit am Kauf (`mentoring_kauf.credit_*`), eingefroren beim Kauf:
--    Closer des tatsächlich geführten Calls, sonst Closer am Kassenlink, sonst
--    zugewiesener CRM-Closer, sonst unassigned (lib/finanzen/credit.ts).
-- 6. `crm_call_ergebnis`: Ergebnis-Maske nach dem Gespräch (Playbook 9.2),
--    versioniert — jede Änderung ist eine neue Zeile. Dazu darf
--    `crm_aktivitaeten.art` jetzt auch `ergebnis` sein.
--
-- Alle neuen Tabellen: RLS an, keine Policy — nur der Service-Client.
-- Wiederholbar: `if not exists`, `drop … if exists`.

-- ── 1. Ledger ────────────────────────────────────────────────────────────────

create table if not exists public.finanz_buchung (
  id                        uuid        primary key default gen_random_uuid(),
  art                       text        not null check (art in ('zahlung', 'erstattung', 'chargeback')),
  -- Zahlung: Rechnung (in_…) bzw. PaymentIntent (pi_…) der Einmalzahlung;
  -- Erstattung: Refund (re_…); Chargeback: Dispute (dp_…).
  stripe_objekt_id          text        not null unique,
  stripe_event_id           text,
  stripe_invoice_id         text,
  stripe_payment_intent_id  text,
  stripe_charge_id          text,
  stripe_subscription_id    text,
  stripe_balance_txn_id     text,
  -- Erstattung/Chargeback: die Originalzahlung.
  bezug_buchung_id          uuid        references public.finanz_buchung(id) on delete set null,
  kauf_id                   text        references public.mentoring_kauf(id) on delete set null,
  produkt                   text,
  rate_nr                   smallint,
  user_id                   uuid        references auth.users(id) on delete set null,
  email                     text,
  waehrung                  text        not null default 'eur',
  -- Cent, Erstattung/Chargeback negativ. brutto = netto + steuer.
  brutto_cents              integer     not null,
  steuer_cents              integer     not null,
  netto_cents               integer     not null,
  steuer_quelle             text        not null default 'stripe'
                              check (steuer_quelle in ('stripe', 'stripe_anteilig', 'fallback_19_inkl', 'unbekannt')),
  -- Stripe-Gebühr dieser Transaktion (positiv = Kosten), null = nicht verfügbar.
  gebuehr_cents             integer,
  status                    text        not null default 'gebucht' check (status in ('gebucht', 'quarantaene')),
  quarantaene_grund         text,
  -- occurred_at (Zahlung/Erstattung bei Stripe) und received_at (Servereingang), UTC.
  gebucht_am                timestamptz not null,
  eingegangen_am            timestamptz not null default now(),
  created_at                timestamptz not null default now(),
  constraint finanz_buchung_summe check (brutto_cents = netto_cents + steuer_cents)
);

create index if not exists finanz_buchung_kauf_idx on public.finanz_buchung (kauf_id, gebucht_am);
create index if not exists finanz_buchung_zeit_idx on public.finanz_buchung (gebucht_am desc);
create index if not exists finanz_buchung_pi_idx on public.finanz_buchung (stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create index if not exists finanz_buchung_charge_idx on public.finanz_buchung (stripe_charge_id) where stripe_charge_id is not null;
create index if not exists finanz_buchung_sub_idx on public.finanz_buchung (stripe_subscription_id) where stripe_subscription_id is not null;
create index if not exists finanz_buchung_quarantaene_idx on public.finanz_buchung (status) where status = 'quarantaene';

alter table public.finanz_buchung enable row level security;
revoke all on public.finanz_buchung from anon, authenticated;

comment on table public.finanz_buchung is
  'Finanz-Ledger aus Stripe (Tracking-Playbook 10): Zahlungen, Erstattungen, verlorene Chargebacks je Mentoring-Kauf/Rate/Live-Abo. Eindeutig über stripe_objekt_id, Korrekturen als eigene Zeilen. Migration 114.';

-- ── 2. Chargebacks ───────────────────────────────────────────────────────────

create table if not exists public.finanz_dispute (
  id                        text        primary key,  -- dp_…
  stripe_charge_id          text,
  stripe_payment_intent_id  text,
  bezug_buchung_id          uuid        references public.finanz_buchung(id) on delete set null,
  kauf_id                   text        references public.mentoring_kauf(id) on delete set null,
  betrag_cents              integer     not null,
  waehrung                  text        not null default 'eur',
  grund                     text,
  status                    text        not null check (status in ('opened', 'won', 'lost')),
  stripe_status             text,
  -- Dispute-Gebühren laut Stripe-Balance-Transaktionen (positiv = Kosten).
  gebuehr_cents             integer,
  eroeffnet_am              timestamptz not null,
  entschieden_am            timestamptz,
  -- Statushistorie: [{ status, stripe_status, am, event }]
  verlauf                   jsonb       not null default '[]'::jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table public.finanz_dispute enable row level security;
revoke all on public.finanz_dispute from anon, authenticated;

-- ── 3. Live-Abos ─────────────────────────────────────────────────────────────

create table if not exists public.finanz_live_abo (
  stripe_subscription_id  text        primary key,
  kauf_id                 text        references public.mentoring_kauf(id) on delete set null,
  user_id                 uuid        references auth.users(id) on delete set null,
  email                   text,
  -- Stripe-Status: trialing, active, past_due, canceled, …
  status                  text        not null,
  preis_brutto_cents      integer,
  waehrung                text        not null default 'eur',
  begonnen_am             timestamptz,
  probe_ende_am           timestamptz,
  periode_start_am        timestamptz,
  periode_ende_am         timestamptz,
  cancel_at_period_end    boolean     not null default false,
  -- Erste beobachtete Kündigungsanfrage und tatsächliches Vertragsende.
  kuendigung_angefragt_am timestamptz,
  vertragsende_am         timestamptz,
  beendet_am              timestamptz,
  updated_at              timestamptz not null default now(),
  created_at              timestamptz not null default now()
);

alter table public.finanz_live_abo enable row level security;
revoke all on public.finanz_live_abo from anon, authenticated;

-- ── 4. Provision ─────────────────────────────────────────────────────────────

create table if not exists public.provision (
  id                uuid        primary key default gen_random_uuid(),
  -- Genau ein Provisionseintrag je Ledger-Buchung (Exactly-once).
  buchung_id        uuid        not null unique references public.finanz_buchung(id) on delete cascade,
  kauf_id           text        references public.mentoring_kauf(id) on delete set null,
  closer_id         uuid        references auth.users(id) on delete set null,
  closer_kuerzel    text,
  art               text        not null check (art in ('anspruch', 'korrektur_erstattung', 'korrektur_chargeback')),
  -- Netto der Bezugszahlung bzw. -korrektur (Cent, Korrektur negativ).
  basis_netto_cents integer     not null,
  -- 1500 = 15 %.
  satz_bp           integer     not null default 1500,
  -- Cent, Korrektur negativ. Enthält bei der letzten planmäßigen Rate den Rundungsausgleich.
  betrag_cents      integer     not null,
  rundungsausgleich_cents integer not null default 0,
  status            text        not null default 'accrued' check (status in ('accrued', 'approved', 'paid', 'reversed')),
  -- Abrechnungsperiode (YYYY-MM, Europe/Berlin, nach Buchungsdatum).
  periode           text        not null,
  entstanden_am     timestamptz not null,
  freigegeben_am    timestamptz,
  freigegeben_von   uuid        references auth.users(id) on delete set null,
  ausgezahlt_am     timestamptz,
  ausgezahlt_von    uuid        references auth.users(id) on delete set null,
  auszahlung_ref    text,
  created_at        timestamptz not null default now()
);

create index if not exists provision_closer_idx on public.provision (closer_id, status, periode);
create index if not exists provision_kauf_idx on public.provision (kauf_id);

alter table public.provision enable row level security;
revoke all on public.provision from anon, authenticated;

-- ── 5. Verkaufs-Credit am Kauf ───────────────────────────────────────────────

alter table public.mentoring_kauf add column if not exists credit_closer_id uuid references auth.users(id) on delete set null;
alter table public.mentoring_kauf add column if not exists credit_closer_kuerzel text;
alter table public.mentoring_kauf add column if not exists credit_regel text
  check (credit_regel is null or credit_regel in ('gefuehrter_call', 'kassenlink', 'crm_zuweisung', 'unassigned'));
alter table public.mentoring_kauf add column if not exists credit_termin_id uuid references public.termine(id) on delete set null;
alter table public.mentoring_kauf add column if not exists credit_gesetzt_am timestamptz;

comment on column public.mentoring_kauf.credit_closer_id is
  'Verkaufs-Credit (Tracking-Playbook 9.4, Regel Simon 08.11.2026, Freigabe Emre offen): Closer des letzten geführten Calls vor dem Kauf, sonst Kassenlink, sonst CRM-Zuweisung. Beim Kauf eingefroren — ein späterer Closer-Wechsel ändert ihn nicht.';

-- ── 6. Ergebnis-Maske nach dem Gespräch ──────────────────────────────────────

create table if not exists public.crm_call_ergebnis (
  id                uuid        primary key default gen_random_uuid(),
  termin_id         uuid        not null references public.termine(id) on delete cascade,
  kontakt_id        uuid        references public.crm_kontakte(id) on delete set null,
  version           smallint    not null default 1,
  outcome           text        not null
                      check (outcome in ('won_payment_pending', 'open_decision', 'lost', 'unqualified', 'no_show')),
  produkt           text        not null check (produkt in ('main', 'premium', 'ausbildung', 'none')),
  grund             text        check (grund is null or grund in ('budget', 'timing', 'trust', 'consideration', 'fit', 'other')),
  -- Personenbezogen, nie im ChatGPT-Export.
  notiz             text,
  follow_up_am      timestamptz,
  von               uuid        references auth.users(id) on delete set null,
  am                timestamptz not null default now(),
  unique (termin_id, version)
);

create index if not exists crm_call_ergebnis_termin_idx on public.crm_call_ergebnis (termin_id, version desc);

alter table public.crm_call_ergebnis enable row level security;
revoke all on public.crm_call_ergebnis from anon, authenticated;

alter table public.crm_aktivitaeten drop constraint if exists crm_aktivitaeten_art_check;
alter table public.crm_aktivitaeten add constraint crm_aktivitaeten_art_check
  check (art in ('notiz', 'anruf', 'whatsapp', 'phase', 'zuweisung', 'termin', 'kauf', 'kassenlink', 'system', 'ergebnis'));
