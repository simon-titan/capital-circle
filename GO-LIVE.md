# Capital Circle — Go-Live-Stand

Laufendes Status-Dokument nach dem Vorbild des Schwesterprojekts MoonTrading. Wird
mit jeder größeren Änderung nachgetragen, nicht ersetzt — neue Einträge kommen oben
in den jeweiligen Abschnitt, mit Datum.

Stack: Next.js 16 (App Router) · React 19 · Supabase (Postgres/Auth/RLS) · Stripe ·
Resend (react-email) · Chakra UI v2 · Hetzner S3 (Datei-Uploads) · Discord-Bot · Telegram-Bot.
Hosting: Vercel (Domain `capitalcircletrading.com`). Repo: `simon-titan/capital-circle`
(GitHub, privat).

## Projektüberblick

Capital Circle ist eine Trading-Ausbildungs-/Mentoring-Plattform (Coach: Emre) mit vier
Mitgliedschafts-Stufen in `profiles.membership_tier`:

| Tier | Preis | Vertriebsweg |
|---|---|---|
| `free` | kostenlos | Discord-Funnel / Free-Kurs |
| `monthly` | 97 €/Monat | Self-Checkout (`/pricing` → Stripe) |
| `lifetime` | 699 € einmalig | Self-Checkout (`/pricing` → Stripe) |
| `ht_1on1` | individuell | Bewerbung + Calendly-Call, kein Self-Checkout |

Kernbereiche: Ausbildung/Kurse (sequenzielles Freischalten), Arsenal (Tools/Templates),
Events (Kalender/Webinare), News (Ankündigungs-Feed), Analyse (Markt-Updates),
Trading Journal (aktuell in eigenem, separatem Umbau — siehe unten), Discord-Community,
Telegram-Bot, Bewerbungs-/Sales-Funnel für High-Ticket. Zahlungen laufen vollständig
über Stripe (Checkout + Customer Portal + Webhooks), Mails über Resend/react-email,
Datei-Uploads (Videos, Anhänge, Zertifikate) über Hetzner S3 mit Presigned URLs statt
Supabase Storage.

---

## 06.09.2026 — Admin-Tiefe & Discord-Subscriber-Bot (Branch `feature/admin-depth-discord-bot`)

Fünf Module parallel gebaut, um den Admin-Bereich auf ein Niveau zu bringen, das für
den laufenden Betrieb (Zahlungsstörungen, Support, Compliance) nötig ist. Alles unten
ist **Code-fertig und lokal `tsc --noEmit` + `next build`-grün**, aber **nicht live** —
siehe "Was jetzt noch zu tun ist" am Ende.

**Gutscheine & Zahlungsstörungen** (`/admin/gutscheine`, `/admin/zahlungsstoerungen`)
- Rabattcodes werden als echte Stripe-Coupons/Promotion-Codes angelegt — Stripe verwaltet
  Gültigkeit und Einlöse-Limits, keine eigene Rabattlogik nötig. Einlösungen werden live
  von Stripe abgefragt (`times_redeemed`), nicht lokal gezählt.
- Checkout unterstützt jetzt `allow_promotion_codes` + optionalen `promo`-Parameter für
  vorausgefüllte Codes (z. B. aus Kampagnen-E-Mails).
- Neues Dashboard zeigt auf einen Blick, wer im 48h-Zahlungsausfall-Grace-Zeitraum steckt,
  welche Dunning-Mail (1/2/3) schon raus ist, und erlaubt Admin-Notizen pro Fall.

**Support-Tickets** (`/support` fürs Mitglied, `/admin/tickets` für Admins)
- Mitglieder eröffnen Tickets mit Betreff/Kategorie, Admins antworten im Thread.
- `first_response_at` wird über einen DB-Trigger gesetzt (race-sicher, nicht im
  Anwendungscode) — daraus errechnet sich die Ø-Antwortzeit-Kachel im Admin-Dashboard.
- Admin-Antwort löst automatisch eine E-Mail an das Mitglied aus.

