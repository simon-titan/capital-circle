---
name: Capital Circle
description: Trading-Community und Lernplattform — Champagner auf Graphit. Sternenfeld, weiches Champagner-Licht, graphitgraue Glas-Karten mit Gold-Kante.
colors:
  gold: "#d4b080"
  gold-light: "#e8c094"
  gold-dark: "#b8935f"
  gold-hover: "#ddbd90"
  gold-press: "#c7a26f"
  gold-line: "rgba(232, 192, 148, 0.6)"
  gold-wash: "rgba(212, 176, 128, 0.08)"
  on-gold: "#1a140c"
  graphite: "#0f1317"
  graphite-raised: "rgba(22, 26, 32, 0.92)"
  panel-solid: "#151a1e"
  surface: "#191e23"
  graphite-2: "#222427"
  hairline: "rgba(255, 255, 255, 0.07)"
  hairline-strong: "rgba(255, 255, 255, 0.15)"
  ink: "#d1d0d4"
  track: "#292c32"
  text: "#f2f3f5"
  text-soft: "#d4d7db"
  text-2: "#a3a9b0"
  text-3: "#80868d"
  success: "#4ade80"
  danger: "#f87171"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  numeral:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\" 1"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  nav:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "18px"
    letterSpacing: "0.12em"
  wordmark:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.32em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  card: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  2xl: "40px"
  strip: "48px"
  sidebar: "264px"
  content-max: "1280px"
components:
  button-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-line:
    backgroundColor: "rgba(255, 255, 255, 0.02)"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-line-hover:
    backgroundColor: "rgba(212, 176, 128, 0.06)"
    textColor: "{colors.text}"
  button-funnel:
    backgroundColor: "rgba(255, 255, 255, 0.02)"
    textColor: "{colors.gold}"
    rounded: "{rounded.md}"
    height: "32px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "24px"
  card-title:
    textColor: "{colors.text-soft}"
    typography: "{typography.label}"
  card-hero-title:
    textColor: "{colors.gold-light}"
    typography: "{typography.label}"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.text-soft}"
    typography: "{typography.nav}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "52px"
  nav-item-active:
    backgroundColor: "{colors.gold-wash}"
    textColor: "{colors.gold-light}"
    rounded: "{rounded.md}"
    height: "52px"
  nav-account-item:
    textColor: "{colors.text-soft}"
    height: "48px"
  top-strip:
    backgroundColor: "{colors.graphite-raised}"
    textColor: "{colors.text-2}"
    height: "48px"
  sidebar:
    backgroundColor: "{colors.graphite-raised}"
    width: "264px"
  drawer:
    backgroundColor: "{colors.panel-solid}"
    width: "300px"
  icon-tile:
    backgroundColor: "rgba(255, 255, 255, 0.02)"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    size: "56px"
  progress-bar:
    backgroundColor: "{colors.track}"
    rounded: "{rounded.full}"
    height: "8px"
  progress-segment:
    backgroundColor: "{colors.ink}"
    rounded: "4px"
    height: "24px"
  streak-day-done:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.full}"
    size: "26px"
  play-button:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    rounded: "{rounded.full}"
    size: "64px"
---

# Design System: Capital Circle

## Overview

**Creative North Star: „Champagner auf Graphit“**

Capital Circle ist ein Graphit-Himmel, auf dem Champagner-Gold leuchtet. Der Grund ist ein warmneutrales Graphit mit einem feinen Sternenfeld, dessen hellere Sterne langsam funkeln. Oben rechts liegt ein weicher Champagner-Schein, unten links ein schwaches Gegenlicht. Darüber liegen graphitgraue Glas-Karten: fast deckend, weichgezeichnet (Blur), mit einer Gold-Lichtkante an der Oberkante. Beim Hover heben sie sich leicht an und bekommen einen Gold-Schimmer. Gold ist hier der Charakter der Marke, kein sparsam verteilter Hinweis. Es füllt die Hauptaktionen als Verlauf, markiert den aktiven Nav-Punkt und färbt den Namen in der Begrüßung. Die Daten selbst (Fortschritt, Segmente, Streak-Haken) zeichnet das Dashboard wie im Kunden-Mockup in heller Datentinte.

Die Struktur bleibt ruhig und klar. Oben liegt eine schmale Leiste, links eine Sidebar, rechts ein zweispaltiges Raster, und jede Karte hat einen gesperrten Versaltitel. Eine Schrift trägt alles: Inter, Zahlen mit festen Ziffernbreiten. Die Bewegung ist spürbar, aber leise: Karten steigen beim Laden nacheinander auf, die Hero-Karte atmet, der Live-Punkt sendet Ringe, die Streak-Flamme pulsiert warm, ein Lichtfunke wandert an der Sidebar-Kante. `prefers-reduced-motion` schaltet jede dieser Bewegungen ab.

