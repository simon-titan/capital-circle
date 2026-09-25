-- 105_tradingview_zugang.sql
--
-- TradingView-Zugang zum Invite-only-Indikator (25.09.2026).
--
-- Mitglieder tragen unter `/tools/tradingview` ihren TradingView-Benutzernamen
-- ein und fordern den Zugang an. Freigeschaltet wird von Hand auf TradingView
-- (TradingView hat für Invite-only-Scripts keine offizielle API); hier steht,
-- wer angefragt hat, wer frei ist und wem der Zugang wieder entzogen werden muss.
--
-- Ablauf der Stände:
--   angefragt     → Mitglied hat den Namen eingetragen, Team schaltet frei
--   aktiv         → Team hat auf TradingView freigeschaltet
--   entzug_offen  → Zugang zur Plattform ist beendet (Nachtlauf), Team muss
--                   den Namen auf TradingView wieder austragen
--   entzogen      → erledigt; zahlt das Mitglied wieder, fragt es neu an
--
-- Den Übergang aktiv → entzug_offen setzt ausschließlich der tägliche Cron
-- (`app/api/cron/taeglich`), nach derselben Regel wie Institut und Discord:
-- `is_paid || is_admin`. Damit sind Kündigung, Zahlungsausfall, Widerruf und
-- das Ende der Whop-Übergangszeit ohne eigene Webhook-Haken abgedeckt.
--
-- Zugriff: RLS an. Das Mitglied darf die eigene Zeile lesen, geschrieben wird
-- nur über `/api/tradingview` und `/api/admin/tradingview` mit dem
-- Service-Client — so kann niemand sich selbst auf `aktiv` setzen.
--
-- Idempotent: mehrfach ausführbar.

create table if not exists public.tradingview_zugaenge (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tv_benutzername text not null,
  status text not null default 'angefragt',
  angefragt_am timestamptz not null default now(),
  freigegeben_am timestamptz,
  entzug_angefordert_am timestamptz,
  entzogen_am timestamptz,
  bearbeitet_von uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.tradingview_zugaenge
  drop constraint if exists tradingview_zugaenge_status_check;
alter table public.tradingview_zugaenge
  add constraint tradingview_zugaenge_status_check
  check (status in ('angefragt', 'aktiv', 'entzug_offen', 'entzogen'));

create index if not exists tradingview_zugaenge_status_idx
  on public.tradingview_zugaenge (status);

alter table public.tradingview_zugaenge enable row level security;

drop policy if exists tradingview_zugaenge_select_own on public.tradingview_zugaenge;
create policy tradingview_zugaenge_select_own
  on public.tradingview_zugaenge
  for select
  to authenticated
  using (auth.uid() = user_id);
