# Tokens (Reality-Check: Spec ↔ Code)

← zurück zum [Index](./README.md)

> Diese Datei nennt die **tatsächlich geltenden** Werte. `DESIGN.json` ist die idealisierte Spec
> und weicht an den unten markierten Stellen vom Code ab. **Im Zweifel gilt der Code**
> (`app/globals.css :root` + `theme/index.ts`).

## ⚠️ Bekannte Abweichungen Spec ↔ Code

| Thema | `DESIGN.json` (Spec) | Real im Code | Hinweis |
|-------|----------------------|--------------|---------|
| Primär-Hintergrund | `--color-bg-primary: #07080A` | `--color-bg: #080808` (globals.css), `brand.bg: #080808` (theme) | **Zwei Namen, zwei Werte.** Plattform-`body` rendert `#080808`. |
| Token-Name BG | `--color-bg-primary` | existiert **nicht** in `:root` | Landing-Komponenten nutzen `var(--color-bg-primary, #07080A)` → greift **immer** den Fallback `#07080A`. |
| Text primär | `#F0F0F2` | `--color-text-primary: #f0f0f0` | minimale Differenz; Landing nutzt Fallback `#F0F0F2`. |
| Akzent-Alias | `accent.gold.*` | `--color-accent-blue: #d4af37` + `brand.accentBlue` | **Legacy-Alias auf Gold**, `@deprecated`. Nicht für Neues nutzen. |
| `--color-text-secondary` | `#9A9AA4` | **nicht** in `:root` definiert | Wird in CSS (`.article-body` etc.) genutzt → Fallback/Vererbung. Bei Bedarf ergänzen. |

> **Praxisregel:** In neuem Code, der sowohl auf Plattform als auch Landing laufen kann,
> immer mit Fallback schreiben: `var(--color-bg, #080808)` bzw. `var(--color-text-primary, #F0F0F2)`.

---

## Farben

### Real definiert in `app/globals.css :root`

```css
--color-bg: #080808;
--color-bg-secondary: #0f0f0f;
--color-surface: rgba(255, 255, 255, 0.04);
--color-border: rgba(255, 255, 255, 0.08);
--color-text-primary: #f0f0f0;
--color-text-muted: rgba(255, 255, 255, 0.4);
--color-accent-blue: #d4af37;   /* @deprecated Legacy-Alias auf Gold */
--color-accent-gold: #d4af37;
--color-accent-gold-light: #e8c547;
--color-accent-gold-dark: #a67c00;
--color-accent-glow: rgba(212, 175, 55, 0.28);
--color-white: #ffffff;
```

### Gold-Skala (verbindlich, aus `DESIGN.json` / `theme.brand`)

| Stop | Hex | Rolle |
|------|-----|-------|
| 50 | `#FFFBEB` | hellster Tint |
| 100 | `#FEF3C7` | |
| 200 | `#FDE68A` | |
| 300 | `#FCD34D` | |
| 400 | `#E8C547` | `gold.light` — Hover/Highlight |
| **500** | **`#D4AF37`** | **`gold.DEFAULT` — Standard-Akzent** |
| 600 | `#B8860B` | |
| 700 | `#A67C00` | `gold.dark` — Gradient-Tiefe (theme), in DESIGN.json `#92400E` |
| 800 | `#92400E` | |
| 900 | `#78350F` | |

> Hinweis: `theme/index.ts` setzt `brand.700 = #A67C00`, `DESIGN.json chakraUI.colors.brand.700 = #A67C00`,
> aber `colors.accent.gold.700 = #92400E`. Für **Gradients** gilt die dunkle Tiefe `#A67C00`
> (siehe `goldCtaSx`, Progress-Fill, Button primary).

### Marketing-Metall-Tier (nur Funnel/Landing)

```
Gold    #D4AF37   (rgba(212,175,55,…))
Silber  #AAC0D8   (rgba(180,195,220,…) Border, rgba(180,200,230,…) Glow)
Bronze  #CD7F32   (rgba(184,94,48,…))
Orange  #FF9432   (rgba(255,148,50,…))
Rot     —         (rgba(229,62,62,…)  Verknappungs-Highlight)
```

