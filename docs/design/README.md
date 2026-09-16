# Capital Circle — Design-System v3.2 „Champagner auf Graphit“ (Agent-Referenz)

> **Vor jeder UI-/Style-Arbeit hier starten.** Seit 2026-09 gilt **ein** Schema für Plattform und
> Marketing: Graphitgrund mit Sternenfeld und Champagner-Licht, graphitgraue Glas-Karten mit Gold-Kante,
> eine Schrift (Inter), Champagner-Gold `#D4B080` mit Verlauf und Glow als einziger Akzent, Dashboard-Daten
> in heller Datentinte. Struktur und Farben aus den Kunden-Mockups (Dashboard, Hero, Vergleich, Für wen),
> Look auf Nutzerwunsch mit Gold-Effekten (v3 → v3.1 → v3.2 am 2026-09-13).

## Was ist die Quelle der Wahrheit?

| Ebene | Datei | Zweck |
|-------|-------|-------|
| **Verbindliche Beschreibung** | [`/DESIGN.md`](../../DESIGN.md) | Das Schema: Prinzipien, Tokens, Komponenten, Do/Don't. Im Zweifel gilt DESIGN.md. |
| **Maschinenlesbare Tokens** | [`/DESIGN.json`](../../DESIGN.json) (v3.2.0) | Werte zum Nachschlagen, CSS-Variablen, Regeln. |
| **Implementierung** | `app/globals.css` (`--cc-*`), `theme/index.ts` | Was tatsächlich rendert. |
| **Diese Doku** | `docs/design/*` | Kurze, navigierbare Erklär-Schicht. |

## Stand der Migration

**Abgeschlossen (2026-09-14):** Die gesamte App läuft auf v3.2 — es gibt keine nicht migrierten Bereiche mehr.

| Bereich | Status |
|---------|--------|
| Plattform-Shell (Sidebar, obere Leiste, Drawer, Hintergrund) | ✅ v3.2 |
| Dashboard (`/dashboard`) | ✅ v3.2 (Daten in Datentinte) |
| Institut-Übersicht (`/ausbildung`) und Lernseite (`/ausbildung/[modul]`) | ✅ v3.2 |
| Trading Journal (Home, Dashboard, Trades, Tage), klassisches Journal, Positionsrechner | ✅ v3.2 |
| Live & Events | ✅ v3.2 (Kalender nur in Gold) |
| Ressourcen (Analysen, Wochenaufgabe, Arsenal, Codex, News, Zertifikate) | ✅ v3.2 |
| Konto (Einstellungen, Billing, Checkout, Support, Pending Review) | ✅ v3.2 |
| Marketing/Funnel (`/` Sales-Landing, `/insight`, `/bewerbung`, `/apply`, `/free`, `/survey`) | ✅ v3.2 |
| Auth & Onboarding (`/login`, `/register`, `/einsteig`, `/intro-video`) | ✅ v3.2 |
| Einzelseiten (`/wartung`, `/erfolge`, `/video`, `/termin`, `/discord`) | ✅ v3.2 |
| Admin (`/admin/**`) | ✅ v3.2 |

Entfernt: `GlassCard`, `GlowButton`, `CardLockOverlay`, `PageTransition`, die `.glass-card*`-Klassen und das
Marketing-Metall-Tier. `app/layout.tsx` lädt nur noch Inter (Radley und JetBrains Mono sind raus). Die `--color-*`-Tokens
bleiben nur als Aliasse mit v3.2-Werten. `#D4AF37` kommt nirgends mehr vor — auch die E-Mail-Templates
(`lib/email/layout/`) folgen v3.2.

## Navigationskarte

| Datei | Lies das, wenn du … |
|-------|----------------------|
| [`principles.md`](./principles.md) | … die Regeln brauchst: Gold-Einsatz, Farbe, Typo, Do/Don't. |
| [`tokens.md`](./tokens.md) | … konkrete Werte brauchst (`--cc-*`, Typo-Rollen, Radien, Motion). |
| [`components.md`](./components.md) | … Buttons, Karten, Navigation, Fortschritt baust. |
| [`hero-glass.md`](./hero-glass.md) | **Historisch (v2)** — beschreibt Glass-Klassen, die aus dem Code entfernt sind. Nicht für neue Arbeit. |
| [`funnel-pages.md`](./funnel-pages.md) | **Historisch (v2)** — Funnel-Anatomie (Aufbau, Tracking) ja; die Stilangaben (Metall-Tier, Radley) sind überholt. |

## Quick-Start

1. `DESIGN.md` lesen, dann `principles.md`.
2. Nur `--cc-*`-Variablen, `.cc-card` (+ `.cc-card--hero`) und die Button-Varianten `gold` / `line` verwenden.
3. Karten, Titel, Fortschritt aus `components/platform/dashboard/primitives.tsx` wiederverwenden; für Funnel, Landing,
   Onboarding und Admin die [geteilten Bausteine](./components.md#geteilte-bausteine-aus-der-migration).
4. Keine `--color-*`-Tokens und keine `.radley-*`/`.jetbrains-mono`-Klassen in neuem Code; `GlassCard` gibt es nicht mehr.

## Regeln für Änderungen am System

- Neuer Token: `DESIGN.md` **und** `DESIGN.json` **und** `app/globals.css` synchron halten.
- Neue Webfonts sind nicht vorgesehen (eine Schrift: Inter).
