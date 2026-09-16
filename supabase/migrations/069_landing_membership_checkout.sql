-- 069_landing_membership_checkout.sql
-- Sales-Landing auf "/" mit Gast-Checkout: neue Abo-Laufzeiten, Trichter-Tabelle,
-- Bewertungen der Mitgliedschafts-Landing.
--
-- Additiv gehalten. Migration 043 legt `profiles.membership_tier` per
-- `add column if not exists` samt CHECK an — dieser Block ist auf einer bereits
-- deployten Datenbank ein No-op, weil die Spalte existiert. Eine nachtraegliche
-- Aenderung MUSS deshalb hier stehen und darf 043 nicht editieren.

-- ── 1. Laufzeiten 'quarterly' und 'yearly' erlauben ─────────────────────────
--
-- Der CHECK aus 043 stand inline an der Spalte und traegt daher einen von
-- Postgres vergebenen Namen (ueblicherweise `profiles_membership_tier_check`).
-- Der DO-Block sucht ihn ueber den Katalog statt ihn zu raten: Wurde die Spalte
-- irgendwann von Hand angefasst, heisst er woanders anders, und ein hart
-- verdrahtetes DROP wuerde still danebengreifen.
--
-- 'lifetime' bleibt in der Liste. Der Plan ist aus dem Verkauf genommen, aber
-- Bestandskunden tragen den Wert, und ein Profil-Update wuerde sonst scheitern.
do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'profiles'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%membership_tier%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end if;

  alter table public.profiles
    add constraint profiles_membership_tier_check
    check (membership_tier in ('free', 'monthly', 'quarterly', 'yearly', 'lifetime', 'ht_1on1'));
end
$$;

-- ── 2. Trichter der Kasse ───────────────────────────────────────────────────
--
-- Eine Zeile pro Klick auf "/go/<plan>". Ohne sie laesst sich ein Kaufabbruch
-- nicht beziffern: Stripe kennt jede Session, aber weder unser Plan-Kuerzel
-- noch die Herkunft (`?src=`), und alle Sessions ueber die API abzufragen waere
-- bei jeder Auswertung ein voller Durchlauf.
--
-- `id` ist die Stripe-Session-ID und damit zugleich der Idempotenzschluessel:
-- Ein zweiter Aufruf desselben Webhooks kann keine zweite Zeile erzeugen.
create table if not exists public.checkout_sessions (
  id text primary key,
  plan text not null check (plan in ('monthly', 'quarterly', 'yearly')),
  status text not null default 'started'
    check (status in ('started', 'completed', 'canceled', 'expired')),
  -- Nur gesetzt, wenn beim Start bereits jemand eingeloggt war (Upgrade aus
  -- dem Mitgliederbereich). Beim Gast-Checkout bleibt die Spalte leer — das
  -- Konto entsteht erst nach der Zahlung.
  user_id uuid references public.profiles(id) on delete set null,
  src text,
  von_pfad text,
  bezahlt_am timestamptz,
  abgebrochen_am timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists checkout_sessions_status_idx on public.checkout_sessions(status);
create index if not exists checkout_sessions_created_at_idx on public.checkout_sessions(created_at desc);

-- Kein Client-Zugriff: Die Tabelle wird ausschliesslich vom Service-Role-Client
-- geschrieben (Route-Handler, Webhook) und im Adminbereich gelesen. RLS aktiv
-- ohne Policy heisst deny-by-default — dieselbe Politik wie bei
-- `stripe_webhook_events` (Migration 043).
alter table public.checkout_sessions enable row level security;

-- ── 3. Bewertungen der Mitgliedschafts-Landing ──────────────────────────────
--
-- Die Landing auf "/" liest ueber `landing_slug = 'membership'`. Ohne Zeilen
-- faellt `ReviewSection` auf `config/landing-config.ts` zurueck, und dort steht
-- Text ueber den kostenlosen Kurs — auf einer Verkaufsseite fuer 99 Euro der
-- falsche Inhalt. Die Texte sind Platzhalter aus dem Bestand von '/bewerbung'
-- und gehoeren vor dem Go-live gegen echte Bewertungen getauscht.
insert into public.landing_reviews (name, rating, title, body, date_label, avatar_url, landing_slug, sort_order)
select v.name, v.rating, v.title, v.body, v.date_label, v.avatar_url, 'membership', v.sort_order
from (values
  ('Maximilian R.', 5, 'Endlich ein strukturierter Ansatz',
   'Ich habe vorher unzählige YouTube-Videos und Kurse konsumiert — immer das gleiche oberflächliche Zeug. Capital Circle hat mir zum ersten Mal gezeigt, wie professionelles Trading wirklich funktioniert. Das Fundament stimmt.',
   'März 2026', '/client-pb/1765279404415.jpg', 1),
  ('Leon K.', 5, 'Mehr als erwartet',
   'Ich war skeptisch, ob ein Programm wirklich diesen Mehrwert liefern kann. Aber Emre gibt alles — kein Fluff, kein Upsell-Druck. Einfach ehrliches Wissen, das mir direkt geholfen hat meine Drawdowns zu reduzieren.',
   'April 2026', '/client-pb/393d1b15978eed96285cf196b2f51eda.avif', 2),
  ('Jonas T.', 5, 'Community macht den Unterschied',
   'Das Onboarding war top, aber was mich wirklich überzeugt hat ist die Community. Trader, die tatsächlich wissen wovon sie reden. Kein Spam, keine Signale — nur echter Austausch auf hohem Niveau.',
   'Februar 2026', '/client-pb/4208db19763848b131989eadba9899aa.avif', 3),
  ('Niklas W.', 5, 'Die Live-Sessions sind der Unterschied',
   'Zu sehen, wie jemand vor dem Einstieg entscheidet statt danach zu erklären, hat bei mir mehr bewegt als jedes Video. Seit ich die Regeln aus den Sessions selbst fahre, sind meine Wochen endlich vergleichbar.',
   'Mai 2026', '/client-pb/user_6819319_6ec853ff-5777-4398-8fcc-06e2621cbcf8.avif', 4)
) as v(name, rating, title, body, date_label, avatar_url, sort_order)
where not exists (
  select 1 from public.landing_reviews where landing_slug = 'membership'
);
