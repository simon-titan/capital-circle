-- 042_phase1_funnel_review.sql
-- Phase 1: Free-Funnel + Bewerbungs-Review
-- Hinweis: 041_* ist durch trading_journal belegt; neue Funnel-Migrationen starten bei 042.

-- Neue Spalten in profiles (additiv — is_admin/is_paid bleiben unangetastet)
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

-- Admin-Vollzugriff (Service-Role-Key umgeht RLS; diese Policy für direkten Client-Zugriff im Admin-Panel)
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
