-- ────────────────────────────────────────────────────────────────────────────
-- 080: Zahlungsfälle, Aufschub und die Unterhaltung dazu
-- ────────────────────────────────────────────────────────────────────────────
--
-- Übernommen aus MoonTrading (dort 0031 + 0033), Entscheidung Simon vom
-- 19.09.2026: Das Mahnsystem läuft genau wie dort.
--
-- ── Was bis hierher passierte, wenn eine Abbuchung scheiterte ──────────────
--
-- `invoice.payment_failed` schrieb eine Zeile nach `payments`, überschrieb
-- `access_until` mit „jetzt plus 48 Stunden" (auch wenn der Zugang länger lief)
-- und schickte eine Mail. Mail 2 und 3 kamen per Cron nach 24 und 48 Stunden,
-- nach sieben Tagen ging ein Alarm nach Slack. Gemerkt wurde das über drei
-- Zeitstempel am Profil und über `email_sequence_log`, das je Adresse genau
-- **eine** Mahnung pro Stufe kennt: Beim zweiten Ausfall desselben Kunden ging
-- keine einzige Mail mehr raus. Ob der Kunde antworten wollte, stand nirgends.
--
-- ── Was jetzt passiert ─────────────────────────────────────────────────────
--
-- Jede gescheiterte Rechnung ist ein **Fall** mit Betrag, Zahllink, Frist und
-- Verlauf. Tag 0 erste Nachricht (Mail immer, Discord-Direktnachricht dazu),
-- Tag 3 und 5 Erinnerung, Tag 7 Sperre und Warteraum. Der Kunde antwortet über
-- einen Knopf unter der Direktnachricht; beantwortet wird in der Fallakte im
-- Adminbereich.
--
-- ── `stripe_invoice_id` ist der Idempotenzschlüssel ───────────────────────
--
-- Stripe schickt `invoice.payment_failed` bei **jedem** Wiederholungsversuch.
-- Ohne die Eindeutigkeit entstünden mehrere Fälle für eine Rechnung. Ein
-- zweiter Ausfall ist dagegen eine neue Rechnung und damit ein neuer Fall —
-- genau das, was vorher fehlte.
--
-- ── Der Aufschub ist eine Spalte, keine eigene Tabelle ─────────────────────
--
-- Ein Fall hat höchstens einen laufenden. Die **Geschichte** geht dabei nicht
-- verloren: Jede Änderung am Aufschub schreibt eine Zeile in
-- `zahlungsfall_nachricht` mit `kanal = 'system'`.
--
-- ── Die Frist ist eine Spalte und keine Rechnung ───────────────────────────
--
-- Sie liesse sich aus `eroeffnet_am` ableiten, wäre dann aber nicht
-- verhandelbar: Ein Aufschub verschiebt sie, und eine geänderte
-- Stripe-Einstellung gilt nur für neue Fälle, nicht rückwirkend für eine
-- Frist, die einem Kunden bereits genannt wurde.
--
-- ── Zugriff ────────────────────────────────────────────────────────────────
--
-- Deny-by-default: RLS an, absichtlich **keine** Policy, dazu das
-- ausdrückliche `revoke`. Auch keine „select own"-Policy: RLS schränkt Zeilen
-- ein, keine Spalten, und im Verlauf stehen interne Notizen. Geschrieben und
-- gelesen wird ausschliesslich mit dem Service-Client (Webhook, Nachtlauf,
-- Adminbereich nach `requireAdmin`).
--
-- Ausführen im Supabase SQL-Editor. Idempotent, ändert keine bestehenden Daten.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.zahlungsfall (
  id uuid primary key default gen_random_uuid(),

  -- Nicht nullable: Eine Rechnung setzt einen Stripe-Kunden voraus, und den
  -- gibt es bei uns nur mit Profil.
  user_id uuid not null references public.profiles(id) on delete cascade,

  stripe_invoice_id text not null unique,
  stripe_subscription_id text,

  -- Der offene Betrag laut Rechnung (der Kassenzettel, nicht der Vertragswert).
  betrag_cents integer not null,
  waehrung text not null default 'eur',

  -- Wie oft Stripe es schon versucht hat.
  versuche integer not null default 1,

  status text not null default 'offen'
    check (status in ('offen', 'aufschub', 'bezahlt', 'beendet')),

  -- Wann der Zugang ruht, wenn bis dahin nicht bezahlt wurde. Sieben Tage ab
  -- dem ersten Fehlversuch (config/zahlung.ts → FRIST_TAGE). NULL heisst: Es
  -- läuft keine Uhr (Probefall, oder ein geschlossener Fall, auf den der Kunde
  -- noch geantwortet hat).
  frist timestamptz,

  -- Wie viele Erinnerungen schon draussen sind. Ein Zähler, kein Datum: Läuft
  -- der Nachtlauf zweimal an einem Tag, geht die nächste raus oder keine.
  erinnerungen integer not null default 0,
  letzte_erinnerung_am timestamptz,

  -- Stripes hosted_invoice_url: zahlen und Zahlungsmethode ändern in einem
  -- Schritt. Festgehalten, damit die Erinnerung nicht erneut bei Stripe fragt.
  zahlung_url text,

  -- Der Tarifname zum Zeitpunkt des Fehlversuchs, für den Nachrichtentext.
  paket text,

  -- Bis wann darf er zahlen. NULL heisst: kein Aufschub gewährt.
  aufschub_bis timestamptz,
  aufschub_grund text,
  aufschub_von uuid references public.profiles(id) on delete set null,

  eroeffnet_am timestamptz not null default now(),

  -- Wandert nur mit, wenn wirklich jemand etwas geschrieben hat, nicht bei
  -- einer Systemzeile.
  letzte_nachricht_am timestamptz,

  geschlossen_am timestamptz,
  geschlossen_grund text
);

