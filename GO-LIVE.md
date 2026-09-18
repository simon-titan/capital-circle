# Capital Circle — Go-Live-Stand

Laufendes Status-Dokument nach dem Vorbild des Schwesterprojekts MoonTrading. Wird
mit jeder größeren Änderung nachgetragen, nicht ersetzt — neue Einträge kommen oben
in den jeweiligen Abschnitt, mit Datum.

Stack: Next.js 16 (App Router) · React 19 · Supabase (Postgres/Auth/RLS) · Stripe ·
Resend (react-email) · Chakra UI v2 · **Cloudflare Stream** (Kursvideos) · **Cloudflare R2**
(sonstige Datei-Uploads) · Discord-Bot · Telegram-Bot.
Hosting: Vercel (Domain `capitalcircletrading.com`). Repo: `simon-titan/capital-circle`
(GitHub, **öffentlich** — der gesamte Quelltext inkl. Admin-Routen ist einsehbar; Zugangsdaten liegen ausschließlich in `.env*`, das per `.gitignore` ausgeschlossen ist).
Deploy-Checkliste: [`DEPLOY-VERCEL.md`](DEPLOY-VERCEL.md).

## Projektüberblick

Capital Circle ist eine Trading-Ausbildungs-/Mentoring-Plattform (Coach: Emre) mit vier
Mitgliedschafts-Stufen in `profiles.membership_tier`:

| Tier | Preis | Vertriebsweg |
|---|---|---|
| `free` | kostenlos | Discord-Funnel / Free-Kurs |
| `monthly` | 99 €/Monat | Gast-Checkout (`/` → `/go/monthly` → Stripe) |
| `quarterly` | 267 €/3 Monate | Gast-Checkout (`/` → `/go/quarterly` → Stripe) |
| `yearly` | 990 €/Jahr | Gast-Checkout (`/` → `/go/yearly` → Stripe) |
| `lifetime` | 699 € einmalig | **nur intern** (17.09.2026) — Angebot in `/einstellungen/abonnement` für Mitglieder mit aktivem, zahlendem Abo; kein öffentlicher Preis, kein Link von der Landingpage |
| `ht_1on1` | individuell | Bewerbung + Calendly-Call, kein Self-Checkout |

Seit 16.09.2026 ist `/` die Sales-Landing mit Gast-Checkout (Konto entsteht erst nach der
Zahlung im Webhook), Login/Onboarding liegt auf `/einsteig`, `/pricing` leitet dauerhaft
auf `/#angebot`.

Kernbereiche: Ausbildung/Kurse (sequenzielles Freischalten), Arsenal (Tools/Templates),
Events (Kalender/Webinare), News (Ankündigungs-Feed), Analyse (Markt-Updates),
Trading Journal (aktuell in eigenem, separatem Umbau — siehe unten), Discord-Community,
Telegram-Bot, Bewerbungs-/Sales-Funnel für High-Ticket. Zahlungen laufen vollständig
über Stripe (Checkout + Customer Portal + Webhooks), Mails über Resend/react-email.
Kursvideos liegen in Cloudflare Stream (signiertes HLS, `videos.cloudflare_uid`), alle
übrigen Datei-Uploads (Thumbnails, Anhänge, Zertifikate, Avatare) in Cloudflare R2 mit
Presigned URLs statt Supabase Storage.

---

## 16.09.2026 — Cloudflare-Umstellung, Sales-Landing auf `/`, Gast-Checkout

**Cloudflare scharf geschaltet.** Signing-Key-Paar über `POST /stream/keys` erzeugt, alle
`CLOUDFLARE_*`- und `R2_*`-Variablen gesetzt, R2-Bucket `capital-circle` in der
**EU-Jurisdiktion** angelegt (DSGVO — der S3-Endpunkt trägt deshalb `.eu.` im Host).
`npm run cf:check` prüft Stream-API, Signatur, Manifest-URL und R2 in einem Lauf.

