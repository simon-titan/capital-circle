# Capital Circle — Design-System (Agent-Referenz)

> **Vor jeder UI-/Style-Arbeit hier starten.** Diese Doku ist die navigierbare
> Erklär-Schicht über den Design-Tokens. Sie sorgt dafür, dass neue Funnels, Landing-Pages
> und Plattform-Features ohne erneuten Kontext-Dump konsistent gebaut werden.

## Was ist die Quelle der Wahrheit?

| Ebene | Datei | Zweck |
|-------|-------|-------|
| **Maschinenlesbare Tokens (SSOT)** | [`/DESIGN.json`](../../DESIGN.json) | Vollständige, idealisierte Spec: Farben, Spacing, Komponenten-Tokens, Chakra-Mapping, CSS-Variablen. Werte hier nachschlagen. |
| **Navigierbare Erklär-Schicht** | `docs/design/*` (diese Doku) | Wie das System *tatsächlich* gebaut ist, die zwei Stil-Modi, Page-Muster, Abweichungen Spec↔Code. |

> ⚠️ **Wichtig:** `DESIGN.json` ist die **Spec/Aspiration** und weicht an einigen Stellen vom
> *real implementierten* Code ab. Welche Werte wirklich gelten, steht in
> [`tokens.md`](./tokens.md) (Reconciliation-Tabelle). Im Zweifel gilt der Code.

## Die zwei Modi (zentral!)

Das Repo hat **zwei bewusst unterschiedliche Stil-Welten**:

1. **Plattform** (Mitgliederbereich, `[data-platform]`) — strikt **Gold-only**: Schwarz/Weiß/Grau
   tragen 90 % der UI, Gold (`#D4AF37`) ist der **einzige** Akzent.
2. **Marketing / Funnel** (`/insight`, `/bewerbung`, `(marketing)`) — bewusstes
   **„Metall-Tier"-Schema**: Bronze/Silber/Gold (+ Orange/Rot-Highlights) für emotionale,
   conversion-orientierte Landing-Pages.

Details & Wann-was: [`principles.md`](./principles.md).

## Navigationskarte

| Datei | Lies das, wenn du … |
|-------|----------------------|
| [`principles.md`](./principles.md) | … die Philosophie, die zwei Modi und die Color-/Typo-/Glass-Regeln + Do/Don't brauchst. |
| [`tokens.md`](./tokens.md) | … konkrete Werte brauchst (Farben, Fonts, Spacing, Radii, Shadows, Motion) — inkl. Abweichungen Spec↔Code. |
| [`components.md`](./components.md) | … Buttons, Cards, Inputs, Badges, Modals, StatWidgets etc. baust. |
| [`hero-glass.md`](./hero-glass.md) | … den Hero-/Glassmorphism-Look (`.glass-card-hero`, `.glass-card-dashboard`) reproduzierst. |
| [`funnel-pages.md`](./funnel-pages.md) | … eine neue Landing-/Funnel-Page baust (Anatomie + `/insight` & `/bewerbung` als Vorlage). |

## Quick-Start: Neue Funnel-/Landing-Page bauen

1. **`principles.md`** lesen → Modus wählen (fast immer **Marketing/Metall-Tier**).
2. **`tokens.md`** → echte Farb-/Font-/Spacing-Werte.
3. **`funnel-pages.md`** → Anatomie kopieren; `/insight` (kurz, Single-Section) oder `/bewerbung`
   (Full-Marketing mit Below-Fold-Sektionen) als Vorlage.
4. **Bestehende Bausteine wiederverwenden statt neu bauen:**
   - `components/brand/Logo.tsx` — `<Logo variant="onDark" />`
   - `components/ui/GlassVideoPlayer.tsx` — Funnel-Video (16:9, Glass-Rahmen)
   - `components/ui/GlassCard.tsx` — `<GlassCard hero|dashboard|highlight|spotlight />`
   - `components/landing/MobileCTAFooter.tsx` — fester Mobile-CTA-Balken
   - `components/landing/LandingPageClient.tsx` — komplettes Marketing-Gerüst (Hero+Below-Fold)
   - `components/marketing/FreeApplicationModal.tsx` / `Step2ApplicationModal.tsx` — Bewerbungs-Funnel
   - `goldCtaSx` (in `InsightLandingPageClient.tsx`) — der goldene CTA-Button-Stil
   - `config/landing-config.ts` (`landingConfig`) — CTA-Texte, Features, Reviews
5. **Tracking** nicht vergessen: `?ref=`-Param → `/api/tracking/event` (Visit/Application).

## Regeln für Änderungen am System

- Neue **Tokens**: in `DESIGN.json` **und** in `app/globals.css` (`:root`) / `theme/index.ts` spiegeln —
  und [`tokens.md`](./tokens.md) aktualisieren.
- Neue **Webfonts**: zusätzlich `app/layout.tsx` (Font-`<link>`) anpassen.
- Diese Doku ist die Referenz — bei strukturellen Stil-Entscheidungen hier dokumentieren.