v3.1 löst das flache Schema v3 „Capital Circle Minimal“ ab. Der Nutzer fand es „extrem langweilig — keine Farben, keine Effekte“ und hat „Gold-Look + neue Struktur“ mit „Sternenfeld + Gold-Licht“ gewählt. Dabei bleiben Sidebar, Raster und Inhalte aus v3 erhalten, und der Gold-Charakter des früheren Designs kommt zurück. Das Landschaftsbild und Radley kommen nicht zurück. Seit 2026-09-14 ist die gesamte App umgesetzt (siehe Status unten). v3.2 übernimmt die Farben 1:1 aus dem Kunden-Mockup (01-dashboard): Graphit statt Nachtblau, Champagner `#D4B080` statt Brand-Gold `#D4AF37`, Dashboard-Daten und Icon-Kacheln neutral. Alle Effekte aus v3.1 bleiben.

**Status (2026-09-14): Migration abgeschlossen.** Plattform (Dashboard, Institut, Trading Journal, klassisches Journal, Positionsrechner, Live & Events, Ressourcen, Konto), Marketing/Funnel, Auth und Onboarding, Einzelseiten (`/wartung`, `/erfolge`, `/video`, `/termin`, `/discord`) und Admin (`/admin/**`) laufen auf v3.2. Es gibt keine nicht migrierten Seiten mehr; neue Flächen folgen ausschließlich diesem Dokument.

**Key Characteristics:**
- Graphitgrund `#0f1317` mit Sternenfeld und weichem Champagner-Licht, beides fixiert hinter dem Inhalt; wie laut der Himmel steht, regeln `--cc-sky-stars` (0.5) und `--cc-sky-glow` (0.58).
- Graphitgraue Glas-Karten (12px, 94 % deckend, Blur 14px, tiefer Schatten) mit Gold-Lichtkante oben; Hover hebt an und leuchtet golden.
- Champagner-Gold `#D4B080` als Verlauf (hell `#e8c094` → dunkel `#b8935f`) für Hauptaktionen, aktive Navigation, Fokus und Live.
- Daten im Dashboard (Fortschrittsbalken, Segmente, erledigte Streak-Tage) in heller Datentinte `#d1d0d4`; Icon-Kacheln neutral mit Haarlinie.
- Eine Hero-Karte für den nächsten Schritt: Gold-Rahmen, Gold-Schein, atmender Glow.
- Inter für alles; Zahlen tabellarisch; Kartentitel klein, gesperrt, versal.
- Grün/Rot nur semantisch.
- Jede Dauerbewegung steht auf der Reduced-Motion-Liste.

## Colors

Warmneutrales Graphit mit einer einzigen Akzentfamilie: Champagner-Gold in drei Helligkeiten und zwei Verläufen. Dazu kommt eine helle, neutrale Datentinte für Werte im Dashboard.

### Primary
- **Champagner-Gold** (`gold`): Kern der Marke, 1:1 aus dem Kunden-Mockup übernommen (v3.2, ersetzt `#D4AF37` auf der Plattform). Mittelton beider Verläufe, Live-Ring, Caret, Funnel-Text.
- **Gold hell** (`gold-light`): Gold als Text und Licht auf Graphit. Begrüßungsname, Hero-Kartentitel, aktiver Nav-Punkt, Live-Punkt, Schloss bei gesperrten Inhalten, Promo-Code, Lichtkanten.
- **Gold dunkel** (`gold-dark`): tiefes Ende der Verläufe.
- **Gold-Verlauf** (135°, `#ecc99c` → Gold → Gold dunkel; im Sidecar als `gold-grad`): Füllung von Gold-Buttons und Play-Button.
- **Gold-Balken** (90°, Gold dunkel → Gold → Gold hell; im Sidecar als `gold-bar`): Fortschrittsbalken außerhalb der Dashboard-Daten (z. B. Lernseite); läuft zum hellen Ende hin.
- **Gold hell / gedrückt** (`gold-hover`, `gold-press`): Kompatibilitätswerte für flache Gold-Flächen; Gold-Buttons reagieren über Helligkeit und Glow.
- **Gold-Haarlinie** (`gold-line`): Rand des aktiven Nav-Punkts, Hover-Rand der Line-Buttons, Funnel-Kontur, offener heutiger Streak-Tag, Tastaturfokus.
- **Gold-Hauch** (`gold-wash`): Startton des aktiven Nav-Verlaufs und getönte Flächen (z. B. Status-Pills im Institut).
- **Tinte auf Gold** (`on-gold`): Text und Icons auf Gold-Füllung.

