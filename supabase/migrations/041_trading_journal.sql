-- Trading Journal: Journale und Trades pro Nutzer (Paid-Gate in der App)

create table if not exists public.trading_journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Eigenkapital',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists idx_trading_journals_user on public.trading_journals (user_id);

create table if not exists public.trading_journal_trades (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.trading_journals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  trade_date date not null,
  trade_time time without time zone,
  weekday text,
  strategy text not null,
  asset text not null,
  session text,
  direction text not null,
  contracts integer not null default 1,
  entry_price numeric,
  sl_ticks integer not null,
  tp_ticks integer not null,
  result_ticks integer not null default 0,
  result_dollar numeric not null default 0,
  rr text,
  order_type text,
  open_position text,
  news_events jsonb not null default '[]'::jsonb,
  news_result text,
  news_timing text,
  emotion_before text,
  emotion_after text,
  notes text,
  screenshot_storage_key text,
  scalp_zones jsonb not null default '[]'::jsonb,
  scalp_pa jsonb not null default '[]'::jsonb,
  ocrr_bias jsonb not null default '[]'::jsonb,
  ocrr_conf jsonb not null default '[]'::jsonb,
  ocrr_vol jsonb not null default '[]'::jsonb,
  naked_zones jsonb not null default '[]'::jsonb,
  naked_bonus jsonb not null default '[]'::jsonb,
  naked_vp jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trading_journal_trades_journal on public.trading_journal_trades (journal_id);
create index if not exists idx_trading_journal_trades_user on public.trading_journal_trades (user_id);
create index if not exists idx_trading_journal_trades_date on public.trading_journal_trades (trade_date desc);

alter table public.trading_journals enable row level security;
alter table public.trading_journal_trades enable row level security;

-- Journals: nur eigene Zeilen
create policy "trading_journals_select_own"
  on public.trading_journals for select
  using (auth.uid() = user_id);

create policy "trading_journals_insert_own"
  on public.trading_journals for insert
  with check (auth.uid() = user_id);

create policy "trading_journals_update_own"
  on public.trading_journals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "trading_journals_delete_own"
  on public.trading_journals for delete
  using (auth.uid() = user_id);

-- Trades: nur eigene user_id; INSERT nur wenn Journal dem Nutzer gehört
create policy "trading_journal_trades_select_own"
  on public.trading_journal_trades for select
  using (auth.uid() = user_id);

create policy "trading_journal_trades_insert_own_journal"
  on public.trading_journal_trades for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.trading_journals j
      where j.id = journal_id and j.user_id = auth.uid()
    )
  );

create policy "trading_journal_trades_update_own"
  on public.trading_journal_trades for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.trading_journals j
      where j.id = journal_id and j.user_id = auth.uid()
    )
  );

create policy "trading_journal_trades_delete_own"
  on public.trading_journal_trades for delete
  using (auth.uid() = user_id);

comment on table public.trading_journals is 'Trading-Journale pro Nutzer (Capital Circle)';
comment on table public.trading_journal_trades is 'Erfasste Trades inkl. Strategie-Tags und optional Screenshot-Key';
