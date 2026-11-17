-- 108_mentoring.sql
--
-- Mentoring-Programme mit Kassenlink nach dem Closing-Call (17.10.2026).
-- Plan und Hintergrund: config/mentoring.ts (Produkte, Laufzeiten, Raten).
--
-- Sechs Teile:
--
-- 1. Stufe `mentoring` in `profiles.membership_tier`. Eine Stufe für alle drei
--    Produkte (Ausbildung 599 €, Main 3.000 €, Premium 5.000 €): Was genau
--    gekauft wurde, steht in `mentoring_kauf`. Die Plattform bleibt dauerhaft
--    offen (wie Lifetime), befristet ist nur der Live-Bereich.
-- 2. `profiles.live_bis`: bis wann Live-Sessions und Analysen offen sind. Gilt
--    nur für die Stufe `mentoring` — Abo-, Lifetime- und 1:1-Konten sehen den
--    Live-Bereich wie bisher. Geschrieben nur mit dem Service-Schlüssel (eigener
--    Schutz-Trigger, siehe unten).
-- 3. `kassenlink`: ein Angebot nach dem Closing-Call, je Kunde. Der Closer legt
--    es im Admin an (Produkt, Zahlweise, E-Mail), der Kunde bekommt den Link.
-- 4. `mentoring_kauf` und `mentoring_rate`: der bezahlte Kauf und jede Rate.
--    Primärschlüssel sind Stripe-IDs (Kasse bzw. Rechnung) — das macht den
--    Webhook idempotent.
-- 5. Herkunft `call_funnel` für Leads und Video-Aufrufe der neuen Funnel-Seite
--    `/call`.
-- 6. `hat_live_zugang()` und die Lese-Regeln für `analysis_posts` und
--    `live_session_videos`.
--
-- Alle neuen Tabellen: RLS an, keine Policy — gelesen und geschrieben wird nur
-- über den Service-Client (Admin-API, Webhook, Kassenseite).
--
-- Wiederholbar: `if not exists`, `create or replace`, `drop … if exists`.

-- ── 1. Stufe `mentoring` ─────────────────────────────────────────────────────

do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'profiles'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%membership_tier%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end if;

  alter table public.profiles
    add constraint profiles_membership_tier_check
    check (membership_tier in ('free', 'monthly', 'quarterly', 'yearly', 'lifetime', 'ht_1on1', 'mentoring'));
end
$$;

-- ── 2. Live-Zugang ───────────────────────────────────────────────────────────

alter table public.profiles add column if not exists live_bis timestamptz;

comment on column public.profiles.live_bis is
  'Bis wann Live-Sessions und Analysen offen sind. Nur für membership_tier = mentoring ausgewertet (lib/mentoring/zugang.ts, hat_live_zugang()). Verlängert durch das Live-Abo (99 €/Monat).';

-- Eigener Schutz-Trigger statt einer weiteren Kopie von `profiles_schreibschutz`
-- (073/100): Der Nutzer-Client darf `live_bis` weder setzen noch ändern.
create or replace function public.profiles_live_bis_schutz()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.live_bis := null;
  else
    new.live_bis := old.live_bis;
  end if;
  return new;
end
$$;

drop trigger if exists profiles_live_bis_schutz on public.profiles;
create trigger profiles_live_bis_schutz
  before insert or update on public.profiles
  for each row execute function public.profiles_live_bis_schutz();

-- ── 3. Kassenlinks ───────────────────────────────────────────────────────────

create table if not exists public.kassenlink (
  id                uuid        primary key default gen_random_uuid(),
  -- Öffentlicher Teil der Adresse `/kasse/<token>`. Zufällig, nicht erratbar.
  token             text        not null unique,
  produkt           text        not null check (produkt in ('ausbildung', 'main', 'premium', 'live')),
  -- 1 = Einmalzahlung, 2–4 = Monatsraten. Obergrenze je Produkt in config/mentoring.ts.
  raten             smallint    not null default 1 check (raten between 1 and 4),
  -- Gesamtpreis zum Zeitpunkt der Anlage, festgeschrieben.
  betrag_cents      integer     not null check (betrag_cents > 0),
  email             text        not null,
  name              text,
  closer            text,
  lead_id           uuid        references public.discord_leads(id) on delete set null,
  notiz             text,
  erstellt_von      uuid        references auth.users(id) on delete set null,
  erstellt_am       timestamptz not null default now(),
  gueltig_bis       timestamptz not null,
  status            text        not null default 'offen' check (status in ('offen', 'bezahlt', 'storniert')),
  stripe_session_id text,
  bezahlt_am        timestamptz,
  kauf_id           text
);