### Neutral
- **Graphit** (`graphite`): Seitengrund unter Sternenfeld und Champagner-Licht; auch das Häkchen auf erledigten Streak-Tagen. Seit 2026-09-17 einen Tick dunkler (`#0f1317` statt `#12171c`), damit die Karten klarer davor stehen.
- **Graphit erhöht** (`graphite-raised`): Leiste, Sidebar und mobile Kopfzeile, 92 % deckend mit Blur 16–18px.
- **Panel massiv** (`panel-solid`): mobiler Drawer, deckend.
- **Fläche** (`surface`): Grundton der Karten; im Einsatz als vertikaler Verlauf `rgba(27,32,38,0.94)` → `rgba(24,29,34,0.94)`.
- **Graphit 2** (`graphite-2`): Tooltips, eingelassene Flächen.
- **Haarlinie** (`hairline`) / **Haarlinie kräftig** (`hairline-strong`): Trenner, Kartenrand, Sidebar-Kante, Sub-Listen-Schiene bzw. Kontur der Line-Buttons und Icon-Kacheln.
- **Datentinte** (`ink`): helles, neutrales Grau für Daten im Dashboard — Balken in „Weiter wo du warst“, gefüllte Fortschrittssegmente, erledigte Streak-Tage.
- **Spur** (`track`): ungefüllte Balken, Scrollbar.
- **Text** (`text`), **Text weich** (`text-soft`), **Text 2** (`text-2`), **Text 3** (`text-3`): Hauptwert, Kartentitel/Nav, Meta, Trennpunkt/gesperrt.

### Semantic
- **Gewinn** (`success`) und **Verlust/überfällig** (`danger`): nur für Bedeutung.
- **Streak-Glut** (warmes Orange `#ffb454` mit Glut-Verlauf `rgba(255,140,60,…)`): für die Streak-Flamme und — seit 2026-09-17 — für den Zeitton „bald“ (siehe unten). Die Wärme gehört zum Motiv Feuer und ist kein zweiter Akzent.
- **Zeitton** (`components/platform/dashboard/zeit-ton.ts`): Ein Termin, der **läuft**, steht in Grün (`--cc-success`); bis **drei Stunden** vor dem Start in der Streak-Glut; davor bleibt er neutral bzw. in Gold hell. Die Regel gilt gleichermaßen für „Heute live“ und „Nächste Termine“ und kommt aus einer einzigen Ableitung — zwei Kopien derselben Schwelle driften auseinander. Der Nutzer wollte hier ausdrücklich Gelb; Gelb wäre ein zweiter Akzentton neben Gold, deshalb trägt die Warnstufe die bereits erlaubte Glut. Gefärbt werden Punkt und Text, **nicht** der Typ-Badge — der behält die im Admin gewählte Event-Farbe.
- **Ticket-Status** (`lib/support/shared.ts`, Punkt `TicketStatusDot`): offen = Gold hell, wartet auf Antwort = Gold dunkel, in Bearbeitung = Datentinte, gelöst = Grün, geschlossen = Grau (45 % Weiß).
- **Event-Farben** (`config/event-colors.ts`): nur Markentöne — Champagner `#d4b080` (Standard), Champagner hell `#e8c094`, Bronze `#b8935f`, Silber `#d1d0d4`, Graphit `#80868d`. Der Admin wählt im Event-Formular, der Mitglieder-Kalender färbt die Chips als Hauch (18 %) mit Haarlinie (55 %) über die Klassen `ev-tone-<key>`. Alt-Farben aus der Datenbank werden auf den nächstliegenden Markenton abgebildet, die API speichert nur Palettenwerte. Free-Call (Gold-Verlauf) und gesperrte Events überschreiben den Ton.

### Named Rules
**The Champagne-on-Graphite Rule.** Farbe kommt aus der Champagner-Gold-Familie auf dem Graphitgrund. Es gibt keinen zweiten Akzentton; die helle Datentinte ist neutral und zählt nicht als Akzent. Ausnahmen sind nur Grün/Rot für Bedeutung und die warme Glut der Streak-Flamme.

**The Forward-in-Gold Rule.** Eine Gold-Füllung bekommt, was dich jetzt weiterbringt: Weiterlernen, Beitreten, Stream beitreten, Jetzt bewerben. Alle übrigen Aktionen sind Line-Buttons, die erst beim Hover eine Gold-Kante zeigen.

**The Data-Ink Rule.** Daten im Dashboard stehen wie im Kunden-Mockup in heller Datentinte: der Balken in „Weiter wo du warst“, die Fortschrittssegmente und die erledigten Streak-Tage; die Prozentzahl steht in Text. Gold bleibt für Aktion, Navigation, Fokus, Live und Hervorhebung. Fortschrittsbalken außerhalb des Dashboards (Lernseite, Institut) laufen weiter im Gold-Balken.

**The Semantic-Only Rule.** Grün und Rot tragen ausschließlich Gewinn, Verlust oder Überfälligkeit.

## Typography

**Display Font:** Inter (mit system-ui, sans-serif)
**Body Font:** Inter
**Label/Mono Font:** Inter mit tabellarischen Ziffern (`tnum`); keine Monospace-Schrift.
**Geladen:** nur Inter (Google Fonts in `app/layout.tsx`); Chakra `fonts.heading/body/mono` = Inter. Keine weiteren Webfonts.

**Character:** Eine sachliche Grotesk in wenigen Gewichten (400/500/600). Die Ordnung kommt aus Größe, Gewicht und Grau. Gold als Textfarbe setzt Betonung, eine zweite Schrift braucht es dafür nicht.

