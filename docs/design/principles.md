# Prinzipien & Stil-Modi

← zurück zum [Index](./README.md)

## Markenphilosophie

**Dark Monochrome mit Gold-Akzent.** Schwarz/Weiß/Grau tragen ~90 % der UI; Metallic-Gold
(`#D4AF37`) tritt nur dort auf, wo **Aktion, Fokus oder Bedeutung** signalisiert werden soll.
Premium, ruhig, klar — kein dekoratives Buntwerk.

- **Stack:** Next.js · Supabase · Chakra UI v2 · Hetzner Object Storage.
- **Primärstil:** Dark Monochrome Minimal mit selektiven Glassmorphism-Akzenten auf Widgets/Modals.
- **Grün & Rot** ausschließlich semantisch (Profit/Loss, Success/Error) — **nie** als Designfarbe.

---

## Die zwei Stil-Modi

Das ist die wichtigste Unterscheidung im ganzen System. Es gibt **zwei bewusst getrennte Welten**:

### 1. Plattform-Modus (Gold-only)

**Wo:** Mitgliederbereich / `app/(platform)/*`, Admin, alles unter `[data-platform]`.

- **Strikt monochrom + Gold.** Gold ist der **einzige** Akzent.
- Gold nur für: primäre CTAs, aktive Nav-Items, Fokus-States, Progress-Bars, selektierte Quiz-Antworten,
  Hero-/Highlight-Karten.
- Glassmorphism nur auf Widgets, Modals, Overlays, Top-/Sidebar — **nie** auf Content-Karten.
- Dies ist der Modus, den `DESIGN.json` `usage_guidelines` beschreibt.

### 2. Marketing-/Funnel-Modus (Metall-Tier)

**Wo:** `/insight`, `/bewerbung`, `app/(marketing)/*`, alle Landing-/Funnel-Pages.

- Bewusst **mehrfarbiges „Metall-Tier"-Schema** zur emotionalen Aufwertung & visuellen Hierarchie:

  | Tier | Farbe | Einsatz |
  |------|-------|---------|
  | **Gold** | `#D4AF37` | höchste Wertigkeit, Haupt-CTA, „Premium" |
  | **Silber** | `#AAC0D8` (blaustichig) | Mittel-Tier, neutrale Stats |
  | **Bronze/Kupfer** | `#CD7F32` / `rgba(184,94,48,…)` | Einstieg/Wärme |
  | **Orange** | `#FF9432` / `rgba(255,148,50,…)` | Energie/Dringlichkeit (Insight-Cards) |
  | **Rot** | `rgba(229,62,62,…)` | Verknappungs-Highlight („EINE EINZIGE CHANCE") |

- **Warum die Abweichung Absicht ist:** Landing-Pages müssen Aufmerksamkeit, Dringlichkeit und
  Tier-Hierarchie transportieren — das reine Gold-only der Plattform wäre zu flach für Conversion.
  Das Schema bleibt aber **diszipliniert**: gedämpfte, metallische Töne auf dunklem Grund, kein Regenbogen.

> **Faustregel:** Baust du etwas im Mitgliederbereich → **Gold-only**. Baust du einen Funnel/Landing →
> **Metall-Tier** erlaubt, aber kontrolliert (siehe [`funnel-pages.md`](./funnel-pages.md)).

---

## Color-Regeln

- 90 % der UI: ausschließlich Background-/Surface-/Text-Tokens (Schwarz/Weiß/Grau).
- Gold = Signalfarbe (Plattform) bzw. höchstes Tier (Marketing).
- Grün/Rot nur semantisch (Profit/Loss, Success/Error) — nie dekorativ.
- Gradients: Gold-auf-Gold (`accentPrimary`) oder Weiß-Transparenz (`surfaceUp`); im Marketing zusätzlich
  metallische Radial-Verläufe pro Tier. **Keine** bunten Multi-Color-Gradients.
- Der Name `--color-accent-blue` / `brand.accentBlue` ist ein **deprecated Legacy-Alias auf Gold** —
  „minimal blau" aus alten Prompts ist **veraltet**. Immer Gold.

## Typografie-Regeln (verbindlich)

| Rolle | Schrift | Einbindung |
|-------|---------|------------|
| Überschriften | **Radley** (serif, 400 + italic) | `.radley-regular` / `.radley-regular-italic`, `h1`–`h6`, Chakra `fonts.heading`, `var(--font-heading)` |
| Fließtext & UI | **Inter** (variable, optical sizing) | `body`, `.inter` (+ `.inter-medium/-semibold/-bold`), Chakra `fonts.body`, `var(--font-body)` |
| Zahlen / Code | **JetBrains Mono** | `.jetbrains-mono`, Chakra `fonts.mono`, `var(--font-mono)` |

- **Alle Zahlen** (Preise, %, Datum, IDs) in JetBrains Mono — ohne Ausnahme.
- Im Mitgliederbereich werden Überschriften per `[data-platform] h1…h6` bewusst auf **Inter** gezwungen
  (siehe `app/globals.css`) — Radley bleibt für Marketing/Hero-Akzente.
- `.dm-sans` = Legacy-Alias für Inter-Body; neues Markup nutzt `.inter`.
- Keine weiteren Schriftfamilien. Neue Webfonts nur mit Anpassung von `DESIGN.json` + `app/layout.tsx`.

## Glassmorphism-Regeln

- Nur auf: StatWidgets, Modals, Overlays, Top-/Sidebar, Hero-/Dashboard-Karten — **nie** auf einfache
  Content-Karten oder Listen.
- `backdrop-filter` immer mit `-webkit-` Prefix; max. `blur(32px)` (Performance).
- Bei `backdrop-filter` `will-change: transform` für GPU-Beschleunigung.

---

## Do / Don't

**Do**
- CSS-Variablen (`--color-*`, `--font-*`) statt hardcoded Werten verwenden, wo vorhanden.
- Hover: `transform: translateY(-1px…-2px)` + Border-/Glow-Änderung.
- Animationen max. ~400 ms, Easing `cubic-bezier(0.16, 1, 0.3, 1)`.
- 4px-Raster strikt einhalten (kein `padding: 15px`).
- `prefers-reduced-motion` respektieren (alle Hero-/Puls-Animationen deaktivieren).
- Bestehende Bausteine wiederverwenden (siehe [README Quick-Start](./README.md#quick-start-neue-funnel-landing-page-bauen)).

**Don't**
- Kein heller Page-Background.
- Kein Glassmorphism auf Content-Karten/Listen.
- Kein `blur() > 32px`.
- Im **Plattform-Modus** keine Farben außer Gold (+ Semantik). Im **Marketing-Modus** keine Töne
  außerhalb der Metall-Tier-Palette.
- Keine Schrift außer Radley / Inter / JetBrains Mono.
- Kein „blau" (deprecated).
