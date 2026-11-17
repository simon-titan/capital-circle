<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Dateien und Videos (Stand 16.09.2026)

**Kursvideos** liegen in **Cloudflare Stream** (`videos.cloudflare_uid`, signiertes HLS
per RS256-JWT, `requireSignedURLs`). **Alle übrigen Uploads** — Thumbnails, Anhänge,
Zertifikate, Avatare, Cover — liegen in **Cloudflare R2** (S3-kompatibel, Presigned PUT,
Region immer `auto`, Bucket in der EU-Jurisdiktion). Zentral in `lib/storage.ts` und
`lib/cloudflare-stream.ts`.

**Hetzner Object Storage ist tot.** Der Bucket antwortet mit `NoSuchBucket`, die
Schlüssel mit `InvalidAccessKeyId`. `HETZNER_*`-Variablen und
`getHetznerStorageMisconfiguration()` existieren nur noch als Altlast bzw. Alias —
nicht in neuem Code verwenden, `getStorageMisconfiguration()` heißt die aktuelle Form.

**Es gibt keine Migrationstabelle.** Migrationen werden von Hand im Supabase-SQL-Editor
eingespielt. `npm run db:check` prüft alle Migrationen gegen die echte Datenbank, indem es
die erzeugten Tabellen und Spalten abfragt; `npm run db:pending` baut die Sammeldatei.

**Bild-Uploads bitte per Drag & Drop** (`components/admin/ImageDropZone.tsx`). Der
Windows-Dateidialog friert auf dem Rechner des Nutzers den gesamten Browser ein
(Ereignis-ID 1002, betraf Chrome *und* Opera) — das ist kein App-Fehler, aber der Grund,
warum wir den Dialog umgehen.

## Design System (Capital Circle)

**Schema v3.2 „Champagner auf Graphit“ (seit 2026-09, Struktur aus Kunden-Mockups, Farben 1:1 nach Kunden-Mockup, Look auf Nutzerwunsch mit Gold-Effekten):** ein Schema für Plattform **und** Marketing — Graphitgrund mit Sternenfeld und Champagner-Licht, graphitgraue Glas-Karten mit Gold-Kante (`.cc-card`, Hero `.cc-card--hero`), eine Schrift (Inter), Champagner-Gold `#D4B080` mit Verlauf/Glow für Aktion, aktive Navigation, Fokus und Live. Daten im Dashboard (Fortschritt, Segmente, Streak-Haken) stehen in heller Datentinte (`--cc-ink`). Flächen bleiben dunkel und ruhig; Gold ist der einzige Akzent (Grün/Rot nur semantisch). Das alte Brand-Gold `#D4AF37` kommt in der App nicht mehr vor. **Migration abgeschlossen (2026-09-14):** Plattform, Marketing/Funnel, Auth/Onboarding, Einzelseiten und Admin laufen auf v3.2.

**Vor jeder UI-/Style-Arbeit zuerst [`DESIGN.md`](DESIGN.md) lesen** (verbindlich), dann [`docs/design/README.md`](docs/design/README.md) (Navigation, Migrationsstand). Maschinenlesbare Werte: `DESIGN.json` (v3.2). Implementierung: `app/globals.css` (`--cc-*`), `theme/index.ts` (Button-Varianten `gold` / `line`). Wiederverwendbare Bausteine: `components/platform/dashboard/primitives.tsx`, Shell in `components/platform/shell/`; Funnel-, Landing-, Onboarding- und Admin-Bausteine siehe [`docs/design/components.md`](docs/design/components.md).

**Typografie (verbindlich):** **Inter für alles** — Überschriften, UI und Zahlen (Zahlen mit `.cc-num` = tabellarische Ziffern). `app/layout.tsx` lädt **nur Inter**; Radley und JetBrains Mono sind entfernt. Die alten Klassen `.radley-regular*`, `.jetbrains-mono` und `.dm-sans` setzen nur noch Inter und kommen in neuem Code nicht vor. Keine weiteren Webfonts.

**Legacy, nicht erweitern:** `--color-*`-Tokens nur noch als Aliasse (Werte = v3.2-Palette; neuer Code nutzt `--cc-*`), `docs/design/hero-glass.md` und die Stilangaben in `docs/design/funnel-pages.md` (beide historisch). **Entfernt:** `GlassCard` / `.glass-card*` (ersetzt durch `.cc-card`), `GlowButton`, `CardLockOverlay`, `PageTransition` und das Marketing-Metall-Tier (Bronze/Silber/Orange).

## UI Feedback Memo

2026-09-13: Das rein minimalistische v3 (flach, keine Effekte) fand der Nutzer „extrem langweilig“. Gewünscht ist der **Gold-Look mit Effekten** (Glas, Gold-Glow, Verläufe, warme Streak-Flamme, Sternenfeld) auf der **neuen Struktur** (Sidebar, Raster, Inhalte aus den Kunden-Mockups).
Nicht wieder „wegminimieren“: Hero-Qualität, Gold-Glow und Tiefe beibehalten, aber keine neuen Akzentfarben neben Gold einführen.
Übrige Plattform- und Marketing-Seiten auf dasselbe Schema migrieren — erledigt (siehe 2026-09-14).
2026-09-13 (v3.2): Farben 1:1 nach Kunden-Mockup — der Gold-Akzent ist jetzt **Champagner `#D4B080`** auf Graphit, Dashboard-Daten in heller Datentinte. Die Effekte (Sternenfeld, Gold-Licht, Hero-Glow, Flamme, Gold-Buttons) bleiben ausdrücklich erhalten.
2026-09-14: **Migration abgeschlossen** — die gesamte App (Plattform, Marketing/Funnel, Auth/Onboarding, Einzelseiten, Admin) läuft auf v3.2. Neue Seiten direkt im Schema bauen, keine Legacy-Muster zurückholen.