### Hierarchy
- **Display** (600, 36px, mobil 28px, 1.15, −0.01em): Begrüßung „Hallo Emre.“, der Name in Gold hell. Darunter die Frage in 18/16px Text 2.
- **Numeral** (600, 44px, −0.02em, tabellarisch): Streak-Zahl in Text. Die Prozentzahl im Fortschritt nutzt denselben Schnitt in 30px, ebenfalls in Text.
- **Title** (600, 18px, mobil 17px, 1.3): Hauptwert einer Karte.
- **Body** (400–500, 16px, 1.5): Fließtext und Zustandstexte.
- **Meta** (400, 14px, 1.5, Text 2): Nebeninformation. Titel und Meta stehen in einer Zeile, getrennt durch „·“. Bricht die Meta um, verschwindet der Punkt.
- **Nav** (400, 15px): Sidebar-Zeilen; Sub-Punkte 14px.
- **Label** (500, 13px, 0.12em, versal): Kartentitel in Text weich, auf Hero-Karten in Gold hell. Er ist die `h2` der Karte, keine Dachzeile über einer Überschrift. Untertitel innerhalb einer Karte (z. B. „Letzte 7 Tage“) nutzen 12px in Text 2.
- **Wordmark** (400, 15px, 0.32em, versal): „CAPITAL CIRCLE“ in der Sidebar (kompakt 13px / 0.3em).

### Named Rules
**The One-Face Rule.** Inter ist die einzige Schrift. Zahlen bekommen tabellarische Ziffern statt einer Mono-Schrift. Radley und JetBrains Mono sind entfernt und werden nicht mehr geladen.

**The Time-Vocabulary Rule.** Jede zeitgebundene Angabe spricht dieselbe Sprache: „läuft jetzt“, „Heute · 15:00 Uhr“, „Morgen“, „Fr, 19. Sep“.

## Layout

- **Rahmen:** Oben eine Leiste von 48px: die Apex-Promo läuft als Laufband über die volle Breite (Hover pausiert, bei reduzierter Bewegung steht sie still); die Unterkante ist eine Gold-Linie mit 18 % Deckkraft. Ab `lg` (992px) folgt links eine feste Sidebar von 264px, sticky unter der Leiste. Darunter ersetzt eine 56px-Kopfzeile mit Menü-Button die Sidebar und öffnet dieselbe Navigation als Drawer von links (max. 300px).
- **Inhalt:** max. 1280px, zentriert; Innenabstand 16/24/40px (mobil/md/xl), oben 24/32/48px.
- **Dashboard-Raster:** seit 2026-09-17 drei Reihen statt zweier durchlaufender Spalten, Abstand 20px. Oben „Als nächstes“ und „Dein Fortschritt“ (1.8fr / 1fr ab `xl`), in der Mitte „Heute live“, „Diese Woche“ und „Journal“ (drei gleiche Spalten ab `lg`), unten „Neueste Analyse“ und „Nächste Termine“ (1fr / 1.25fr ab `xl`). Die Statuskacheln (Lernzeit, Mitglied seit, Discord) sind am 17.09.2026 entfallen; Discord wohnt jetzt im Konto-Block der Sidebar und erscheint unterhalb `lg` zusätzlich als erste Karte über „Als nächstes“. Unterhalb der Bruchstelle stapelt jede Reihe für sich, die Dringlichkeit steckt damit in der Reihenfolge der Reihen — das frühere `display: contents` mit `order` je Karte entfällt.
- **Rhythmus:** Karten-Innenabstand 20/24px, Abstand zwischen Karten 20px, Kartentitel 16px über dem Inhalt. Eine Statuszeile schließt die Seite ab, hinter einer Haarlinie 32–40px unter dem Raster.
- **Einstieg:** Kopf und Karten steigen in `order`-Reihenfolge auf (80ms + 70ms je Schritt).

## Elevation & Depth

Tiefe entsteht in drei Ebenen. Hinten liegt der Himmel (Graphit, Sternenfeld, Champagner-Licht, alles `position: fixed`). Seine Lautstärke hängt an zwei Reglern in `:root`: `--cc-sky-stars` (Deckkraft von `.cc-stars`, aktuell 0.5) und `--cc-sky-glow` (Deckkraft von `.cc-goldlight`, aktuell 0.58). Die rgba-Werte in den beiden Klassen halten nur noch das Verhältnis der Sterne bzw. der beiden Lichter zueinander — wer den Hintergrund beruhigen oder aufdrehen will, ändert die Regler, nicht die Verläufe. In der Mitte liegt das Glas: Leiste, Sidebar und Karten, fast deckend (92–94 %) mit Blur, sodass Sterne und Licht nur weich durchscheinen. Vorne liegt das Licht, also Gold-Kanten, Gold-Glows und Schatten, die Karten und Hauptaktionen vom Grund abheben. Ebenen über dem Inhalt (Drawer) liegen auf einem dunklen Overlay (`rgba(8,10,12,0.72)`).

