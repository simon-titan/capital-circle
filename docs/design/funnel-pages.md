# Funnel- & Landing-Pages

← zurück zum [Index](./README.md) · Modus: **Marketing/Metall-Tier** (siehe [principles.md](./principles.md))

> Vorlage & Anatomie für neue Funnels. Zwei reale Referenz-Implementierungen:
> **`/insight`** (kurz, Single-Section) und **`/bewerbung`** (Full-Marketing mit Below-Fold).

---

## Generische Funnel-Anatomie

Eine Funnel-Page ist **standalone** (keine Plattform-Chrome) und folgt diesem Muster:

1. **Plattform-Nav/Topbar ausblenden** — per injiziertem `<style>` im Client-Component:
   ```jsx
   <style>{`
     nav[aria-label], header[role="banner"], [data-platform-nav], [data-topbar] { display:none !important; }
     body { padding-top:0 !important; margin-top:0 !important; padding-bottom:120px; }
     @media (min-width:768px){ body{ padding-bottom:0; } }
   `}</style>
   ```
2. **Splash-Overlay** (300 ms): `position:fixed`, `zIndex 9999`, BG `#07080A`, zentriertes `<Logo variant="onDark" />`
   + Gold-Progress-Bar (`linear-gradient(90deg,#A67C00,#D4AF37,#E8C547)`), slidet nach oben weg.
3. **Hintergrund:** dunkler Grund `var(--color-bg-primary, #07080A)` + fixe Radial-Gold-Glows via `_before`.
   Optional BG-Image (`/bg/dashboard.png`) mit dunklem Radial-Overlay.
4. **Gold-Top-Accent** (`2px` Gradient-Linie) am Sektionskopf.
5. **Hero:** Headline (oft mit farbigem Highlight-Span) + `GlassVideoPlayer` (16:9) + Sidebar/CTA.
6. **Metall-Tier-Content-Cards** (Bronze/Silber/Gold rotierend).
7. **Mobile-CTA-Footer** (fester Balken) via `MobileCTAFooter`.
8. **Bewerbungs-Modal** (`FreeApplicationModal` oder `Step2ApplicationModal`), lazy via `next/dynamic`, `ssr:false`.
9. **Footer:** Risiko-Disclaimer + Copyright, sehr gedämpft.
10. **Tracking:** `?ref=`-Param aus URL → `sessionStorage` → `POST /api/tracking/event` (`type: "visit" | "application"`).

### Wiederverwendbare Bausteine

| Baustein | Pfad |
|----------|------|
| Logo | `components/brand/Logo.tsx` (`variant="onDark"`) |
| Video-Player | `components/ui/GlassVideoPlayer.tsx` |
| Mobile-CTA-Balken | `components/landing/MobileCTAFooter.tsx` |
| Gold-CTA-Stil | `goldCtaSx` in `components/landing/InsightLandingPageClient.tsx` |
| Komplettes Marketing-Gerüst | `components/landing/LandingPageClient.tsx` |
| Hero (geteilt) | `components/landing/HeroSection.tsx` |
| Bewerbungs-Modale | `components/marketing/FreeApplicationModal.tsx`, `Step2ApplicationModal.tsx` |
| CTA-/Feature-/Review-Config | `config/landing-config.ts` (`landingConfig`) |
| Gold-Divider | `components/landing/GoldGlowDivider.tsx` |

---

## `/insight` — kurzer Free-Funnel

**Route:** `app/insight/page.tsx` → `components/landing/InsightLandingPageClient.tsx` (eigenständig, kein `LandingPageClient`).

**Aufbau:**
- Splash-Overlay (s. o.).
- **Main-Section** mit BG-Image `/bg/dashboard.png` + Radial-Overlay + Gold-Top-Accent.
  - **H1** mit Rot-Highlight-Box: „Du hast nur diese **EINE EINZIGE CHANCE.**"
    (`rgba(229,62,62,0.18)` BG, Border `0.30`).
  - **2-Spalten-Grid** (`1fr 340px` ab `md`): links `GlassVideoPlayer` (`NEXT_PUBLIC_FREE_FUNNEL_VIDEO_URL`,
    `autoPlay`, Overlay-CTA bei `onEnded`), rechts sticky **`SidebarCard`**.
  - **`SidebarCard`:** Logo + 2×2-Stat-Grid (Tier-Muster **Gold/Silber/Silber/Gold**:
    „5 Jahre Erfahrung", „6-stellige Payouts", „1000+ Trader", „Vollzeit Trader") + goldener CTA (`goldCtaSx`) + Trust-Text.
