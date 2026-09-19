-- ────────────────────────────────────────────────────────────────────────────
-- 100: Whop-Umzug — Herkunft am Profil, damit der Zugang auch wieder endet
-- ────────────────────────────────────────────────────────────────────────────
--
-- Die letzten 29 zahlenden Mitglieder ziehen von Whop auf unsere Plattform um
-- (`scripts/whop-umzug-import.mjs`, `config/whop-umzug.ts`). Sie bekommen ein
-- Konto mit `is_paid = true`, `membership_tier = 'free'` — wie der
-- Whop-Altbestand — und ein `access_until`: das Ende des Zeitraums, den sie bei
-- Whop bereits bezahlt haben.
--
-- ── Warum es dafür eine eigene Spalte braucht ───────────────────────────────
--
-- Weil der Nachtlauf diesen Zugang wieder beenden muss, und zwar **nur
-- diesen**. Ohne Merkmal bliebe als Erkennung nur das Muster
-- „membership_tier = 'free' und is_paid und access_until in der
-- Vergangenheit". Das trifft heute zufällig die Richtigen, ist aber kein
-- Merkmal, sondern eine Ähnlichkeit: Die 58 Altbestands-Profile aus der ersten
-- Whop-Zeit stehen auf denselben Werten und sollen **nicht** ablaufen; sie
-- haben nur deshalb heute kein `access_until`, weil beim damaligen Import
-- keines gesetzt wurde. Trägt dort irgendwann jemand eines nach, nimmt der
-- Nachtlauf 58 Leuten den Zugang, und niemand findet den Grund.
--
-- Eine Spalte, die sagt „dieser Zugang stammt aus dem Whop-Umzug und endet am
-- hinterlegten Datum", ist die Aussage, die der Nachtlauf tatsächlich braucht.
--
-- Zweiter Nutzen: Sie ist der Empfängerkreis der Umzugs-Kampagne
-- (`app/api/admin/whop-umzug`). Wer angeschrieben wird, steht damit in der
-- Datenbank und nicht in einer CSV auf einem Laptop.
--
-- ── Warum sie in den Schreibschutz gehört ───────────────────────────────────
--
-- Seit Migration 073 setzt ein Trigger die Rechte- und Zahlungsspalten still
-- zurück, wenn jemand sie über die öffentliche API mit seinem eigenen Token
-- ändert. Diese Spalte muss mit hinein, sonst entsteht eine Rechteausweitung
-- über Bande: `is_paid` und `access_until` sind geschützt, aber wer sein
-- eigenes `whop_umzug_am` auf NULL setzt, fällt aus dem Ablauf heraus und
-- behält `is_paid = true` dauerhaft. Die Funktion wird deshalb hier mit
-- `create or replace` neu geschrieben — Wortlaut identisch zu 073, eine Zeile
-- länger.
--
-- Idempotent (`add column if not exists`, `create or replace`, `do nothing`).
-- Ausführen im Supabase-SQL-Editor; es gibt keine Migrationstabelle.
-- Danach `npm run db:check`.

-- ── 1. Die Herkunftsspalte ──────────────────────────────────────────────────

alter table public.profiles
  add column if not exists whop_umzug_am timestamptz;

comment on column public.profiles.whop_umzug_am is
  'Aus dem Whop-Umzug importiert (Zeitpunkt des Imports, NULL = nicht daraus). '
  'Der Nachtlauf beendet den Zugang dieser Konten, sobald access_until vorbei ist '
  'und kein Stripe-Abo besteht. Siehe lib/whop-umzug/ablauf.ts.';

-- Teil-Index: Gefragt wird immer nach „ist gesetzt" (29 Zeilen von mehreren
-- Tausend). Ein voller Index bestünde fast nur aus NULL.
create index if not exists profiles_whop_umzug_am_idx
  on public.profiles (whop_umzug_am)
  where whop_umzug_am is not null;

-- ── 2. Schreibschutz aus 073 um die neue Spalte erweitern ───────────────────
--
-- Unverändert übernommen aus 073_notfall_profiles_schreibschutz.sql, ergänzt um
-- `whop_umzug_am` in beiden Zweigen. Wer 073 liest, findet dort den
-- vollständigen Hintergrund.

create or replace function public.profiles_schreibschutz()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Security Invoker: `current_user` ist die Rolle der Anfrage.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Profile entstehen im Registrierungs-Trigger. Legt ein Nutzer selbst eines
    -- an, dann nur ohne Rechte und ohne Zahlstatus.
    new.is_admin := false;
    new.admin_role := null;
    new.is_paid := false;
    new.membership_tier := 'free';
    new.access_until := null;
    new.stripe_customer_id := null;
    new.lifetime_purchased_at := null;
    new.lifetime_offer_group := null;
    new.whop_umzug_am := null;
    new.application_status := null;
    new.step2_application_status := null;
    new.dunning_admin_note := null;
    new.payment_failed_email_1_sent_at := null;
    new.payment_failed_email_2_sent_at := null;
    new.payment_failed_email_3_sent_at := null;
    new.ht_upsell_email_sent_at := null;
    new.discord_id := null;
    new.discord_username := null;
    new.discord_access_token := null;
    new.discord_refresh_token := null;
    return new;
  end if;

  -- UPDATE: Rechte, Zahlstatus, Zugang, Bewerbungsstatus, Mahn-Stempel.
  new.id := old.id;
  new.created_at := old.created_at;
  new.is_admin := old.is_admin;
  new.admin_role := old.admin_role;
  new.is_paid := old.is_paid;
  new.membership_tier := old.membership_tier;
  new.access_until := old.access_until;
  new.stripe_customer_id := old.stripe_customer_id;
  new.lifetime_purchased_at := old.lifetime_purchased_at;
  new.lifetime_offer_group := old.lifetime_offer_group;
  new.whop_umzug_am := old.whop_umzug_am;
  new.application_status := old.application_status;
  new.step2_application_status := old.step2_application_status;
  new.dunning_admin_note := old.dunning_admin_note;
  new.payment_failed_email_1_sent_at := old.payment_failed_email_1_sent_at;
  new.payment_failed_email_2_sent_at := old.payment_failed_email_2_sent_at;
  new.payment_failed_email_3_sent_at := old.payment_failed_email_3_sent_at;
  new.ht_upsell_email_sent_at := old.ht_upsell_email_sent_at;

  -- Discord: nur Loeschen ist erlaubt (siehe Kopfkommentar in 073).
  if new.discord_id is not null then new.discord_id := old.discord_id; end if;
  if new.discord_username is not null then new.discord_username := old.discord_username; end if;
  if new.discord_access_token is not null then new.discord_access_token := old.discord_access_token; end if;
  if new.discord_refresh_token is not null then new.discord_refresh_token := old.discord_refresh_token; end if;

  return new;
end;
$$;

drop trigger if exists profiles_schreibschutz on public.profiles;
create trigger profiles_schreibschutz
  before insert or update on public.profiles
  for each row execute function public.profiles_schreibschutz();
