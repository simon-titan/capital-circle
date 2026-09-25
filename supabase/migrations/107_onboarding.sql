-- 107_onboarding.sql
--
-- Kunden-Onboarding mit ICP-Fragen und Start-Checkliste (26.09.2026).
-- Plan: docs/plaene/onboarding-kunde.md
--
-- Drei Teile:
--
-- 1. Flags in `profiles`. Dort, weil `proxy.ts` das Profil bei jeder Seite
--    ohnehin liest — die Weiche „Fragen noch offen?" kostet so keine zweite
--    Abfrage. Geschrieben werden sie nur mit dem Service-Schlüssel (API-Routen
--    unter `app/api/onboarding`); ein eigener Schutz-Trigger setzt Schreibversuche
--    über den Nutzer-Client still zurück, genau wie `profiles_schreibschutz` (073)
--    es für Rechte und Zahlstatus tut. Sonst könnte sich jemand die Fragen per
--    Konsole selbst als beantwortet markieren.
--
-- 2. `onboarding_antworten`: eine Zeile pro Nutzer mit den fünf Antworten
--    (feste Schlüssel, Beschriftungen in `config/onboarding.ts`), der
--    technischen Herkunft (`attribution`, getrennt von der selbst angegebenen
--    `discovery_source`) und den Zeitstempeln der Checklisten-Schritte.
--    Die UTM-Daten stehen sonst nur in `funnel_sitzungen`, und die wird nach
--    90 Tagen geleert — der Schnappschuss hier bleibt.
--
-- 3. `onboarding_ereignisse`: die Messpunkte „Käufer → Fragen → Discord →
--    Vorstellung → Kursstart → aktiviert". Jedes Ereignis zählt pro Nutzer
--    einmal (Unique), geschrieben wird mit `on conflict do nothing`.
--
-- Beide Tabellen: RLS an. Lesen darf der Nutzer seine eigene Antwortzeile,
-- sonst nichts; alles Schreiben läuft über den Service-Client.
--
-- Wiederholbar: `if not exists`, `create or replace`, `drop … if exists`.

-- ── 1. Profil-Flags ─────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists onboarding_gestartet_am timestamptz,
  add column if not exists onboarding_fragen_am timestamptz,
  add column if not exists onboarding_abgeschlossen_am timestamptz,
  add column if not exists passwort_gesetzt_am timestamptz;

create or replace function public.profiles_onboarding_schutz()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.onboarding_gestartet_am := null;
    new.onboarding_fragen_am := null;
    new.onboarding_abgeschlossen_am := null;
    new.passwort_gesetzt_am := null;
    return new;
  end if;

  new.onboarding_gestartet_am := old.onboarding_gestartet_am;
  new.onboarding_fragen_am := old.onboarding_fragen_am;
  new.onboarding_abgeschlossen_am := old.onboarding_abgeschlossen_am;
  new.passwort_gesetzt_am := old.passwort_gesetzt_am;
  return new;
end;
$$;

drop trigger if exists profiles_onboarding_schutz on public.profiles;
create trigger profiles_onboarding_schutz
  before insert or update on public.profiles
  for each row execute function public.profiles_onboarding_schutz();

-- ── 2. Antworten und Schritte ───────────────────────────────────────────────

create table if not exists public.onboarding_antworten (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  trading_experience text
    check (trading_experience in ('anfang', 'unter_6m', '6_12m', '1_2j', '2_4j', '4j_plus')),
  trading_stage text
    check (trading_stage in ('anfang', 'kein_prozess', 'break_even', 'phasen', 'profitabel')),
  main_problem text
    check (main_problem in ('prozess', 'bias', 'execution', 'disziplin', 'risk', 'psychologie', 'konstanz', 'unklar')),
  trading_goal text
    check (trading_goal in ('prozess', 'profitabel', 'funded', 'nebeneinkommen', 'hauptberuf', 'professionalisieren')),
  discovery_source text
    check (discovery_source in ('instagram', 'tiktok', 'youtube', 'telegram', 'empfehlung', 'sonstiges')),
  discovery_source_other text check (discovery_source_other is null or char_length(discovery_source_other) <= 200),
  -- Technische Herkunft (UTM, src, Verweis) zum Zeitpunkt der Fragen.
  attribution jsonb,
  -- Bestandsmitglied (Konto vor dem Onboarding-Start) oder Neukäufer.
  bestand boolean not null default false,
  discord_verbunden_am timestamptz,
  community_link_geoeffnet_am timestamptz,
  community_vorgestellt_am timestamptz,
  kurs_gestartet_am timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.onboarding_antworten enable row level security;

drop policy if exists onboarding_antworten_select_own on public.onboarding_antworten;
create policy onboarding_antworten_select_own on public.onboarding_antworten
  for select to authenticated
  using (auth.uid() = user_id);

-- ── 3. Ereignisse ───────────────────────────────────────────────────────────

create table if not exists public.onboarding_ereignisse (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  art text not null check (art in (
    'onboarding_started',
    'onboarding_question_1_completed',
    'onboarding_question_2_completed',
    'onboarding_question_3_completed',
    'onboarding_question_4_completed',
    'onboarding_question_5_completed',
    'onboarding_questions_completed',
    'onboarding_dashboard_shown',
    'onboarding_discord_connected',
    'onboarding_community_intro_completed',
    'onboarding_course_started',
    'onboarding_completed'
  )),
  meta jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, art)
);

create index if not exists onboarding_ereignisse_art_idx
  on public.onboarding_ereignisse (art, created_at);

-- Keine Policies: nur der Service-Client liest und schreibt.
alter table public.onboarding_ereignisse enable row level security;
