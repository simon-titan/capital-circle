-- 109: Free-Training-Funnel (Entscheidung Simon, 02.11.2026)
--
-- Öffentliche Seite `/training` → kostenlose Registrierung → drei Videos im
-- Mitgliederbereich → Analysegespräch oder Ausbildung (599 €).
--
--   1. Profile: Herkunft und Registrierungszeitpunkt.
--   2. Kurs „Kostenloses Training" mit festem Modul. Die drei Videos werden im
--      Admin unter Kurse & Module hochgeladen; der Player schaltet sie
--      nacheinander frei (90 %-Regel in `lib/module-video.ts`).
--   3. `training_leads`: eigenes CRM-Board für Analysegespräche aus dem
--      Training — getrennt von `discord_leads` (Call-, Termin-, Discord-Funnel).
--   4. `email_sequence_log` kennt die neue Strecke `training` (keine Änderung nötig,
--      `sequence` ist Freitext).
--
-- Idempotent, darf mehrfach laufen.

-- ── 1. Profile ───────────────────────────────────────────────────────────────

alter table public.profiles add column if not exists funnel_quelle text;
alter table public.profiles add column if not exists training_registriert_am timestamptz;
alter table public.profiles add column if not exists funnel_herkunft jsonb;

comment on column public.profiles.funnel_quelle is
  'Über welchen Funnel das Konto entstand, z. B. ''training'' (Free Training, /training). Null = alter Weg.';
comment on column public.profiles.training_registriert_am is
  'Zeitpunkt der Registrierung über /training. Basis der Mailstrecke `training`.';
comment on column public.profiles.funnel_herkunft is
  'Woher die Registrierung kam: { kanal, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, erfasst_am }. kanal = youtube | instagram | tiktok | podcast | google | direkt | sonstige (lib/training/herkunft.ts).';

create index if not exists profiles_training_idx
  on public.profiles (training_registriert_am desc)
  where training_registriert_am is not null;

-- ── 2. Kurs „Kostenloses Training" ───────────────────────────────────────────

insert into public.courses (id, title, slug, description, is_free, sort_order, is_sequential_exempt, created_at)
values (
  '00000000-0000-0000-0000-000000000012',
  'Kostenloses Training',
  'kostenloses-training',
  'In diesem Training zeigen wir dir das komplette System.',
  true,
  -30,
  true,
  now()
)
on conflict (id) do update
  set is_free = true,
      is_sequential_exempt = true,
      slug = excluded.slug;

insert into public.modules (id, course_id, title, description, order_index, is_published, slug)
values (
  '00000000-0000-0000-0000-000000000112',
  '00000000-0000-0000-0000-000000000012',
  'Kostenloses Training',
  'Videos, die aufeinander aufbauen.',
  1,
  true,
  'kostenloses-training'
)
on conflict (id) do update
  set course_id = excluded.course_id,
      is_published = true;

-- ── 3. CRM: Analysegespräche aus dem Training ────────────────────────────────

create table if not exists public.training_leads (
  id                    uuid        primary key default gen_random_uuid(),
  -- Öffentlicher Schlüssel für Calendly (`utm_content`), nicht erratbar.
  token                 text        not null unique default replace(gen_random_uuid()::text, '-', ''),
  user_id               uuid        references auth.users(id) on delete set null,
  name                  text        not null,
  email                 text        not null,
  phone                 text,
  -- Wo im Mitgliederbereich angefragt wurde.
  stelle                text        not null default 'dashboard'
                          check (stelle in ('nach_video_3', 'training', 'programme', 'dashboard')),
  answers               jsonb       not null default '{}'::jsonb,
  -- Kanal der Registrierung (aus profiles.funnel_herkunft), für das Board.
  kanal                 text,
  -- Stand des Trainings beim Anfragen (0–3).
  videos_gesehen        smallint    not null default 0,
  -- Pipeline
  status                text        not null default 'neu'
                          check (status in ('neu', 'termin', 'no_show', 'nachfassen', 'gewonnen', 'verloren')),
  closer                text,
  produkt               text,
  revenue_cents         integer,
  notizen               text,
  -- Calendly
  calendly_event_uri    text,
  calendly_invitee_uri  text,
  termin_am             timestamptz,
  gewonnen_am           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists training_leads_created_idx on public.training_leads (created_at desc);
create index if not exists training_leads_user_idx on public.training_leads (user_id);
create index if not exists training_leads_email_idx on public.training_leads (lower(email));
create index if not exists training_leads_status_idx on public.training_leads (status, created_at desc);

alter table public.training_leads enable row level security;
revoke all on public.training_leads from anon, authenticated;

comment on table public.training_leads is
  'Analysegespräch-Anfragen aus dem Free Training (/training → Mitgliederbereich). Eigenes CRM-Board unter /admin/training. Zugriff nur über den Service-Client.';