- **Content-Cards-Section:** 3 `INSIGHT_CARDS` (mobil horizontal-scroll/snap, Desktop 3er-Grid),
  Themes aus `CARD_THEMES` = **Orange / Silber-Blau / Gold**; jede Karte mit Icon-Bubble, Bullet-Box, „Jetzt bewerben"-Link.
- **Footer:** Disclaimer + Copyright.
- **Modal:** `FreeApplicationModal` (kein Below-Fold, keine Lazy-Sektionen).

**Charakter:** Schnell, single-screen-fokussiert, ein klares CTA-Ziel (Free-Bewerbung).

---

## `/bewerbung` — High-Ticket Step-2-Funnel

**Route:** `app/bewerbung/page.tsx` → `components/landing/LandingPageClient.tsx`.
**Geschützt:** nur approved Free-Nutzer (Zugang via `proxy.ts`).

**Props an `LandingPageClient`:**
```tsx
<LandingPageClient
  useStep2Modal                 // Step2ApplicationModal (11 Fragen) statt FreeApplicationModal
  funnelVideoSrc={NEXT_PUBLIC_STEP2_BEWERBUNG_VIDEO_URL}
  landingSlug="bewerbung"       // ReviewSection lädt Reviews per API
  ctaOverrides={{
    primary: "ZUGANG BEANTRAGEN",
    secondary: "Bist du dir sicher dass du dir diese Möglichkeit verdient hast?",
    videoEndedLabel: "ZUGANG BEANTRAGEN",
    trustLine: null,
    subheadline: "Bewirb dich für einen der {exklusiven} Plätze …",   // {…} = Gold-Highlight-Tokens
  }}
/>
```

**Aufbau (`LandingPageClient`):**
- Splash-Overlay + `MobileCTAFooter`.
- **Above-fold:** `HeroSection` (Logo, Headline mit `{…}`-Gold-Highlights, `GlassVideoPlayer`,
  Feature-Cards im **Bronze/Silber/Gold**-Schema via `CARD_STYLES`, CTA).
- **Below-fold (lazy via `next/dynamic`, mit Skeleton-`Box`):** `ReviewSection` → `CasesSection` →
  `FounderSection` → `StatsAndTargetSection`, getrennt durch `GoldGlowDivider`.
- **Modal:** `Step2ApplicationModal` (11 Fragen), `ssr:false`.
- `openModal()` öffnet bei `useStep2Modal` direkt das Modal (sonst Scroll zum Inline-Step2).

**Charakter:** Vollwertige Marketing-Story (Hero → Social Proof → Cases → Founder → Stats),
höhere Verbindlichkeit, Tier-Hierarchie über Bronze/Silber/Gold.

---

## Checkliste: neue Funnel-Variante

1. **Vorlage wählen:** kurz → `/insight`-Muster; Full-Story → `/bewerbung` via `LandingPageClient` + `ctaOverrides`.
2. Standalone-Setup: Nav ausblenden, Splash, BG-Glows, Mobile-CTA-Footer.
3. **Metall-Tier** statt Gold-only; Palette aus [tokens.md](./tokens.md) einhalten.
4. Video aus eigener `NEXT_PUBLIC_*_VIDEO_URL`-Env; Fallback-Platzhalter vorsehen.
5. `goldCtaSx` für den Haupt-CTA wiederverwenden.
6. Passendes Modal wählen (`FreeApplicationModal` vs `Step2ApplicationModal`).
7. `landingSlug` setzen + Tracking (`?ref=` → `/api/tracking/event`) verdrahten.
8. Texte/Reviews/Features über `config/landing-config.ts` pflegen, nicht hardcoden.
9. Below-Fold-Sektionen lazy laden (`next/dynamic`) für Performance.
10. `prefers-reduced-motion` & Mobile-Scroll-Snap testen.
