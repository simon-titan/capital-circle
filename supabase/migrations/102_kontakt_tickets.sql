-- 102_kontakt_tickets.sql
--
-- Kontaktformular ohne Anmeldung (`/kontakt`): Wer sich nicht einloggen kann,
-- bekommt ein Ticket im selben System wie die Mitglieder. Dieselben Tabellen,
-- derselbe Admin-Bereich (`/admin/tickets`), dieselbe Antwortzeit-Messung.
--
-- ── Was sich ändert ─────────────────────────────────────────────────────────
--
-- `support_tickets.user_id` darf leer sein. Statt des Kontos tragen Tickets aus
-- dem Formular `contact_email` und `contact_name`. Eine Prüfbedingung stellt
-- sicher, dass jedes Ticket mindestens einen von beiden Absendern hat.
--
-- `zugangs_token` ist das Geheimnis hinter dem Link, mit dem die Person ihren
-- Verlauf ohne Konto wiedersieht (`/kontakt/<id>?t=<token>`). Es ist eine
-- Zufalls-UUID und wird nur in der Bestätigungsmail und direkt nach dem
-- Absenden ausgegeben.
--
-- `ip_hash` ist die gehashte Absenderadresse (HMAC, nicht umkehrbar) und dient
-- allein der Drosselung gegen Missbrauch. Es steht nie eine Klartext-IP in
-- der Tabelle.
--
-- ── RLS ─────────────────────────────────────────────────────────────────────
--
-- Bleibt unverändert. Anonyme Tickets gehören keinem `auth.uid()`; die
-- Auswahl- und Einfüge-Richtlinien von Migration 063 greifen für sie nie.
-- Angelegt, gelesen und beantwortet werden sie ausschließlich über den
-- Service-Client der API-Routen (`/api/kontakt`) und den Admin-Bereich.

alter table support_tickets alter column user_id drop not null;

alter table support_tickets add column if not exists contact_email text;
alter table support_tickets add column if not exists contact_name text;
alter table support_tickets add column if not exists zugangs_token uuid not null default gen_random_uuid();
alter table support_tickets add column if not exists quelle text not null default 'mitglied';
alter table support_tickets add column if not exists ip_hash text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'support_tickets_absender_check') then
    alter table support_tickets
      add constraint support_tickets_absender_check
      check (user_id is not null or contact_email is not null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'support_tickets_quelle_check') then
    alter table support_tickets
      add constraint support_tickets_quelle_check
      check (quelle in ('mitglied', 'kontakt'));
  end if;
end $$;

create index if not exists idx_support_tickets_contact_email
  on support_tickets (contact_email, created_at desc)
  where contact_email is not null;

create index if not exists idx_support_tickets_ip_hash
  on support_tickets (ip_hash, created_at desc)
  where ip_hash is not null;

create index if not exists idx_support_tickets_quelle
  on support_tickets (quelle, created_at desc);
