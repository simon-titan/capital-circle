-- Schreibschutz fuer Rechte- und Zahlungsspalten in `profiles`.
--
-- Hintergrund: Seit Migration 005 darf jeder angemeldete Nutzer seine eigene
-- Profilzeile aendern (`profiles_update_own`), ohne jede Einschraenkung der
-- Spalten. Damit waren auch die Spalten beschreibbar, an denen Adminrechte,
-- Zahlstatus und Zugang haengen. Diese Migration schliesst das als Sofortmassnahme;
-- die Lese-Policy (`profiles_select_authenticated`) wird separat eingeschraenkt.
--
-- Wie es wirkt: Ein Trigger vor INSERT/UPDATE greift nur, wenn die Anfrage mit
-- der Rolle `authenticated` oder `anon` laeuft — also ueber die oeffentliche
-- Datenbank-API mit einem Nutzer-Token. Webhooks, Crons und Admin-Routen
-- schreiben mit dem Service-Client (`service_role`), der Registrierungs-Trigger
-- `handle_new_user` laeuft als Security Definer — beide bleiben unberuehrt.
--
-- Bei UPDATE werden geschuetzte Spalten still auf den alten Wert zurueckgesetzt,
-- statt die Anfrage abzulehnen. Grund: Mehrere Stellen schreiben legitim ueber
-- den Nutzer-Client (Streak, Lernzeit, letzter Login, Onboarding, Profilformular).
-- Wuerde der Trigger werfen, fiele jede dieser Anfragen komplett aus, sobald sie
-- einmal eine geschuetzte Spalte mitschickt. So gehen sie durch, nur ohne Wirkung
-- auf die geschuetzten Felder.
--
-- Discord-Felder: Das Profilformular und die Trennen-Route setzen sie ueber den
-- Nutzer-Client auf NULL. Loeschen bleibt deshalb erlaubt, Setzen nicht — gesetzt
-- werden sie ausschliesslich im OAuth-Callback mit dem Service-Client.
--
-- Wiederholbar: `create or replace` und `drop trigger if exists`.

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
  new.application_status := old.application_status;
  new.step2_application_status := old.step2_application_status;
  new.dunning_admin_note := old.dunning_admin_note;
  new.payment_failed_email_1_sent_at := old.payment_failed_email_1_sent_at;
  new.payment_failed_email_2_sent_at := old.payment_failed_email_2_sent_at;
  new.payment_failed_email_3_sent_at := old.payment_failed_email_3_sent_at;
  new.ht_upsell_email_sent_at := old.ht_upsell_email_sent_at;

  -- Discord: nur Loeschen ist erlaubt (siehe Kopfkommentar).
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