⚠️ **Hetzner Object Storage ist verschwunden.** Der Bucket `capitalcircle` antwortet in
nbg1/fsn1/hel1 mit `NoSuchBucket`, die Keys mit `InvalidAccessKeyId`. Damit zeigen alle
118 `videos.storage_key`, sämtliche Thumbnails, Arsenal-PDFs, Zertifikate und Avatare ins
Leere. `lib/storage.ts` läuft jetzt auf R2 (gleiche Schlüsselstruktur; Hetzner nur noch als
Lese-Rückfallebene hinter `STORAGE_LEGACY_FALLBACK=1`). R2 startet leer — alles außer den
Kursvideos muss neu hochgeladen werden.

**148 Videos liegen bereits in Cloudflare Stream** (1535 Min), aus einem früheren
Direkt-Upload — mit Nummern-Präfix umbenannt und ohne Signatur-Zwang, also allein über die
UID öffentlich abrufbar. `npm run cf:link` ordnet sie über Name + Dauer den DB-Zeilen zu
(75/118 Treffer, 50 auf die Sekunde bestätigt), trägt `cloudflare_uid` nach und schaltet
`requireSignedURLs` ein. Prüfliste: `exports/cloudflare-video-abgleich.csv`. Das
öffentliche Funnel-Video aus `NEXT_PUBLIC_DISCORD_TERMIN_VIDEO_URL` ist ausgenommen.

**Admin-Upload per Drag & Drop.** Dateien in die Zone ziehen, mehrere gleichzeitig,
Warteschlange mit Fortschritt pro Datei; der Titel kommt aus dem Dateinamen. Ein Video auf
die Mitte einer Subkategorie zu ziehen verschiebt es hinein (`DraggableList` kennt jetzt
Ablage-Ziele und eine Raster-Variante).

**Modul-Übersichten als Raster.** `/admin/kurse/[courseId]` und `/ausbildung` zeigen Module
nebeneinander; ein Klick klappt die Untermodule auf (Admin: mit Videos, Dauer und
Unveröffentlicht-Markierung; Mitglieder: mit `x/y`-Fortschritt je Untermodul).

**Sales-Landing auf `/` mit Gast-Checkout.** Acht Abschnitte nach den Kunden-Mockups,
Kaufweg `/go/<plan>` → Stripe → Webhook legt das Konto an → `/checkout/success` mit
Passwort-Formular. Prefetch-/Bot-/HEAD-Schutz auf `/go/` (bei MoonTrading hat dessen Fehlen
589 von 729 Sessions als Phantom-Abbrüche erzeugt). Login/Onboarding auf `/einsteig`,
`/pricing` gelöscht und auf `/#angebot` umgeleitet, Lifetime aus dem öffentlichen Verkaufsweg
entfernt (seit 17.09.2026 wieder kaufbar — aber ausschließlich im Mitgliederbereich, gesteuert
über `app_settings.lifetime_offer_enabled` und `profiles.lifetime_offer_group`, Migration 071).
Stripe-Preise per `npm run stripe:preise -- --apply` angelegt (Test-Modus, Produkt
`prod_VGo4kOUjnyWCfp`). Dabei fiel auf: die bisher eingetragene `STRIPE_PRICE_MONTHLY`
gehörte zu einem **anderen Stripe-Konto** als der hinterlegte `sk_test`-Key.

**Dashboard überarbeitet.** „Weiter wo du warst" zeigt jetzt tatsächlich das zuletzt
gesehene Video mit Vorschaubild aus Cloudflare — vorher stand dort konstant derselbe alte
Free-Kurs-Eintrag, weil `POST /api/progress` das `updated_at` nie geschrieben hat (die
Spalte hat nur `default now()`, keinen Trigger) und die Sortierung deshalb auf
eingefrorenen Zeitstempeln lief. Dieselbe Route lief außerdem bei **jedem** Speichern in
einen 500er: Sie selektierte `profiles.total_learning_seconds` / `learning_seconds_by_day`,
die es nicht gab. Weiter: Live-Karte mit Event-Typ-Badge, „Beitreten" öffnet den externen
Link direkt statt über eine Weiterleitung (`lib/external-url.ts`), Fortschrittskarte auf
gleicher Höhe wie ihre Nachbarn, und unter „Nächster Termin" steht ein Mini-Monatskalender
mit Punkten je Termin. Der Gold-Glow ist dort auf Wunsch raus (`.cc-neutral`, siehe
[`AGENTS.md`](AGENTS.md)).