### Shadow Vocabulary
- **Karte ruhend** (`0 12px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)`): jede Glas-Karte.
- **Karte Hover** (`0 16px 40px rgba(0,0,0,0.42), 0 0 28px rgba(212,176,128,0.1), inset 0 1px 0 rgba(255,255,255,0.06)`): zusammen mit −2px Anhebung und Gold-Rand (30 %).
- **Hero atmend** (zwischen `0 0 26px rgba(212,176,128,0.12)` und `0 0 46px rgba(212,176,128,0.24)` plus Tiefenschatten, 6s): nur Hero-Karten.
- **Gold-Button** (`0 6px 18px rgba(212,176,128,0.22), inset 0 1px 0 rgba(255,255,255,0.35)`; Hover `0 0 26px rgba(212,176,128,0.45)`).
- **Gold-Leuchten klein** (`0 0 10–12px rgba(212,176,128,0.28–0.45)`): Füllung des Gold-Balkens, Live-Punkt. Datentinte (Dashboard-Balken, Segmente, Streak-Kreise) leuchtet nicht.
- **Medien** (`0 10px 28px rgba(0,0,0,0.45)`): Video-Vorschau in der Hero-Karte.

### Named Rules
**The Glass-Card Rule.** Inhalte liegen auf Glas: graphitgrauer Verlauf (94 % deckend), Blur 14px, 1px-Rand (7 % Weiß), tiefer Schatten und eine Gold-Lichtkante oben (mittig über 68 % der Breite, bei Hero-Karten über die volle Breite). Keine Karte ohne Blur und Gold-Kante direkt auf dem Himmel.

**The Hero-for-Next-Step Rule.** Die Hero-Behandlung mit Gold-Rahmen, Gold-Schein und atmendem Glow ist dem nächsten Schritt vorbehalten: „Weiter wo du warst“ und die Bewerbungsaufforderung.

## Shapes

Weiche, mittlere Radien: 12px für Karten und Icon-Kacheln, 10px für Medien, 8px für Buttons und Nav-Zeilen, 6px für Tageszellen und Tooltips, 4px für Fortschrittssegmente. Voll gerundet sind Balken, Punkte, Badges, Streak-Kreise und der Play-Button. Konturen sind 1px; offene Streak-Tage haben einen durchgezogenen 1.5px-Kreis. Lichtlinien (Kartenkante, Sidebar-Kante) sind 1px-Verläufe, die an den Enden ausblenden. Icons sind Lucide-Linien mit Strichstärke 1.5–1.75; Flamme und Play dürfen gefüllt sein.

## Components

### Buttons
- **Shape:** 8px, Inter, Chakra-Größen md (40px) und sm (32px).
- **Gold (`variant="gold"`):** Gold-Verlauf mit dunkler Tinte, 600, Gold-Schatten und heller Innenkante. Hover: Helligkeit +6 %, 1px Anhebung, stärkerer Gold-Glow. Active: zurück auf 0, Helligkeit −4 %.
- **Line (`variant="line"`):** fast transparent (2 % Weiß) mit kräftiger Haarlinie, 500. Hover: Gold-Hauch 6 %, Gold-Haarlinie, weicher Gold-Glow. Standard für alle übrigen Aktionen.
- **Funnel:** Line-Variante mit Gold-Text und Gold-Haarlinie (z. B. „Jetzt bewerben“ in der Sidebar).
- **Focus:** 2px Gold-Kontur (`gold-line`) mit 2px Abstand; Chakra-Fokusring in Gold.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** graphitgrauer Verlauf `rgba(27,32,38,0.94)` → `rgba(24,29,34,0.94)` mit Blur 14px auf dem Himmel.
- **Shadow Strategy:** Karte ruhend / Hover (siehe Elevation & Depth).
- **Border:** 1px Weiß 7 %; Gold-Lichtkante oben; Hover-Rand Gold 30 %.
- **Internal Padding:** 20px, ab md 24px. Aktion rechts neben dem Inhalt ab `sm`, darunter auf schmalen Screens.
- **Kartentitel:** Label-Schnitt als `h2`.
- **Hero-Variante:** Rand Gold 40 % (Hover 62 %), Gold-Schein oben rechts, schwaches Gegenlicht unten links, Grundverlauf `rgba(29,34,40,0.94)` → `rgba(24,29,34,0.94)`, Titel in Gold hell, atmender Glow.
- **Icon-Kachel:** 56px, 12px, Haarlinie kräftig auf 2 % Weiß, Icon in Text — neutral wie im Kunden-Mockup.
- **Gesperrt (Free):** Schloss in Gold hell, „Nur für Mitglieder“, ein Satz Meta und ein Line-Button „Mitglied werden“. Der Inhalt wird ehrlich benannt statt verwischt.
- **Sticky-Falle:** `.cc-card` setzt `position: relative` und überschreibt damit Chakras `position="sticky"` am selben Element. Klebende Karten (Seitenleisten, Zusammenfassungen) in eine äußere `Box` mit `position="sticky"` legen; die `.cc-card` liegt darin.