### Semantik (nur funktional)

| Rolle | DEFAULT | Text | Subtle |
|-------|---------|------|--------|
| success / profit | `#22C55E` | `#4ADE80` | `rgba(34,197,94,0.10)` |
| error / loss | `#EF4444` | `#F87171` | `rgba(239,68,68,0.10)` |
| warning | `#EAB308` | `#FDE047` | `rgba(234,179,8,0.10)` |

---

## Typografie

```css
--font-heading: "Radley", serif;
--font-body:    "Inter", sans-serif;   /* theme: 'Inter', system-ui, sans-serif */
--font-mono:    "JetBrains Mono", monospace;
```

**CSS-Klassen (in `app/globals.css`):** `.radley-regular`, `.radley-regular-italic`,
`.inter`, `.inter-medium` (500), `.inter-semibold` (600), `.inter-bold` (700),
`.jetbrains-mono`, `.dm-sans` (Legacy = Inter).

**CDN (`app/layout.tsx`):**
- `Radley:ital@0;1`
- `Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900`
- `JetBrains+Mono:wght@400;500;700`

**Skala (aus DESIGN.json `typography.scale`):** `xs 11` · `sm 13` · `base 15` · `md 16` ·
`lg 18` · `xl 20` · `2xl 24` · `3xl 30` · `4xl 36` · `5xl 48` · `6xl 64` (px).

---

## Spacing (4px-Raster)

`0` · `4` · `8` · `12` · `16` · `20` · `24` · `28` · `32` · `40` · `48` · `56` · `64` · `80` · `96` · `128` (px).

Layout-Konstanten (DESIGN.json `spacing.layout`): `navHeight 64`, `sidebarWidth 240`
(collapsed `64`), `contentMaxWidth 1280`, `moduleMaxWidth 860`, `adminMaxWidth 1440`,
`cardPadding 20`, `sectionVerticalSpacing 80`.

## Radii

```
sm 6 · DEFAULT 10 · md 12 · lg 16 · xl 20 · 2xl 24 · 3xl 32 · full 9999
```
Semantisch: `card 16` · `widget 20` · `button 10` · `input 10` · `badge 6` · `modal 24`.

> **Code-Realität:** `theme/index.ts` radii = `card 12 / button 8 / modal 24`
> (weicht von DESIGN.json `card 16 / button 10` ab). Chakra-Komponenten nutzen die theme-Werte.

## Shadows

```
sm      0 1px 3px rgba(0,0,0,.50)
DEFAULT 0 4px 12px rgba(0,0,0,.60)
md      0 8px 24px rgba(0,0,0,.60)
lg      0 16px 48px rgba(0,0,0,.70)
card    0 4px 16px rgba(0,0,0,.60), inset 0 1px 0 rgba(255,255,255,.05)
glass   0 8px 32px rgba(0,0,0,.50), inset 0 1px 0 rgba(255,255,255,.07)
glow.gold 0 0 24px rgba(212,175,55,.22), 0 0 8px rgba(212,175,55,.12)
```

## Motion

```
duration: instant 80 · fast 150 · base 220 · slow 350 · enter 400 · page 500 (ms)
easing.default: cubic-bezier(0.16, 1, 0.3, 1)   ← Standard für fast alles
easing.spring:  cubic-bezier(0.34, 1.56, 0.64, 1)
easing.smooth:  cubic-bezier(0.4, 0, 0.2, 1)
```

Page-Transition (Framer): `{opacity, y:6}` → `{opacity:1, y:0}`, `duration 0.30`, ease `[0.16,1,0.3,1]`.

---

## Regel für neue Tokens

Neuer Token = **drei Orte synchron** halten:
1. `DESIGN.json` (Spec/SSOT)
2. `app/globals.css` `:root` und/oder `theme/index.ts` (Implementierung)
3. Diese Datei (`tokens.md`) — inkl. Eintrag in die Abweichungs-Tabelle, falls Spec ≠ Code.
