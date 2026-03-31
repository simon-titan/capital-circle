# Hero UI Spezifikation (Dashboard Welcome)

Diese Datei dokumentiert die aktuelle Hero-Umsetzung inkl. Farben, Verlaeufe, Rundungen, Animationen und Hierarchie, damit der Look konsistent an anderen Stellen reproduziert werden kann.

## 1) Design-Tokens (Basisfarben)

Aus `app/globals.css` (`:root`):

- `--color-bg`: `#080808`
- `--color-text-primary`: `#f0f0f0`
- `--color-text-muted`: `rgba(255, 255, 255, 0.4)`
- `--color-accent-gold`: `#d4af37`
- `--color-accent-gold-light`: `#e8c547`
- `--color-accent-gold-dark`: `#a67c00`
- `--color-accent-glow`: `rgba(212, 175, 55, 0.28)`

## 2) Hero-Container (`.glass-card-hero`)

Verwendet in `components/platform/WelcomeCard.tsx` ueber `<GlassCard hero />`.

### Form und Material

- `border-radius: 18px`
- `border: 1px solid rgba(212, 175, 55, 0.56)`
- `backdrop-filter: blur(24px)`
- `overflow: hidden`
- `position: relative`

### Background-Layer (3 Ebenen)

1. `radial-gradient(circle at top right, rgba(212, 175, 55, 0.28), transparent 48%)`
2. `radial-gradient(circle at 18% 18%, rgba(232, 197, 71, 0.12), transparent 52%)`
3. `linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.08) 100%)`

### Basisschatten

- `0 14px 46px rgba(0, 0, 0, 0.5)`
- `0 0 34px rgba(212, 175, 55, 0.2)`
- `inset 0 1px 0 rgba(255, 255, 255, 0.12)`

### Animationen

- `glass-card-hero-breathe 5.6s ease-in-out infinite`
- `glass-card-hero-shimmer 7.2s ease-in-out infinite`

`prefers-reduced-motion` ist aktiv und deaktiviert die Animationen.

### Pseudo-Elemente

- `::before`: obere Goldkante, `height: 2px`
- `::after`: diagonaler Shimmer-Layer mit `background-size: 220% 220%`

## 3) Layout-Hierarchie der Hero-Card

Datei: `components/platform/WelcomeCard.tsx`

### Desktop (`lg`)

`Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }}`

- Linke Spalte:
  1. Kicker "Willkommen zurueck"
  2. Radley-Subline
  3. Haupttitel "Hallo {name}!"
  4. Motivations-/Status-Text
  5. Datumsanzeige direkt darunter
- Rechte Spalte (vertikal, gleiche Breite):
  1. Streak-Card
  2. Institut-Rings
  3. Lernzeit-Woche
  4. Mitgliedschaft + Lernzeit gesamt

### Mobile

Einspaltig (`base: "1fr"`), gleicher visueller Aufbau in vertikaler Reihenfolge.

## 4) Datumsanzeige (Pill)

In `WelcomeCard.tsx`:

- `display: inline-flex`
- `align-items: center`
- `gap: 3`
- `px: 4`, `py: 3`
- `border-radius: 14px`
- `border: 1px solid rgba(212, 175, 55, 0.35)`
- `background: linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(8, 8, 8, 0.35) 100%)`
- `box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.25)`

Icon-Kreis:

- `bg: rgba(212, 175, 55, 0.2)`
- Icon-Farbe: `var(--color-accent-gold-light)`

## 5) Streak-Sektion

Klassen: `.welcome-streak-hot` und `.welcome-streak-flame`

### Container

- `border-radius: 18px`
- `padding: { base: 3, md: 4 }`
- `border: 1px solid rgba(255, 150, 80, 0.35)`
- Hintergrund:
  - warme Radialquelle links
  - goldene Radialquelle rechts
  - dunkler Verlauf als Basis
- Animation: `welcome-streak-glow 4s ease-in-out infinite`

### Flame-Block

- `border-radius: 16px`, `p: 3`
- Verlauf warm/orange-gold
- Border: `rgba(255, 160, 80, 0.45)`
- Icon: `size={28}`
- Animation: `welcome-streak-flame-pulse 2.4s ease-in-out infinite`

### KPI-Zahl und Progress

- Zahl (JetBrains Mono) mit Text-Gradient:
  - `#fff2d0 -> #e8c547 -> #c99500`
- Progress-Track:
  - `height: 7px`
  - dunkler Hintergrund + feine Border
- Progress-Fill:
  - `#ff8a3c -> #ffb454 -> #e8c547`
  - Glow: `0 0 18px rgba(255, 150, 60, 0.5)`

## 6) Institut-Rings (3 Donuts)