### Navigation
- **Sidebar:** Graphit erhöht mit Blur 18px. Oben die gesperrte Wortmarke; fünf Gruppen als 52px-Zeilen im Abstand von 12px, 24px-Linienicons. Darunter, hinter einer Haarlinie, News/Profil/Logout als 48px-Zeilen; News trägt ein neutrales Zahl-Badge.
- **Lichtlinie:** Die rechte Sidebar-Kante ist eine 1px-Linie, die zur Mitte hin golden wird. Ein kleiner Lichtfunke wandert in 14s an ihr entlang.
- **Default / Hover:** Text weich / weißer Hauch 4 % mit Text.
- **Aktiv:** Gold-Haarlinie, Gold-Verlauf von links (16 % → 3 %), weicher Gold-Glow, Text und Icon in Gold hell.
- **Sub-Listen:** eingerückt an einer 1px-Schiene, 34px-Zeilen in 14px. Aktiv heißt ein leuchtender 1px-Goldstrich auf der Schiene plus Text in Weiß 500.
- **Gesperrt:** Text 3 mit kleinem Schloss, nicht klickbar.
- **Mobil:** 56px-Kopfzeile (Glas, Blur 16px); Drawer deckend in Panel massiv mit derselben Liste.

### Kopfleiste
Glas-Leiste (Blur 16px) mit einer Gold-Unterkante von 18 %. Die Promo beginnt mit einem leuchtenden Gold-Punkt, der Rabattcode steht in Gold hell (600, 0.04em). Hover auf der Promo zeigt einen Gold-Hauch von 5 %.

### Fortschritt
- **Balken (`ProgressBar`):** 8px, Spur 7 % Weiß, max. 400px breit. `tone="gold"` (Standard, z. B. Lernseite): Gold-Balken-Verlauf mit Gold-Leuchten. `tone="ink"` (Dashboard, „Weiter wo du warst“): Datentinte ohne Leuchten.
- **Segmentierter Fortschritt:** zehn Segmente à 10 %, 24px hoch, 5px Abstand, 4px Radius. Leer = 1px-Kontur 14 % Weiß, voll = Datentinte ohne Rand und Leuchten. Die Prozentzahl steht darüber in Text. Zahl und Balken zeigen immer denselben Wert (abgerundet).
- **Bewegung:** füllt sich einmal beim Laden (900ms, `cubic-bezier(0.16,1,0.3,1)`, Segmente um 45ms versetzt).

### Streak
Seit 2026-09-17 steht die Streak nicht mehr als eigene Karte, sondern im Fuß der Fortschrittskarte, hinter einer Haarlinie und zweigeteilt: links eine 44px-Glut-Kachel (warmer Verlauf Orange → Champagner, Rand in Orange) mit gefüllter, warm pulsierender Flamme (2.6s) neben der tabellarischen Zahl und „Tage aktiv“, rechts hinter einer senkrechten Haarlinie ein Häkchen mit „N von 5 Tagen diese Woche“. Die Siebentagesreihe aus Kreisen entfällt; wer den Verlauf sehen will, findet ihn im Tooltip der Glut-Kachel.

### Live-Zustand
Ein 8px-Punkt in Gold hell mit Leuchten vor der Zeitangabe. Läuft eine Session, breitet sich ein Gold-Ring aus (1.8s). Beim Termin „heute“ steht der Punkt still, bei späteren Terminen fehlt er.

### Weiterlernen (Hero)
Hero-Karte mit Videovorschau links (10px, Gold-Rand 28 %, Tiefenschatten) und Titel · Meta, Balken in Datentinte und Gold-Button rechts. Mitten auf der Vorschau liegt ein 64px-Play-Button im Gold-Verlauf mit starkem Gold-Glow; Hover skaliert ihn auf 1.07. Ohne Bild wird der Lektionstitel auf einem warmen Gold-Schein zum Bildinhalt.

### Bewegung
Standard-Easing `cubic-bezier(0.16,1,0.3,1)`, Zustandswechsel 150–220ms. Einmalig beim Laden: Aufsteigen der Karten, Füllen des Fortschritts. Dauerhaft und leise: Sternfunkeln (7s, Deckkraft 0.55 → 0.8), Hero-Atmen (6s), Live-Ring (1.8s), Punkt in der Hero-Pill der Verkaufsseite (`.cc-pulse`, 2.4s), Flamme (2.6s), Funke (14s), mobiles Promo-Laufband (32s). `prefers-reduced-motion` stoppt alle und hebt die Karten-Anhebung auf.