**Institut (`/ausbildung`) neu sortiert.** Keine Kursgruppen mehr, sondern ein flaches
Modulraster (3 pro Reihe), alle Karten gleich hoch und immer ausgeklappt, die ganze Karte
ist der Link ins Modul. Module ohne sichtbares Video werden ausgeblendet. Wo ein Cover
hinterlegt ist, füllt es die Kartenoberkante und die Inhaltsliste entfällt.

**Admin-Navigation aufgeräumt.** Bewerbungen, Free-Kurs, Live Stream und Codex sind aus der
Seitenleiste raus (die Seiten selbst bleiben erreichbar), Analytics hat eine eigene
Gruppe „Auswertung", Analyse bleibt unter „Inhalte". Jede Gruppe ist auf- und zuklappbar,
der Zustand liegt in `localStorage` (`cc-admin-nav-zu`, gelesen über `useSyncExternalStore`,
damit es keine Hydration-Abweichung gibt). `/admin/kurse` nutzt die volle Bildschirmbreite.

**Bild-Uploads per Drag & Drop** (`components/admin/ImageDropZone.tsx`), plus Cover-Löschen.
Hintergrund: Auf dem Rechner des Nutzers fror der **Windows-Dateidialog** den gesamten
Browser ein — nachweisbar über Windows-Ereignis-ID 1002, elf Vorfälle in sechs Stunden,
betroffen waren `chrome.exe` **und** `opera.exe`. Also kein App-Fehler; der Weg per
Drag & Drop umgeht den Dialog ganz. Vier Stellen hängen noch am Dateidialog
(`LiveSessionManager` 2×, `NewsManager`, Video-Thumbnails).

**`/vorschau` — offene Adresse für die Verkaufsseite.** Rendert dieselbe
`MembershipLanding` wie `/`, aber ohne Anmeldepflicht, ohne Dashboard-Weiche und **ohne
Wartungs-Gate**. Gedacht zum Herzeigen, während die Plattform zu ist. `noindex, nofollow`
plus `canonical: "/"` und Sperre in `robots.ts`, damit sie nicht als doppelter Inhalt
neben der echten Startseite im Index landet. Die Kauf-Schaltflächen zeigen weiter auf
`/go/<plan>` und bleiben im Wartungsmodus gesperrt — Vorschau heißt ansehen, nicht kaufen.

**Migrationsstand geklärt.** Es gibt keine Migrationstabelle; `npm run db:check` prüft
stattdessen alle 72 Migrationen gegen die echte Datenbank, indem es die erzeugten Tabellen
und Spalten abfragt. Dabei fielen 006, 019 und 040 als nie angewendet auf. In 040 fehlte
eine schließende Klammer (`least(...)::integer` statt `least(...)::integer)`) — ein
Altbestand im Repo. `npm run db:pending` prüft die Klammerbilanz seitdem selbst und bricht
bei Ungleichgewicht ab, statt eine kaputte Sammeldatei zu erzeugen. Stand: alle 72
angewendet.

**Zusammengeführt und veröffentlicht.** `feature/admin-depth-discord-bot` per Fast-Forward
nach `master` (431 Dateien), Produktions-Build grün (TypeScript sauber, 129 Seiten).
Beim Aufräumen fürs öffentliche Repo ausgeschlossen: eine Rechnungs-PDF, herumliegende
Emoji-/Screenshot-Bilder im Projektwurzelverzeichnis, lokale Agenten-Zustände und die
generierte `_JETZT_EINSPIELEN.sql` (siehe `.gitignore`).

---

## 06.09.2026 — Plattform-Migrations-Kampagne (Whop → eigene Plattform)

Whop-Abonnenten sollen möglichst reibungslos zurück auf die eigene Plattform wechseln.
Gebaut nach exakt demselben, bereits bewährten Muster wie die ursprüngliche
Whop-Migration (siehe Meilensteine unten), nur umgekehrte Richtung:

