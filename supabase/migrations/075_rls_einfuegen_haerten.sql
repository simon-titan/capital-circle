-- 075_rls_einfuegen_haerten.sql
-- nachweis: npm run db:check-rls
--
-- Schreib-Policies auf weiteren Tabellen an das anpassen, was die App wirklich tut.
--
-- Hintergrund: Mehrere Tabellen erlauben Nutzern ueber die oeffentliche
-- Datenbank-API mehr, als die App selbst je schreibt. Die App-Routen pruefen ihre
-- Eingaben — die Policies aber nicht, und die API ist mit dem oeffentlichen
-- anon-Key plus eigenem Login fuer jedes Konto direkt erreichbar. Diese Migration
-- zieht die Policies auf den Umfang der App-Routen zurueck. Jede Aenderung ist mit
-- dem Code abgeglichen (Stand 19.09.2026): Keine App-Funktion schreibt anders als
-- hier erlaubt.
--
--   1. certificates — Einreichungen nur als „pending“, nicht oeffentlich, ohne
--      Pruefvermerk und nur mit einer Datei aus dem eigenen Upload-Ordner.
--      Warum: Freigegebene, oeffentliche Nachweise erscheinen ohne Login auf
--      `/erfolge`, und fuer jeden Nachweis erzeugen `/erfolge`, `/zertifikate` und
--      `GET /api/certificates` eine signierte Download-Adresse zum gespeicherten
--      Dateischluessel. Ohne diese Bedingungen haette ein Nutzer die Freigabe
--      ueberspringen und einen beliebigen Schluessel des Speichers eintragen
--      koennen. Die Route `POST /api/certificates` schreibt genau so, wie hier
--      verlangt (Schluessel aus `/api/certificates/presign-upload`, Status und
--      Sichtbarkeit aus den Spalten-Standardwerten).
--
--   2. discord_connections — Nutzer duerfen ihre Verknuepfung lesen und loeschen,
--      aber nicht mehr selbst anlegen oder aendern. Warum: An `discord_user_id`
--      haengen Rollenvergabe, Rollenentzug und der Server-Rauswurf beim Trennen.
--      Eine frei eintragbare ID haette diese Aktionen auf ein fremdes Discord-Konto
--      gelenkt. Angelegt wird die Verknuepfung ausschliesslich im OAuth-Callback
--      (`app/api/discord/callback`) mit dem Service-Client — dort stammt die ID
--      nachweislich von Discord.
--
--   3. support_tickets — neue Tickets nur mit Status „open“, Prioritaet „normal“
--      und ohne Antwort-/Erledigt-Stempel. Warum: Prioritaet und Stempel steuern die
--      Admin-Warteschlange und die gemessene Antwortzeit. `POST /api/support/tickets`
--      setzt nur Betreff und Kategorie, der Rest kommt aus den Standardwerten.
--
--   4. step2_applications, cancellations — die Einfuege-Policies fuer Nutzer
--      entfallen. Beide Tabellen beschreibt die App ausschliesslich mit dem
--      Service-Client (`/api/applications/step2/create`; Kuendigungs-Umfrage,
--      Abo-Kuendigung und Stripe-Webhook). Ueber die API haette ein Nutzer eine
--      Step-2-Bewerbung mit beliebigem Status bzw. beliebig viele Kuendigungs-
--      eintraege anlegen koennen, die Admin-Auswertung und Reaktivierungs-Mails
--      speisen. Lesen der eigenen Zeilen bleibt erlaubt.
--
--   5. insight_tracking_events — die offene Einfuege-Policy (`with check (true)`,
--      auch ohne Login) entfaellt. `POST /api/tracking/event` schreibt mit dem
--      Service-Client und prueft den Link vorher; die Policy wurde nie gebraucht
--      und erlaubte jedem, die Kampagnen-Statistik aufzublaehen.
--
-- Bestehende Zeilen bleiben unberuehrt. `npm run db:check-rls` meldet zusaetzlich,
-- ob es bereits Nachweise mit fremdem Dateischluessel oder Freigabe ohne Pruefer gibt.
--
-- Nachweis: Diese Datei erzeugt weder Tabellen noch Spalten, `npm run db:check`
-- kann sie deshalb nicht erkennen. `npm run db:check-rls` prueft die Wirkung.
--
-- Wiederholbar: `drop policy if exists` vor jedem `create policy`.

-- ── 1. certificates ──────────────────────────────────────────────────────────

drop policy if exists "certificates_insert_own" on public.certificates;
create policy "certificates_insert_own"
  on public.certificates
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and is_public = false
    and reviewed_at is null
    and reviewed_by is null
    -- Nur der eigene Upload-Ordner, wie ihn /api/certificates/presign-upload vergibt …
    and starts_with(storage_key, 'certificates/' || (select auth.uid())::text || '/')
    -- … und ohne Pfadsegmente „.“ oder „..“, die eine Adresse umlenken koennten.
    and storage_key !~ '(^|/)\.\.?(/|$)'
  );

-- ── 2. discord_connections ───────────────────────────────────────────────────
-- Die Namen stammen aus Migration 028 (mit Umlauten, genau so angelegt).

drop policy if exists "User kann eigene Verbindung einfügen" on public.discord_connections;
drop policy if exists "User kann eigene Verbindung updaten" on public.discord_connections;

-- ── 3. support_tickets ───────────────────────────────────────────────────────

drop policy if exists "support_tickets_insert_own" on public.support_tickets;
create policy "support_tickets_insert_own"
  on public.support_tickets
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'open'
    and priority = 'normal'
    and first_response_at is null
    and resolved_at is null
  );

-- ── 4. step2_applications, cancellations ─────────────────────────────────────

drop policy if exists "Users can insert own step2 application" on public.step2_applications;
drop policy if exists "Users insert own cancellations" on public.cancellations;

-- ── 5. insight_tracking_events ───────────────────────────────────────────────

drop policy if exists "public_insert_tracking_events" on public.insight_tracking_events;
