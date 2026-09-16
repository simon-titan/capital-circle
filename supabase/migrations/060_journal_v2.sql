-- Trading Journal v2: Import- & Analytics-Journal (Paid-Only).
--
-- Bewusst getrennt von 041_trading_journal.sql: das klassische Journal
-- (trading_journals / trading_journal_trades) bleibt unverändert und wandert
-- lediglich auf /journal-klassisch. Hier entstehen eigene Tabellen für
-- geschlossene Round-Trip-Trades, die entweder aus einem Broker-CSV
-- rekonstruiert oder manuell erfasst werden.

-- ── Konten / Journale ───────────────────────────────────────────────────────────
create table if not exists public.journal_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Eigenkapital',
  broker text,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists idx_journal_accounts_user on public.journal_accounts (user_id);

-- ── Import-Batches: Idempotenz + Undo (Löschen kaskadiert die Trades) ───────────
create table if not exists public.journal_import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.journal_accounts (id) on delete cascade,
  source text not null default 'tradovate_csv',
  file_name text,
  file_hash text,
  timezone text not null default 'Europe/Berlin',
  row_count integer not null default 0,
  trade_count integer not null default 0,
  inserted_count integer not null default 0,
  skipped_count integer not null default 0,
  open_positions_count integer not null default 0,
  status text not null default 'processing'
    check (status in ('processing', 'done', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_journal_import_batches_user on public.journal_import_batches (user_id);
create index if not exists idx_journal_import_batches_account on public.journal_import_batches (account_id);

-- Ganzdatei-Idempotenz pro Konto. Partial, damit mehrere NULL-Hashes koexistieren.
create unique index if not exists uq_journal_import_batches_file
  on public.journal_import_batches (account_id, file_hash)
  where file_hash is not null;

-- ── Trades: ausschliesslich geschlossene Round-Trips ────────────────────────────
create table if not exists public.journal_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.journal_accounts (id) on delete cascade,
  source text not null default 'manual'
    check (source in ('manual', 'tradovate_csv')),
  symbol text not null,
  contract text,
  direction text not null check (direction in ('long', 'short')),
  qty numeric not null check (qty > 0),
  entry_price numeric not null,
  exit_price numeric not null,
  entry_time timestamptz not null,
  exit_time timestamptz not null,
  trade_date date not null,
  point_value numeric not null,
  gross_pnl numeric not null,
  fees numeric,
  net_pnl numeric generated always as (gross_pnl - coalesce(fees, 0)) stored,
  notes text,
  screenshot_storage_key text,
  tags jsonb not null default '[]'::jsonb,
  external_ids jsonb not null default '[]'::jsonb,
  import_batch_id uuid references public.journal_import_batches (id) on delete cascade,
  dedupe_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_journal_trades_account_date
  on public.journal_trades (account_id, trade_date desc);
create index if not exists idx_journal_trades_user on public.journal_trades (user_id);
create index if not exists idx_journal_trades_batch on public.journal_trades (import_batch_id);

-- Dedupe nur für Importe. Manuelle Trades haben dedupe_key = NULL und
-- kollidieren daher nie (Postgres behandelt NULLs im Unique-Index als distinct).
create unique index if not exists uq_journal_trades_dedupe
  on public.journal_trades (account_id, dedupe_key)
  where dedupe_key is not null;

-- ── RLS ────────────────────────────────────────────────────────────────────────
alter table public.journal_accounts enable row level security;
alter table public.journal_import_batches enable row level security;
alter table public.journal_trades enable row level security;

-- Konten: nur eigene Zeilen
create policy "journal_accounts_select_own"
  on public.journal_accounts for select
  using (auth.uid() = user_id);

create policy "journal_accounts_insert_own"
  on public.journal_accounts for insert
  with check (auth.uid() = user_id);

create policy "journal_accounts_update_own"
  on public.journal_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "journal_accounts_delete_own"
  on public.journal_accounts for delete
  using (auth.uid() = user_id);

-- Batches: eigene user_id; INSERT nur wenn das Konto dem Nutzer gehört
create policy "journal_import_batches_select_own"
  on public.journal_import_batches for select
  using (auth.uid() = user_id);

create policy "journal_import_batches_insert_own_account"
  on public.journal_import_batches for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.journal_accounts a
      where a.id = account_id and a.user_id = auth.uid()
    )
  );

create policy "journal_import_batches_update_own"
  on public.journal_import_batches for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "journal_import_batches_delete_own"
  on public.journal_import_batches for delete
  using (auth.uid() = user_id);

-- Trades: eigene user_id; INSERT/UPDATE nur wenn das Konto dem Nutzer gehört
create policy "journal_trades_select_own"
  on public.journal_trades for select
  using (auth.uid() = user_id);

create policy "journal_trades_insert_own_account"
  on public.journal_trades for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.journal_accounts a
      where a.id = account_id and a.user_id = auth.uid()
    )
  );

create policy "journal_trades_update_own"
  on public.journal_trades for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.journal_accounts a
      where a.id = account_id and a.user_id = auth.uid()
    )
  );

create policy "journal_trades_delete_own"
  on public.journal_trades for delete
  using (auth.uid() = user_id);

comment on table public.journal_accounts is 'Trading-Journal v2: Konten/Journale pro Nutzer';
comment on table public.journal_import_batches is 'Trading-Journal v2: ein Eintrag pro hochgeladener Broker-Datei (Idempotenz + Undo)';
comment on table public.journal_trades is 'Trading-Journal v2: geschlossene Round-Trip-Trades (Import oder manuell)';
comment on column public.journal_trades.dedupe_key is 'Deterministischer Schlüssel importierter Trades; NULL bei manueller Erfassung';
comment on column public.journal_trades.point_value is '$ pro Preispunkt, primär aus Notional Value der CSV abgeleitet';