- `config/platform-migration-campaign.ts` + 3 neue Mail-Templates
  (`lib/email/templates/platform-migration-{1-announcement,2-reminder,3-faq}.tsx`,
  teilen sich die Kampagnen-Bausteine aus `lib/email/campaigns/whop-migration/` —
  die sind rein optisch generisch, Name kommt nur historisch von der Erstnutzung).
- Admin-Trigger `POST /api/admin/campaigns/platform-migration` (Mail 1, Snapshot) +
  Cron `/api/cron/platform-migration-followups` (Mail 2/3, öffner-/klick-basiert,
  registriert in `vercel.json`) — strukturell identisch zur Whop-Migration.
- Zielgruppe kommt NICHT aus `profiles` (die meisten Whop-Abonnent:innen haben keine
  eigene DB-Zeile), sondern aus einem manuellen Whop-Mitgliederexport (CSV), importiert
  über `npm run import:whop-members -- <csv>` in ein eigenes Resend-Segment
  (`RESEND_PLATFORM_MIGRATION_SEGMENT_ID`, wird beim ersten Lauf automatisch angelegt).
- Preis einheitlich auf **99 €/Monat** vereinheitlicht (vorher inkonsistent 97 €/99 €
  an verschiedenen Stellen) — angepasst in `PricingCards.tsx`, `UserTierOverrideModal.tsx`,
  `apply/thanks-membership/page.tsx` und `MONTHLY_PRICE_EUR` in
  `app/api/admin/analytics/route.ts`.
- Whop-Kündigung bleibt bewusst Self-Service (FAQ-Mail 3 erklärt den Ablauf) — keine
  Whop-API-Integration vorhanden, um das zu automatisieren.

🔒 **Blockierend, bevor Mail 1 ausgelöst wird:**
- ~~Dieselben Go-Live-Blocker wie unten (Migrationen 062–066, Rechtstexte)~~ — die
  Migrationen sind seit 16.09.2026 angewendet (alle 72, geprüft mit `npm run db:check`).
  **Die Rechtstexte bleiben blockierend:** zahlende Whop-Mitglieder sollen nicht auf eine
  rechtlich unvollständige Seite geschickt werden.
- ~~`STRIPE_PRICE_MONTHLY` (`price_1TOK0fGUgAQCwJluNepVhRzn`) ließ sich gegen den
  hinterlegten Testmodus-Key nicht auflösen (`404 resource_missing`).~~
  **Am 16.09.2026 geklärt und behoben:** Die Preis-ID gehörte zu einem *anderen
  Stripe-Konto* als der `sk_test`-Key — daher der 404. Ersetzt durch die drei per
  `npm run stripe:preise -- --apply` erzeugten Preise (99 € / 267 € / 990 €, Produkt
  `prod_VGo4kOUjnyWCfp`). Für den Live-Betrieb müssen sie im Live-Modus neu angelegt
  werden.
- Whop-Mitgliederexport (CSV) einmalig aus dem Whop-Dashboard ziehen und mit
  `npm run import:whop-members -- <pfad>` importieren, bevor Mail 1 getriggert wird.

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

## Was jetzt noch zu tun ist

*Stand 16.09.2026, gegen Datenbank und Repo geprüft — nicht aus dem Gedächtnis.*

🔒 **Blockierend vor dem echten Go-Live:**

- **Rechtstexte.** `/impressum`, `/datenschutz`, `/agb`, `/widerruf` existieren im
  App-Router **nicht**. `/datenschutz` ist bereits aus `app/(marketing)/apply/page.tsx`
  und `app/(marketing)/free/page.tsx` verlinkt und läuft dort auf 404. Details und die
  vier fehlenden Pflichtangaben siehe eigener Abschnitt unten.
- **Stripe läuft vollständig im Testmodus.** Für Live gebraucht werden: `sk_live`-/
  `pk_live`-Schlüssel, drei im Live-Modus neu angelegte Preise
  (`npm run stripe:preise -- --apply`) und ein Webhook-Endpoint auf
  `https://capitalcircletrading.com/api/stripe/webhook` samt `STRIPE_WEBHOOK_SECRET`.
  **Ohne den Webhook entsteht nach einer Gast-Zahlung kein Konto** — der Käufer zahlt
  und bekommt nichts.