create index if not exists kassenlink_status_idx on public.kassenlink (status, erstellt_am desc);
create index if not exists kassenlink_email_idx on public.kassenlink (lower(email));

alter table public.kassenlink enable row level security;
revoke all on public.kassenlink from anon, authenticated;

-- ── 4. Käufe und Raten ───────────────────────────────────────────────────────

create table if not exists public.mentoring_kauf (
  -- Stripe-Checkout-Session-ID.
  id                        text        primary key,
  user_id                   uuid        not null references auth.users(id) on delete cascade,
  kassenlink_id             uuid        references public.kassenlink(id) on delete set null,
  produkt                   text        not null check (produkt in ('ausbildung', 'main', 'premium', 'live')),
  zahlweise                 text        not null check (zahlweise in ('einmal', 'raten', 'abo')),
  raten_gesamt              smallint,
  raten_betrag_cents        integer,
  -- Was insgesamt fällig ist (bei Raten: Rate × Anzahl). Beim Live-Abo null.
  soll_cents                integer,
  stripe_customer_id        text,
  stripe_subscription_id    text,
  stripe_payment_intent_id  text,
  status                    text        not null default 'aktiv'
                              check (status in ('aktiv', 'vollstaendig', 'beendet', 'erstattet')),
  live_monate               smallint,
  closer                    text,
  email                     text,
  gekauft_am                timestamptz not null default now(),
  vollstaendig_am           timestamptz,
  bestaetigung_gesendet_am  timestamptz,
  created_at                timestamptz not null default now()
);

create index if not exists mentoring_kauf_user_idx on public.mentoring_kauf (user_id, gekauft_am desc);
create unique index if not exists mentoring_kauf_sub_idx
  on public.mentoring_kauf (stripe_subscription_id) where stripe_subscription_id is not null;

alter table public.mentoring_kauf enable row level security;
revoke all on public.mentoring_kauf from anon, authenticated;

create table if not exists public.mentoring_rate (
  -- Stripe-Rechnungs-ID.
  id                      text        primary key,
  kauf_id                 text        not null references public.mentoring_kauf(id) on delete cascade,
  nummer                  smallint    not null check (nummer > 0),
  betrag_cents            integer     not null,
  stripe_subscription_id  text,
  bezahlt_am              timestamptz not null,
  created_at              timestamptz not null default now()
);

create unique index if not exists mentoring_rate_nummer_idx on public.mentoring_rate (kauf_id, nummer);

alter table public.mentoring_rate enable row level security;
revoke all on public.mentoring_rate from anon, authenticated;

-- ── 5. Herkunft `call_funnel` ────────────────────────────────────────────────

do $$
declare
  c text;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public' and rel.relname = 'discord_leads' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%source_origin%'
  loop
    execute format('alter table public.discord_leads drop constraint %I', c);
  end loop;

  alter table public.discord_leads
    add constraint discord_leads_source_origin_check
    check (source_origin is null or source_origin in ('discord_funnel', 'termin_direct', 'call_funnel'));

  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public' and rel.relname = 'discord_video_views' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%source%'
  loop
    execute format('alter table public.discord_video_views drop constraint %I', c);
  end loop;

  alter table public.discord_video_views
    add constraint discord_video_views_source_check
    check (source in ('discord_funnel', 'termin_direct', 'video_only', 'call_funnel', 'unknown'));
end
$$;

-- ── 6. Live-Zugang in der Datenbank ──────────────────────────────────────────

create or replace function public.hat_live_zugang()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select coalesce(p.is_admin, false)
        or (
          coalesce(p.is_paid, false)
          and (p.membership_tier is distinct from 'mentoring' or (p.live_bis is not null and p.live_bis > now()))
        )
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;

comment on function public.hat_live_zugang() is
  'Wie hat_zugang(), aber für den Live-Bereich: Konten der Stufe mentoring nur bis profiles.live_bis. Gleiche Regel wie hatLiveZugang() in lib/mentoring/zugang.ts (Migration 108).';

drop policy if exists "analysis_posts_select_zugang" on public.analysis_posts;
create policy "analysis_posts_select_zugang"
  on public.analysis_posts
  for select
  to authenticated
  using ((select public.hat_live_zugang()));

drop policy if exists "live_session_videos_select_zugang" on public.live_session_videos;
create policy "live_session_videos_select_zugang"
  on public.live_session_videos
  for select
  to authenticated
  using ((select public.hat_live_zugang()) or public.live_session_ist_frei(session_id));
