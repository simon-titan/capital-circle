# Tokens (v3.2 „Champagner auf Graphit“)

← zurück zum [Index](./README.md) · Werte: [`DESIGN.json`](../../DESIGN.json) · Code: `app/globals.css` (`:root`-Block v3.2 + Effekte `.cc-stars`, `.cc-goldlight`, `.cc-card`)

Farben seit v3.2 1:1 aus dem Kunden-Mockup (01-dashboard).

## Grund & Flächen

| Variable / Klasse | Wert | Rolle |
|-------------------|------|-------|
| `--cc-bg` | `#0f1317` | Graphitgrund |
| `.cc-stars` | Punkte 1–1.5px, zweite Ebene funkelt; Deckkraft `--cc-sky-stars` | Sternenfeld (fixed) |
| `--cc-sky-stars` | `0.5` | Regler: wie hell das Sternenfeld steht |
| `.cc-goldlight` | Champagner-Radial oben rechts 0.17 / unten links 0.07, Deckkraft `--cc-sky-glow` | Champagner-Licht (fixed) |
| `--cc-sky-glow` | `0.58` | Regler: wie stark das Champagner-Licht steht (wirksam ~0.10 / ~0.04) |
| `--cc-bg-raised` | `rgba(22,26,32,0.92)` + Blur | Sidebar, Leiste, mobile Kopfzeile |
| `--cc-panel-solid` | `#151a1e` | Drawer |
| `--cc-surface` | `#191e23` | Grundton der Karten |
| `.cc-card` | Verlauf `rgba(27,32,38,0.94)` → `rgba(24,29,34,0.94)`, Blur 14px, Rahmen `rgba(255,255,255,0.07)`, Radius 12px, Gold-Kante oben | Karten |
| `.cc-card--hero` | Gold-Rahmen 0.4, Champagner-Radial, Verlauf `rgba(29,34,40,0.94)` → `rgba(24,29,34,0.94)`, atmender Glow | Hero-Karte |
| `--cc-surface-2` | `#222427` | Tooltips, feste Innenflächen |
| `--cc-line` / `--cc-line-strong` | `rgba(255,255,255,0.07)` / `0.15` | Haarlinien; kräftig = Kontur Line-Button, Icon-Kachel |

## Text & Daten

`--cc-text #f2f3f5` · `--cc-text-soft #d4d7db` · `--cc-text-2 #a3a9b0` · `--cc-text-3 #80868d`

| Variable | Wert | Rolle |
|----------|------|-------|
| `--cc-ink` | `#d1d0d4` | Datentinte im Dashboard: Weiterlernen-Balken (`ProgressBar tone="ink"`), Fortschrittssegmente, Streak-Haken |
| `--cc-track` | `#292c32` | Spur, Scrollbar |

## Gold (Champagner)

| Variable | Wert |
|----------|------|
| `--cc-gold` | `#d4b080` |
| `--cc-gold-hover` / `--cc-gold-press` | `#ddbd90` / `#c7a26f` |
| `--cc-gold-light` | `#e8c094` (Name, Hero-Titel, aktive Nav, Live) |
| `--cc-gold-dark` | `#b8935f` |
| `--cc-gold-grad` | `linear-gradient(135deg, #ecc99c, #d4b080 50%, #b8935f)` — Buttons, Play |
| `--cc-gold-bar` | `linear-gradient(90deg, #b8935f, #d4b080 55%, #e8c094)` — Fortschritt (`ProgressBar` Standard, z. B. Lernseite) |
| `--cc-gold-line` / `--cc-gold-wash` | `rgba(232,192,148,0.6)` / `rgba(212,176,128,0.08)` |
| `--cc-on-gold` | `#1a140c` |

Streak-Flamme (einzige Nicht-Gold-Farbe): Kachel Orange→Champagner, Icon `#ffb454`. Grün/Rot nur semantisch.
Legacy: `--color-accent-gold*` ist seit der Migration nur noch ein Alias auf Champagner (`#d4b080` / `#e8c094` / `#b8935f`).

## Typografie

Nur **Inter** (die einzige Schrift, die `app/layout.tsx` lädt), Zahlen mit `.cc-num`. Begrüßung 28/36px (Name in Gold) · Kartentitel 13px Versalien 0.12em ·
Wert 17/18px · Meta 14px · Streak-Zahl 44px · Prozent 30px in Text · Nav 15px · Wortmarke 15px 0.32em.

## Radien · Layout

Buttons 8px · Kacheln/Karten 12px · Segmente 4px. Leiste 48px · Sidebar 264px (ab lg) · Main max. 1280px.

## Motion

`--cc-ease: cubic-bezier(0.16, 1, 0.3, 1)`

| Klasse | Einsatz |
|--------|---------|
| `.cc-rise` | Karten steigen beim Laden nacheinander auf |
| `.cc-fill` | Fortschritt/Segmente füllen sich einmal |
| `.cc-card--hero` | atmender Gold-Glow (6s) |
| `.cc-flame` | Streak-Flamme pulsiert |
| `.cc-ping` | Live-Ring |
| `.cc-stars::after` | Sterne funkeln (0.55 → 0.8) |
| `.cc-pulse` | Punkt in der Eyebrow-Pill der Verkaufsseite (2.4s) |
| `.cc-spark` | Lichtfunke an der Sidebar-Kante |
| `.cc-marquee` | Promo-Band mobil |

Alle aus bei `prefers-reduced-motion: reduce`.

## Chakra-Theme (`theme/index.ts`)

| Bereich | Wert |
|---------|------|
| `fonts.heading` / `body` / `mono` | Inter |
| `colors.brand` | Champagner-Palette: `brand.200` = `#E8C094` (= `--cc-gold-light`, Chakra nutzt im Dark Mode meist Stufe 200), `brand.500` = `#D4B080` (= `--cc-gold`), `brand.600` = `#B8935F` |
| `defaultProps` | `Switch`, `Checkbox`, `Radio`, `Progress`, `Slider`, `Tabs` → `colorScheme: "brand"` (kein Chakra-Blau mehr) |
| `Alert` Variante `solid` (Toasts) | Graphit-Panel (`--cc-panel-solid`, Rand `--cc-line-strong`); Icon grün/rot bei `colorScheme` green/red, sonst Champagner |
| `Button` | Varianten `gold` / `line` (siehe [components.md](./components.md)) |
| `shadows.outline` | Fokusring `0 0 0 2px rgba(212,176,128,0.75)` |

## Legacy (nicht für neue Arbeit)

Die `--color-*`-Tokens oben in `app/globals.css` bleiben als **Aliasse** — ihre Werte entsprechen seit der Migration
der v3.2-Palette (z. B. `--color-bg` = `#0f1317`, `--color-accent-gold` = `#d4b080`). `--color-profit` / `--color-loss`
bleiben semantische Journal-Tokens. Neuer Code nutzt `--cc-*`.

Die Klassen `.radley-regular*`, `.jetbrains-mono`, `.dm-sans` setzen nur noch Inter und werden nicht mehr verwendet.
Entfernt: `.glass-card*`, `.welcome-streak-*`, `.appointment-card-*`, `.institut-card-*`.
