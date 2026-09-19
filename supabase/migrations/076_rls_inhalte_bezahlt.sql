-- 076_rls_inhalte_bezahlt.sql
-- nachweis: npm run db:check-rls
--
-- Bezahlte Inhalte nur noch fuer Konten mit Zugang lesbar.
--
-- Hintergrund: Die Lese-Policies der Inhaltstabellen stammen aus der Zeit vor
-- der Bezahlschranke und lauten `using (auth.uid() is not null)`. Jedes
-- angemeldete Konto — die Registrierung ist offen, ein Konto kostet nichts —
-- konnte damit ueber die oeffentliche Datenbank-API lesen, was die Oberflaeche
-- nur Zahlenden zeigt: den Volltext der Analysen, die Quizfragen samt Loesungen,
-- die Speicherschluessel und Stream-IDs der Kursvideos, Anhaenge und
-- Live-Session-Aufzeichnungen. Die Oberflaeche sperrte, die Daten nicht.
--
-- Welche Regel gilt (abgeglichen mit dem Code, Stand 19.09.2026):
--
--   Zugang zu bezahlten Inhalten hat, wer `profiles.is_paid = true` hat oder
--   Admin ist. So entscheidet das Institut seit jeher
--   (`userCanAccessAcademyModule`, `/api/attachment-url`, Arsenal, die
--   Schloesser in der Navigation, die Analyse-Karte im Dashboard). Im Code steht
--   dieselbe Regel als `hatInhaltsZugang()` in `lib/membership.ts`.
--
--   Bewusst NICHT die Stufe (`membership_tier`) oder `access_until`: Die
--   Whop-Altkonten stehen auf `membership_tier = 'free'` mit `is_paid = true`
--   und haben heute ueber `is_paid` vollen Institutszugang. Wer hier die Stufe
--   pruefte, sperrte sie beim Einspielen still aus. `evaluateAccess()` (Stufe +
--   `access_until`) gilt in der App nur fuer das Trading Journal.
--
--   Frei bleibt, was die App auch ohne Zahlung zeigt:
--     - Videos, Quizze und Anhaenge aus Kursen mit `courses.is_free = true`
--       (Anhaenge zusaetzlich nur mit eigenem `is_free`, wie in
--       `/api/attachment-url`),
--     - eigenstaendige Anhaenge (Arsenal) mit `is_free = true`,
--     - Live-Session-Videos der freien Kategorie. Welche das ist, entscheidet
--       der Code ueber den Titel (`components/platform/live-session-free.ts`,
--       derzeit „Wochenrecap“). Derselbe Titelvergleich steht unten in
--       `live_session_ist_frei()` — wer den einen aendert, aendert den anderen.
--
--   Unveraendert fuer alle angemeldeten Konten lesbar bleiben die Gliederungen:
--   `courses`, `modules`, `subcategories`, `live_session_categories`,
--   `live_sessions`, `live_session_subcategories`, `arsenal_attachment_categories`.
--   Aus ihnen baut die App die gesperrten Kacheln fuer Konten ohne Zahlung
--   (Kurs- und Modulnamen, Anzahl Aufzeichnungen) — Inhalt steckt dort nicht.
--
-- Was diese Migration tut:
--
--   1. Hilfsfunktionen im Stil von `public.ist_admin()` (Migration 074):
--      Security Definer, leerer `search_path`, voll qualifizierte Namen. Sie
--      lesen `profiles`, `modules`, `courses` usw. mit den Rechten des
--      Eigentuemers — so koennen die Policies sie aufrufen, ohne selbst wieder
--      Policies anderer Tabellen auszuloesen, und das Ergebnis haengt nicht davon
--      ab, was der anfragende Nutzer sonst sehen darf. Ausfuehren duerfen sie nur
--      `authenticated` und `service_role`. Sie verraten nichts ausser, ob das
--      eigene Konto Zugang hat bzw. ob ein Modul/Video/eine Session frei ist.
--
--   2. Lese-Policies neu fuer `videos`, `video_attachments`,
--      `standalone_attachments`, `quizzes`, `analysis_posts`,
--      `live_session_videos`. Vorher werden ALLE bestehenden SELECT-Policies
--      dieser Tabellen entfernt, auch solche, die nicht aus den Migrationen
--      stammen (etwa im Dashboard angelegt): Policies gelten ODER-verknuepft,
--      eine vergessene offene Policy hebelte die neue aus. Die Schreib-Policies
--      fuer Admins (`*_admin_write`, `for all`) bleiben unberuehrt; sie lassen
--      Admins weiterhin alles lesen.
--
-- Code, der im selben Branch angepasst ist:
--   - `/api/video-url` und `/api/live-session-video-url` pruefen den Zugang
--     selbst (vorher: jedes Konto bekam jede Abspiel-Adresse).
--   - `/api/analysis-post-image` prueft den Zugang.
--   - Modulseite `ausbildung/[segment]` ohne Zugang: nur noch die Gliederung
--     (Titel, Dauer) hinter der Paywall, ueber den Service-Client — ohne Quiz,
--     Anhaenge, Beschreibungen und Abspiel-Schluessel.
--   - Live Sessions: Konten ohne Zahlung sehen die bezahlten Kategorien jetzt
--     gesperrt statt leer (`liveSessionsNurFrei`).
--   Alle uebrigen Lesestellen mit Nutzer-Client lesen fuer Konten ohne Zahlung
--   nachweislich nur freie Inhalte oder filtern ohnehin auf Zugang (Institut-
--   Uebersicht, Dashboard, „Weiter wo du warst“, Arsenal, Admin-Bereich).
--
-- Wirkung auf bestehende Konten: Wer heute `is_paid = true` hat oder Admin ist,
-- liest alles wie bisher (Abo, Lifetime, HT, Whop-Altbestand). Konten ohne
-- Zahlung lesen nur noch die freien Inhalte.
--
-- Nachweis: Diese Datei erzeugt weder Tabellen noch Spalten, `npm run db:check`
-- kann sie deshalb nicht erkennen. `npm run db:check-rls` prueft die Wirkung mit
-- Wegwerf-Konten (ohne Zahlung, mit Abo, Whop-Altbestand, Lifetime, Admin).
--
-- Wiederholbar: `create or replace function`, Policies werden vor dem Anlegen
-- entfernt.

