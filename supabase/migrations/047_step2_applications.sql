-- Step-2-Bewerbung: Erweiterte Bewerbung (11 Fragen) für approved Free-Nutzer
-- Analog zu high_ticket_applications — Antworten als JSONB für flexible Fragen-Config.

-- 1. Tabelle
create table if not exists public.step2_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create unique index if not exists step2_applications_user_id_unique
  on public.step2_applications (user_id);

-- 2. Profil-Feld für schnelles Gating in proxy.ts / Banner
alter table public.profiles
  add column if not exists step2_application_status text
  check (step2_application_status is null or step2_application_status in ('pending', 'approved', 'rejected'));

-- 3. RLS
alter table public.step2_applications enable row level security;

create policy "Users can read own step2 application"
  on public.step2_applications for select
  using (auth.uid() = user_id);

create policy "Users can insert own step2 application"
  on public.step2_applications for insert
  with check (auth.uid() = user_id);

create policy "Admins can read all step2 applications"
  on public.step2_applications for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can update step2 applications"
  on public.step2_applications for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
