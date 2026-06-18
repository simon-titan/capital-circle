# Komponenten

← zurück zum [Index](./README.md) · Werte-Quelle: [`DESIGN.json`](../../DESIGN.json) `components.*`

> Spezifikationen distilliert aus `DESIGN.json`, ergänzt um die **real existierenden** Helfer im Code.
> Bevorzugt vorhandene Komponenten/Klassen nutzen statt neu bauen.

## Button

Basis: `font-body`, `14px`, `weight 500`, `radius 10px`, `transition all 150ms cubic-bezier(0.16,1,0.3,1)`,
`inline-flex`, `gap 8px`.

**Sizes:** `xs 28h/12px` · `sm 34h/13px` · `md 40h/14px` · `lg 48h/15px` · `xl 56h/16px`.

**Varianten:**
| Variante | Kurz |
|----------|------|
| **primary** | Gold-Gradient `linear-gradient(135deg,#D4AF37,#A67C00)`, weiße Schrift, Gold-Glow. Einziger farbiger Button. |
| **secondary** | `rgba(255,255,255,0.06)`, Border `0.09`, hellt bei Hover auf. |
| **ghost** | transparent, Text `#9A9AA4` → `#F0F0F2` bei Hover. |
| **outline** | transparent, Gold-Border `0.40`, Text Gold. |
| **danger** | `rgba(239,68,68,0.10)`, roter Text/Border. |
| **white** | `rgba(255,255,255,0.09)`, blur(8px). |

**States:** `disabled` opacity 0.30 / `not-allowed`; `loading` opacity 0.65.

**Marketing-CTA (Code):** Der goldene Funnel-Button ist als `goldCtaSx` in
`components/landing/InsightLandingPageClient.tsx` definiert — Gradient `135deg #E8C547→#D4AF37→#A67C00`,
Glow + Hover-Lift. Für neue Funnel-CTAs wiederverwenden.

## Card

Basis: `rgba(255,255,255,0.04)`, blur(16px), Border `0.08`, `radius 16px`, `padding 20px`,
`shadow card`. Varianten: `default`, `flat` (kein Glass), `elevated`, `interactive` (Hover-Lift `-2px`),
`accentBorder` (Gold-Rahmen, sparsam), `locked` (opacity 0.40, grayscale).

**Real im Code:** [`components/ui/GlassCard.tsx`](../../components/ui/GlassCard.tsx) —
`<GlassCard />` mit Boolean-Props:
| Prop | Klasse | Einsatz |
|------|--------|---------|
| (default) | `.glass-card` | Standard-Glass-Karte |
| `highlight` | `.glass-card-highlight` | Dashboard, höhere Deckkraft + Gold-Linie |
| `spotlight` | `.glass-card-spotlight` | Hausaufgabe/Events, extra betont |
| `hero` | `.glass-card-hero` | Welcome-Hero (siehe [hero-glass.md](./hero-glass.md)) |
| `dashboard` | `.glass-card-dashboard` | Hero-Subcard-Familie (Rings/Lernzeit) |

## Input

`rgba(255,255,255,0.04)`, Border `0.09`, `radius 10px`, `40px` Höhe, Text `#F0F0F2`,
Placeholder `#3A3A40`. **Focus:** Gold-Border `0.65` + `0 0 0 3px rgba(212,175,55,0.12)`.
Error/Success analog mit Rot/Grün. Chakra: `focusBorderColor="brand.500"`.

## Badge

`11px`, `weight 500`, `radius 6px`, `padding 3px 8px`. Varianten:
`default` (grau), `gold`, `success`, `error`, `warning`, `white`, `locked`, `new` (Gold, Pill).

## ProgressBar

Track `#1A1B1F`, `radius full`. Fill: `linear-gradient(90deg,#A67C00,#D4AF37)` + Gold-Glow,
`transition width 600ms`. Sizes `xs 3 / sm 5 / md 8 / lg 12` px. Varianten: `default` (gold),
`mono` (weiß, kein Glow), `success`, `quiz` (3px).

## Modal

Overlay `rgba(0,0,0,0.75)` + blur(4px), `zIndex 100`. Container `rgba(10,11,14,0.96)`,
blur(32px), Border `0.09`, `radius 24px`, `padding 32px`, `maxWidth 520px`.
**Codex-Acceptance-Flow:** Sonderfall, nicht überspringbar, `zIndex 9999`, Gold-Scrollbar.

## StatWidget

`rgba(20,21,25,0.82)`, blur(20px) saturate(1.6), Border `0.09`, `radius 20px`, `padding 18px 20px`.
Label: `11px`, uppercase, `letter-spacing 0.08em`, `#606068`. Value: **JetBrains Mono**, `28px`,
`weight 700`. Change: grün/rot/neutral, Mono `12px`. (Genutzt u.a. in `components/admin/AnalyticsDashboard.tsx`.)

## Navigation

- **Sidebar:** `240px` (collapsed `64px`), `rgba(7,8,10,0.96)` blur(20px), Border-right `0.06`.
- **Item:** `40px`, `radius 10px`. Active: `rgba(212,175,55,0.10)`, Text `#E8C547`, `border-left 2px #D4AF37`.
- **Topbar:** `64px`, `rgba(7,8,10,0.92)` blur(20px), Border-bottom `0.06`.

## Admin-Table

Container `#0C0D10`, Border `0.07`, `radius 12px`. Header: `11px` uppercase `#3A3A40`,
`rgba(255,255,255,0.02)`. Row-Hover `rgba(255,255,255,0.03)`. Cell `14px` `#9A9AA4`.

## Iconography

**Library:** `lucide-react`. Stroke: `default 1.5` (thin 1.25 / bold 2.0).
Sizes: `xs 14 · sm 16 · md 20 · lg 24 · xl 32 · 2xl 48` px.
Semantik-Mapping siehe `DESIGN.json iconography.semantic` (z. B. `lock → Lock`, `complete → CheckCircle2`).

## Skeleton / Toast

- **Skeleton:** `rgba(255,255,255,0.05)`, `radius 6px`, `shimmer 1.8s` Gradient-Sweep.
- **Toast:** `rgba(18,19,24,0.96)` blur(16px), `radius 12px`, farbiger `border-left 3px`
  je nach success/error/warning/info (info = Gold).
