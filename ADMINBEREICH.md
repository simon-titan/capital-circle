# Capital Circle — Adminbereich

Übersicht aller Admin-Module unter `/admin` (Zugriff: `profiles.is_admin = true`, ab
06.09.2026 zusätzlich granular über `profiles.admin_role` — siehe „Team" unten).
Nach dem Vorbild der MoonTrading-Adminbereich-Doku, angepasst auf den tatsächlichen
Capital-Circle-Funktionsumfang.

## Inhalt & Bewerbungen
- **Übersicht** (`/admin`) — Landing-Seite des Adminbereichs.
- **Analytics** (`/admin/dashboard`) — MRR, Lifetime-Revenue 30 Tage, aktive Abos,
  Funnel-Kennzahlen.
- **Bewerbungen** / **High-Ticket** / **Step-2 Bewerbungen** — die drei Bewerbungs-
  Funnel-Stufen (Standard-Mitgliedschaft, High-Ticket-1:1, Step-2-Vertiefung), inkl.
  Calendly-Integration bei High-Ticket.
- **Kurse & Module** / **Free Kurs** / **Quiz** — Ausbildungsinhalte, sequenzielles
  Freischalten, Video-/Anhang-Verwaltung über Hetzner-Presigned-Upload.
- **Events** — Kalender/Webinar-Termine (iCal-fähig), auch wiederkehrende Termine.
- **Hausaufgaben** — Aufgaben-Zuweisung und -Prüfung.
- **Live Sessions** / **Live Stream** — Terminverwaltung bzw. Cloudflare-Stream-Toggle.
- **Analyse** — redaktionelle Markt-Analyse-Beiträge (Bild + Text) im Mitglieder-Feed.
- **News** — kompakter Ankündigungs-/Post-Feed mit Like/Kommentar/Save (Free + Paid).
- **Bewertungen** — Landingpage-Testimonials.
- **Tracking Links** — Kampagnen-/UTM-Tracking.
- **Arsenal** — Tools/Templates-Bibliothek für Mitglieder.

## Community & Discord
- **Discord** (`/admin/discord`) — wer ist per OAuth verbunden, Rollen-Status
  (Regulär/Warteraum/Keine, seit 06.09.2026), manueller „Bestand abgleichen"-Trigger
  gegen den echten Discord-Server-Zustand.
- **Discord Funnel** — separater Cold-Traffic-Funnel für kostenlose Mitglieder:
  Leads, Channels, Engagement-Tracking, Closer-Ansicht, eigenes KPI-/Export-Set.
  Getrennt vom bezahlten Discord-Rollen-System oben.
- **Zertifikate** (`/admin/zertifikate`, seit 06.09.2026) — Review-Queue für von
  Mitgliedern eingereichte Trading-Nachweise; freigeben → erscheint auf `/erfolge`
  (öffentlich, ohne Login).
- **Support-Tickets** (`/admin/tickets`, seit 06.09.2026) — Mitglieder-Anfragen,
  Status/Priorität, Ø-Antwortzeit-Kachel (Trigger-basiert, race-sicher).

## Zahlungen & Mitglieder
- **Mitglieder** (`/admin/mitglieder`) — Nutzerliste, Tier-Override
  (`free`/`monthly`/`lifetime`/`ht_1on1`), seit 06.09.2026: CSV-Export der Liste und
  Ein-Klick-DSGVO-Art.15-Auskunft pro Mitglied (protokolliert in
  `gdpr_export_requests`).
- **Gutscheine** (`/admin/gutscheine`, seit 06.09.2026) — Rabattcodes, technisch als
  echte Stripe-Promotion-Codes angelegt; Einlösungen live von Stripe abgefragt.
- **Zahlungsstörungen** (`/admin/zahlungsstoerungen`, seit 06.09.2026) — wer steckt im
  48h-Zahlungsausfall-Grace, welche Dunning-Mail ist raus, Admin-Notizfeld pro Fall.
- **Team** (`/admin/team`, seit 06.09.2026) — Admin-Rollen (`owner`/`admin`/`support`/
  `editor`) statt eines einzelnen `is_admin`-Flags; Rollenänderungen im
  `user_audit_log` nachvollziehbar. Nur `owner` darf Rollen ändern (Fallback: solange
  kein `owner` existiert, dürfen alle bestehenden Admins die Seite nutzen).

## Betrieb
- **Wartungsmodus** (`/admin/wartung`, seit 06.09.2026) — globaler Schalter, sperrt die
  gesamte Plattform (außer `/admin*`, `/login`, `/wartung`) für Nicht-Admins, mit
  konfigurierbarer Nachricht. Greift direkt in der Middleware (`proxy.ts`), 15s
  in-memory gecacht, fail-open bei DB-Fehlern.

---

*Letzte Aktualisierung: 06.09.2026 — siehe [GO-LIVE.md](GO-LIVE.md) für den laufenden
Status, offene Punkte vor dem produktiven Einsatz der neuen Module, sowie den Stand der
Rechtstexte (Impressum/Datenschutz/AGB/Widerruf — entschieden, aber noch nicht gebaut).*
