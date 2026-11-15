-- 111 · Termine (Analysegespräch) und neue Ratengrenze (E-Mail-Playbook 1.0, 07.11.2026)
--
-- 1. Kassenlinks bis sechs Raten: Premium jetzt bis 6 (Restcent auf Rate 1,
--    `config/mentoring.ts`). Vorher 1–4.
-- 2. `termine`: jede Calendly-Buchung eines Analysegesprächs als eigene Zeile
--    („Terminversion"). Eine Umbuchung ist eine neue Zeile mit `vorgaenger_id`;
--    der Gesprächsvorgang (`vorgang`) bleibt gleich — daran hängt, dass T02
--    nur einmal je Vorgang rausgeht. Status setzen Calendly-Webhook und Team
--    (Board → Termine: erschienen, No-Show, Absage).
--
-- Nur über den Service-Client.

alter table public.kassenlink drop constraint if exists kassenlink_raten_check;
alter table public.kassenlink add constraint kassenlink_raten_check check (raten between 1 and 6);

create table if not exists public.termine (
  id              uuid        primary key default gen_random_uuid(),
  -- Woher der Lead kommt: Analysegespräch aus dem Training oder /call, /termin, Discord.
  lead_art        text        not null check (lead_art in ('training', 'discord')),
  lead_id         uuid        not null,
  lead_token      text,
  -- Gesprächsvorgang: bleibt über Umbuchungen gleich (`<lead_art>:<lead_id>`).
  vorgang         text        not null,
  user_id         uuid        references auth.users(id) on delete set null,
  email           text        not null,
  name            text,
  -- Calendly
  invitee_uri     text        not null unique,
  event_uri       text,
  start_am        timestamptz not null,
  ende_am         timestamptz,
  zeitzone        text,
  berater_name    text,
  berater_email   text,
  join_url        text,
  absage_url      text,
  umbuchen_url    text,
  -- Ablauf
  status          text        not null default 'gebucht'
                    check (status in ('gebucht', 'umgebucht', 'abgesagt_kunde', 'abgesagt_team', 'gefuehrt', 'no_show')),
  vorgaenger_id   uuid        references public.termine(id) on delete set null,
  abgesagt_am     timestamptz,
  -- Absage mit „kein Interesse": R02 ohne Neubuchungs-Absatz (Playbook R02).
  kein_interesse  boolean     not null default false,
  no_show_am      timestamptz,
  gefuehrt_am     timestamptz,
  gesetzt_von     uuid        references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists termine_start_idx on public.termine (start_am);
create index if not exists termine_vorgang_idx on public.termine (vorgang, created_at desc);
create index if not exists termine_email_idx on public.termine (lower(email));
create index if not exists termine_status_idx on public.termine (status, start_am);

alter table public.termine enable row level security;
revoke all on public.termine from anon, authenticated;

comment on table public.termine is
  'Analysegespräche aus Calendly, eine Zeile je Terminversion (Umbuchung = neue Zeile, gleicher vorgang). Grundlage der Termin-Mails T01–T04, R01–R03, N01/N02 (E-Mail-Playbook 1.0). Migration 111.';
