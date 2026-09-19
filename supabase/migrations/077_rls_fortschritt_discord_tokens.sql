-- 077_rls_fortschritt_discord_tokens.sql
-- nachweis: npm run db:check-rls
--
-- Zwei Nachzuegler aus dem RLS-Audit (19.09.2026). Setzt Migration 076 voraus
-- (`public.hat_zugang()`, `public.modul_ist_frei()`).
--
-- ── Teil 1: user_progress — nur eigene Zeilen, nur zugaengliche Module ──────
--
-- Hintergrund: Die Schreib-Policies aus Migration 030 pruefen nur, dass die
-- Zeile dem Nutzer gehoert. Ueber die oeffentliche Datenbank-API konnte damit
-- jedes Konto Fortschritt zu beliebigen Modulen anlegen — auch zu Modulen, auf
-- die es keinen Zugang hat — und `completed` wieder auf false setzen oder
-- Zeilen loeschen, was die App nie tut.
--
-- Wer schreibt heute (abgeglichen mit dem Code):
--   - `POST /api/progress` mit dem Nutzer-Client, als Upsert auf
--     (user_id, module_id), fuer das Modul, das der Nutzer gerade ansieht.
--   - `transferVideoProgress` (lib/progress-transfer.ts) aus zwei Admin-Routen
--     mit dem Nutzer-Client eines Admins, fuer fremde Zeilen.
--   Geloescht wird ueber den Nutzer-Client nirgends.
--
-- Was sich aendert:
--   1. Anlegen und Aendern nur fuer die eigene Zeile UND nur fuer Module, die
--      das Konto oeffnen darf: mit Zugang (`hat_zugang()`) alle, ohne Zahlung
--      nur Module aus Free-Kursen. Admins wie bisher alles.
--   2. Loeschen nur noch fuer Admins.
--   3. Ein Trigger haelt die Werte plausibel, ohne Anfragen abzulehnen (gleiche
--      Haltung wie der Schreibschutz aus 073 — ein Fortschritts-Ping, der wegen
--      eines Randwerts scheitert, waere fuer den Nutzer ein verlorener Stand):
--        - `completed` faellt nie von true auf false zurueck, `completed_at`
--          bleibt beim ersten Abschluss (so haelt es `/api/progress` ohnehin),
--        - Nutzer und Modul einer Zeile sind nicht umzuhaengen,
--        - Sekunden nicht negativ, Quiz-Ergebnis zwischen 0 und 100.
--
-- Was bewusst NICHT geht: Ob ein Modul „abgeschlossen“ ist, meldet der Browser
-- (angesehene Sekunden, Quiz bestanden). Die Datenbank kann das nicht
-- nachpruefen, ohne die Wiedergabe selbst mitzuschreiben. Die sequenzielle
-- Freischaltung bleibt damit fuer Konten mit Zugang umgehbar — sie ist eine
-- Lernhilfe, keine Bezahlschranke. Konten ohne Zahlung erreichen darueber
-- nichts, weil sie zu bezahlten Modulen gar keinen Fortschritt mehr schreiben
-- und die Inhalte ohnehin nicht lesen koennen (076).
--
-- ── Teil 2: Discord-OAuth-Tokens nicht mehr aufbewahren ─────────────────────
--
-- Der OAuth-Callback (`app/api/discord/callback`) speicherte Access- und
-- Refresh-Token doppelt im Klartext: in `profiles` und in
-- `discord_connections`. Gebraucht wird das Access-Token nur im Callback selbst
-- (Server-Beitritt ueber die Bot-API), danach liest es kein Code mehr; das
-- Refresh-Token wurde nie verwendet. Ein aufbewahrtes Token ist nur Risiko:
-- Wer es in die Haende bekommt, handelt im Namen des Discord-Kontos.
-- Der Callback schreibt sie ab diesem Branch nicht mehr; diese Migration leert
-- die vorhandenen. Die Spalten bleiben stehen, weil Profilformular und
-- Trennen-Route sie noch auf NULL setzen.
--
-- Nachweis: Diese Datei erzeugt weder Tabellen noch Spalten, `npm run db:check`
-- kann sie deshalb nicht erkennen. `npm run db:check-rls` prueft die Wirkung
-- (Fortschritt schreiben mit Wegwerf-Konten, Anzahl gespeicherter Tokens).
--
-- Wiederholbar: `create or replace`, Policies und Trigger werden vor dem
-- Anlegen entfernt, die Updates treffen beim zweiten Lauf keine Zeile mehr.