-- ── 1. Hilfsfunktionen ───────────────────────────────────────────────────────

create or replace function public.hat_zugang()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select coalesce(p.is_paid, false) or coalesce(p.is_admin, false)
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;

comment on function public.hat_zugang() is
  'true, wenn der anfragende Nutzer bezahlte Inhalte sehen darf: profiles.is_paid oder profiles.is_admin. Gleiche Regel wie hatInhaltsZugang() in lib/membership.ts (Migration 076).';

create or replace function public.modul_ist_frei(p_modul uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select c.is_free
      from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = p_modul
    ),
    false
  );
$$;

comment on function public.modul_ist_frei(uuid) is
  'true, wenn das Modul in einem Kurs mit is_free = true liegt (Migration 076).';

-- Ein Video ist frei, wenn es veroeffentlicht ist und — direkt oder ueber seine
-- Subkategorie — in einem Free-Kurs liegt. Videos im Ablagestapel (weder Modul
-- noch Subkategorie) sind nie frei; sie sind ohnehin nie veroeffentlicht.
create or replace function public.video_ist_frei(p_video uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select coalesce(v.is_published, false)
        and public.modul_ist_frei(coalesce(v.module_id, s.module_id))
      from public.videos v
      left join public.subcategories s on s.id = v.subcategory_id
      where v.id = p_video
    ),
    false
  );
$$;

comment on function public.video_ist_frei(uuid) is
  'true, wenn das Video veroeffentlicht ist und in einem Free-Kurs liegt (Migration 076).';

-- Freie Live-Session-Kategorie: Titelvergleich wie `isFreeLiveSessionCategory`
-- in components/platform/live-session-free.ts (FREE_LIVE_SESSION_CATEGORY).
create or replace function public.live_session_ist_frei(p_session uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select strpos(lower(c.title), 'wochenrecap') > 0
      from public.live_sessions ls
      join public.live_session_categories c on c.id = ls.category_id
      where ls.id = p_session
    ),
    false
  );
$$;

comment on function public.live_session_ist_frei(uuid) is
  'true, wenn die Live Session in der freien Kategorie liegt (Titel enthaelt „wochenrecap“, wie live-session-free.ts). Migration 076.';