Datei: `components/platform/WelcomeModuleRings.tsx`

### Kartenhuelle

- `border-radius: 14px`
- `border: 1px solid rgba(212, 175, 55, 0.38)`
- `bg: linear-gradient(165deg, rgba(212, 175, 55, 0.1) 0%, rgba(8, 8, 8, 0.55) 55%)`
- `px: { base: 3, md: 4 }`
- `py: { base: 2, md: 3 }`

### Donut-Spezifikation

- `size: 72`
- `stroke: 6`
- Track: `rgba(255,255,255,0.08)`
- Fortschrittsverlauf:
  - `#f0dc82 -> #e8c547 -> #8a7218`
- Prozentlabel (Mitte):
  - `JetBrains Mono`, `fontSize: lg`, Gold-Light

## 7) Lernzeit-Woche (vertikale Balken)

Datei: `components/platform/WelcomeLearningWeek.tsx`

### Kartenhuelle

Gleiche visuelle Familie wie Institut-Rings:

- `border-radius: 14px`
- `border: 1px solid rgba(212, 175, 55, 0.38)`
- `bg: linear-gradient(165deg, rgba(212, 175, 55, 0.1) 0%, rgba(8, 8, 8, 0.55) 55%)`
- `px: { base: 3, md: 4 }`
- `py: { base: 2, md: 3 }`

### Chart-Verhalten

- 7 vertikale Balken (pro Tag)
- `trackPx = 80`
- Balkenfarbe:
  - `#f0dc82 -> #d4af37 -> #8a6f1c`
- aktive Balken:
  - Glow: `0 0 16px rgba(212, 175, 55, 0.35)`
- Hover:
  - Tooltip zeigt Tageslabel + genaue Lernzeit

## 8) Rundungen und Spacing-Scale (Rezept)

Empfohlene Standardstufen fuer denselben Stil:

- Hero-Aussen: `18px`
- Subcards innen: `14px`
- Meta-Container: `12px`
- Icon-Bubbles/Pills: `14px` oder `full`

Spacing:

- Hero-Padding: `{ base: 4, md: 5 }`
- vertikale Block-Abstaende: `{ base: 4, md: 5 }`
- kompakte Innenabstaende: `3` bis `4`

## 9) Typo-Hierarchie

Fonts gemaess Projektvorgabe:

- Heading-Akzent: Radley nur gezielt (z. B. Subline)
- Haupt-UI/Text: Inter
- Zahlen/KPIs: JetBrains Mono

Muster:

- Overline/Kicker: Inter Medium, `xs`, uppercase, mehr Letterspacing
- Primare Titel: Inter Semibold, `2xl/3xl`, Gold-Light
- Support-Text: Inter Regular, `sm/md`, warmes Weiss
- KPI-Zahlen: JetBrains Mono, teils mit Gradient-Text

## 10) Reproduktions-Checkliste (Kurzform)

1. Gold-Tokens aus `:root` verwenden, keine ad-hoc Farben.
2. Glas-Hintergrund mit 2 radialen + 1 linearem Verlauf bauen.
3. `blur(24px)`, Border + Shadow kombinieren.
4. Obere 2px Goldkante ueber `::before`.
5. Shimmer-Layer ueber `::after` animieren.
6. Radius-Stufen 18/14/12 konsistent halten.
7. Streak als warmen Gegenpol (orange-gold) mit eigener Animation gestalten.
8. Rings + Week in derselben Card-Familie halten (gleiche Border/Background).
9. KPI-Zahlen in JetBrains Mono.
10. `prefers-reduced-motion` immer mitpflegen.

## 11) Dashboard-Zeilenkarten (Institut / Hausaufgabe / Events)

Fuer Karten unterhalb der Welcome-Hero-Zeile gilt dieselbe **Subcard-Familie** wie Institut-Rings und Lernzeit-Woche:

- CSS-Klasse: `.glass-card-dashboard` in `app/globals.css`
- Chakra: `<GlassCard dashboard />` in `components/ui/GlassCard.tsx`
- Effekt: goldene Verlaeufe, `border-radius: 14px`, duenne Gold-Topline via `::before`, `blur(24px)`

Verwendung:

- `components/platform/LastVideoCard.tsx` (Institut)
- `components/platform/HomeworkCard.tsx`
- `components/platform/UpcomingEventsCard.tsx`

Typo-Muster: Kicker wie in der Hero-Spalte (`inter-medium`, `xs`, uppercase, `letter-spacing: 0.1em`, `color: rgba(255,255,255,0.5)`), Titel in `var(--color-text-primary)` oder Akzent-Gold je nach Hierarchie, gemaess `DESIGN.json` (Gold, Radius Button `10px`).

