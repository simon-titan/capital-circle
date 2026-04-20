-- 044_phase3_churn.sql
-- Phase 3: Churn-Prevention / Dunning / Offboarding-Survey

-- Neue Spalten in profiles für Churn-/Dunning-Tracking
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
