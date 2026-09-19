-- 074_rls_profiles_lesen.sql
-- nachweis: npm run db:check-rls
--
-- Lesezugriff auf `profiles` auf die eigene Zeile beschraenken (Admins sehen alle).
--
-- Hintergrund: Migration 005 hat die urspruenglichen Policies aus 002 ersetzt,
-- weil deren Admin-Pruefung `profiles` innerhalb einer `profiles`-Policy abfragte
-- und damit in eine Endlosrekursion lief. Als Uebergang entstand
-- `profiles_select_authenticated` mit `using (auth.uid() is not null)`: Jeder
-- angemeldete Nutzer konnte damit saemtliche Profile lesen — samt Stripe-Kunden-ID,
-- Discord-Zugangsdaten, Zahlungs- und Mahnstempeln und interner Admin-Notiz. Weil
-- die Registrierung offen ist, reichte dafuer ein beliebiges neues Konto.
--
-- Was diese Migration tut:
--
--   1. `public.ist_admin()` — prueft, ob der anfragende Nutzer Admin ist. Die
--      Funktion laeuft als Security Definer (Rechte des Eigentuemers, ohne RLS),
--      deshalb kann die neue Policy sie aufrufen, ohne sich selbst erneut
--      auszuloesen. Genau das war der Rekursionsfehler aus 002. `search_path` ist
--      leer und alle Namen sind voll qualifiziert, damit niemand die Funktion ueber
--      ein gleichnamiges Objekt in einem anderen Schema umlenken kann.
--      Ausfuehren darf sie nur `authenticated` (und `service_role`); sie verraet
--      ohnehin nur, ob man selbst Admin ist.
--      Verlaesslich ist das Ergebnis nur zusammen mit Migration 073: Erst deren
--      Schreibschutz verhindert, dass ein Nutzer `is_admin` an seiner eigenen
--      Zeile selbst setzt. 073 muss also vor dieser Datei eingespielt sein.
--
--   2. `profiles_select_authenticated` weicht `profiles_select_eigene_oder_admin`:
--      eigene Zeile oder Admin. Die Admin-Pruefungen in den Policies der anderen
--      Tabellen (`exists (select 1 from profiles p where p.id = auth.uid() and
--      p.is_admin)`) lesen nur die eigene Zeile und funktionieren unveraendert.
--      `lib/supabase/admin-auth.ts` zaehlt in `requireAdminRole` die Owner ueber
--      den Nutzer-Client — das geht weiter, weil der Aufrufer dort bereits Admin ist.
--
--      Code-Stellen, die fremde Profile ueber den Nutzer-Client gelesen haben,
--      sind im selben Branch umgestellt: Die Autorennamen unter News-Kommentaren
--      (`getNewsPostInteractions` in `lib/server-data.ts`) kommen jetzt ueber den
--      Service-Client, und zwar nur Name, Nutzername und Avatar. Alle uebrigen
--      Lesestellen mit Nutzer-Client lesen nachweislich nur die eigene Zeile.
--
--   3. `profiles_insert_own` entfaellt. Profile entstehen ausschliesslich im
--      Registrierungs-Trigger `handle_new_user` (Migration 003, Security Definer);
--      die App legt nirgends ein Profil ueber den Nutzer-Client an. Ohne Policy
--      lehnt RLS jedes INSERT aus der oeffentlichen API ab. Der INSERT-Zweig des
--      Triggers aus 073 bleibt als zweite Sicherung stehen.
--
--   4. `profiles_update_own` bekommt ein ausdrueckliches `with check` und gilt nur
--      noch fuer `authenticated`. An der Wirkung aendert das nichts (ohne `with
--      check` nimmt Postgres die `using`-Bedingung), es steht jetzt nur da.
--
-- Nachweis: Diese Datei erzeugt weder Tabellen noch Spalten, `npm run db:check`
-- kann sie deshalb nicht erkennen. `npm run db:check-rls` prueft die Wirkung mit
-- Wegwerf-Konten gegen die echte Datenbank.
--
-- Wiederholbar: `create or replace function`, `drop policy if exists` vor jedem
-- `create policy`.

-- ── 1. Admin-Pruefung ohne Rekursion ─────────────────────────────────────────

create or replace function public.ist_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

comment on function public.ist_admin() is
  'true, wenn der anfragende Nutzer profiles.is_admin = true hat. Security Definer, damit Policies auf profiles sie ohne Rekursion nutzen koennen (Migration 074).';

-- Supabase vergibt EXECUTE auf neue Funktionen standardmaessig an anon,
-- authenticated und service_role. `anon` braucht sie nicht.
revoke all on function public.ist_admin() from public;
revoke all on function public.ist_admin() from anon;
grant execute on function public.ist_admin() to authenticated;
grant execute on function public.ist_admin() to service_role;

-- ── 2. Lesen: eigene Zeile oder Admin ────────────────────────────────────────

drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_select_eigene_oder_admin" on public.profiles;
create policy "profiles_select_eigene_oder_admin"
  on public.profiles
  for select
  to authenticated
  -- `(select …)` wertet beide Ausdruecke einmal pro Anfrage aus statt einmal pro
  -- Zeile. Bei Admin-Abfragen ueber alle Profile macht das den Unterschied.
  using (id = (select auth.uid()) or (select public.ist_admin()));

-- ── 3. Einfuegen: nur noch ueber den Registrierungs-Trigger ──────────────────

drop policy if exists "profiles_insert_own" on public.profiles;

-- ── 4. Aendern: nur die eigene Zeile (welche Spalten, regelt Trigger 073) ────

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