**Zertifikate & Wartungsmodus** (`/zertifikate`, `/erfolge`, `/admin/zertifikate`,
`/admin/wartung`)
- Mitglieder reichen Trading-Nachweise über den bestehenden Hetzner-Presigned-Upload ein;
  Admin gibt frei (`approved` + `is_public`); öffentliche Showcase unter `/erfolge` (ohne
  Login, Bilder immer per kurzlebiger Presigned-URL, nie öffentlich im Bucket).
- Neuer generischer `app_settings`-Key-Value-Store (bewusst nicht `053_stream_settings`
  zweckentfremdet, das ist ein Stream-spezifisches Singleton) — aktuell nur mit
  `maintenance_mode` befüllt, aber für künftige Flags wiederverwendbar.
- Wartungsmodus greift direkt in `proxy.ts`: Admins kommen immer durch, alle anderen
  landen auf `/wartung`. Der DB-Read dafür ist 15s in-memory gecacht; bei DB-Fehler
  fällt der Check bewusst auf "keine Wartung" zurück (ein Supabase-Hickup soll nicht
  die ganze Plattform sperren).

**DSGVO-Auskunft, CSV-Export, Team-Rollen** (`/admin/team`, Mitglieder-Liste)
- `profiles.is_admin` (ein Flag für alle) wird durch `admin_role` ergänzt
  (`owner > admin > support > editor`), ohne dass bestehende Admins Zugriff verlieren —
  Rollenänderungen landen im bestehenden `user_audit_log`.
- **Wichtig:** Kein bestehendes Profil wurde automatisch zu `owner` gemacht (bewusst,
  um nichts zu erraten). Solange kein `owner` existiert, darf jeder bestehende Admin
  die Team-Seite nutzen — nach dem ersten Deploy einmal manuell
  `update profiles set admin_role='owner' where id='<haupt-admin-uuid>';` ausführen.
- Ein Klick liefert die vollständige DSGVO-Art.15-Auskunft eines Mitglieds als JSON
  (Profil, Abos, Zahlungen, Bewerbungen), protokolliert in `gdpr_export_requests`.
- Mitgliederliste lässt sich als Excel-kompatible CSV exportieren (`lib/csv.ts`,
  wiederverwendbarer Helper für künftige Exports).

**Discord-Subscriber-Bot-Tiefe** (`/admin/discord`)
- Rollen-Helper (`lib/discord/roles.ts`) aus den bereits bestehenden OAuth-Connect-/
  Disconnect-Routen extrahiert — Verhalten unverändert, keine Duplikate mehr.
- Zahlungsausfall verschiebt verbundene Mitglieder automatisch in eine Warteraum-Rolle
  (`DISCORD_WAITING_ROOM_ROLE_ID`, optional — ohne gesetzten Wert wird best-effort
  übersprungen, blockiert nie den Stripe-Webhook selbst).
- Kündigung entzieht automatisch beide Rollen (regulär + Warteraum), ohne Kick — Nutzer
  bleibt Mitglied, wie bisherige Politik es vorsieht.
- Erfolgreiche Zahlung nach Ausfall holt automatisch aus dem Warteraum zurück (geprüft
  direkt gegen den Live-Zustand auf Discord, kein zusätzliches DB-Flag nötig).
- Neuer Bestandsabgleich: `scripts/discord-role-sync.mjs` (Standard: Dry-Run, `--apply`
  für echte Änderungen) und ein „Bestand abgleichen"-Button im Admin-Discord-Panel,
  beide protokolliert in `discord_sync_log`.

---

## Was jetzt noch zu tun ist (vor Live-Schaltung dieser fünf Module)

🔒 **Blockierend:**
- Migrationen `062`–`066` gegen Supabase ausführen (`supabase db push` bzw. übliches
  Projekt-Verfahren) — bisher nur lokal geschrieben, nicht angewendet.
- `DISCORD_WAITING_ROOM_ROLE_ID` in Discord-Server anlegen und in den Env-Vars (Vercel +
  lokal) setzen, sonst bleibt die Warteraum-Logik inaktiv (harmlos, aber ungenutzt).
- Einmalig einen echten `admin_role='owner'` setzen (siehe oben) — sonst bleibt die
  Owner-Regel im "Fallback für alle Admins"-Modus.
