-- 113 · Leistungen nach Tracking-Playbook, Upgrade-Anrechnung, ICP-Fragen
--       (Entscheidungen Simon 08.11.2026)
--
-- 1. Journal und Live-Archiv bekommen eigene Fristen am Profil:
--    `journal_bis` (leer = dauerhaft) und `archiv_bis` (Aufzeichnungen der
--    Live-Sessions). `live_bis` bleibt der Live-Bereich (Analysen, Daily Bias).
--    Ausbildung: Journal 1 Monat, kein Archiv. Main/Premium: Journal dauerhaft,
--    Archiv 12 Monate. Live-Abo: verlängert nur `live_bis`.
--    Bestand: Wer vor dieser Migration ein Programm hatte, bekam das Archiv mit
--    dem Live-Bereich — `archiv_bis` übernimmt deshalb einmalig `live_bis`.
-- 2. `hat_archiv_zugang()` schützt `live_session_videos` (bisher `hat_live_zugang()`).
-- 3. Upgrade Ausbildung → Main/Premium: 499 € Anrechnung am Kassenlink und am Kauf.
-- 4. ICP-Fragen fürs Onboarding: Fragen 5–10 in `onboarding_antworten`, Stempel am Profil.

-- ── 1. Fristen am Profil ─────────────────────────────────────────────────────

alter table public.profiles add column if not exists journal_bis timestamptz;
alter table public.profiles add column if not exists archiv_bis timestamptz;
-- ICP-Stempel (Abschnitt 4) schon hier, weil der Schutz-Trigger unten sie nennt.
alter table public.profiles add column if not exists icp_free_am timestamptz;
alter table public.profiles add column if not exists icp_kaeufer_am timestamptz;

comment on column public.profiles.journal_bis is
  'Bis wann das Trading Journal offen ist. Nur für membership_tier = mentoring ausgewertet; leer = dauerhaft (lib/mentoring/zugang.ts). Ausbildung: 1 Monat ab Kauf.';
comment on column public.profiles.archiv_bis is
  'Bis wann das Live-Archiv (Aufzeichnungen) offen ist. Nur für membership_tier = mentoring ausgewertet (hat_archiv_zugang()). Main/Premium: 12 Monate ab Kauf.';

update public.profiles
   set archiv_bis = live_bis
 where membership_tier = 'mentoring'
   and archiv_bis is null
   and live_bis is not null;

-- Schreibschutz wie für `live_bis` (108): Der Nutzer-Client darf beides weder setzen noch ändern.
create or replace function public.profiles_zugang_bis_schutz()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.journal_bis := null;
    new.archiv_bis := null;
    new.icp_free_am := null;
    new.icp_kaeufer_am := null;
  else
    new.journal_bis := old.journal_bis;
    new.archiv_bis := old.archiv_bis;
    new.icp_free_am := old.icp_free_am;
    new.icp_kaeufer_am := old.icp_kaeufer_am;
  end if;
  return new;
end
$$;

drop trigger if exists profiles_zugang_bis_schutz on public.profiles;
create trigger profiles_zugang_bis_schutz
  before insert or update on public.profiles
  for each row execute function public.profiles_zugang_bis_schutz();

-- ── 2. Live-Archiv in der Datenbank ──────────────────────────────────────────

create or replace function public.hat_archiv_zugang()
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
          and (p.membership_tier is distinct from 'mentoring' or (p.archiv_bis is not null and p.archiv_bis > now()))
        )
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;

comment on function public.hat_archiv_zugang() is
  'Wie hat_live_zugang(), aber für das Live-Archiv: Konten der Stufe mentoring nur bis profiles.archiv_bis. Gleiche Regel wie hatArchivZugang() in lib/mentoring/zugang.ts (Migration 113).';

drop policy if exists "live_session_videos_select_zugang" on public.live_session_videos;
create policy "live_session_videos_select_zugang"
  on public.live_session_videos
  for select
  to authenticated
  using ((select public.hat_archiv_zugang()) or public.live_session_ist_frei(session_id));

-- ── 3. Upgrade-Anrechnung ────────────────────────────────────────────────────

alter table public.kassenlink add column if not exists anrechnung_cents integer not null default 0
  check (anrechnung_cents >= 0);
alter table public.kassenlink add column if not exists upgrade_von_kauf_id text
  references public.mentoring_kauf(id) on delete set null;

alter table public.mentoring_kauf add column if not exists anrechnung_cents integer not null default 0
  check (anrechnung_cents >= 0);
alter table public.mentoring_kauf add column if not exists upgrade_von_kauf_id text
  references public.mentoring_kauf(id) on delete set null;

-- Eine Ausbildung wird höchstens einmal angerechnet.
create unique index if not exists mentoring_kauf_upgrade_einmal
  on public.mentoring_kauf (upgrade_von_kauf_id) where upgrade_von_kauf_id is not null;

-- ── 4. ICP-Fragen (Emre, „ICP-Fragen fürs Onboarding") ───────────────────────
--
-- Erweitert das Onboarding aus 107 (fünf Fragen = Emres 1–4 und 7) um die
-- Fragen 5–6 (alle) und 8–10 (Käufer). Free-Mitglieder beantworten 1–7 beim
-- ersten Login nach der Annahme, Käufer (Stufe mentoring) 1–10; vorhandene
-- Antworten werden wiederverwendet. Abo- und Lifetime-Mitglieder bleiben bei
-- den fünf Fragen (`onboarding_fragen_am`).

alter table public.onboarding_antworten
  add column if not exists job_situation text
    check (job_situation in ('vollzeit', 'teilzeit', 'selbststaendig', 'ausbildung', 'trader', 'sonstiges')),
  add column if not exists time_per_week text
    check (time_per_week in ('unter_3h', '3_5h', '6_10h', '11_20h', 'ueber_20h')),
  add column if not exists kauf_grund text
    check (kauf_grund in ('prozess', 'ansatz', 'betreuung', 'live', 'ausbildung', 'vertrauen')),
  add column if not exists kauf_bedenken text
    check (kauf_bedenken in ('investition', 'kenntnisstand', 'zeit', 'ziele', 'richtige_wahl', 'nichts')),
  add column if not exists fokus_3m text
    check (fokus_3m in ('prozess', 'analyse', 'entries', 'risiko', 'psychologie', 'auswertung', 'optimieren'));

comment on column public.profiles.icp_free_am is 'ICP-Fragen 1–7 beantwortet (Free-Onboarding, Migration 113).';
comment on column public.profiles.icp_kaeufer_am is 'ICP-Fragen 1–10 beantwortet (Käufer-Onboarding, Migration 113).';

-- Messpunkte für bis zu zehn Fragen.
do $$
declare
  c text;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'onboarding_ereignisse'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%onboarding_question_1_completed%'
  loop
    execute format('alter table public.onboarding_ereignisse drop constraint %I', c);
  end loop;

  alter table public.onboarding_ereignisse
    add constraint onboarding_ereignisse_art_check
    check (art in (
      'onboarding_started',
      'onboarding_question_1_completed',
      'onboarding_question_2_completed',
      'onboarding_question_3_completed',
      'onboarding_question_4_completed',
      'onboarding_question_5_completed',
      'onboarding_question_6_completed',
      'onboarding_question_7_completed',
      'onboarding_question_8_completed',
      'onboarding_question_9_completed',
      'onboarding_question_10_completed',
      'onboarding_questions_completed',
      'onboarding_dashboard_shown',
      'onboarding_discord_connected',
      'onboarding_community_intro_completed',
      'onboarding_course_started',
      'onboarding_completed'
    ));
end
$$;
