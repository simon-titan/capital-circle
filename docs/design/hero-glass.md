# Hero & Glassmorphism

← zurück zum [Index](./README.md)

> Reproduktions-Referenz für den Hero-/Glass-Look (Dashboard-Welcome & verwandte Karten).
> Konsolidiert die frühere `HERO-UI-SPEZIFIKATION.md`. Die hier genannten Klassen leben in
> [`app/globals.css`](../../app/globals.css); Wrapper-Komponente ist
> [`components/ui/GlassCard.tsx`](../../components/ui/GlassCard.tsx).

## Klassen-Übersicht (in `app/globals.css`)

| Klasse | ca. Zeile | Einsatz |
|--------|-----------|---------|
| `.glass-card` | ~113 | Standard-Glass-Karte |
| `.glass-card-highlight` | ~123 | höhere Deckkraft + Gold-Akzentlinie (Dashboard) |
| `.glass-card-spotlight` | ~136 | extra betont (Hausaufgabe/Events) |
| `.glass-card-dashboard` | ~174 | Hero-Subcard-Familie (Institut-Rings, Lernzeit-Woche) + `::before` Gold-Topline |
| `.glass-card-hero` | ~263 | Welcome-Hero: Breathe + Shimmer Animation, `::before`/`::after` |
| `.welcome-streak-hot` / `-flame` | ~351 | warmer Streak-Gegenpol (orange-gold), eigener Puls |
| `.appointment-card-glow` / `-booked` | ~364 | Termin-Karten (gold bzw. grün) |
| `.institut-card-media` / `-body` | ~409 | Institut-Karte Medienkopf/Body |

> `GlassCard`-Props mappen auf diese Klassen: `hero` → `.glass-card-hero`,
> `dashboard` → `.glass-card-dashboard`, `spotlight`/`highlight` entsprechend.

## Basis-Tokens (Hero)

Aus `app/globals.css :root` (siehe [tokens.md](./tokens.md)):
`--color-bg #080808` · `--color-text-primary #f0f0f0` · `--color-accent-gold #d4af37` ·
`--color-accent-gold-light #e8c547` · `--color-accent-gold-dark #a67c00` ·
`--color-accent-glow rgba(212,175,55,0.28)`.

## Hero-Container (`.glass-card-hero`)

**Form & Material**
- `border-radius: 18px`, `border: 1px solid rgba(212,175,55,0.56)`
- `backdrop-filter: blur(24px)`, `overflow: hidden`, `position: relative`

**Background (3 Ebenen)**
1. `radial-gradient(circle at top right, rgba(212,175,55,0.28), transparent 48%)`
2. `radial-gradient(circle at 18% 18%, rgba(232,197,71,0.12), transparent 52%)`
3. `linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.08) 100%)`

**Basis-Schatten**
`0 14px 46px rgba(0,0,0,0.5)`, `0 0 34px rgba(212,175,55,0.2)`, `inset 0 1px 0 rgba(255,255,255,0.12)`

**Animationen** (deaktiviert bei `prefers-reduced-motion`)
- `glass-card-hero-breathe 5.6s ease-in-out infinite` (Schatten atmet)
- `glass-card-hero-shimmer 7.2s ease-in-out infinite` (`::after`, `background-size: 220% 220%`)

**Pseudo-Elemente**
- `::before` — obere Goldkante, `height: 2px`
- `::after` — diagonaler Shimmer-Layer

## Layout-Hierarchie der Hero-Card

Datei: `components/platform/WelcomeCard.tsx` — `Grid templateColumns={{ base:"1fr", lg:"1fr 1fr" }}`.

- **Links:** Kicker „Willkommen zurück" → Radley-Subline → Haupttitel „Hallo {name}!" →
  Motivations-/Status-Text → Datums-Pill.
- **Rechts:** Streak-Card → Institut-Rings → Lernzeit-Woche → Mitgliedschaft + Lernzeit gesamt.
- **Mobile:** einspaltig, gleiche vertikale Reihenfolge.

### Datums-Pill
`inline-flex`, `gap 3`, `px 4 / py 3`, `radius 14px`, Border `rgba(212,175,55,0.35)`,
BG `linear-gradient(135deg, rgba(212,175,55,0.12), rgba(8,8,8,0.35))`,
`inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.25)`. Icon-Kreis `rgba(212,175,55,0.2)`.

## Subcard-Familie (`.glass-card-dashboard`)

Gleiche Optik für Institut-Rings, Lernzeit-Woche und die Dashboard-Zeilenkarten
(`LastVideoCard`, `HomeworkCard`, `UpcomingEventsCard`):
- `radius 14px`, Border `rgba(212,175,55,0.38)`, blur(24px)
- BG: 2 radiale Gold-Quellen + `linear-gradient(165deg, rgba(212,175,55,0.1), rgba(8,8,8,0.55) 55%)`
- `::before` dünne Gold-Topline
- Komponenten-Specs: `WelcomeModuleRings.tsx` (Donuts `size 72`, `stroke 6`, Verlauf `#f0dc82→#e8c547→#8a7218`),
  `WelcomeLearningWeek.tsx` (7 vertikale Balken `#f0dc82→#d4af37→#8a6f1c`).

## Streak-Sektion (warmer Gegenpol)

`.welcome-streak-hot`: `radius 18px`, Border `rgba(255,150,80,0.35)`, warme + goldene Radialquellen,
`welcome-streak-glow 4s`. Flame-Block (`.welcome-streak-flame`): `welcome-streak-flame-pulse 2.4s`,
Icon `size 28`. KPI-Zahl JetBrains Mono mit Text-Gradient `#fff2d0→#e8c547→#c99500`;
Progress-Fill `#ff8a3c→#ffb454→#e8c547`, Glow `0 0 18px rgba(255,150,60,0.5)`.

## Rundungs-/Spacing-Rezept

- Hero außen `18px` · Subcards `14px` · Meta-Container `12px` · Icon-Bubbles/Pills `14px` oder `full`.
- Hero-Padding `{ base:4, md:5 }` · vertikale Block-Abstände `{ base:4, md:5 }` · kompakt `3`–`4`.

## Typo im Hero

- Overline/Kicker: `inter-medium`, `xs`, uppercase, `letter-spacing 0.1em`, `rgba(255,255,255,0.5)`.
- Primäre Titel: Inter Semibold, `2xl`/`3xl`, Gold-Light.
- Support-Text: Inter Regular, `sm`/`md`, warmes Weiß.
- KPI-Zahlen: JetBrains Mono (teils Gradient-Text).

## Reproduktions-Checkliste

1. Gold-Tokens aus `:root` nutzen, keine Ad-hoc-Farben.
2. Glas-Hintergrund = 2 radiale + 1 linearer Verlauf.
3. `blur(24px)` + Border + Shadow kombinieren.
4. Obere `2px` Goldkante via `::before`.
5. Shimmer-Layer via `::after` animieren.
6. Radius-Stufen `18/14/12` konsistent.
7. Streak als warmen Gegenpol (orange-gold) mit eigener Animation.
8. Rings + Lernzeit in der `.glass-card-dashboard`-Familie halten.
9. KPI-Zahlen in JetBrains Mono.
10. `prefers-reduced-motion` immer mitpflegen.