### Marketing (umgesetzt, aus Kunden-Mockups)
Dasselbe Schema auf Landing, Funnels, Pricing und Bewerbung, seit 2026-09-14 umgesetzt (Bausteine: `components/marketing/funnel-ui.tsx`, `components/landing/landing-ui.tsx`, `components/landing/DiscordFunnelChrome.tsx`). Die Kunden-Mockups (Hero, Vergleich, Für wen) sind die Quelle des Sternenfelds und der Lichtlinie; Plattform und Marketing teilen damit einen Himmel:
- Graphitgrund mit Sternenfeld und Champagner-Licht wie in der Plattform; kein Landschaftsbild.
- Große Inter-Headlines (600), einzelne Wörter in Gold hell, eine gedämpfte zweite Zeile in Text 2.
- Primäre CTA im Gold-Verlauf mit Glow; die Kopfnavigation zeigt die Wortmarke gesperrt. `Logo` (`components/brand/Logo.tsx`) ist eine Text-Wortmarke „CAPITAL CIRCLE“ in Inter (400, versal, 0.32em) statt des früheren Serif-Bilds.
- Vergleichstabelle auf Glas mit Haarlinien; die Capital-Circle-Spalte ist durch Gold-Rand, Gold-Schein und goldene Spaltenkopf-Schrift hervorgehoben.
- Glas-Karten mit Gold-Kante, Nummer, Gold-Icon-Kachel, Titel und Ergebnis-Text.
- Eine rote Haarlinie gibt es nur für die Ausschlussbox „Für wen das nichts ist“.

## Do's and Don'ts

### Do:
- **Do** Inhalte auf Glas-Karten legen: 12px, Blur 14px, Tiefenschatten, Gold-Lichtkante oben, Hover mit −2px und Gold-Schimmer.
- **Do** den Seitengrund aus Graphit `#0f1317`, Sternenfeld und Champagner-Licht aufbauen (`.cc-stars`, `.cc-goldlight`).
- **Do** Aktionen, die jetzt weiterbringen, im Gold-Verlauf füllen; alles andere als Line-Button mit Gold-Kante beim Hover.
- **Do** Daten im Dashboard (Fortschritt, Segmente, erledigte Streak-Tage) in Datentinte `--cc-ink` zeichnen, die Prozentzahl in Text; Gold bleibt Aktion, Navigation, Fokus und Live.
- **Do** die Hero-Karte dem nächsten Schritt vorbehalten.
- **Do** Zahlen in Inter mit tabellarischen Ziffern setzen.
- **Do** Zeitangaben im Vokabular „läuft jetzt“ / „Heute · 15:00 Uhr“ / „Morgen“ / „Fr, 19. Sep“ schreiben.
- **Do** jede neue Dauerbewegung in die Reduced-Motion-Liste in `app/globals.css` aufnehmen.
- **Do** gesperrte Inhalte für Free-Mitglieder ehrlich benennen und einen Weg zur Mitgliedschaft zeigen.

### Don't:
- **Don't** einen anderen Goldton als die Champagner-Familie um `#D4B080` verwenden. Das gelbere Brand-Gold `#D4AF37` ist vollständig entfernt, auch aus den E-Mails; kein kühles Messing.
- **Don't** Dashboard-Daten wieder vergolden oder Icon-Kacheln golden tönen; beide bleiben neutral wie im Kunden-Mockup.
- **Don't** einen zweiten Akzentton einführen; Grün/Rot nur für Bedeutung, Orange nur für Streak-Glut und Zeitton.
- **Don't** eine zweite Schrift einführen (kein Radley, keine Mono-Schrift).
- **Don't** das Landschaftsbild oder die Metall-Tier-Farben (Bronze/Silber/Platin) zurückholen — beide sind entfernt.
- **Don't** Karten ohne Blur und Gold-Kante direkt auf den Himmel stellen.
- **Don't** Bewegungen ohne Reduced-Motion-Abschaltung bauen.

## Legacy (nicht Teil des Systems)

Die Migration ist abgeschlossen. Was an Legacy noch im Code steht, dient nur der Kompatibilität; neue Flächen verwenden ausschließlich die `--cc-*`-Tokens und die `.cc-*`-Klassen.

- **`--color-*`-Tokens** oben in `app/globals.css`: bleiben als Aliasse, ihre Werte entsprechen der v3.2-Palette (Graphit/Champagner, z. B. `--color-accent-gold` = `#d4b080`). `--color-profit` / `--color-loss` bleiben semantische Journal-Tokens. `--font-heading`/`--font-body`/`--font-mono` = Inter.
- **Klassen `.radley-regular(-italic)`, `.jetbrains-mono`, `.dm-sans`:** existieren noch, setzen aber Inter; kein Code nutzt sie mehr, sie bleiben nur zur Sicherheit.
- **Chakra-Theme** (`theme/index.ts`): `fonts.heading/body/mono` = Inter; `colors.brand` ist Champagner (`brand.200` = `#E8C094`, `brand.500` = `#D4B080`); `Switch`/`Checkbox`/`Radio`/`Progress`/`Slider`/`Tabs` haben standardmäßig `colorScheme: "brand"`; die Alert-Variante „solid“ (Toasts) ist ein Graphit-Panel, das Icon grün/rot semantisch, sonst Champagner. `radii.card/button/modal` bleiben als Kompatibilitätswerte.
- **Entfernt:** `components/ui/GlassCard.tsx`, `GlowButton.tsx`, `CardLockOverlay.tsx`, `PageTransition.tsx`, die `.glass-card*`-Klassen, alte Dashboard-CSS (welcome-streak, appointment-card, institut-card, Arsenal-Empty-Puls, Quiz-CTA-Puls), das Marketing-Metall-Tier und die Webfonts Radley und JetBrains Mono.
- **E-Mails** (`lib/email/layout/styles.ts`, `components.tsx`, `BaseEmail.tsx`, Kampagne `lib/email/campaigns/whop-migration/`): folgen v3.2. Mail-Clients kennen keine CSS-Variablen, daher stehen die `--cc-*`-Werte dort als Hex, Linien als vorgerechnete Volltöne, Verläufe immer mit Vollton-Fallback. Graphit-Grund, Graphit-Karten, Champagner-Button mit dunkler Schrift, Wortmarke „CAPITAL CIRCLE“ als Text mit Champagner-Lichtkante. Inter per `<link>`, sonst System-Sans; Monospace nur für Zugangsdaten zum Abtippen.

