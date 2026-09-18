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

2026-09-17 (**Hero-Vorschau hängt am Dashboard**): `components/landing/membership/PlattformVorschau.tsx`
baut das Dashboard als Markup nach und steht auf der Verkaufsseite direkt unter der Headline. Sie
ist **kein eigenständiges Design** — wer `components/platform/dashboard/**` ändert, zieht sie mit.
Am 17.09.2026 hing sie einen Tag lang hinterher und zeigte die gelöschte Streak-Karte mit der
Siebenerreihe. Die Vorschau läuft deshalb jetzt unter **`cc-neutral`** wie das echte Dashboard, und
ihre Zahlen in `config/landing-membership.ts` (`plattformVorschau`) müssen zueinander passen: Der
Prozentwert, die Lektionszahl und die gefüllten Segmente zeigen denselben Stand, die Streak-Tage
passen zu „N von 5 Tagen diese Woche". Ein Widerspruch dort steht unter der Überschrift
„Belegt statt behauptet" — das ist die teuerste Stelle der Seite für einen Rechenfehler.

2026-09-17 (**Kaufweg**): `app/go/[plan]/route.ts` leitet bei jedem Fehlschlag auf `/?fehler=<code>`.
Der Code wird von `components/landing/membership/KaufFehlerHinweis.tsx` gelesen und über dem Hero
angezeigt. Der Hinweis liest die Adresse **im Client** in einer `Suspense`-Grenze — würde die Seite
`searchParams` entgegennehmen, fiele die ganze Verkaufsseite von statisch auf dynamisch. Wer einen
neuen Fehlercode in der Route ergänzt, ergänzt auch den Text dort; unbekannte Codes fallen auf den
allgemeinen Kassenfehler zurück. Der Kaufknopf in `AngebotSection.tsx` sperrt sich nach dem ersten
Klick und zeigt „Kasse wird geöffnet …" — ohne das entsteht beim Doppeltipp eine zweite Stripe-Kasse.