- **Widerrufs-Checkbox im Checkout** (am 06.09. entschieden, nicht gebaut) — gehört
  zum Rechtstexte-Paket.

📦 **Inhalte — die Plattform ist technisch fertig, aber halb leer:**

- **71 Videos liegen im unsortierten Stapel.** Sie haben eine Cloudflare-UID, sind also
  abspielbar; ihnen fehlt nur die Zuordnung zu einem Modul. Bis dahin sieht sie niemand.
- **38 Videos haben keine Cloudflare-Quelle** und sind depubliziert
  (`exports/tote-videos.csv`, Rückweg: `node scripts/unpublish-dead-videos.mjs --zurueck`).
  Drei **veröffentlichte** Module sind dadurch leer und fallen aus dem Institut:
  Livetrades (0 von 4), Trade Recaps (0 von 10), Psychology (0 von 0).
  Die gesunden Module zum Vergleich: Volume Profile + Orderflow 23/26, Fundamentale
  Analyse 14/15, NYSE iFVG Momentum 13/25, Market Foundations 11/13,
  Auction Market Theory 9/10, Tools & Indikatoren 4/5, Risk Management 2/6.
- **R2 ist leer.** **0 von 14 Modulen** haben ein Cover — die Cover-Anzeige im Institut
  zeigt derzeit bei keinem einzigen Modul etwas. Ebenso fehlen alle Video-Thumbnails,
  Arsenal-PDFs, Zertifikate und Avatare; sie lagen auf dem verschwundenen
  Hetzner-Bucket.

⚙️ **Konfiguration:**

- **Der Wartungsmodus ist aktuell AN.** `/` leitet für alle außer Admins auf `/wartung`;
  die Verkaufsseite ist über `/vorschau` trotzdem zu sehen.
- **Kein `owner` gesetzt** — 3 Admins, davon 0 mit `admin_role = 'owner'`. Die
  Owner-Regel läuft im Fallback („alle bestehenden Admins dürfen").
- `DISCORD_WAITING_ROOM_ROLE_ID` ist nirgends gesetzt, die Warteraum-Logik bleibt
  inaktiv (harmlos, aber ungenutzt).
- **R2-CORS deckt keine Branch-Preview-URLs ab.** Erlaubt sind `capitalcircletrading.com`,
  `www.capitalcircletrading.com`, `capital-circle-s5bg.vercel.app` und `localhost:3000`.
  Auf `capital-circle-git-<branch>-….vercel.app` scheitern Bild-Uploads mit CORS-Fehler.
- Alle fünf Admin-Bereiche mit echten Testdaten durchklicken (Coupon-Einlösung,
  Zahlungsausfall → Warteraum → Recovery, Zertifikat-Upload → Freigabe, Ticket-Antwort
  → E-Mail, Wartungsmodus ein/aus).

☐ **Nicht blockierend, aber offen:**

- Vier Bild-Uploads laufen noch über den Windows-Dateidialog statt Drag & Drop
  (`LiveSessionManager` 2×, `NewsManager`, Video-Thumbnails) — genau der Dialog, der
  den Browser des Nutzers einfriert.
- Keine Rate-Limits auf Zertifikat-Einreichung oder Ticket-Erstellung.
- GDPR-Export deckt eine sinnvolle Teilmenge ab (profiles, subscriptions, payments,
  applications), nicht jede Tabelle im Projekt.
- `auth.admin.listUsers({perPage:1000})` wird an mehreren Stellen ungepaged verwendet —
  unkritisch bei aktueller Mitgliederzahl, Pagination nachrüsten bei Wachstum.
- Emotion-`CacheProvider` im AdminFrame fehlt, daher eine Hydration-Warnung in der
  Konsole (kosmetisch).
- `next.config.ts` setzt `proxyClientMaxBodySize: "2gb"`; Vercel begrenzt Request-Bodies
  auf 100 MB. Folgenlos, weil Videos direkt zu Cloudflare Stream und Bilder per
  Presigned PUT direkt zu R2 gehen — der Wert ist nur irreführend.

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