## Offene Entscheidungen

- Keine. Erledigt: Event-Farben am 2026-09-14 auf die Markenpalette umgestellt (Farbwähler bleibt, nur Markentöne). TradingView-Ticker am 2026-09-13 auf Nutzerwunsch entfernt — die Leiste zeigt nur noch die Promo.

## Änderungsprotokoll

- v3 → v3.1 (2026-09-13): Gold-Look zurück auf Nutzerwunsch. Sternenfeld und Gold-Licht, Glas-Karten mit Gold-Kante, Gold-Verlauf für Hauptaktionen und Fortschritt, Hero-Karte und leise Dauerbewegungen. Ersetzt die v3-Regeln „flach, keine Schatten/Glas/Verläufe/Glows“, „Gold nur für eine fällige Aktion“ und „Datentinte statt Gold“. Inter-only und Brand-Gold `#D4AF37` bleiben.
- v3.1 → v3.2 (2026-09-13): Farben 1:1 nach Kunden-Mockup (01-dashboard). Graphit `#12171c` statt Nacht `#0a0d11`, graphitgraue Karten (94 % deckend, Rand 7 %), Champagner `#D4B080` statt Brand-Gold `#D4AF37` als Akzent der Plattform (Verläufe, Glows, Fokus und Theme-Buttons ziehen mit). Dashboard-Daten (Weiterlernen-Balken, Fortschrittssegmente, Streak-Haken) und Icon-Kacheln stehen neutral in heller Datentinte `#d1d0d4`, die Prozentzahl in Text — „Datentinte statt Gold“ kehrt für Daten zurück. Sternenfeld, Champagner-Licht, Hero-Glow, Flamme, Gold-Buttons, aktive Navigation, Gold-Name und Fokusring bleiben. Legacy-`--color-*`, `colors.brand` und Marketing behalten `#D4AF37`.
- v3.2 (2026-09-14): gesamte App migriert — Plattform, Marketing/Funnel, Auth/Onboarding, Einzelseiten und Admin auf `--cc-*` und `.cc-card`. Nur noch Inter geladen (Radley, JetBrains Mono entfernt); `GlassCard`, `GlowButton`, `CardLockOverlay`, `PageTransition` und `.glass-card*` gelöscht, Metall-Tier entfernt. `--color-*` und `colors.brand` auf Champagner gezogen (nur noch Aliasse), Chakra-Controls standardmäßig `colorScheme="brand"`, Toasts als Graphit-Panel. `Logo` ist eine Inter-Wortmarke statt des Serif-Bilds. Neu: Sticky-Hinweis für `.cc-card`, Ticket-Statusfarben, offene Entscheidung Event-Farben.
- v3.2 Nachtrag (2026-09-14): E-Mail-Templates auf „Champagner auf Graphit“ und Inter umgestellt (`#D4AF37`, Georgia, Aqua/Lila im Discord-Invite und Rot/Weiß der Migrations-Kampagne entfernt). Event-Farben: Farbwähler mit fünf Markentönen (`config/event-colors.ts`), Mitglieder-Kalender färbt die Chips wieder nach Admin-Wahl.
- v3.2 → v3.2.1 (2026-09-17): **Himmel ruhiger** auf Nutzerwunsch. Der Grund ist einen Tick dunkler (`#12171c` → `#0f1317`; `--cc-bg`, die `--color-*`-Aliasse und `theme/index.ts` → `brand.bg` ziehen mit, sonst stünde der Body-Hintergrund heller als der Himmel darüber). Neu sind die beiden Regler `--cc-sky-stars` (0.5) und `--cc-sky-glow` (0.58): Sternenfeld und Champagner-Licht behalten ihre rgba-Verläufe als Verhältnis und werden über die Deckkraft der Klasse gedämpft — das Gold-Licht wirkt damit bei ~0.10 (oben rechts) und ~0.04 (unten links) statt 0.17/0.07. Der Funkel-Keyframe `cc-twinkle` läuft von 0.55 → 0.8 statt 0.35 → 1, weil ein Funkeln, das fast auf null geht, sich als Blinken liest. Das betrifft Plattform **und** Marketing, die sich den Himmel teilen. Ebenfalls neu: `.cc-pulse` — der Punkt in der Eyebrow-Pill der Verkaufsseite (2.4s, in der Reduced-Motion-Liste).
