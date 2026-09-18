-- 071_lifetime_freischaltung.sql
--
-- Lifetime wieder verkaeuflich machen — aber nur nach innen.
--
-- Grundregel: Wer eine normale, aktive Mitgliedschaft hat, darf Lifetime
-- kaufen. Es gibt keinen oeffentlichen Preis und keinen Link von der
-- Landingpage; das Angebot existiert ausschliesslich im Mitgliederbereich.
--
-- Zwei Stellschrauben, damit sich das gezielt steuern laesst:
--
--   1. `profiles.lifetime_offer_group` — eine Textspalte statt eines Bools,
--      damit sich mehrere Gruppen unterscheiden lassen. Ein spaeter
--      importiertes Segment (z. B. 'whop-import-2026') bekommt seinen eigenen
--      Namen und kann als Ganzes freigeschaltet oder wieder entzogen werden.
--      NULL heisst: keine Sondergruppe.
--
--   2. `app_settings.lifetime_offer_enabled` — der globale Schalter. Er liegt
--      in der Datenbank und nicht in einer Umgebungsvariable, damit er sich
--      ohne Deployment umlegen laesst. **Auslieferungszustand: an.**
--
-- Die Reihenfolge der Pruefung steht in `lib/access-control/lifetime-offer.ts`:
-- Schalter an -> jedes zahlende Mitglied. Schalter aus -> nur Gruppen.
-- Ohne aktives, zahlendes Abo sieht es niemand.

-- ── 1. Freischalt-Gruppe am Profil ──────────────────────────────────────────

alter table public.profiles
  add column if not exists lifetime_offer_group text;

comment on column public.profiles.lifetime_offer_group is
  'Freischalt-Gruppe fuer das Lifetime-Angebot (NULL = keine Sondergruppe). Greift nur, wenn der globale Schalter app_settings.lifetime_offer_enabled aus ist.';

-- Teil-Index: Gesucht wird immer nach einer bestimmten Gruppe, nie nach NULL.
-- Ein voller Index waere zu 99 % aus NULL-Eintraegen von Mitgliedern ohne
-- Sondergruppe.
create index if not exists profiles_lifetime_offer_group_idx
  on public.profiles (lifetime_offer_group)
  where lifetime_offer_group is not null;

-- ── 2. Globaler Schalter ────────────────────────────────────────────────────
--
-- `app_settings` stammt aus 064 (Wartungsmodus): key/value als jsonb, oeffentlich
-- lesbar, schreibbar nur fuer Admins. `do nothing` bei Konflikt, damit ein
-- zweiter Durchlauf einen bereits von Hand ausgeschalteten Schalter nicht
-- wieder anknipst.

insert into public.app_settings (key, value)
values ('lifetime_offer_enabled', jsonb_build_object('enabled', true))
on conflict (key) do nothing;