-- ── 1. user_progress: Policies ───────────────────────────────────────────────
-- Alle bestehenden Policies der Tabelle entfernen, egal unter welchem Namen —
-- eine vergessene offene Policy hebelte die neuen aus (ODER-Verknuepfung).

do $$
declare
  r record;
begin
  for r in
    select pol.policyname
    from pg_policies pol
    where pol.schemaname = 'public'
      and pol.tablename = 'user_progress'
  loop
    execute format('drop policy if exists %I on public.user_progress', r.policyname);
  end loop;
end
$$;

alter table public.user_progress enable row level security;

drop policy if exists "progress_select_eigene_oder_admin" on public.user_progress;
create policy "progress_select_eigene_oder_admin"
  on public.user_progress
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.ist_admin()));

drop policy if exists "progress_insert_eigene_zugaenglich" on public.user_progress;
create policy "progress_insert_eigene_zugaenglich"
  on public.user_progress
  for insert
  to authenticated
  with check (
    (select public.ist_admin())
    or (
      user_id = (select auth.uid())
      and ((select public.hat_zugang()) or public.modul_ist_frei(module_id))
    )
  );

drop policy if exists "progress_update_eigene_zugaenglich" on public.user_progress;
create policy "progress_update_eigene_zugaenglich"
  on public.user_progress
  for update
  to authenticated
  using (user_id = (select auth.uid()) or (select public.ist_admin()))
  with check (
    (select public.ist_admin())
    or (
      user_id = (select auth.uid())
      and ((select public.hat_zugang()) or public.modul_ist_frei(module_id))
    )
  );

drop policy if exists "progress_delete_admin" on public.user_progress;
create policy "progress_delete_admin"
  on public.user_progress
  for delete
  to authenticated
  using ((select public.ist_admin()));

-- ── 2. user_progress: Plausibilitaet ─────────────────────────────────────────

create or replace function public.user_progress_plausibel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Security Invoker: `current_user` ist die Rolle der Anfrage. Service-Client
  -- (Webhooks, Crons) und SQL-Editor bleiben unberuehrt, wie beim
  -- Schreibschutz aus 073.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  new.video_progress_seconds := greatest(coalesce(new.video_progress_seconds, 0), 0);
  if new.quiz_last_score is not null then
    new.quiz_last_score := least(greatest(new.quiz_last_score, 0), 100);
  end if;

  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.user_id := old.user_id;
    new.module_id := old.module_id;
    if coalesce(old.completed, false) then
      new.completed := true;
      new.completed_at := coalesce(old.completed_at, new.completed_at);
    end if;
  end if;

  return new;
end;
$$;

comment on function public.user_progress_plausibel() is
  'Haelt user_progress bei Schreibzugriffen ueber die oeffentliche API plausibel: completed faellt nicht zurueck, Nutzer/Modul fest, Werte im Rahmen (Migration 077).';

drop trigger if exists user_progress_plausibel on public.user_progress;
create trigger user_progress_plausibel
  before insert or update on public.user_progress
  for each row execute function public.user_progress_plausibel();

-- ── 3. Discord-Tokens leeren ─────────────────────────────────────────────────
-- Laeuft im SQL-Editor als `postgres`; der Schreibschutz-Trigger aus 073 greift
-- nur fuer `authenticated`/`anon` und laesst das Leeren ohnehin zu.

update public.profiles
set discord_access_token = null,
    discord_refresh_token = null
where discord_access_token is not null
   or discord_refresh_token is not null;

update public.discord_connections
set discord_access_token = null,
    discord_refresh_token = null
where discord_access_token is not null
   or discord_refresh_token is not null;

comment on column public.profiles.discord_access_token is
  'Wird nicht mehr befuellt (Migration 077) — das Token wird nur im OAuth-Callback gebraucht.';
comment on column public.profiles.discord_refresh_token is
  'Wird nicht mehr befuellt (Migration 077).';
comment on column public.discord_connections.discord_access_token is
  'Wird nicht mehr befuellt (Migration 077) — das Token wird nur im OAuth-Callback gebraucht.';
comment on column public.discord_connections.discord_refresh_token is
  'Wird nicht mehr befuellt (Migration 077).';
