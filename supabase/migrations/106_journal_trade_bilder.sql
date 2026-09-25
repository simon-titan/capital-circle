-- 106_journal_trade_bilder.sql
--
-- Trading Journal: jeder Trade ein eigener Eintrag (25.09.2026).
--
-- 1. `journal_trade_bilder` — mehrere Bilder pro Trade (Chart vor dem Entry,
--    Exit-Screenshot, Bookmap …). Die Dateien liegen in R2 unter
--    `journal/<user_id>/<trade_id>/<uuid>.<ext>`. Angelegt wird eine Zeile nur
--    von `app/api/journal/trades/[id]/bilder` mit dem Service-Schlüssel, nachdem
--    die Route Eigentum und Schlüssel-Präfix geprüft hat. Deshalb gibt es hier
--    keine Insert-Policy: Ein Nutzer soll keine fremden Schlüssel an seinen
--    Trade hängen können.
--    Die Altspalte `journal_trades.screenshot_storage_key` war am 25.09.2026 in
--    keiner Zeile befüllt — es gibt nichts zu übernehmen, sie bleibt ungenutzt.
--
-- 2. `journal_trade_geloescht` — merkt sich den `dedupe_key` gelöschter
--    importierter Trades. Ohne das käme ein gelöschter Trade beim erneuten
--    Import derselben (oder einer überlappenden) CSV zurück, weil der Import
--    nur gegen die noch vorhandenen Trades dedupliziert.
--
-- Idempotent; kann gefahrlos erneut eingespielt werden.

create table if not exists public.journal_trade_bilder (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.journal_trades(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_key text not null,
  content_type text not null,
  bytes integer,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists journal_trade_bilder_trade_idx
  on public.journal_trade_bilder (trade_id, position);

alter table public.journal_trade_bilder enable row level security;

drop policy if exists "journal_trade_bilder_select_own" on public.journal_trade_bilder;
create policy "journal_trade_bilder_select_own"
  on public.journal_trade_bilder for select
  using (auth.uid() = user_id);

drop policy if exists "journal_trade_bilder_delete_own" on public.journal_trade_bilder;
create policy "journal_trade_bilder_delete_own"
  on public.journal_trade_bilder for delete
  using (auth.uid() = user_id);

comment on table public.journal_trade_bilder is 'Trading-Journal v2: Bilder pro Trade (R2-Schlüssel), Insert nur über die API';

create table if not exists public.journal_trade_geloescht (
  account_id uuid not null references public.journal_accounts(id) on delete cascade,
  dedupe_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  geloescht_am timestamptz not null default now(),
  primary key (account_id, dedupe_key)
);

alter table public.journal_trade_geloescht enable row level security;

drop policy if exists "journal_trade_geloescht_select_own" on public.journal_trade_geloescht;
create policy "journal_trade_geloescht_select_own"
  on public.journal_trade_geloescht for select
  using (auth.uid() = user_id);

drop policy if exists "journal_trade_geloescht_insert_own_account" on public.journal_trade_geloescht;
create policy "journal_trade_geloescht_insert_own_account"
  on public.journal_trade_geloescht for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.journal_accounts a
      where a.id = account_id and a.user_id = auth.uid()
    )
  );

comment on table public.journal_trade_geloescht is 'Trading-Journal v2: dedupe_keys gelöschter Import-Trades, damit ein Re-Import sie nicht zurückholt';
