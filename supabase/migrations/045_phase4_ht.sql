-- 045_phase4_ht.sql
-- Phase 4: High-Ticket-Bewerbungen (1-on-1)

create table if not exists public.high_ticket_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  name text,
  whatsapp_number text,
  answers jsonb not null,
  budget_tier text not null
    check (budget_tier in ('under_2000', 'over_2000')),
  contacted_at timestamptz,
  call_scheduled_at timestamptz,
  outcome text
    check (outcome in ('closed_won','closed_lost','no_show','pending', null))
    default 'pending',
  internal_notes text,
  created_at timestamptz not null default now()
);

create index if not exists ht_applications_budget_idx on public.high_ticket_applications(budget_tier);
create index if not exists ht_applications_created_at_idx on public.high_ticket_applications(created_at desc);
create index if not exists ht_applications_outcome_idx on public.high_ticket_applications(outcome);

alter table public.high_ticket_applications enable row level security;

drop policy if exists "Admin full access ht_applications" on public.high_ticket_applications;
create policy "Admin full access ht_applications" on public.high_ticket_applications
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