-- Supabase vergibt EXECUTE auf neue Funktionen standardmaessig auch an `anon`.
revoke all on function public.hat_zugang() from public;
revoke all on function public.hat_zugang() from anon;
grant execute on function public.hat_zugang() to authenticated;
grant execute on function public.hat_zugang() to service_role;

revoke all on function public.modul_ist_frei(uuid) from public;
revoke all on function public.modul_ist_frei(uuid) from anon;
grant execute on function public.modul_ist_frei(uuid) to authenticated;
grant execute on function public.modul_ist_frei(uuid) to service_role;

revoke all on function public.video_ist_frei(uuid) from public;
revoke all on function public.video_ist_frei(uuid) from anon;
grant execute on function public.video_ist_frei(uuid) to authenticated;
grant execute on function public.video_ist_frei(uuid) to service_role;

revoke all on function public.live_session_ist_frei(uuid) from public;
revoke all on function public.live_session_ist_frei(uuid) from anon;
grant execute on function public.live_session_ist_frei(uuid) to authenticated;
grant execute on function public.live_session_ist_frei(uuid) to service_role;

-- ── 2. Bestehende Lese-Policies entfernen ────────────────────────────────────
-- Alle reinen SELECT-Policies der sechs Tabellen, egal unter welchem Namen.
-- Policies `for all` (die Admin-Schreibrechte) bleiben stehen.

do $$
declare
  r record;
begin
  for r in
    select pol.policyname, pol.tablename
    from pg_policies pol
    where pol.schemaname = 'public'
      and pol.cmd = 'SELECT'
      and pol.tablename in (
        'videos',
        'video_attachments',
        'standalone_attachments',
        'quizzes',
        'analysis_posts',
        'live_session_videos'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end
$$;

-- RLS ist auf allen sechs Tabellen seit ihrer Anlage an; die Zeilen stehen hier,
-- damit die Datei auch gegen eine abweichende Datenbank nichts offen laesst.
alter table public.videos enable row level security;
alter table public.video_attachments enable row level security;
alter table public.standalone_attachments enable row level security;
alter table public.quizzes enable row level security;
alter table public.analysis_posts enable row level security;
alter table public.live_session_videos enable row level security;

-- ── 3. Neue Lese-Policies ────────────────────────────────────────────────────
-- `(select public.hat_zugang())` wird einmal pro Anfrage ausgewertet statt
-- einmal pro Zeile. Fuer Konten mit Zugang entscheidet damit der erste Teil,
-- die Pruefung je Zeile faellt nur fuer Konten ohne Zahlung an.

drop policy if exists "videos_select_zugang" on public.videos;
create policy "videos_select_zugang"
  on public.videos
  for select
  to authenticated
  using ((select public.hat_zugang()) or public.video_ist_frei(id));

-- Wie `/api/attachment-url`: ohne Zahlung nur Anhaenge mit eigenem `is_free`,
-- deren Video veroeffentlicht ist und in einem Free-Kurs liegt.
drop policy if exists "video_attachments_select_zugang" on public.video_attachments;
create policy "video_attachments_select_zugang"
  on public.video_attachments
  for select
  to authenticated
  using ((select public.hat_zugang()) or (is_free and public.video_ist_frei(video_id)));

drop policy if exists "standalone_attachments_select_zugang" on public.standalone_attachments;
create policy "standalone_attachments_select_zugang"
  on public.standalone_attachments
  for select
  to authenticated
  using ((select public.hat_zugang()) or is_free);

drop policy if exists "quizzes_select_zugang" on public.quizzes;
create policy "quizzes_select_zugang"
  on public.quizzes
  for select
  to authenticated
  using ((select public.hat_zugang()) or public.modul_ist_frei(module_id));

-- Analysen haben keinen freien Teil (Navigation: „Analysen“ = nur Mitglieder).
drop policy if exists "analysis_posts_select_zugang" on public.analysis_posts;
create policy "analysis_posts_select_zugang"
  on public.analysis_posts
  for select
  to authenticated
  using ((select public.hat_zugang()));

drop policy if exists "live_session_videos_select_zugang" on public.live_session_videos;
create policy "live_session_videos_select_zugang"
  on public.live_session_videos
  for select
  to authenticated
  using ((select public.hat_zugang()) or public.live_session_ist_frei(session_id));
