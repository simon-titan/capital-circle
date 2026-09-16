# Prinzipien (v3.2 „Champagner auf Graphit“)

← zurück zum [Index](./README.md) · verbindlich: [`DESIGN.md`](../../DESIGN.md)

## Haltung

Struktur, Inhalte und seit v3.2 auch die Farben kommen aus den Kunden-Mockups (Sidebar, Raster, „Was ist jetzt
dran?“). Der Look ist **Champagner auf Graphit**: Graphitgrund mit Sternenfeld und Champagner-Licht, graphitgraue
Glas-Karten mit Gold-Kante, Gold mit Verlauf und Glow für Aktion und Hervorhebung. Das rein flache v3 war dem Nutzer
zu langweilig (2026-09-13) — nicht wieder wegminimieren.

- Grund: Graphit (`--cc-bg`), Sternenfeld (`.cc-stars`) + weicher Champagner-Schein (`.cc-goldlight`).
- Karten: graphitgraues Glas (94 %) mit Blur, feiner Rahmen, Gold-Kante oben, Schatten; Hover hebt an und glüht leicht gold.
- Hero-Karte („Weiter wo du warst“): Gold-Rahmen, Gold-Schein, atmender Glow.
- Eine Schrift: **Inter** — Überschriften, UI, Zahlen (tabellarische Ziffern, `.cc-num`).
- Ein Schema für Plattform **und** Marketing. Das Metall-Tier (Bronze/Silber/Orange) ist abgelöst.

## Gold (Champagner #D4B080) — der einzige Akzent

| Einsatz | Form |
|---------|------|
| Hauptaktionen (Weiterlernen, Beitreten, Jetzt bewerben) | `variant="gold"` — Verlauf, Glow, Hover-Lift |
| Fortschritt außerhalb der Dashboard-Daten (Lernseite, Institut) | Gold-Balken mit leichtem Glow |
| Name in der Begrüßung, Hero-Kartentitel | `--cc-gold-light` |
| Aktiver Navigationspunkt | Gold-Verlauf-Wash, Gold-Linie, Glow |
| Live | Gold-Punkt, bei laufender Session mit Ring (`.cc-ping`) |
| Sekundäre Aktionen | `variant="line"` — Haarlinie, Hover mit Gold-Kante |

**Datentinte statt Gold für Dashboard-Daten** (wie im Kunden-Mockup): Weiterlernen-Balken (`ProgressBar tone="ink"`),
Fortschrittssegmente und Streak-Haken in `--cc-ink` (hellgrau), die Prozentzahl in `--cc-text`, Icon-Kacheln neutral.

Einzige Ausnahme vom Gold: die warme Streak-Flamme (Orange→Champagner). Grün/Rot nur semantisch.

## Bewegung

Karten steigen beim Laden nacheinander auf (`.cc-rise`), Fortschritt füllt sich (`.cc-fill`), die Hero-Karte atmet,
die Flamme pulsiert, Sterne funkeln, ein Lichtfunke wandert an der Sidebar-Kante. Alles aus bei `prefers-reduced-motion`.

## Do / Don't

**Do**
- `.cc-card` (+ `--hero`) und die Primitives aus `components/platform/dashboard/primitives.tsx` nutzen.
- Gold über die Tokens (`--cc-gold*`, `--cc-gold-grad`, `--cc-gold-bar`) statt Einzelwerten.
- Gesperrte Inhalte ehrlich benennen (`LockedNote`).
- Browser-Oberflächen mitgestalten: Auswahl, Caret, Scrollbar, `:focus-visible` (gold).

**Don't**
- Keine zweite Schrift (Radley, JetBrains Mono sind entfernt; geladen wird nur Inter).
- Keine weiteren Akzentfarben neben Gold; kein Bronze/Silber/Orange (außer der Streak-Flamme).
- Kein `#D4AF37` — das gelbere Brand-Gold ist aus der App entfernt.
- Dashboard-Daten und Icon-Kacheln nicht wieder vergolden.
- Kein Verlaufstext (Gradient auf Schrift) — Betonung über Farbe/Gewicht.
- Kein `GlassCard`/`.glass-card*` — beide sind entfernt, `.cc-card` ersetzt sie.
- Kein heller Hintergrund.