2026-09-16 (**Ausnahme Dashboard**): Auf ausdrücklichen Nutzerwunsch läuft **nur `/dashboard`** ohne Gold-Glow — Kanten dort neutral grau, kein atmender Hero-Glow, keine Gold-Haarlinie an der Kartenoberkante, kein Schein an Fortschrittsbalken und Live-Punkt. Umgesetzt über die Wrapper-Klasse **`.cc-neutral`** (`components/platform/dashboard/DashboardView.tsx`, Regeln in `app/globals.css`) plus die entsprechenden Inline-Werte in `components/platform/dashboard/**`.
Das widerspricht bewusst dem Eintrag von 2026-09-13 („Gold-Glow beibehalten, nicht wegminimieren"). **Der gilt unverändert für den Rest der App** — Marketing, Institut, Admin und Funnel behalten Glas, Gold-Kante und Glow. Wer das Dashboard anfasst: den Gold-Look dort nicht „wiederherstellen".
Gold-Schrift und Gold-Buttons bleiben auch im Dashboard (Aktionen und Begrüßung) — entfernt wurden nur Schein und Rahmenfarbe.

2026-09-17 (**Himmel ruhiger, gilt global**): Der Hintergrund war dem Nutzer zu unruhig. Der
Grund ist jetzt einen Tick dunkler (`#12171c` → **`#0f1317`**), Sternenfeld und Champagner-Licht
hängen an zwei neuen Reglern in `:root`: **`--cc-sky-stars`** (0.5) und **`--cc-sky-glow`** (0.58).
Die rgba-Werte in `.cc-stars` und `.cc-goldlight` halten nur noch das Verhältnis zueinander — wer
den Himmel nachjustiert, dreht an den zwei Reglern, **nicht** an den Verläufen. Der Funkel-Keyframe
`cc-twinkle` läuft von 0.55 → 0.8 statt 0.35 → 1 (fast auf null abfallendes Funkeln liest sich als
Blinken). Der dunklere Grund steht an drei Stellen, die zusammenbleiben müssen: `--cc-bg`, die
`--color-bg*`-Aliasse in `app/globals.css` und `brand.bg` in `theme/index.ts` (Chakra erzeugt daraus
`body { background }` und überschreibt damit die CSS-Regel). Das betrifft Plattform **und**
Marketing — beide teilen sich den Himmel, und genau so war es gewünscht.
Das ist **keine** Rücknahme des Eintrags von 2026-09-13: Glas, Gold-Kante und Glow bleiben
unverändert. Leiser wurde nur der Grund dahinter.

2026-09-17 (**Verkaufsseite**): Neue Prozess-Section „Aus Wissen wird ein Prozess." zwischen
Bewertungen und Vergleich (`components/landing/membership/ProzessSection.tsx`); der Nav-Anker
`ablauf` zeigt endlich dorthin statt auf die Vergleichstabelle. Vergleich und „Für wen" laufen auf
den neuen Kunden-Mockups (zweizeilige Tabellenzellen, Merksatz an einer senkrechten Haarlinie,
weiße Icon-Kacheln, CTA unter der Section). CTA heißt überall **„Capital Circle beitreten"**.
Die beiden nachgebauten Vorschauen in der Prozess-Section rechnen in **`cqw`** (Container-Queries),
sind also Maßstabsmodelle: Wer dort Größen ändert, ändert sie in Prozent der Kachelbreite, nicht in
Pixeln. Der Screenshot dazwischen liegt unter `public/prozess/` — der Ordner steht deshalb im
Matcher von `proxy.ts` unter den Ausnahmen, sonst liefert der Proxy dort Login-HTML statt Bild.

2026-09-17 (**Belegte Auszahlungen**): Die Ergebnis-Section zeigt echte Nachweise statt
Platzhalter (`config/landing-membership.ts`, `auszahlungenCommunity` / `auszahlungenEmre`), alle
weiteren liegen auf der neuen öffentlichen Seite **`/ergebnisse`** (`app/ergebnisse/page.tsx`,
Galerie in `components/landing/membership/NachweisGalerie.tsx`). Nicht verwechseln mit
`/erfolge` — das ist die Galerie der von Mitgliedern selbst eingereichten Nachweise aus der
Tabelle `certificates`.
Aufgenommen wird **nur, wo Geld geflossen ist** (Überweisung, Payout-Mail, Payout-Zertifikat).
Kontostände, Tagesgewinne und bestandene Challenges gehören ausdrücklich nicht dazu: Von 82
gelieferten Screenshots waren nur 16 echte Auszahlungen, der Rest zeigt Kontogrößen — die neben
eine Auszahlung zu stellen würde das Versprechen „jeder Nachweis nachprüfbar" brechen.
Die Bilder liegen unter `public/nachweise/` und stehen **unverändert**, genau so wie der Nutzer
sie geliefert hat — mit Discord-Kopfzeile, Avatar, Nickname und Klarnamen auf den Urkunden.
Ausdrückliche Entscheidung vom 17.09.2026; eine erste Fassung war zugeschnitten und anonymisiert,
das war nicht gewollt. Wer hier etwas anfasst, sollte wissen: Es sind personenbezogene Daten
Dritter auf einer öffentlichen Seite **und in einem öffentlichen Repo** — mit dem Commit sind sie
draußen, nicht erst mit dem Deploy. Das Einverständnis der Mitglieder liegt beim Betreiber.
Der Ordner steht im Matcher von `proxy.ts` unter den Ausnahmen, `/ergebnisse` in `PUBLIC_PATHS` —
ohne beides liefert der Proxy dort Login-HTML.

2026-09-17 (**Bestandene Challenges**): `/ergebnisse` hat einen **zweiten Block** unter den
Auszahlungen — 17 Challenge-Zertifikate aus demselben Bildbestand (`challenges` in
`config/landing-membership.ts`, Bilder `public/nachweise/challenge-<firma>-<YYYY-MM-DD>.jpg`).
Getrennt, weil die Zertifikate etwas anderes belegen: Die genannten 25.000 bis 150.000 $ sind
**Kontogrößen, keine Auszahlungen**. Deshalb heißt das Feld `kontogroesse` und nicht `betrag`, steht
die Zahl **neutral statt grün** (Grün trägt laut DESIGN.md Gewinn) und trägt auf der Kachel die
Beschriftung „Kontogröße". Wer die beiden Listen zusammenlegt oder das Feld umbenennt, baut genau
die Verwechslung ein, gegen die der Block gebaut wurde.
`NachweisGalerie.tsx` trägt beide Arten über ein `art`-Feld je Block und hat dafür eine **eigene
Lightbox**: die aus `ErgebnisseSection.tsx` färbt ihre Zahl fest grün, weil sie nur Auszahlungen
kennt. Die Verkaufsseite `/` zeigt weiterhin ausschließlich die Auszahlungen.
Die 17 Bilder stehen unverändert in ihren Originalmaßen (siehe oben). Ausnahme sind **drei**
Quellbilder, die zwei Dokumente übereinander zeigen: Sie sind nur waagerecht getrennt, volle
Breite, Originalpixel. Ohne diese Trennung stünde unter „Kontogröße 100.000 $" ein Screenshot,
dessen größtes Element ein Überweisungsbetrag ist — und dasselbe Bild eine Sektion höher noch
einmal als Auszahlung.
Aussortiert wurden ein Zertifikat ohne lesbares Datum, eine Topstep-Funding-Mail ohne Kontogröße
und eine Dublette.

2026-09-29 (**Hero-Video statt Dashboard-Nachbau**): Unter der Headline der Verkaufsseite läuft
jetzt ein geschnittener 60-s-Rundgang durch die Plattform als stummer Loop
(`components/landing/membership/PlattformVideo.tsx`, Dateien in `public/hero/`, Quelle
„website hero.mp4"). Der Markup-Nachbau `PlattformVorschau` samt `plattformVorschau` in der Config
ist entfernt — der Eintrag vom 17.09. („Hero-Vorschau hängt am Dashboard") gilt damit nicht mehr.
Kein Player: keine Steuerelemente, keine Klicks, `aria-hidden`. Das Video trägt **nur einen Gold-/Weiß-Glow, keine
Rahmenlinie** (Nutzerwunsch; eine Champagner-Kante mit Lichtkante oben war kurz drin und ist
ausdrücklich wieder raus). Der frühere Verlauf, mit dem die Vorschau nach unten abtauchte, ist weg. Direkt über dem Video
steht ein **kleines Badge** „Von einem echten Trader entwickelt, für echte Ergebnisse"
(`hero.videoBadge`). Die Dachzeile über der Headline bleibt „Premium Trading Community" — sie
ersetzen war ein Missverständnis und ist zurückgenommen, ebenso im Vorschaubild. Vier Fassungen (AV1 und H.264,
Desktop 1920 px und Mobil 1080 px, 30 fps) plus WebP-Poster, AV1 Desktop ~4,8 MB, Mobil ~2,5 MB.
`public/hero/` wird ein Jahr `immutable` gecacht (`next.config.ts`) — **beim Austausch neue
Dateinamen vergeben** (aktuell `plattform-2-…`, als Nächstes `plattform-3-…`). Der Ordner steht im
Matcher von `proxy.ts` unter den Ausnahmen.

2026-09-17 (**Kaufweg**): `app/go/[plan]/route.ts` leitet bei jedem Fehlschlag auf `/?fehler=<code>`.
Der Code wird von `components/landing/membership/KaufFehlerHinweis.tsx` gelesen und über dem Hero
angezeigt. Der Hinweis liest die Adresse **im Client** in einer `Suspense`-Grenze — würde die Seite
`searchParams` entgegennehmen, fiele die ganze Verkaufsseite von statisch auf dynamisch. Wer einen
neuen Fehlercode in der Route ergänzt, ergänzt auch den Text dort; unbekannte Codes fallen auf den
allgemeinen Kassenfehler zurück. Der Kaufknopf in `AngebotSection.tsx` sperrt sich nach dem ersten
Klick und zeigt „Kasse wird geöffnet …" — ohne das entsteht beim Doppeltipp eine zweite Stripe-Kasse.

2026-09-22 (**Kasse mit bestehendem Kunden**): Jede Stripe-Kasse, die `customer` übergibt, braucht
`customer_update: { address: "auto" }` — sonst lehnt Stripe Tax (`automatic_tax`) die Session ab,
weil unsere Kunden nur mit E-Mail angelegt werden und keine Adresse haben. Stand bis dahin nur beim
Lifetime-Kauf; die drei Abos scheiterten für jeden eingeloggten Käufer mit Stripe-Kunde, praktisch
also für die Whop-Umzügler („Unexpected end of JSON input" bzw. in Safari „The string did not match
the expected pattern" im Toast). Betrifft `app/api/stripe/create-checkout-session/route.ts` und
`app/go/[plan]/route.ts` (dort nur im `customer`-Zweig, bei `customer_email` verbietet Stripe das
Feld). Der Stripe-Block der eingebetteten Kasse steht jetzt in try/catch und antwortet mit
`stripe_fehler`; der Client liest die Antwort über `components/billing/kassenFehler.ts`.

2026-09-23 (**Lifetime-Popup**): Im Mitgliederbereich erscheint **einmal** ein Popup mit dem
Lifetime-Angebot, ab dem 30. Tag nach Kontoanlage (`profiles.created_at`) und nur für Konten, denen
`pruefeLifetimeAngebot()` den Kauf erlaubt. Anzeige in `components/platform/shell/LifetimePopup.tsx`
(hängt in `PlatformFrame`), Entscheidung und Merken in `app/api/lifetime/popup/route.ts`, gemerkt in
`profiles.lifetime_popup_gesehen_am` (Migration 104) plus `localStorage`. Auf Abo-, Checkout- und
Billing-Seiten kommt es nicht. Neutral gerahmt (kein Gold-Schein), weil es auch über dem Dashboard aufgeht.

2026-10-17 (**Call-Funnel und Mentoring-Programme**): Nach Emres Board gibt es neben der Abo-Verkaufsseite
`/` (bleibt unverändert) einen Call-Funnel **`/call`** (VSL mit Ton, Fragebogen + Calendly, Case
Studies, Nachweis-Wand) und drei Programme, verkauft im Closing-Call über einen **Kassenlink**:
Ausbildung 599 € (max. 2 Raten), Main 3.000 € und Premium 5.000 € (max. 4 Raten), dazu das Live-Trading-Abo
99 €/Monat. Alles Fachliche steht in `config/mentoring.ts`, die Kasse in `lib/mentoring/kasse.ts`, der
Webhook-Zweig in `lib/stripe/webhooks/mentoring.ts`, Tabellen in Migration 108.
**Stufe `mentoring`**: Plattform, Kurse und Journal dauerhaft (wie Lifetime, aber `is_paid` zählt),
**Live-Sessions und Analysen nur bis `profiles.live_bis`** (`hatLiveZugang` in `lib/mentoring/zugang.ts`,
gespiegelt als `hat_live_zugang()` in der Datenbank). Wo sich das Board widersprach, gelten die
Detailblätter (Entscheidung Simon): Live 3 bzw. 12 Monate, Gruppencall Main 4 / Premium 12 Monate.
**Raten sind Monatsabos, aber keine Mitgliedschaft**: Alle Abo- und Rechnungs-Handler zweigen vorne an
`metadata.art` ab (`mentoring`, `mentoring_raten`, `live_abo`), solche Abos stehen **nicht** in
`subscriptions`. Die Raten enden über einen Subscription Schedule von selbst. Geplatzte Rate: Mahnen,
an Tag 7 sperren (`is_paid`), nachgeholte Zahlung öffnet wieder. Geplatztes Live-Abo: kein Zahlungsfall,
`live_bis` läuft einfach aus. Wer einen neuen Abo-Handler baut, muss denselben Abzweig setzen, sonst
schreibt ein Ratenkauf `membership_tier: monthly` oder nimmt nach der letzten Rate den Zugang.
**Garantie** (`garantie` in `config/mentoring.ts`) ist ein Entwurf mit `freigegeben: false` — bis Emre die
Bedingungen abnimmt, zeigt keine Seite den Garantiesatz und `/garantie` ist 404 (Vorschau mit `?vorschau=1`).
AGB § 7a ist neu und nicht anwaltlich geprüft.

2026-10-19 (**Vorschau für Emre, P1-Fixes Funnel und Kasse**): **`/vorschau/mentoring`** zeigt den
ganzen Mentoring-Funnel mit Beispieldaten — Call-Funnel (`/vorschau/mentoring/call`, ohne Tracking,
Lead und Calendly), alle Kassenseiten (`kasse/<variante>`, Varianten in `app/vorschau/mentoring/varianten.ts`),
die Bestätigungsmail als HTML (`mail/<variante>`) und den Garantie-Entwurf. Öffentlich und vom
Wartungs-Gate ausgenommen (`proxy.ts`). Die Kassenseite rendert dafür über **`components/kasse/KassenAnsicht.tsx`**
— echte Seite und Vorschau teilen sich das Layout; Änderungen dort, nicht in `app/kasse/[token]/page.tsx`.
Auf `/call` ist der Klick auf **„Weiter zum Kalender"** im letzten Frageschritt die Calendly-Einwilligung
(Hinweis steht direkt darüber, Datenschutz ergänzt); `CalendlyZweiKlick` hat dafür `sofort` und zeigt
nach 8 s ohne iframe einen Direktlink. Ohne VSL entfällt Schritt 1 samt
„Schritt x von 2". Die Erfolgsseite sagt bei Programmkäufen „Dein Zugang" statt „Mitgliedschaft"
(`produkt` in `ladeKaufStatus`).
Danach die P2-Punkte: **Ratenzahlen nur, wo der Preis glatt aufgeht** (`erlaubteRaten`) — Premium also 1, 2
oder 4 Raten, weil 3 × 1.666,66 € = 4.999,98 € ergäbe. Wer Premium in 3 Raten will, muss den Restcent auf eine
Rate legen (Schedule, Webhook, Mail, Admin), nicht nur den Filter lockern. Die Kassenseite trennt „Dauerhaft
enthalten" von „Live und Betreuung" (`Leistung.dauerhaft`), nennt beim Live-Abo das Datum der ersten Abbuchung
(`ersteLiveAbbuchung` in `lib/mentoring/kasse.ts`, dieselbe Regel wie `trial_end`) und zeigt die
Zahlungs-Logos nur, solange `STRIPE_PMC_MENTORING` leer ist. Auf `/call`: Laufzeile mit Pause-Knopf,
Nachweis-Wand als Auswahl (`ergebnisseAuswahl`, ohne die Belege, die schon Case Study sind), Auto-Weiter nach
Klick auf eine Option (nicht per Tastatur, nie auf der letzten Frage), eigene Budgetfrage (`buchung.karte.fragen`,
`/termin` unverändert), VSL-Untertitel über `NEXT_PUBLIC_CALL_VIDEO_CAPTIONS` (WebVTT unter `public/untertitel/`,
steht im Matcher von `proxy.ts`).
Danach auf Wunsch: **Buchung auf `/call` als Modal** statt zweier Inline-Karten. Jede Hauptaktion ist ein
`CallBuchungKnopf` und öffnet dasselbe Modal (`CallBuchung.tsx`); der Zustand liegt im Provider, Schließen und
Wiederöffnen landet im selben Schritt. Alte Links auf `/call#termin` öffnen das Modal direkt. Während der
Kalender offen ist, schließt ein Klick daneben das Modal nicht.

2026-11-02 (**Verkaufsschalter: normalen Zugang schließen**): Unter **`/admin/verkauf`** (System → Verkaufsseite)
lässt sich der normale Zugang schließen. **Übergangsweise** (bis der neue Funnel live ist) zeigt die Hinweisseite nur
die Ankündigung „Etwas Großes steht an. … Schau in den nächsten Tagen wieder vorbei" **ohne Knopf** — das ist der
Standard (`VERKAUF_VORLAGEN.uebergang`). Danach im Admin „Vorlage: Funnel" einsetzen: Knopf an, Ziel `/training`.
Texte, Knopf und Ziel sind im Admin einstellbar. Logik zentral in `lib/verkauf/schalter.ts`,
gespeichert in `app_settings` unter `verkauf_geschlossen` (Upsert, keine Migration nötig; fehlt die Zeile, gilt „offen").
Geschlossen heißt: `/` zeigt per **Rewrite in `proxy.ts`** die Hinweisseite `app/geschlossen/page.tsx` (die
Verkaufsseite selbst bleibt statisch, `/vorschau` zeigt sie weiter), `/go/<plan>` legt keine Kasse an — **auch nicht
für `?src=whop`** —, `/api/stripe/create-checkout-session` antwortet `verkauf_geschlossen`, die Abo-Seite zeigt Konten
ohne laufendes Abo den Funnel-Hinweis statt der Pakete, und `pruefeLifetimeAngebot()` liefert `verkauf_geschlossen`
(damit verschwinden Lifetime-Karte, -Popup und -Absätze in Mails). Die Folgemails der Plattform-Umzugskampagne
pausieren, der Whop-Umzug verweigert das Senden. **Offen bleiben** laufende Abos (Verlängerung, Jahreswechsel,
Kündigung, Mahnungen), Login und Rechtstexte. Wer einen neuen Kaufweg für Abo oder
Lifetime baut, fragt `istVerkaufGeschlossen()` — ungecacht; nur der Proxy cacht 15 s.
Achtung beim Testen: Der Schalter liegt in der Produktionsdatenbank — lokal umlegen schließt die Live-Seite.
Nebenbei behoben: „Jetzt Mitglied werden" in `PaywallOverlay` und auf gesperrten Live-Sessions führte jeden auf
`/bewerbung`, die der Proxy nur freigegebenen Free-Mitgliedern öffnet — alle anderen landeten zurück auf dem
Dashboard. Das Ziel kommt jetzt aus `mitgliedWerdenZiel()` in `lib/membership.ts`.

2026-11-02 (**Free-Training-Funnel**, Board „Gesamtübersicht"): Neuer Weg in die Plattform. Alles Fachliche und alle
Texte in **`config/training.ts`**, Datenmodell in Migration **109** (`profiles.funnel_quelle`,
`profiles.training_registriert_am`, Kurs/Modul „Kostenloses Training" mit festen IDs `…0012`/`…0112`, CRM-Tabelle
`training_leads`).
- **`/training`** (öffentlich, statisch): Landingpage + Registrierungs-Modal (Name, E-Mail, Passwort, Turnstile).
  `/api/training/registrieren` legt das Konto per `generateLink({ type: "signup" })` **unbestätigt** an und schickt
  die Bestätigung über Resend; der Link geht über `/auth/confirm` direkt nach `/kostenloses-training`. Eine zweite
  Registrierung mit unbestätigter Adresse schickt einen neuen Link (Magic Link). `application_status` bleibt null —
  mit `pending` landete das Konto auf `/pending-review`. `/free` leitet dauerhaft auf `/training`; die alte
  Free-Mailstrecke ist abgeschaltet (`free-course-sequence`, `ABGESCHALTET`), ersetzt durch
  `app/api/cron/training-sequence` (vier Stufen, `email_sequence_log` sequence `training`, schweigt ohne Videos).
- **`/kostenloses-training`** (Mitgliederbereich): spielt das Modul mit dem vorhandenen Kursplayer ab — Freischaltung
  Video für Video nach der 90-%-Regel (`lib/module-video.ts`), Fortschritt in `user_progress`. Ohne hochgeladene
  Videos stehen Platzhalter da. Der Kurs ist aus dem Institut ausgeblendet (`getAcademyModulesOverview`). Stand je
  Konto: `lib/training/stand.ts`.
- **Videos (Stand 06.11.2026):** **fünf** Kursvideos (`TRAINING_VIDEO_ANZAHL = 5`; sichtbare Texte nennen **keine** Anzahl mehr, Entscheidung Simon 06.11.):
  Einführung, Grundlagen, Auction Market Theory, Dein Tradingansatz, Das System in der Praxis. Das „einführungsvideo free
  kurs 01" ist **Kursvideo 1**, nicht das Landingpage-Video — das war am 05.11. falsch zugeordnet. Emres eigenes
  **Funnel-Video im Hero von `/training`** ist seit 14.11. die finale Fassung „free kurs phunnel video.mp4" (1:51,
  Vorgabe `landingVideo` in `config/training.ts`), das **VSL auf `/call`** „main phunnel video .mp4" (8:29, Vorgabe
  `callVideo` in `config/call-funnel.ts`), beide unsigniert. **Getauscht werden sie im Admin** (Karte „Funnel-Videos" oben
  auf `/admin/training/videos`, `lib/funnel-videos.ts`, `app_settings.funnel_videos`, ohne Migration): Video aus Stream
  wählen, Standbild-Sekunde, „Videos tauschen", „Auf Vorgabe zurück". Die Auswahl hat Vorrang vor der Config; die Seiten
  bleiben statisch (`revalidate = 3600`, Speichern ruft `revalidatePath`). Der Server stellt ein Funnel-Video auf
  **unsigniert** und lehnt Kurs-, Live- und Blueprint-Videos ab; umgekehrt lehnen Trainingsvideo- und Blueprint-Route ein
  aktuelles Funnel-Video ab (`funnelSperrHinweis`) — signiert wäre die Landingpage schwarz. Die früheren Overrides
  `NEXT_PUBLIC_CALL_VIDEO_URL` / `_POSTER` sind seit 14.11. aus dem Code (sie hielten lokal ein altes Video fest).
  Die **Videoanleitung zum Trading Blueprint** ist „Video 6.mp4" (10:27, signiert). Kursvideos angeordnet, benannt und
  veröffentlicht werden auf derselben Seite (Admin → Vertrieb → Funnel- & Kursvideos): Drag & Drop, Auswahl aus
  Cloudflare Stream (auch direkt im Cloudflare-Dashboard hochgeladene Dateien) oder neuer Upload. Beim Hinzufügen stellt
  die Ansicht das Video auf `requireSignedURLs` (`setRequireSignedUrls` in `lib/cloudflare-stream.ts`) — Dashboard-Uploads
  tragen das nicht. **Das Landingpage-Video bleibt unsigniert** (statische Seite, ein Token liefe ab): nie in ein Modul
  hängen. Die Landingpage-Titel stehen statisch in `videoPlatzhalter` — mit den Titeln im Admin gleich halten.
- **Free-Dashboard:** Konten ohne Zahlung sehen oben `TrainingKarte` (Fortschritt, nächstes Video, zwei Wege).
- **`/programme`** („Ausbildung & Mentoring", Nav-Punkt mit Badge „Neu"): Ausbildung per Selbstkauf
  (`/api/programme/ausbildung`, `starteKasse` mit `abbruchPfad`/`quelle`, einmal oder 2 Raten — **nicht** hinter dem
  Verkaufsschalter), Mentoring über das Analysegespräch. Abo-Mitglieder dürfen kaufen (Entscheidung Simon), ihr Abo
  endet dann zum Periodenende; Mentoring/Lifetime/1:1 sehen „Bereits freigeschaltet".
- **Analysegespräch** (`components/platform/training/AnalyseGespraech.tsx`): Fragen wie `/call`, Name/E-Mail aus dem
  Konto, Leads in **`training_leads`** mit `stelle` (nach_video_3, training, programme, dashboard) und Videostand —
  **eigenes CRM-Board `/admin/training`**, getrennt von `discord_leads` (Wunsch Simon: „klar sehen, wer von wo kommt").
  Calendly mit `utm_medium=training` + Token; der Webhook hat dafür einen eigenen Zweig. Eigener Termin-Typ optional
  über `NEXT_PUBLIC_TRAINING_CALENDLY_URL`. Ein Mentoring-Kauf setzt den offenen Lead des Kontos auf „gewonnen".
- **Herkunft** (Board, Spalte 1): Die Landing merkt sich UTM und Referrer (`lib/training/herkunft.ts`, localStorage,
  30 Tage), die Registrierung speichert sie in `profiles.funnel_herkunft` mit `kanal` (youtube, instagram, tiktok,
  podcast, google, direkt, sonstige), Leads übernehmen ihn (`training_leads.kanal`). Das Board schlüsselt danach auf.
  **Links in Bio, Videobeschreibung und Shownotes deshalb mit `?utm_source=youtube|instagram|tiktok|podcast`.**
- **Abgelaufener Bestätigungslink:** `/auth/confirm` schickt Links mit `next=/kostenloses-training` bei einem Fehler
  zurück auf `/training?fehler=link_abgelaufen` (Hinweis + erneut eintragen), nicht auf den Login.
- **Team-Benachrichtigung:** Mail an `TEAM_POSTFACH` (+ optional `TRAINING_LEAD_EMPFAENGER`, kommagetrennt) bei jeder
  neuen Gesprächsanfrage und bei der Calendly-Buchung (`lib/email/templates/training-team.tsx`, wirft nie).
- Eingeloggte auf `/training` leitet `proxy.ts` direkt nach `/kostenloses-training`.
- **Community & Live** (Board, Spalte 9): `CommunityLiveKarte` auf dem Free-Dashboard — nächste Live-Termine und die
  Discord-Kanäle mit Schloss (Kanalnamen in `community` in `config/training.ts`, nur Anzeige).
- Sobald die Videos stehen: unter `/admin/verkauf` „Vorlage: Funnel" einsetzen (Knopf auf `/training`).

2026-11-07 (**Free-Kurs-Bewerbung und E-Mail-Playbook, Phase 1+2**): Emres „E-Mail-Playbook 1.0“ (36 Vorlagen
A01–Q02, Stoppregeln, 38 Abnahmetests) ist die verbindliche Vorlage. **Umgesetzt sind Bewerbung, 30-Tage-Zugang und die
Free-Kurs-Mails (A, S, L, I, E).** B/T/R/N (Termine, Calendly) und W/U/V/Q (Kauf, Live) folgen als Phase 3 und 4.
- **Kein Sofort-Zugang mehr:** `/training` ist eine Bewerbung (Emres drei Fragen + „Möchtest du, dass wir dich
  kontaktieren?“, Texte in `bewerbung` in `config/training.ts`). Konto + Bewerbung legt `/api/training/registrieren` an,
  der Bestätigungslink führt auf **`/training/status`**; erst dann geht A01 raus (`nachAdressbestaetigung` in
  `lib/training/bewerbung.ts`, aufgerufen aus `/auth/confirm`). Bestehende Free-Konten ohne Zugang bewerben sich auf
  `/kostenloses-training` (`/api/training/bewerbung`). Emre entscheidet unter `/admin/training` → Reiter Bewerbungen:
  Annehmen = `training_zugang` mit **30 Kalendertagen** (gleiche Berliner Uhrzeit, `plusKalendertageBerlin`) + A02,
  Ablehnen = A03, **endgültig** (eine Bewerbung je Konto, `unique(user_id)`). Offene und abgelehnte Free-Konten schickt
  `proxy.ts` auf `/training/status`. `application_status` und der alte Bewerbungsweg bleiben unberührt.
- **Zugang** (`lib/training/zugang.ts`, `ladeTrainingFreigabe`): Zahlende und Admins immer; sonst nur mit aktivem
  `training_zugang`. Gesperrt wird in `/api/video-url` und `/api/dashboard/lektion`, das Konto bleibt. Einmalig +7 Tage
  **ab Freischaltung durch das Team** (Board, Registrierungen → „7 Tage“, schickt E03), angefragt wird nur per WhatsApp
  (`TRAINING_WHATSAPP_NUMMER`, ohne sie geht E02 nicht raus). Bestandskonten aus der Zeit vor dem 07.11. bekamen mit
  Migration 110 30 Tage ab Einspielen (`aus_bestand`, keine S/L/I-Mails). **Video 2 ist optional** (`OPTIONALE_VIDEOS`,
  `PlaylistVideoRow.optional`): Video 3 öffnet nach Video 1, Abschluss = 1, 3, 4, 5. Videotitel nach Playbook.
- **Versandsteuerung** (`lib/mailsystem/`): Die Entscheidung ist eine reine Funktion (`free-entscheidung.ts`) mit den
  Abnahmetests in `free-entscheidung.test.ts` (**`npm run test:mails`**). Jede Vorlage landet je Kontakt und Anlass genau
  einmal in **`mail_versand`** — gesendet, übersprungen oder gestoppt, mit Grund (Board → Versandprotokoll). M/K-Mails mit
  24 h Mindestabstand, Priorität nach Kapitel 08, mehr als 24 h Verzug wird übersprungen statt nachgeholt. Harte Stopps:
  `mail_sperre` (Bounce/Beschwerde aus dem Resend-Webhook), `unsubscribed_at`, Kauf. **Kontaktpause** (`kontakt_pause`,
  Board → „Pause“) hält M/K an, Aufheben nur mit festgehaltenem nächsten Schritt; E05 ist die ausdrückliche Ausnahme.
  Gesprächsanfrage = `training_leads.fragen_am` bzw. `discord_leads.questions_completed_at`.
- **Texte unverändert aus dem Playbook** (`lib/email/templates/playbook/free-kurs.tsx`), Absender
  „Emre | Capital Circle“ über `MAIL_ABSENDER_EMAIL` (sonst `RESEND_FROM_EMAIL`), Antworten an `MAIL_ANTWORT_AN`
  (sonst Team-Postfach) — keine unbeaufsichtigte No-Reply-Adresse. Vorschau aller 17 Mails: `/admin/training/mails`.
- **Cron `mail-free`** ersetzt `training-sequence` (abgeschaltet). In `vercel.json` täglich, verträgt aber jeden Takt —
  auf Vercel Pro stündlich einplanen, sonst gehen „+24 h“-Mails bis zu einen Tag später. `?probe=1` entscheidet nur.
- Links aus Mails überleben den Login (`proxy.ts` hängt `next` an, `OnboardingFlow` folgt ihm).
- **Cron-Takt (Vercel Pro):** `mail-free` stündlich, `mail-termine` alle 5 Minuten, `mail-kunden` stündlich (:30).

2026-11-07 (**E-Mail-Playbook Phase 3+4, Preise**): Entscheidungen Simon: Preise nach Playbook, Calendly-Mails aus,
Vercel Pro, **keine Qualifizierung** — jeder bekommt nach den Fragen den Kalender.
- **Preise:** Ausbildung **799 €** (2 Raten à 399,50 €), Premium **bis 6 Raten**. Der Restcent liegt auf **Rate 1**
  (`ersteRateCents`, `ratenText` in `config/mentoring.ts`): Die Kasse bucht Rate 1, der Subscription Schedule hat dann zwei
  Phasen (1 Monat Kassenpreis, `raten − 1` Monate Regelrate, `richteRatenEndeEin`). Summe = Preis, `erlaubteRaten` = 1…max.
  Kassenlinks bis 6 Raten brauchen Migration 111.
- **Neue Gesprächsfragen** (Emres vier, `DISCORD_FUNNEL_QUESTIONS`): drei Auswahlen + Freitext „größte Schwierigkeit“
  (`typ: "freitext"`, `antwortGueltig`), Investitionsfrage mit Einleitung. Gelten für `/call`, `/termin`, Discord-Funnel und
  das Analysegespräch. Die sechs alten stehen als `FRUEHERE_FRAGEN` für alte Leads und die Auswertung (`ALLE_FRAGEN` zum
  Anzeigen). `buchung.karte.fragen` überschreibt nichts mehr.
- **Termine** (Migration 111, `termine`): Der Calendly-Webhook legt jede Buchung als Terminversion an (`lib/mailsystem/termine.ts`)
  mit Berater, Einwahl-, Absage- und Umbuchungslink; Umbuchung = neue Zeile, gleicher `vorgang`. **Abonnieren:**
  `invitee.created`, `invitee.canceled`, `invitee_no_show.created/deleted`. Die Calendly-Ereignistypen brauchen einen Ort mit
  Einwahllink (Zoom/Meet) — ohne ihn blockiert T01 und das Team bekommt „Mail blockiert“. Board → **Termine**: geführt,
  No-Show (erst nach Beginn), Absage, kein Interesse, wir sagen ab.
- **Termin-Mails** T01, R01–R03 direkt im Webhook; T02–T04, N01/N02 und B01–B03 im Cron `mail-termine`
  (`termin-entscheidung.ts`, Tests 13–24). Alle hinter **`PLAYBOOK_TERMINMAILS=1`** — erst setzen, wenn in Calendly die Mails an
  Eingeladene aus sind, sonst bekommt jeder alles doppelt. Ziele: `/termin/kalender/<t|d>-<token>` (Kalender zur vorhandenen
  Anfrage, nach zweitem No-Show gesperrt), `/termin/vorbereitung/<…>` (Video 5 ohne Free-Bewerbung, signiert),
  `/api/termin/ics/<id>?t=` (Kalendereintrag).
- **Kauf:** Die Kaufbestätigung beginnt jetzt mit **W01** bzw. **Q01** (Playbook-Text, Absender Emre), der Vertragsteil (§ 312f)
  bleibt darunter — eine Mail. **U01/U02** nur für Ausbildungskäufer (Tag 14/30, Stopp bei Upgrade, Erstattung, Anfrage nach dem
  Kauf), **V01/V02** am Ende des enthaltenen Live-Zugangs (`live_bis`, Stufe mentoring, Stopp bei Live-Abo) — Cron `mail-kunden`
  (`kunde-entscheidung.ts`). **Q02** schickt der Webhook bei `cancel_at_period_end`; über den Kündigungsbutton gekündigt
  bestätigt schon die gesetzliche Eingangsbestätigung das Ende, Q02 steht dann als übersprungen im Protokoll.
  V01/V02 verlinken auf `/live-abo` (POST-Knopf, kein Kassenlink in der Mail).
- Vorschau aller 36 Vorlagen: `/admin/training/mails`. Tests: `npm run test:mails` (42).
- **Daily Bias und Trade-Recaps sind im Live-Abo enthalten** (Entscheidung Simon 07.11.2026). Q01 weicht deshalb vom
  Playbook-Wortlaut ab, wie Kasse, AGB und Zugang. Marketing-Einwilligung weiter opt-out wie bisher.
- **Review 07.11.2026** (drei unabhängige Prüfungen) — Regeln, die daraus folgen:
  - Free-Bewerber sehen per Spaltenrecht nur `status` usw., nie `notiz`/Antworten. Gesperrt werden nur `/dashboard` und
    `/kostenloses-training`; Konto, Abrechnung, Kauf bleiben offen. Verlängern erst **nach** Ablauf.
  - Kontakt-Abmeldung ohne Konto landet in `mail_abmeldung` und gilt für alle M/K-Mails. Bounces: nur `Permanent` sperrt.
  - Mindestabstand wird beim Reservieren in `sendeVorlage` noch einmal geprüft (parallel laufende Crons); hängende
    Reservierungen verfallen nach 15 Minuten.
  - Calendly: ohne `CALENDLY_WEBHOOK_SIGNING_KEY` keine Termine/Mails; Fehler → 500 (Calendly wiederholt). Einwahllink wird
    mit `CALENDLY_API_TOKEN` nachgeladen, sonst blockiert T01 **einmal** mit Team-Meldung. Absage durch den Gastgeber = R03 —
    sagt der Kunde am Telefon ab, im CRM/Board „Abgesagt“ wählen.
  - Ratenplan wird bei jedem Abo-Ereignis repariert, falls der Schedule nicht auf `cancel` steht; eine gescheiterte
    Kaufbestätigung gibt ihre Sperre wieder frei.

2026-11-07 (**CRM für die Closer, `/crm`**, Migration 112): eigener Bereich ohne Adminrechte für Simon, Kevin, Daniel.
- **Zugang:** Admins und aktive Einträge in `crm_team` (`lib/crm/zugang.ts`), eintragen unter `/crm/team` (nur Admins; das
  Konto muss existieren). `/crm` ist von Wartungs- und Onboarding-Weiche ausgenommen und prüft selbst.
- **Kontakte** (`crm_kontakte`, einer je E-Mail) entstehen aus allen Quellen: `/call`, `/termin`, Discord, Analysegespräch,
  Free-Bewerbung mit Kontaktwunsch, HT `/apply` (`config/crm.ts` `QUELLEN`; Standardfilter „Neuer Funnel“). Abgleich
  `lib/crm/sync.ts` alle 5 Minuten (Cron `crm-sync`) und per Knopf. **Phasen nur vorwärts aus Belegen** (Termin, No-Show,
  geführt, Kassenlink, Kauf); was ein Closer gesetzt hat (`phase_gesetzt_am`), überschreibt ein älterer Beleg nicht.
- **Alle sehen alle**, gefiltert wird (Closer/Meine/Pool, Phase, Quelle, Zeitraum, Wiedervorlage, Suche — im Browser
  gemerkt). **Jeder darf umverteilen.** Wer zuerst anruft, übernimmt einen Pool-Kontakt.
- **Zuweisung nach Call-Blöcken** (`lib/crm/zuweisung.ts`, Tests): Termin beginnt 13–14 Uhr → Daniel, 15–17 → Kevin,
  17–19 → Simon (Blöcke in `crm_team`, änderbar), sonst Calendly-Gastgeber, sonst Pool.
- **Ansichten:** Heute (Termine, No-Show-Anruf +15 min, Wiedervorlagen, Pool), Pipeline (Kanban, Ziehen), Kontakte (Liste),
  Kontakt (Anrufen/WhatsApp, Anruf festhalten, Notiz, Phase, Wiedervorlage, Kassenlink, Kontaktpause, Terminstatus,
  Antworten, Free-Training, Käufe, Mails, Zeitstrahl), Auswertung (je Closer: Termine, Show-Rate, Abschlussquote, Main/
  Premium/Ausbildung, Vertragswert, bezahlt). Umsatz zählt für den Closer am Kassenlink, sonst den zugewiesenen.
- **Kopplung an die Mails:** CRM-Phase Verloren/Später/Gewonnen stoppt B-, N- und T02-Mails; Kontaktpause ist dieselbe wie im Board.
- Kassenlink-Anlage ist jetzt gemeinsam (`lib/mentoring/kassenlink-anlage.ts`), Kürzel `daniel` ergänzt.
- **Benachrichtigungen vorbereitet, aus:** `CRM_BENACHRICHTIGUNGEN=1` schickt dem Closer eine Mail bei zugewiesenem Termin
  und 15 Minuten nach Beginn, wenn der Termin noch „gebucht“ steht (`lib/crm/benachrichtigung.tsx`).

2026-11-08 (**Funnel-Seiten nach Emre-Feedback**): `/training` und `/call` folgen Emres Mockups.
- **`/training`** (`TrainingLanding.tsx`, Texte `landing` in `config/training.ts`): Hero = Headline, Video, Knopf
  „Jetzt kostenlos bewerben", darunter klein in Gold „100 % kostenlos. Nicht für jeden zugänglich." (`hero.hinweis`, steht
  unter **jedem** Bewerbungsknopf) → „Einblicke aus der Capital Circle Community" (`CommunityEinblicke.tsx`) → „So erhältst
  du Zugang" (Bewerben → Prüfung → Freischaltung, `landing.zugang`) → Bewertungen → FAQ → Abschluss. Hero-Pill, -Punkte,
  Sterne und die Auszahlungen (`ErgebnisseSection`) sind dort raus, `landing.ablauf` heißt jetzt `landing.zugang`.
  `/vorschau/training-2` hält Pill-Text und Punkte als eigene Konstante (`VORSCHAU_HERO`).
- **Discord-Proofs** liegen als Kopie unter **`public/community/discord-01…10.png`** (Originale bleiben in
  `public/Discord Funnel/`, dessen Leerzeichen-Namen und fehlende Matcher-Ausnahme Login-HTML lieferten). `community/`
  steht im Matcher von `proxy.ts` unter den Ausnahmen — es gibt deshalb **keine Route `/community/…`**; wer eine
  anlegt, muss den Bildordner umbenennen. Maße und Alt-Texte stehen in `landing.community.bilder`.
- **`/call`** (`CallFunnelClient.tsx`, Texte `config/call-funnel.ts`): Hero (Headline, Unterzeile, VSL, Knopf „Jetzt
  Analysegespräch anfragen", „100 % kostenlos & unverbindlich") → **Brief** „Ein persönliches Wort von Emre."
  (`EmreBrief.tsx`, Wortlaut und Fettdruck in `emreBrief`) → **Member Wins** (Case Studies mit dem Blockkopf `memberWins`,
  darunter `ErgebnisseSection` und `ReviewSection`, ohne Lichtlinien dazwischen) → Abschluss. Die Sektion „Das Gespräch"
  (Schritt 2 von 2) samt `buchung.punkte`/`headline`/`schritt` ist raus, ebenso Hero-Pill, Video-Badge, Video-Hinweis und
  Sternezeile; `bewertungen` wird für `/call` und `/training` nicht mehr geladen. Das Modal heißt jetzt „Analysegespräch".
- **Der Brief ist die einzige Ausnahme vom Inter-Gebot:** Schreibmaschinen-**Systemschrift**
  `"Courier New", Courier, "Nimbus Mono PS", monospace` — **kein Webfont** laden. Papier, gerissene Kante (`clip-path`,
  Schatten per `drop-shadow` am Elternteil) und Messing-Reißzwecke sind reines CSS; der Text bleibt echter Text
  (mobil ≥ 15 px). Nicht durch ein Bild ersetzen.

2026-11-08 (**Free-Ansicht nach Mockup**): Emres Mockup für Free-Mitglieder (Konten ohne `hatInhaltsZugang`). Zahlende
und Admins sehen Navigation und Dashboard **unverändert**. Texte in **`config/free-bereich.ts`**.
- **Seitenleiste** (`PlatformSidebar.tsx`, Listen `FREE_NAV`/`PREMIUM_OFFEN`/`PREMIUM_GESPERRT` in `nav.ts`): Konto-Kachel
  „Free Member", Gruppe **Free** (Dashboard, Kostenloser Kurs, Trading Blueprint, Capital Circle Vitrine = öffentliche
  `/ergebnisse`), Gruppe **Premium** mit Schloss (Ausbildung & Mentoring offen mit „Neu", darunter gesperrt wie ein
  `paid`-Punkt), unten News/Profil/Einstellungen/Logout. Entscheidet `viewer.isFree` (`!is_paid && !is_admin`, nicht
  `pending`; `viewer.tsx` liest dafür jetzt `is_admin` mit). Drawer (mobil) nutzt dasselbe Panel.
- **Free-Dashboard** (`FreeDashboardView.tsx`, Daten `lib/training/free-dashboard.ts`): „Deine Ausbildung", „Dein Trading
  Blueprint", „Dein Lernweg" (fünf Kacheln, echte Videotitel, Video 2 mit „Optional"), Vitrine. Die Seite verzweigt
  **vor** dem Laden der Daten der Zahlenden; die Streak läuft für beide über `aktualisiereStreak`. `TrainingKarte` und
  `CommunityLiveKarte` hängen nirgends mehr, die Dateien bleiben. Auch hier `.cc-neutral`: die aktuelle Lernweg-Kachel
  hebt sich über Fläche/Kante ab, **nicht** über einen Gold-Rahmen wie im Mockup.
- **Trading Blueprint**: Seite **`/trading-blueprint`** für alle Angemeldeten (Download + Videoanleitung, signiert wie
  `/termin/vorbereitung`). PDF und Video pflegt der Admin unter **`/admin/training/blueprint`** (Vertrieb → Trading
  Blueprint; PDF per Drag & Drop, Presigned PUT nach R2 unter `trading-blueprint/<uuid>/…`; Video per UID, Auswahl oder
  Upload, wird auf `requireSignedURLs` gestellt). Gespeichert **ohne Migration** in `app_settings.trading_blueprint`
  (`lib/trading-blueprint.ts`) — nur der R2-Schlüssel, die Tabelle ist öffentlich lesbar. Download nur über
  **`/api/trading-blueprint/download`** (Anmeldung, 5-Minuten-URL mit `attachment`). Ohne PDF: „Erscheint in Kürze",
  ohne Video kein Video-Link.

2026-11-08 (**Tracking & Finanzen P0**, Emres „Tracking & Finanzen Playbook 1.0" + „Ablaufkarten & QA", Migration **114**):
Stufe P0 nach Entscheidung Simon; **P1 (VSL-/Seiten-Tiefenmessung) ist bewusst nicht gebaut.** Rechnung in `lib/finanzen/*`
(rein, getestet: `npm run test:finanzen`, auch in `test:mails`), Dashboard **`/admin/auswertung`** (Sidebar „Tracking & Finanzen").
- **Ledger** `finanz_buchung` (`lib/finanzen/ledger.ts`): jede erfolgreiche Zahlung eines Mentoring-Kaufs, einer Rate oder des
  Live-Abos eine Zeile, Erstattung und **verlorener** Chargeback eigene negative Zeilen mit `bezug_buchung_id`. Eindeutig über
  `stripe_objekt_id` (Rechnung `in_`, Einmalzahlung `pi_`, Refund `re_`, Dispute `dp_`); Event-Log bleibt `stripe_webhook_events`.
  Aufgerufen im Dispatcher **nach** dem fachlichen Handler (`ledgerSicher`, fehlt 114 → nur Warnung, Kaufweg läuft weiter).
  Einmalzahlung bucht die Kasse (`total_details.amount_tax`), Raten/Live-Abo die Rechnung (`total_taxes`) — die Rechnung aus
  `invoice_creation` einer Einmalzahlung hat keine Abo-Metadaten und wird **nicht** gebucht (sonst doppelt). Steuer nur aus
  Stripe; fehlt sie, 19 % inklusive als `steuer_quelle = fallback_19_inkl`. Erstattungen tragen die Steuer der Originalzahlung
  anteilig (`stripe_anteilig`). Gebühr aus der Balance-Transaktion, sonst `null` (nicht 0). Zahlung ohne Kauf → `status =
  quarantaene`, zählt nirgends; wird beim Checkout bzw. Nachtrag nachverknüpft. Mitgliedsabo-Refunds laufen durch, ohne Buchung.
  **Vollerstattung setzt `mentoring_kauf.status = erstattet`** (U/V-Mails stoppen); den Zugang fasst das nicht an.
- **Neue Stripe-Events (im Dashboard abonnieren):** `charge.refunded`, `refund.created`, `refund.updated`,
  `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`. Chargeback: `opened` ist kein Ausfall, erst `lost`
  bucht und korrigiert die Provision; Verlauf in `finanz_dispute.verlauf`.
- **Live-Abo** `finanz_live_abo` (jedes Abo-Ereignis, `pflegeLiveAbo`): MRR = Netto der letzten Zahlung je **aktivem** Abo;
  Probezeit, `past_due` und Inklusiv-Live aus Main/Premium zählen nie.
- **Provision** `provision`: 15 % vom tatsächlichen Netto je Zahlung (`provision.ts`), eine Zeile je Buchung, Rundungsrest in
  der letzten planmäßigen Rate, Korrekturen negativ, Status accrued → approved → paid (Admin: Finanzen → Provisionseinträge).
  Nur Ausbildung/Main/Premium, kein Live-Abo, nichts ohne Closer. **Credit** (`credit.ts`, Regel Simon, **Freigabe Emre offen**):
  Closer des letzten geführten Calls vor dem Kauf (wer „geführt" gesetzt hat, sonst Call-Block/Gastgeber), sonst Kassenlink,
  sonst CRM-Closer, sonst unassigned — **beim Kauf eingefroren** in `mentoring_kauf.credit_*`, ein Closer-Wechsel ändert ihn nicht.
- **Ergebnis-Maske** (`lib/crm/ergebnis.ts`, `components/crm/ErgebnisDialog.tsx`): „Geführt …" im CRM öffnet sie; Pflicht
  outcome/product, Grund bei lost/unqualified/open_decision, Follow-up bei open_decision/won_payment_pending. Versioniert in
  `crm_call_ergebnis`, Phase über `OUTCOME_ZU_PHASE` (eine Abbildung aufs CRM-Modell; Statusbegriffe 4.3 via `pipelineStatus`).
  Closer-Wechsel nur mit Grund (from/to/grund/effective_at in `crm_aktivitaeten.daten`). „Heute" zeigt geführte Calls ohne
  Ergebnis. Nach `gefuehrt` gehen **keine** automatischen Verkaufsmails raus (B stoppt bei Termin, T nur gebucht, N nur No-Show).
- **Dashboard** (`dashboard.ts`): 8 Karten nach 12.2, Reiter Übersicht/Funnel (nur „partial")/Vertrieb/Finanzen, Filter
  Zeitraum, Funnel (erste Quelle), Leadquelle (Kanal, sonst `unknown`), Produkt, Closer (Credit bzw. Closer des Calls; nicht
  auf anonyme Besucher, Free-Kohorte, MRR). „No Data" statt 0 %. Closer sehen unter `/crm/auswertung` den Teamvergleich und
  **nur ihre eigene** Provision (`/api/crm/provision`).
- **Nachtrag** (Finanzen → „Nachtrag aus Stripe", `backfill.ts`): bucht Bestandskäufe, Raten, Live-Abos, Refunds, Disputes
  idempotent nach. Mit Testschlüssel gegen Produktion findet Stripe nichts → Fehler je Kauf.
- **Exporte** (`export.ts`, eigener Store-ZIP-Schreiber `zip.ts` statt Abhängigkeit): Buchhaltung (7 CSV, nicht pseudonymisiert,
  Abstimmung in `reconciliation.csv`) und ChatGPT (pseudonymisiert mit **`EXPORT_PSEUDO_SECRET`**, ≥ 32 Zeichen, nie wechseln;
  Datenwörterbuch, KPI-Definitionen, README mit Lücken, Manifest mit SHA-256). Fremdschlüssel-, Prüfsummen- und PII-Prüfung —
  bei Fehler keine ZIP. VSL-Dateien bleiben leer (P1).
- **Offen:** Steuerregime/Rechnungsbezug (T-07), Provisionsvertrag (T-06), Credit-Regel (T-09), Consent (T-05), Aufbewahrung
  (T-11). Kein Deckungsbeitrag/Kostenmodell, keine last_non_direct-Attribution, keine zentrale contact_id (Kontakt = E-Mail).

2026-11-08 (**Leistungen nach Tracking-Playbook, Upgrade, ICP-Fragen**, Migration 113): Emres „Tracking & Finanzen
Playbook 1.0" Kapitel 2 ist verbindlich (Entscheidung Simon).
- **Leistungen** (`config/mentoring.ts`): Ausbildung 1 Monat Live + 1 Monat Journal, kein Live-Archiv; Main/Premium Journal
  dauerhaft, Live und Archiv 12 Monate, WhatsApp 4 Monate, 4 bzw. 12 × 60 Min 1:1 mit Emre; **kein Gruppencall mehr**;
  Main bis 6 Raten. Live-Abo: nur Live (kein Archiv, kein Journal). AGB § 7a(2) angepasst (Version 2026-11-08.1, nicht anwaltlich geprüft).
- **Drei Fristen am Profil** (`lib/mentoring/zugang.ts`): `live_bis` = Analysen/Daily Bias (`hatLiveZugang`), `archiv_bis` =
  Aufzeichnungen (`hatArchivZugang`, DB `hat_archiv_zugang()` schützt `live_session_videos`), `journal_bis` = Journal
  (`hatJournalZugang`, leer = dauerhaft). Der Kauf-Webhook setzt sie aus `archivMonate`/`journalMonate`; Bestand bekam
  `archiv_bis = live_bis`, Journal bleibt dauerhaft. Wer eine Frist ändert, ändert TS und SQL zusammen.
- **Upgrade Ausbildung → Main/Premium:** `legeKassenlinkAn` findet eine bezahlte, noch nicht angerechnete Ausbildung zur
  E-Mail und zieht `UPGRADE_ANRECHNUNG_CENTS` (499 €) ab (`kassenlink.anrechnung_cents`, `upgrade_von_kauf_id`; je Ausbildung
  einmal, Unique-Index). `betrag_cents` ist damit die Zusatzsumme = neuer Umsatz. `anrechnung: false` schaltet es ab.
- **ICP-Fragen** (`config/onboarding.ts`, Reihenfolge = Emres Nummern 1–10): Das Onboarding aus 107 ist erweitert, keine neue
  Tabelle. `icpArt` in `lib/onboarding/weiche.ts`: Free mit angenommener Free-Bewerbung → 1–7 (`profiles.icp_free_am`, danach
  direkt `/kostenloses-training`), Stufe `mentoring` → 1–10 (`icp_kaeufer_am`, vorhandene Antworten zählen), andere Zahlende
  → die fünf aus 107. Proxy, `/api/onboarding/status` und `/antwort` nutzen dieselbe Regel; ohne Migration 113 gilt die alte.
  Closer sehen die Antworten im CRM-Kontakt.


2026-11-14 (**CRM-Umbau nach Review**): Die Closer-Ansichten unter `/crm` sind auf Arbeitsfluss umgebaut. Reine Logik in
**`lib/crm/anzeige.ts`** (Tests `anzeige.test.ts`, laufen in `npm run test:mails`): `naechsterSchritt`, Zeitangaben in Berliner
Zeit (`wann`, `relativ`, `berlinZuIso`), Wiedervorlage-Schnellwahl, Telefonsuche unabhängig vom Format, deutsche Fehlertexte
(`fehlerText` — neue API-Fehlercodes dort ergänzen).
- **Heute** ist eine Arbeitsliste nach Dringlichkeit: „Jetzt handeln" (laufender Termin, Termin vorbei ohne Status nach 15 min,
  Ergebnis fehlt, Wiedervorlage überfällig), Tagesplan, neue Leads mit Alter und „Übernehmen" aus dem Pool, Wiedervorlagen später
  heute, Termine der nächsten drei Tage (`ladeHeute` holt jetzt heute + 3 Tage und das Telefon des Kontakts).
- **Kontakt**: oben **ein** nächster Schritt mit passender Aktion; Anruf/Notiz in einer Karte, danach Wiedervorlage per
  Schnellwahl; Kassenlink nach „Zusage, Zahlung offen" mit dem besprochenen Produkt vorbereitet und per WhatsApp verschickbar;
  „Doch geführt" bei No-Show. Keine `window.prompt`/`confirm` mehr — Dialoge in `components/crm/Dialoge.tsx`.
- **Alle Ansichten** laden beim Zurückkehren in den Tab und alle 2 Minuten neu (`useNeuLadenBeiRueckkehr`), die Uhr tickt alle 30 s
  (`useJetzt`) — vorher blieben „Termin läuft"/„No-Show anrufen" bis zum Neuladen stehen.
- **„Gewonnen" setzt der Kauf.** Von Hand nur Admins (API `gewonnen_nur_kauf`); vorher blieb ein von Hand gesetztes „Gewonnen"
  ohne Produkt und Wert für immer stehen.
- Behoben: Wiedervorlage- und Kontaktdatenfelder zeigten nach einem Ergebnis den alten Wert und überschrieben ihn beim Speichern;
  fehlgeschlagene Umverteilung in der Liste blieb optisch stehen; Zeitstrahl zeigte Phasen-IDs und ISO-Zeiten.
- Liste mit Sortierung und als Karten auf dem Handy, Pipeline sortiert je Spalte nach Termin/Wiedervorlage und markiert Fälliges.
- **Stand Datenbank 14.11.:** Migrationen 110–114 sind in Produktion **nicht** eingespielt — ohne 112 zeigt `/crm` nur
  „Migration fehlt", ohne 114 gibt es keine Ergebnis-Maske.

2026-11-14 (**CRM-Oberfläche nach Vergleich mit Pipedrive, HubSpot, Salesforce**): `/crm` hat einen eigenen Rahmen
(`components/crm/CrmRahmen.tsx`): Seitenleiste wie Plattform/Admin, Glasleiste mit **globaler Suche (Strg+K)** und „Kontakt
anlegen", auf dem Handy unten eine Tab-Leiste. Der Rahmen setzt **`data-crm`** — das schaltet `color-scheme: dark` und schmale
Graphit-Scrollleisten (Regeln am Ende von `app/globals.css`); vorher zeichnete Windows weiße Scrollbalken und ein schwarzes
Kalender-Icon in `datetime-local`. Nutzer und Pfade kommen aus dem Kontext (`useCrm()` in `components/crm/ui.tsx`), die Seiten
reichen keine Props mehr durch; Links immer über `pfad(...)`, sonst bricht die Vorschau.
- **Bausteine** in `components/crm/ui.tsx`: `Chip`, `Avatar`, `IconKnopf`, `Abschnitt`, `Kennzahl`, `AuswahlMenu` (statt nativer
  Selects), `useMeldung` (Toasts statt Hinweisbalken), `dunklesFeld` für Datumsfelder. **Nicht** `adminChipProps` auf ein
  `Box as="button"` spreaden — die Props sind für `<Button>` gedacht, auf einer Box fehlen Rand, Abstand und Radius (genau so sahen
  die Chips im CRM vorher aus).
- **Pipeline** (Pipedrive): Spalten mit Anzahl und Vertragswert, Karten mit Closer, nächster Aktivität und **Stau** nach Tagen ohne
  Aktivität (`stauTage`, Grenzen `STAU_GRENZE_TAGE` in `lib/crm/anzeige.ts`, getestet). Beim Ziehen fahren unten Ablagefelder
  Verloren/Später/Gewonnen ein; Gewonnen/Verloren als Spalten nur über „Abschlüsse (30 T.)".
- **Kontakte** (HubSpot): Ansichten als Reiter mit Anzahl, fester Tabellenkopf, „Nächster Schritt" als Spalte, Mehrfachauswahl →
  Closer zuweisen (ein PATCH je Kontakt, Pflichtgrund bleibt).
- **Kontakt** (HubSpot/Salesforce): Aktionsleiste im Kopf, **Phasen-Pfad** (`PFAD`, `pfadStelle`; No-Show/Später als Abzweig,
  Abschluss als Menü), drei Spalten (Über den Kontakt mit Inline-Bearbeitung · nächster Schritt, Composer Anruf/Notiz/Wiedervorlage,
  Zeitstrahl mit Mails und Monatsgruppen · Termine, Kassenlink, Käufe, Antworten).
- **Heute**: Gruß, Kennzahlen, „Jetzt handeln" als Hero-Karte (nächster Schritt, DESIGN-Regel), Tagesplan als Zeitleiste mit
  Jetzt-Linie, Termine der nächsten Tage nach Tag gruppiert.
- **Vorschau mit Beispieldaten:** `/vorschau/mentoring/crm[/pipeline|/kontakte|/kontakte/k-14|/auswertung]` — **nur in `next dev`**
  (Produktion 404), leitet `/api/crm/*` im Browser auf `app/vorschau/mentoring/crm/beispiel.ts` um, schreibende Aktionen tun nichts.
  Zum Gestalten und für Bildschirmfotos ohne echte Kontakte.

2026-11-14 (**`/training` nach Feedback, Smaragd als Funnel-Akzent**): Headline ohne Gedankenstrich, Bewertungen raus
(Nav-Anker ebenfalls). **Smaragd** (`--cc-smaragd*` in `app/globals.css`, Button-Variante **`smaragd`** in `theme/index.ts`)
ist auf Nutzerwunsch zweiter Akzent **nur im Funnel**: Bewerbungsknöpfe im Inhalt (`TrainingStartKnopf`, auch auf
`/kostenloses-training`), Weg-Linie und **Freischaltungs-Karte** im Zugang (`.cc-card--smaragd`: grauer deckender Grund, nur Kante und Schrift grün, `SchrittMarke ton="smaragd"`),
Ausklapp-Knopf der Ergebnisse und das Bewerbungs-Modal (Smaragd-Schein, Schrittleiste „Schritt x von 2"). Der Knopf in der
Kopfleiste (Desktop) ist **Gold**, der Hinweis „100 % kostenlos …" unter den Knöpfen **Weiß**. Der Schluss-CTA (`Abschluss`)
ist raus; `landing.abschluss` liest nur noch `/vorschau/training-2`. Gold bleibt in Headlines und überall sonst — Plattform,
`/`, Admin bekommen kein Smaragd. Smaragd ist bewusst tief/bläulich, damit es nicht mit dem Gewinn-Grün `--cc-success` verwechselt wird.
Die Community-Section heißt „Ergebnisse aus der Capital Circle Community" und zeigt **alle** Nachweise untereinander, **ohne
Filter** (Discord, Auszahlungen Mitglieder, Auszahlungen Emre, Challenges über `NachweisGalerie`; die Gruppenüberschriften
bleiben, weil Kontogröße ≠ Auszahlung), eingeklappt ab ~950 px („Alle n anzeigen").
Der **Video-Player auf `/training` ist Weiß/Grau** (`VideoSchein ton="neutral"` setzt `.cc-player-neutral`, das die
`--cc-gold-*`-Variablen für Play-Knopf, Zeitstrahl und Einstellungsmenü umbiegt; Schein weiß statt gold). Seit 14.11. auch auf `/call`.
Die **mobile Aktionsleiste steht auf `/training` durchgehend** (`MobilAktionsleiste immer`) — das scrollabhängige Ein-/Ausblenden
flackerte, weil sich `innerHeight` mit der Adressleiste ändert. **Seiten-Scrollleiste** auf `/training` und `/call`: `FunnelHimmel`
setzt `data-funnel`, `html:has([data-funnel])` zeichnet sie schmal in Graphit. Der Modal-Body trägt **`.cc-scroll`** (schmale dunkle Scrollleiste, grauer Griff, gilt auch für Textfelder darin) —
ohne das zeichnet Windows einen hellen System-Scrollbalken ins Modal.

2026-11-14 (**Onboarding-Frage 3 mit Mehrfachauswahl, Migration 115**): „Was hält dich aktuell am meisten zurück?"
(`main_problem`) erlaubt mehrere Antworten (`mehrfach: true` in `config/onboarding.ts`; Kästchen statt Kreise, „Weiter"-Knopf
statt Auto-Weiter). Die **zuerst angetippte** bleibt Hauptantwort in `main_problem` (Kreuztabelle Problem × Ziel), **alle** stehen
in `onboarding_antworten.main_problem_alle text[]` (Migration 115, Bestand übernommen). Client ↔ API reisen die Werte
kommagetrennt (`MEHRFACH_TRENNER`); lesen immer über `antwortWerte`/`antwortText`, nie direkt `main_problem`. Ohne 115 speichert
die Route nur die Hauptantwort. Die Leser (`/api/onboarding/status`, `/admin/icp`, CRM-Kontakt) holen deshalb `select("*")`.
Verteilung in `/admin/icp` zählt bei Frage 3 jede gewählte Antwort (Summe > Mitglieder).

2026-11-14 (**Navigation und Free-Ansicht**): **„News" ist aus der Navigation raus** — für Free und Zahlende (`AccountList` in
`PlatformSidebar.tsx`, samt Ungelesen-Abfrage); `/news` selbst existiert weiter. Auf **`/kostenloses-training` läuft kein
Promo-Band** (`PlatformTopStrip`); `PlatformFrame` setzt dort `--cc-strip-h: 0px`, damit klebende Seitenleiste und Kursplayer-
Spalten oben bündig bleiben (`OHNE_BAND`). Das **Free-Dashboard** trägt gezielt Smaragd:
Fortschritt (Zahl + Balken, `ProgressBar tone="smaragd"` in `primitives.tsx`), Hauptknopf (`variant="smaragd"`
ohne Glow wegen `.cc-neutral`), Lernweg-Haken/-Ringe und dünne Kante der aktuellen Kachel. Kein Schein — die Regel
„Dashboard ohne Glow" gilt weiter. Play-Knopf der Video-Vorschau ist **weiß**, „Als nächstes" **Gold**; Blueprint, Vitrine,
Headlines und Seitenleiste bleiben Gold.

2026-11-14 (**`/programme` nur noch für Zahlende**): Free-Mitglieder (`!is_paid && !is_admin`) gehen bei „Ausbildung &
Mentoring" direkt auf **`/call`** (`FREE_PROGRAMME_PFAD` in `config/training.ts`; Seitenleiste `PREMIUM_OFFEN`, Free-Dashboard).
`/programme` leitet Free per `redirect` dorthin um, damit auch alte Links (Mails, `NaechsterSchritt`) ankommen. Zahlende sehen die
Seite weiter; die Karte „Persönlich begleitet" steht in Smaragd (`.cc-card--smaragd`, Icon, Haken, Knopf `variant="smaragd"`),
die Zeile „Ausbildung wird mit 499 € angerechnet" ist raus (die Anrechnung am Kassenlink selbst bleibt).

2026-11-14 (**`/call` nach Feedback**): **Alle CTAs sind Smaragd** (`CallBuchungKnopf` hat
`variant="smaragd"` als Standard, ebenso der Hauptknopf im Buchungs-Modal). Die **Kopfleiste zeigt nur die Wortmarke, mittig**
(`FunnelKopfleiste mittig`, kein Knopf, kein Anmelden). **Aufbau:** Hero → Brief „Ein persönliches Wort von Emre." → **Ergebnisse
aus der Community** (dieselbe `CommunityEinblicke` wie auf `/training`) → Abschluss-CTA. Case Studies (`CallCaseStudies`, Datei
bleibt, hängt nirgends mehr), Auszahlungen (`ErgebnisseSection`) und Bewertungen sind raus — der Eintrag vom 08.11. („Member Wins")
gilt nicht mehr. Der **Hero passt ab `md` in 100vh**: kleinere Headline,
engere Abstände, und die Video-Breite richtet sich nach der Fensterhöhe (`clamp(520px, (100svh − HERO_REST) · 16/9, 960px)`,
`HERO_REST = 450` in `CallFunnelClient.tsx` — wer dem Hero etwas hinzufügt, erhöht den Wert). Der **VSL-Player ist Weiß/Grau**
wie auf `/training` (`VideoSchein ton="neutral"`).

2026-11-14 (**Free-Bewerbungen wie `/admin/applications`**): Die Bewerbungen über `/training` haben eine eigene Seite
**`/admin/training/bewerbungen`** (Sidebar Vertrieb → „Free-Bewerbungen"), Komponente `components/admin/TrainingBewerbungen.tsx` im
Aufbau von `ApplicationsManager`: Status-Reiter mit Zähler (Zu prüfen · Adresse unbestätigt · Angenommen · Abgelehnt · Alle), Suche,
aufklappbare Karten (zu prüfende stehen offen), Kontaktwunsch mit Telefon hervorgehoben, Ablehnen über einen Dialog mit internem Grund.
Dieselbe Komponente steht im Board `/admin/training` (Reiter „Bewerbungen"). Das Board hat jetzt Reiter oben; Kennzahlen und Herkunft
liegen im Reiter „Übersicht & Herkunft". Die alte `BewerbungKarte` (mit `window.confirm`) ist entfernt. Filterchips im Admin immer als
`<Button {...adminChipProps(x)}>` — auf einer `Box as="button"` fehlen Rand, Abstand und Radius. Lokale Vorschau mit Beispieldaten:
`/vorschau/mentoring/bewerbungen` (nur `next dev`).

2026-11-14 (**Countdown im Free-Dashboard, Freitext mind. 100 Zeichen**): Der **Countdown des Trainingszugangs** steht als eigene,
dezente Kachel **in der Seitenleiste direkt unter „Free Member"** (`components/platform/shell/ZugangCountdown.tsx`): Tage/Std/Min/Sek
in Datentinte, Haarlinie für die verbleibende Zeit, „am <Datum>". Liest die eigene `training_zugang`-Zeile im Browser (RLS), Ende wie
`aktuellesEnde`; ohne Zeile oder nach Ablauf erscheint nichts. Die Dashboard-Karte behält oben „Noch n Tage Zugang".
**Promo-Band (Apex) nie für Free-Mitglieder** (`PlatformFrame` → `Rahmen` prüft `viewer.isFree`, `--cc-strip-h: 0px`).
**Bonus-Karte** (grauer Grund, Akzente in Smaragd) unter der Lektionsliste auf `/kostenloses-training` (`BonusBlueprintKarte`, Texte `bonusBlueprint` in
`config/free-bereich.ts`) führt zum Trading Blueprint; `ModuleLearningClient` hat dafür `unterPlaylist` (verkürzt die klebende Liste). **Freitext-Antworten im Gesprächs-Fragebogen** (`/call`, `/termin`, Discord-Funnel, Analysegespräch) brauchen jetzt
**mindestens 100 Zeichen** (`FREITEXT_MIN`, Client und Server); unter dem Feld zählt `FreitextZaehler` mit (Balken, „Noch n
Zeichen", erreicht in Smaragd). Die Free-Bewerbung auf `/training` hat ihre eigene Mindestlänge (`BEWERBUNG_MIN_ZEICHEN`).

2026-11-14 (**Trading Blueprint erst nach dem kostenlosen Kurs**): Free-Konten bekommen PDF und Videoanleitung erst, wenn
`TrainingsStand.abgeschlossen` (alle Pflichtvideos, Video 2 optional) — Regel zentral in **`lib/training/blueprint-freigabe.ts`**
(`ladeBlueprintFreigabe`; Zahlende/Admins immer frei). Durchgesetzt in `/trading-blueprint` (Sperrhinweis mit „x von y Lektionen"
und Knopf zum Kurs, **keine** signierten Video-Adressen) und `/api/trading-blueprint/download` (Umleitung auf die Seite). Free-Dashboard
(`blueprint.frei`) und Bonus-Karte (`gesperrt`, Vorschaubild bleibt als Teaser) zeigen den Zustand nur an. Die Bonus-Karte zeigt das
Standbild der Blueprint-Videoanleitung (signiert, 4 h). Auf `/kostenloses-training` sind Unterzeile („In diesem Training zeigen wir
dir …") und Statuszeile („0/5 Videos · Noch n Tage Zugang") raus.

2026-11-14 (**`/kostenloses-training` aufgeräumt**): Kein Seitentitel mehr (samt Trennstrich des `PageHeader`), kein Schluss-CTA
(`NaechsterSchritt` hängt hier nicht mehr), **keine Notizen** (`ModuleLearningClient ohneNotizen`; ohne Anhänge und Beschreibung entfällt
die Karte unter dem Player ganz — nur hier, die Ausbildung behält Notizen). Dazu kommt die
**Blueprint-Karte aus dem Free-Dashboard** als schmale Karte **direkt unter der Videoliste** in der klebenden Lektionsspalte (`ModuleLearningClient
unterPlaylist`; `BlueprintKarte kompakt` → `BlueprintLeiste`: Cover links, Titel und Satz daneben, Aktionen darunter, Kante und
Lichtlinie in Smaragd über `.cc-card--smaragd`; exportiert aus `FreeDashboardView.tsx`, mit Sperre `frei`). Die Chart-Linie im `BlueprintCover` ist überall
Smaragd. Die Bonus-Karte
(`BonusBlueprintKarte`, `unterPlaylist`, `bonusBlueprint`) ist dafür entfernt — die Einträge oben zur Bonus-Karte gelten nicht mehr.

2026-11-14 (**Sidebar-Akzent, Blueprint-Sperrtext**): „Ausbildung & Mentoring" trägt in der Seitenleiste **kein „Neu"-Badge mehr**,
sondern ist in **Smaragd hervorgehoben** (Fläche und Kante grün, Icon grün, Schrift weiß; Free und Zahlende; `akzent: "smaragd"` an `NavItem`/`FreeNavItem` in `nav.ts`,
`rowProps(…, smaragd)` in `PlatformSidebar.tsx`). Blueprint-Karten (Dashboard und Kursspalte) zeigen gesperrt statt der Beschreibung
die Erklärung `gesperrtErklaerung` und einen kurzen Knopf „Noch gesperrt" (`gesperrtKurz`); Knöpfe dort dürfen umbrechen
(`whiteSpace="normal"`, `h="auto"`) statt überzustehen.

2026-11-14 (**Kursplayer weiß**): Im Kursplayer (`ModuleLearningClient`, also kostenloser Kurs **und** Ausbildungsmodule) sind
Play-Knopf und Zeitstrahl weiß (`.cc-player-neutral` um den `GlassVideoPlayer`, Rahmen `accentRgb` weiß). Der Play-Knopf der
aktiven Lektion in `VideoPlaylist` ist ebenfalls weiß. Live-Sessions und Funnel-Seiten sind davon unabhängig.

2026-11-15 (**Geheimhaltung, Retargeting, Trustpilot**, Migration **116**): Für die Preview an Emre.
- **Geheimhaltungsvereinbarung** (`config/geheimhaltung.ts`, Entwurf, **nicht anwaltlich geprüft**): Jedes Konto mit `is_paid`
  (nie Free, nie Admin) stimmt einmal je Fassung zu — vollständiger Name als Unterschrift plus Haken, gespeichert mit Zeit, IP und
  Browser in `geheimhaltung_zustimmung`. **Pflicht** (Entscheidung Simon): `GeheimhaltungPopup` in `PlatformFrame` hat kein Kreuz,
  schließt nicht per Esc oder Klick daneben; nur Abmelden. Ausgenommen sind Abo und Abrechnung (`OHNE_SPERRE`), damit Kündigen
  immer geht. Entscheidung in `lib/geheimhaltung.ts` (`brauchtGeheimhaltung`, fail-open ohne 116), Route `/api/geheimhaltung`.
  Solange sie offen ist, kommt das Lifetime-Popup nicht. Inhaltliche Textänderung → `GEHEIMHALTUNG_FASSUNG` erhöhen, dann fragt
  es alle neu. Übersicht: `/admin/geheimhaltung` (Community → Geheimhaltung). Gesperrt wird nur die Oberfläche, nicht die APIs.
- **Mail-Kampagnen** `/admin/kampagnen` (Vertrieb → Mail-Kampagnen, `lib/kampagnen/kampagnen.ts`, `config/kampagnen.ts`): Zahlen,
  Vorschau, Testmail an sich selbst, Versand in Paketen über `sendeVorlage` (je Adresse einmal, Bezug `kampagne:<id>`, 24 h Abstand,
  Klasse M mit Abmeldelink). **Echter Versand nur in Produktion** (`VERCEL_ENV=production` oder `KAMPAGNEN_ECHT_SENDEN=1`) — die
  Preview teilt die Datenbank mit der Live-Seite.
  - **RT01 Retargeting** an die ehemaligen Free-Kurs-Mitglieder (Willkommensmail `free_course_welcome` des alten `/free`, nicht zahlend,
    keine Bewerbung, kein laufender Zugang; am 15.11. 340). Text von Emre; **ohne Bewerbung** (Entscheidung Simon), deshalb sind die drei
    Bewerbungssätze angepasst. Der Link `/training/aktivieren?t=<HMAC-Token>` zeigt eine Seite mit Knopf (Scanner sollen nichts
    freischalten); der Knopf schaltet 30 Tage frei (`lib/training/reaktivierung.ts`: Bewerbungszeile `angenommen`, `kanal = retargeting`,
    leere Antworten, keine A01/A02; ICP 1–7 und Free-Mails S/L/I/E laufen wie bei einer Annahme) und meldet bis 45 Tage nach Versand per
    Magic Link an. Ablehnung bleibt endgültig, ein alter abgelaufener Bestandszugang startet einmal neu.
  - **TP01 Trustpilot** an alle mit `is_paid` ohne Admins (98). Text von mir, **von Emre noch abzunehmen**. Ziel
    `NEXT_PUBLIC_TRUSTPILOT_URL`, sonst `https://de.trustpilot.com/evaluate/capitalcircletrading.com`. Ehrliche Bewertung erbitten, nie
    nur positive und nie mit Gegenleistung (Trustpilot-Richtlinien, UWG).

2026-11-17 (**Discord-Wand mit 97 Beiträgen**): Die Wand „Aus dem Discord" in `CommunityEinblicke` (`/training` und `/call`)
zeigt jetzt 95 Screenshots aus „CC-Bewertungen" plus `discord-01.png`/`discord-07.png`; acht alte PNGs waren Dubletten und sind
gelöscht. Liste in **`config/discord-beitraege.ts`** (`landing.community.bilder` zeigt darauf). **Reihenfolge ist Absicht:**
Beiträge mit Auszahlung (`auszahlung: true`) absteigend nach Summe zuerst, danach nach Datum. Die Wand verteilt deshalb
**zeilenweise** auf die kürzeste Spalte (`verteileAufSpalten`) statt CSS-`column-count` — sonst stünden die größten Auszahlungen
alle links untereinander. Brief auf `/call`: der Schlusssatz ist jetzt komplett fett.
Das **VSL auf `/call`** ist seit 17.11. „NEUES PHUNNEL VIDEO.mp4" (`d51192db…`, 8:29, unsigniert) — Vorgabe `callVideo` in
`config/call-funnel.ts`; im Admin ist kein Override gesetzt.

2026-11-17 (**Funnel-Feedback, Runde 1**): `/call`-Hero zeigt hinter „100 % kostenlos & unverbindlich" dezent
**„Limitierte Plätze"** mit Gold-Punkt (`hero.knapp`, nur im Hero über `VertrauensZeile knapp`). Die Community-Section
(`/training`, `/call`) hat **keine Unterzeile und keine Hinweiszeile** mehr und **keine Auszahlungen von Emre** — die
stehen nur noch auf `/ergebnisse`. Die **Vitrine `/ergebnisse`** zeigt ganz unten die Discord-Wand (`DiscordBlock`),
bewusst unter den beiden Nachweis-Blöcken, weil sie auch Funded Accounts und Kontostände enthält. Bewerbungsfrage 3
heißt „Welchen Traum würdest du dir mit Trading gerne erfüllen?" (id bleibt `warum`).
**Kostenloser Kurs hat vier Videos** (`TRAINING_VIDEO_ANZAHL = 4`): „Das System in der Praxis" ist in der Datenbank
unveröffentlicht. Es bleibt das **Vorbereitungsvideo** vor dem Analysegespräch (T02, `/termin/vorbereitung`), jetzt fest
über `vorbereitungsVideo` in `config/training.ts` statt über Platz 5 der Playlist. L04 wird nur noch durch „Kurs fertig"
vorgezogen. **L03** verweist statt aufs letzte Kursvideo jetzt auf die Vitrine `/ergebnisse` (`vitrineUrl`, Absatz
umformuliert, weicht damit bewusst vom Playbook-Wortlaut ab — Entscheidung Simon).

2026-11-17 (**Nach der Gesprächsbuchung ins Free-Dashboard**): Wer **angemeldet** ein Analysegespräch bucht (`/call` oder
`AnalyseGespraech` im Mitgliederbereich), wird nach `calendly.event_scheduled` über **`/api/training/nach-buchung`** nach
**`/dashboard?termin=neu`** geleitet (`weiterNachBuchung` in `lib/training/nach-buchung-client.ts`). Besucher ohne Konto
bleiben bei der Bestätigung im Modal (Entscheidung Simon). Free-Konten ohne laufenden Zugang bekommen dabei **30 Tage** frei
— derselbe Weg wie die Retargeting-Freischaltung (`reaktiviere(…, { kanal: "analysegespraech" })`); Ablehnung bleibt
endgültig, Zahlende/Admins werden nicht umgeleitet. Oben im Free-Dashboard steht dann **`TerminKarte`**
(`components/platform/dashboard/TerminKarte.tsx`, Daten `ladeNaechstenTermin` aus `termine` über `user_id` oder Adresse,
sichtbar bis 1 h nach Beginn): Datum, Uhrzeit, Berater, Beitreten, Kalendereintrag, Umbuchen/Absagen, Vorbereitungsvideo.
Mit `?termin=neu` und noch ohne Termin wartet die Karte auf den Calendly-Webhook (Neuladen alle 3 s, höchstens 30 s) — die
Karte hängt also am Webhook `invitee.created`. Laufen erst die ICP-Fragen, reicht der Proxy `next=/dashboard?termin=neu`
an `/einsteig` weiter, und `OnboardingFlow` folgt ihm auch auf dem Free-Pfad.
