-- 112 · CRM für die Closer (/crm), Entscheidung Simon 07.11.2026
--
-- Ein Kontakt je Person (E-Mail), gebündelt aus allen Quellen: Call-Funnel,
-- Direkt-Termin, Discord-Funnel, Analysegespräch aus dem Training, Free-
-- Bewerbung mit Kontaktwunsch, HT-Bewerbung (/apply). Die Quellen bleiben, wie
-- sie sind; `lib/crm/sync.ts` legt Kontakte an und führt Phase, Termine, Käufe
-- nach. Was der Closer setzt (Phase, Wiedervorlage, Verlustgrund, Zuweisung),
-- steht nur hier.
--
-- Zugriff ausschließlich über den Service-Client nach der Rollenprüfung in
-- `lib/crm/zugang.ts` (Admins und aktive Mitglieder von `crm_team`).

-- ── 1. Team ─────────────────────────────────────────────────────────────────

create table if not exists public.crm_team (
  user_id         uuid        primary key references auth.users(id) on delete cascade,
  name            text        not null,
  -- Kürzel wie in `kassenlink.closer` / `config/mentoring.ts` (kevin, simon, daniel).
  kuerzel         text        not null unique,
  -- Adresse, die in Calendly als Gastgeber steht (Zuordnung von Terminen).
  calendly_email  text,
  -- Fester Call-Block (Berliner Zeit): Termine, die darin beginnen, gehören diesem Closer.
  block_von       time,
  block_bis       time,
  aktiv           boolean     not null default true,
  created_at      timestamptz not null default now()
);

alter table public.crm_team enable row level security;
revoke all on public.crm_team from anon, authenticated;

-- ── 2. Kontakte ─────────────────────────────────────────────────────────────

create table if not exists public.crm_kontakte (
  id                  uuid        primary key default gen_random_uuid(),
  email               text        not null unique,
  name                text,
  telefon             text,
  user_id             uuid        references auth.users(id) on delete set null,
  -- Erste Quelle und alle, aus denen der Kontakt bekannt ist.
  quelle              text        not null,
  quellen             text[]      not null default '{}',
  kanal               text,
  closer_id           uuid        references auth.users(id) on delete set null,
  phase               text        not null default 'neu'
                        check (phase in ('neu', 'kontaktiert', 'termin', 'gespraech', 'angebot', 'gewonnen', 'verloren', 'no_show', 'spaeter')),
  wiedervorlage_am    timestamptz,
  -- Wann ein Closer die Phase zuletzt selbst gesetzt hat: Ältere Belege überschreiben sie nicht.
  phase_gesetzt_am    timestamptz,
  verlust_grund       text,
  verlust_notiz       text,
  -- Gewonnen: Produkt und Vertragswert (aus dem Kauf).
  produkt             text,
  wert_cents          integer,
  gewonnen_am         timestamptz,
  verloren_am         timestamptz,
  letzte_aktivitaet_am timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists crm_kontakte_phase_idx on public.crm_kontakte (phase, updated_at desc);
create index if not exists crm_kontakte_closer_idx on public.crm_kontakte (closer_id, phase);
create index if not exists crm_kontakte_wiedervorlage_idx on public.crm_kontakte (wiedervorlage_am) where wiedervorlage_am is not null;
create index if not exists crm_kontakte_created_idx on public.crm_kontakte (created_at desc);

alter table public.crm_kontakte enable row level security;
revoke all on public.crm_kontakte from anon, authenticated;

-- ── 3. Zeitstrahl ───────────────────────────────────────────────────────────

create table if not exists public.crm_aktivitaeten (
  id          uuid        primary key default gen_random_uuid(),
  kontakt_id  uuid        not null references public.crm_kontakte(id) on delete cascade,
  art         text        not null
                check (art in ('notiz', 'anruf', 'whatsapp', 'phase', 'zuweisung', 'termin', 'kauf', 'kassenlink', 'system')),
  -- Anruf: erreicht, nicht_erreicht, mailbox, rueckruf, termin_vereinbart
  ergebnis    text,
  text        text,
  von         uuid        references auth.users(id) on delete set null,
  am          timestamptz not null default now(),
  daten       jsonb       not null default '{}'::jsonb,
  -- Systemereignisse genau einmal (z. B. `termin:<id>:gebucht`).
  ref         text        unique
);

create index if not exists crm_aktivitaeten_kontakt_idx on public.crm_aktivitaeten (kontakt_id, am desc);

alter table public.crm_aktivitaeten enable row level security;
revoke all on public.crm_aktivitaeten from anon, authenticated;

comment on table public.crm_kontakte is
  'CRM der Closer (/crm): ein Kontakt je E-Mail aus allen Lead-Quellen, mit Phase, Zuweisung, Wiedervorlage, Verlustgrund und Umsatz. Migration 112.';