-- „Was ist offen?" ist die Frage, mit der jemand diese Tabelle öffnet.
create index if not exists zahlungsfall_offen_idx
  on public.zahlungsfall (eroeffnet_am desc)
  where geschlossen_am is null;

-- „Wer ist heute fällig?" fragt der Nachtlauf, täglich.
create index if not exists zahlungsfall_frist_idx
  on public.zahlungsfall (frist)
  where geschlossen_am is null and frist is not null;

-- „Welcher Aufschub läuft als Nächstes ab?"
create index if not exists zahlungsfall_aufschub_faellig_idx
  on public.zahlungsfall (aufschub_bis)
  where status = 'aufschub';

create index if not exists zahlungsfall_user_idx
  on public.zahlungsfall (user_id);

create index if not exists zahlungsfall_abo_idx
  on public.zahlungsfall (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.zahlungsfall_nachricht (
  id uuid primary key default gen_random_uuid(),
  fall_id uuid not null references public.zahlungsfall(id) on delete cascade,

  von_admin boolean not null,
  -- NULL bei Systemzeilen und automatischen Nachrichten.
  autor_id uuid references public.profiles(id) on delete set null,

  text text not null,

  -- Wo die Nachricht gelaufen ist. `notiz` und `system` gehen **nie** raus.
  kanal text not null default 'discord'
    check (kanal in ('discord', 'mail', 'notiz', 'system')),

  -- Ob die Direktnachricht tatsächlich angekommen ist. NULL, wo die Frage sich
  -- nicht stellt. Wer Direktnachrichten von Servermitgliedern gesperrt hat,
  -- ist nicht erreichbar — das ist seine Einstellung, kein Fehler.
  zugestellt boolean,

  -- Ob dieselbe Nachricht zusätzlich als Mail rausging. NULL, wo keine Mail
  -- vorgesehen war (etwa eine Antwort aus der Fallakte ohne Mail). Die Mail
  -- ist der verlässliche Weg: Eine Zeile mit „Discord nicht zugestellt" ist
  -- harmlos, solange hier „ja" steht.
  mail_gesendet boolean,

  erstellt_am timestamptz not null default now()
);

create index if not exists zahlungsfall_nachricht_fall_idx
  on public.zahlungsfall_nachricht (fall_id, erstellt_am);

-- ── Zugriff: deny-by-default ───────────────────────────────────────────────

alter table public.zahlungsfall enable row level security;
alter table public.zahlungsfall_nachricht enable row level security;

revoke all on public.zahlungsfall from anon, authenticated;
revoke all on public.zahlungsfall_nachricht from anon, authenticated;

comment on table public.zahlungsfall is
  'Eine gescheiterte Abbuchung, die Unterhaltung dazu und der gewährte Aufschub. '
  'Eröffnet der Stripe-Webhook, der Nachtlauf erinnert (Tag 3/5) und sperrt (Tag 7), '
  'bearbeitet wird auf /admin/zahlungsstoerungen.';

comment on column public.zahlungsfall.frist is
  'Wann der Zugang ruht, wenn bis dahin nicht bezahlt wurde. Sieben Tage ab dem '
  'ersten Fehlversuch, passend zu Stripes Wiederholungen. Ein Aufschub verschiebt sie.';