- Alle fünf Bereiche mit echten Testdaten/-zahlungen durchklicken (Stripe Testmodus:
  Coupon-Redemption, Zahlungsausfall→Warteraum→Recovery; Zertifikat-Upload→Freigabe;
  Ticket-Antwort→E-Mail; Wartungsmodus ein/aus).

☐ **Nicht blockierend, aber offen:**
- Keine Rate-Limits auf Zertifikat-Einreichung oder Ticket-Erstellung.
- GDPR-Export deckt eine sinnvolle Teilmenge ab (profiles, subscriptions, payments,
  applications), nicht jede Tabelle im Projekt.
- `auth.admin.listUsers({perPage:1000})` wird an mehreren Stellen ungepaged verwendet —
  unkritisch bei aktueller Mitgliederzahl, Pagination nachrüsten bei Wachstum.

## Rechtstexte (Impressum/Datenschutz/AGB/Widerruf) — Status: entschieden, nicht gebaut

`proxy.ts` referenziert öffentliche Pfade `/datenschutz`, `/impressum` — beide Seiten
existieren im App-Router **nicht**, `/agb` und `/widerruf` fehlen komplett. Vor jedem
echten Go-Live müssen sie gebaut und rechtlich geprüft werden — bei MoonTrading war
genau das ein dokumentierter Blocker.

**Bereits entschieden (06.09.2026):**
- Rechtsform: **Einzelunternehmen/Freiberufler** → Impressum braucht den vollen Namen
  der/des Inhabers, kein Handelsregister-Eintrag nötig.
- Widerrufsrecht bei den digitalen Mitgliedschaften (monthly/lifetime): **Sofortzugriff
  mit ausdrücklicher Verzichts-Checkbox im Checkout** (statt volles 14-Tage-Widerrufsrecht
  mit Zugriffssperre/Rückerstattungsrisiko). Das bedingt einen kleinen Umbau am
  Checkout-Flow (neue Pflicht-Checkbox + Speicherung von Zustimmungszeitpunkt/-text als
  Nachweis), noch nicht umgesetzt.

🔒 **Blockierend, bevor die vier Seiten inhaltlich geschrieben werden können** — fehlende
Pflichtangaben fürs Impressum:
- Vollständiger Name der/des Inhabers
- Ladungsfähige Anschrift (Straße/PLZ/Ort)
- Telefonnummer + Kontakt-E-Mail (Vorschlag offen: `kontakt@capitalcircletrading.com`,
  da die Domain schon für Transaktions-Mails genutzt wird)
- Kleinunternehmer nach §19 UStG oder regelbesteuert mit USt-IdNr?

Sobald diese vier Punkte vorliegen: `config/legal.ts` (zentrale Textbausteine, nach
MoonTrading-Vorbild) + vier Seiten (`app/impressum`, `app/datenschutz`, `app/agb`,
`app/widerruf`, Gold-only) + Checkout-Checkbox + `proxy.ts`-PUBLIC_PATHS-Ergänzung um
`/agb`/`/widerruf`. Bis dahin bewusst nicht mit Platzhalter-Fantasiedaten gebaut, um
kein scheinbar fertiges, aber rechtlich falsches Impressum online zu riskieren.

---

## Vorherige Meilensteine (aus Commit-Historie, vor diesem Dokument)

- Telegram-Bot mit `/start`-Willkommensnachricht + Whop-Checkout-Button
- Whop-Migrations-E-Mail-Kampagne für unbezahlte Bestandsmitglieder
- Discord-Funnel (Lead-Tracking für kostenlose Mitglieder, eigenes Admin-Analytics)
- Ausbildung/Kurse, Arsenal, Events, News, Live-Sessions, Bewerbungs-/Sales-Funnel,
  Stripe Checkout/Portal/Webhook, Dunning-/Reaktivierungs-Cronjobs
- Trading-Journal-Rebuild (Stand: laufend, siehe uncommitted WIP auf diesem Branch bzw.
  eigener Branch — nicht Teil dieses Dokuments)
