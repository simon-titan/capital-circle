-- 043_phase2_stripe.sql
-- Phase 2: Stripe Subscriptions / Lifetime / Payments / Webhook-Idempotenz

-- Neue Spalten in profiles (additiv — is_paid bleibt unangetastet, wird per Sync-Regel kohärent gehalten)
alter table public.profiles
  add column if not exists stripe_customer_id text unique,
  add column if not exists membership_tier text not null default 'free'
    check (membership_tier in ('free', 'monthly', 'lifetime', 'ht_1on1')),
  add column if not exists access_until timestamptz,
  add column if not exists lifetime_purchased_at timestamptz;

create index if not exists profiles_stripe_customer_id_idx on public.profiles(stripe_customer_id);
create index if not exists profiles_membership_tier_idx on public.profiles(membership_tier);

-- Subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,
  stripe_price_id text not null,
  status text not null
    check (status in ('active','trialing','past_due','canceled','incomplete','incomplete_expired','unpaid','paused')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists subscriptions_status_idx on public.subscriptions(status);
create index if not exists subscriptions_stripe_id_idx on public.subscriptions(stripe_subscription_id);

-- Payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  stripe_payment_intent_id text unique,
  stripe_invoice_id text unique,
  stripe_charge_id text,
  amount_cents integer not null,
  currency text not null default 'eur',
  status text not null,
  failure_reason text,
  attempt_count integer default 1,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_created_at_idx on public.payments(created_at desc);

-- Webhook-Idempotenz
create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  received_at timestamptz not null default now()
);

-- updated_at-Trigger (generisch wiederverwendbar)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- RLS
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists "Users read own subs" on public.subscriptions;
create policy "Users read own subs" on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "Users read own payments" on public.payments;
create policy "Users read own payments" on public.payments
  for select using (auth.uid() = user_id);

drop policy if exists "Admin full access subscriptions" on public.subscriptions;
create policy "Admin full access subscriptions" on public.subscriptions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Admin full access payments" on public.payments;
create policy "Admin full access payments" on public.payments
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- stripe_webhook_events: kein Client-Zugriff, nur Service-Role (RLS aktiv, keine Policy = deny-by-default)
