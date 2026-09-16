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
