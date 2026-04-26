# BLUEPRINT: Standard Landing Page

Dieser Prompt erstellt eine vollständige Next.js Landing Page nach dem bewährten SNT-Aufbau.
Alle Sections, die Reihenfolge und die Mobile-Pricing-Footer Logik werden exakt reproduziert.
Inhalte sind bewusst als Platzhalter gehalten -- du ersetzt sie projektbasiert.

---

## SCHRITT 1: Konfiguration (PFLICHTANGABEN)

Bevor du den Prompt absendest, fülle die folgenden Variablen aus.
Der Agent wird diese Werte in jeder Section und im Footer verwenden.

```
PRODUKT_TYP: "[Was wird beworben? z.B. Mitgliedschaft / Online-Kurs / Coaching-Programm / Bewerbungsprozess / Software / Community]"
PRODUKT_NAME: "[Name des Produkts, z.B. 'XYZ Premium' / 'Das Mentorship' / 'Die Academy']"
PREIS_MODELL: "[paid | free]"
  → paid  = Preisauswahl (monatlich/quartalsweise/jährlich) + PayPal + Checkout Modal
  → free  = Einfacher Anmelde-CTA, kein Preis
PREISE_PAID:
  monatlich: "[z.B. 47]"        (nur relevant wenn PREIS_MODELL=paid)
  quarterly: "[z.B. 127]"       (nur relevant wenn PREIS_MODELL=paid)
  jaehrlich: "[z.B. 367]"       (nur relevant wenn PREIS_MODELL=paid)
MARKENFARBE: "[Primärfarbe als HEX, z.B. #068CEF]"
BRAND_NAME: "[Dein Markenname, z.B. 'SNTTRADES']"
VIDEO_ID: "[Vimeo Video-ID oder Platzhalter 'PLACEHOLDER_VIDEO_ID']"
```

---

## SCHRITT 2: Der Prompt

Kopiere alles ab hier und sende es an den AI-Agenten deiner Wahl.
Ersetze vorher alle `[VARIABLE]`-Platzhalter mit deinen Werten aus Schritt 1.

---

```
Erstelle eine vollständige Next.js 15+ Landing Page (App Router, TypeScript) mit Chakra UI v3,
@emotion/react für Keyframes und @phosphor-icons/react für Icons.

Die Seite bewirbt: [PRODUKT_TYP] namens "[PRODUKT_NAME]".
Preismodell: [PREIS_MODELL]
Primärfarbe (BRAND_COLOR): [MARKENFARBE]
Markenname: [BRAND_NAME]

Erstelle folgende Dateien:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 1: config/blueprint-config.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Enthält alle konfigurierbaren Werte der Landing Page:

export const blueprintConfig = {
  brand: {
    name: "[BRAND_NAME]",
    color: "[MARKENFARBE]",
    tagline: "[PLATZHALTER: Dein Claim in 5-8 Wörtern]",
  },
  product: {
    type: "[PRODUKT_TYP]",
    name: "[PRODUKT_NAME]",
    headline: "[PLATZHALTER: Die Haupt-Überschrift der Page (max. 10 Wörter)]",
    subheadline: "[PLATZHALTER: Ein Satz der den Nutzen erklärt]",
    videoId: "[VIDEO_ID]",
    priceModel: "[PREIS_MODELL]" as "paid" | "free",
  },
  pricing: {
    // Nur relevant wenn priceModel === "paid"
    monthly: { price: [PREIS_MONATLICH], label: "Pro Monat" },
    quarterly: { price: [PREIS_QUARTERLY], label: "Pro Quartal" },
    annual: { price: [PREIS_JAEHRLICH], label: "Pro Jahr" },
  },
  features: [
    // "Was du bekommst" - 4-6 Feature-Einträge mit Icon-Name (Phosphor), label, detail
    { icon: "VideoCamera", label: "[PLATZHALTER Feature 1]", detail: "[Kurzdetail oder null]" },
    { icon: "ChartLineUp", label: "[PLATZHALTER Feature 2]", detail: null },
    { icon: "Users",       label: "[PLATZHALTER Feature 3]", detail: null },
    { icon: "BookOpen",    label: "[PLATZHALTER Feature 4]", detail: null },
    { icon: "Trophy",      label: "[PLATZHALTER Feature 5]", detail: null },
  ],
  founder: {
    image: "/placeholder-founder.jpg",
    name: "[PLATZHALTER: Name des Gründers / Creators]",
    subtitle: "MEET THE FOUNDER",
    bio: [
      "[PLATZHALTER: Erster Absatz der Founder-Story]",
      "[PLATZHALTER: Zweiter Absatz]",
      "[PLATZHALTER: Dritter Absatz]",
    ],
    achievements: [
      "[PLATZHALTER Achievement 1]",
      "[PLATZHALTER Achievement 2]",
      "[PLATZHALTER Achievement 3]",
      "[PLATZHALTER Achievement 4]",
    ],
    checklist: [
      "[PLATZHALTER Expertise 1]",
      "[PLATZHALTER Expertise 2]",
      "[PLATZHALTER Expertise 3]",
      "[PLATZHALTER Expertise 4]",
    ],
    socialLinks: {
      instagram: "#",
      tiktok: "#",
    },
  },
  stats: [
    { value: "X+",    suffix: "+", label: "[PLATZHALTER Stat 1, z.B. JAHRE ERFAHRUNG]" },
    { value: "X.000+",suffix: "+", label: "[PLATZHALTER Stat 2, z.B. ZUFRIEDENE KUNDEN]" },
    { value: "Xk+",   suffix: "k+",label: "[PLATZHALTER Stat 3, z.B. FOLLOWER]" },
    { value: "X+",    suffix: "+", label: "[PLATZHALTER Stat 4, z.B. ABSCHLÜSSE]" },
  ],
  phases: [
    {
      label: "PHASE 1",
      title: "[PLATZHALTER Phase 1 Titel]",
      description: "[PLATZHALTER Phase 1 Beschreibung, 2-3 Sätze]",
      bullets: ["[Bullet 1]", "[Bullet 2]", "[Bullet 3]"],
      image: "/placeholder-phase1.jpg",
    },
    {
      label: "PHASE 2",
      title: "[PLATZHALTER Phase 2 Titel]",
      description: "[PLATZHALTER Phase 2 Beschreibung]",
      bullets: ["[Bullet 1]", "[Bullet 2]", "[Bullet 3]"],
      image: "/placeholder-phase2.jpg",
    },
    {
      label: "PHASE 3",
      title: "[PLATZHALTER Phase 3 Titel]",
      description: "[PLATZHALTER Phase 3 Beschreibung]",
      bullets: ["[Bullet 1]", "[Bullet 2]", "[Bullet 3]"],
      image: "/placeholder-phase3.jpg",
    },
  ],
  targetGroups: [
    {
      iconName: "Student",
      title: "[PLATZHALTER Zielgruppe 1 Titel]",
      description: "[PLATZHALTER Zielgruppe 1 Beschreibung]",
      cta: "[PLATZHALTER CTA Text]",
    },
    {
      iconName: "TrendUp",
      title: "[PLATZHALTER Zielgruppe 2 Titel]",
      description: "[PLATZHALTER Zielgruppe 2 Beschreibung]",
      cta: "[PLATZHALTER CTA Text]",
    },
    {
      iconName: "Trophy",
      title: "[PLATZHALTER Zielgruppe 3 Titel]",
      description: "[PLATZHALTER Zielgruppe 3 Beschreibung]",
      cta: "[PLATZHALTER CTA Text]",
    },
  ],
  reviews: [
    {
      name: "Max M.",
      rating: 5,
      title: "[PLATZHALTER Review Titel 1]",
      text: "[PLATZHALTER Review Text 1 - mindestens 3 Sätze]",
      date: "April 2026",
    },
    {
      name: "Laura K.",
      rating: 5,
      title: "[PLATZHALTER Review Titel 2]",
      text: "[PLATZHALTER Review Text 2]",
      date: "April 2026",
    },
    {
      name: "Tim S.",
      rating: 4,
      title: "[PLATZHALTER Review Titel 3]",
      text: "[PLATZHALTER Review Text 3]",
      date: "März 2026",
    },
    {
      name: "Sarah W.",
      rating: 5,
      title: "[PLATZHALTER Review Titel 4]",
      text: "[PLATZHALTER Review Text 4]",
      date: "März 2026",
    },
  ],
  cta: {
    paid: "JETZT SICHER ZUR KASSE",
    free: "KOSTENLOS ANMELDEN",
  },
};


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 2: app/landing/page.tsx  (oder app/[deine-route]/page.tsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Importiert alle Section-Komponenten und rendert sie in folgender EXAKTER REIHENFOLGE:

1. <MobileCTAFooter />              ← IMMER zuerst (fixed, über allem)
2. <HeroSection />                  ← Hero: Video + Titel + Details + Pricing (Desktop)
3. <GlowDivider />                  ← Blauer Glow-Trenner
4. <ReviewSection />                ← Kundenbewertungen mit Rating-Übersicht
5. <GlowDivider />                  ← Blauer Glow-Trenner
6. <FounderSection />               ← Meet the Founder
7. <StatsAndTargetSection />        ← Animierte Stats + Zielgruppen-Karten
8. <GlowDivider />                  ← Blauer Glow-Trenner
9. <PhasesSection />                ← 3 Phasen-Karten (So funktioniert's)

Das Page-File enthält außerdem folgenden Inline-Style-Block (JSX):
- Navbar/Header auf dieser Seite ausblenden (display: none)
- body padding-top: 0, margin-top: 0, background: black
- MobileCTAFooter sicherstellen: position fixed, bottom 0, z-index 1000
- body padding-bottom: 120px (damit Inhalt nicht vom Footer verdeckt wird)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 3: components/landing/GlowDivider.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Eine einfache Box-Komponente:
- w="100%", h="2px"
- background: "linear-gradient(90deg, transparent, {BRAND_COLOR} mit 0.6 Opacity, transparent)"
- boxShadow: "0 0 20px {BRAND_COLOR} mit 0.4 Opacity"


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 4: components/landing/HeroSection.tsx  ("use client")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Props: nimmt Daten aus blueprintConfig.

LAYOUT DESKTOP (md+):
- Linke Spalte (55% Breite): Vimeo Video Player (16:9, autoplay muted), darunter Community-Stats-Banner (3 Profilbilder + Text "Bereits über X+ [Einheit] auf ihrem Weg begleitet")
- Rechte Spalte (flex 1): Marken-Badge (Brand Name), Überschrift "Werde Teil von [BRAND_NAME]!", 5 Sterne Rating (4.8), Beschreibungstext, WENN paid: 3 klickbare Pricing-Optionen (Radio-Cards: monatlich EMPFEHLUNG-Badge / quarterly / annual), PayPal-Button (weißer Overlay bis geladen), "oder"-Trenner, Haupt-CTA Button (BRAND_COLOR), Zahlungs-Icons (Apple Pay, Mastercard, Google Pay, Visa als SVG)

LAYOUT MOBILE (base):
- Video Player oben (full width, 16:9)
- Community-Stats-Banner (nur bei paid)
- Darunter: Überschrift, Rating, Beschreibungstext
- Feature-Cards ("Was du bekommst"): vertikale Liste mit Icon + Label + Detail
- WENN paid: PayPal-Button + CTA-Button (werden auf Mobile durch den MobileCTAFooter ersetzt, also hier für Mobile AUSBLENDEN via display={{ base: "none", md: "flex" }} auf den CTA-Buttons)
- WENN free: CTA-Button sichtbar auf Mobile

HERO-SECTION STYLING:
- w="100vw", bg="black", radiale Gradienten mit BRAND_COLOR Blauschimmer (3-8% Opacity)
- Alle interaktiven Elemente (Pricing-Cards, Buttons) mit Hover-Transitions 0.2s
- Ausgewählte Pricing-Card: 2px solid Border in BRAND_COLOR, bg mit 10% BRAND_COLOR
- EMPFEHLUNG-Badge: position absolute, top-right, bg="red.500"

PRICING MODAL LOGIK (nur paid):
- useState für selectedPlan ("monthly" | "quarterly" | "annual")
- useState für isModalOpen
- Klick auf "JETZT SICHER ZUR KASSE" → öffnet PricingModal mit view="checkout"
- Modal ist ein Bottom-Sheet auf Mobile, zentriertes Overlay auf Desktop
- Modal zeigt: Planauswahl (Radio) + PayPal Express + "oder" + CTA Button (view=selection)
- Auf "JETZT SICHER ZUR KASSE" im Modal → view wechselt zu "checkout" (hier: Platzhalter für Checkout-Embed oder Redirect-URL)

FREE REGISTRATION MODAL LOGIK:
- Einfaches Modal mit Formular (Name + E-Mail) oder Redirect zur Registrierung


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 5: components/landing/MobileCTAFooter.tsx  ("use client")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KRITISCHE CONVERSION-KOMPONENTE. Exakte Implementierung:

WENN priceModel === "paid":

  CONTAINER:
  - position="fixed", bottom={0}, left={0}, right={0}
  - zIndex={1000}
  - display={{ base: "block", md: "none" }}   ← NUR MOBILE
  - bg="rgba(40, 40, 40, 0.98)", backdropFilter="blur(20px)"
  - borderTop="1px solid rgba(255,255,255,0.1)"
  - boxShadow="0 -4px 20px rgba(0,0,0,0.3)"
  - px={4}, py={4}

  INHALT (von oben nach unten):
  
  ZEILE 1 (HStack justify="space-between"):
    Links: Aktueller Preis als Text ("47€ pro Monat" / "127€ alle 3 Monate" / "367€ pro Jahr")
           → abhängig von selectedPlan State (Default: "monthly")
    Rechts: Button "3 Optionen ▼" → onClick öffnet PricingModal mit view="selection"
  
  ZEILE 2 (HStack gap={3}):
    Button 1 (flex=1, h=48px): PayPal Express Button
      - Echter PayPal-Button rendert unsichtbar (opacity 0) in absolutem Container
      - Weißer Overlay-Button mit PayPal-Logo SVG zeigt sich darüber
      - Overlay hat pointer-events:none sobald PayPal geladen → Klick geht durch
      - Ladestate: "Lädt..." Text im Overlay
    
    Button 2 (flex=1, h=48px): Haupt-CTA
      - bg=BRAND_COLOR, color="white", fontWeight="bold"
      - Icon: Lock (weight="fill") + Text "SICHER ZUR KASSE"
      - onClick → öffnet PricingModal mit view="checkout", selectedPlan="monthly"

  ZEILE 3 (unter Button 2): Zahlungs-Icons (Apple Pay, Mastercard, Google Pay, Visa SVG)

  PRICING MODAL (Bottom-Sheet):
  - Öffnet sich von unten mit slideUp Animation (0.3s ease-out)
  - Backdrop: position fixed, inset 0, bg rgba(0,0,0,0.7), zIndex 9999
  - Panel: maxH="90vh", overflowY="auto", borderTopRadius="2xl"
  - Drag-Handle: 40px × 4px, bg rgba(255,255,255,0.3), mx="auto", mt={3}
  
  VIEW "selection":
  - Header: "WÄHLE DEINEN PLAN" + X-Button
  - 3 Radio-Cards (monatlich EMPFEHLUNG / quarterly / annual) mit Preis
  - PayPal Express Button (gleiche Overlay-Logik)
  - "oder" Trenner
  - CTA Button "JETZT SICHER ZUR KASSE"
  - Zahlungs-Icons
  
  VIEW "checkout":
  - Zurück-Pfeil + X-Button
  - Checkout-Embed oder Redirect-Logik (Platzhalter: Box mit Text "[CHECKOUT EMBED HIER]")

WENN priceModel === "free":

  CONTAINER (gleiche Position/Styling wie oben):
  - Titel: "[PRODUKT_NAME]" + Subtitle
  - CTA Button: "KOSTENLOS ANMELDEN" (full width, BRAND_COLOR)
  - Hinweis: "100% kostenlos • Keine Kreditkarte erforderlich"
  - Klick → öffnet Registrierungs-Modal (einfaches Formular)

WICHTIG für beide Varianten:
  - Der Page-Container muss body { padding-bottom: 120px } haben damit
    der Seiteninhalt nicht durch den fixen Footer verdeckt wird.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 6: components/landing/ReviewSection.tsx  ("use client")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Props: reviews aus blueprintConfig.reviews

LAYOUT (Stack direction { base: "column", lg: "row" }):

LINKE SPALTE (lg: 300px fixed):
- Überschrift "Bewertungen"
- Durchschnittssterne (5 SVG-Sterne, gefüllt/leer je Rating) + "4.X von 5"
- Rating-Verteilung (5 Balken: 5 Sterne / 4 Sterne / etc.)
  → Balken-Breite proportional zur Anzahl, Farbe: gold für 5★, orange für 4★

RECHTE SPALTE (flex: 1):
- Liste der ReviewCards (anfangs nur 4, dann "Alle anzeigen" klappt den Rest auf)
- Jede ReviewCard: Avatar (Initialen-Box in BRAND_COLOR oder Bild), Name, Datum,
  Sterne, Review-Titel (fett), Review-Text (bei >150 Zeichen → "Mehr anzeigen ▼")
- Trennlinie zwischen Reviews (1px rgba(255,255,255,0.1))

STYLING: bg="black", py={8-12}, px={4-8}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 7: components/landing/FounderSection.tsx  ("use client")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Props: founder aus blueprintConfig.founder

LAYOUT (Stack direction { base: "column", lg: "row" }):

LINKS: Großes Gründer-Bild
- w { base: "280px", md: "360px", lg: "420px" }
- h { base: "380px", md: "480px", lg: "560px" }
- borderRadius="xl", objectFit="cover"
- Platzhalter: bg="rgba(255,255,255,0.05)" mit zentriertem Text "[GRÜNDER FOTO]"

RECHTS:
- Subtitle (grau, uppercase, letterSpacing)
- Name als h2 (groß, weiß, fett) – mit BRAND_COLOR Highlight-Box
- Bio-Absätze (3 Textblöcke)
- Achievement-Box (bg mit leichtem Schimmer, Border):
  → Box-Titel als BRAND_COLOR-Highlight
  → CheckCircle-Liste der Achievements
  → Abschluss-Statement in BRAND_COLOR-Highlight-Box
- Checkliste "Expertise & Erfolge" mit CheckCircle Icons
- Social-Links (Instagram + TikTok): runde Buttons mit Hover

STYLING: bg="black", py={12-20}, px={4-8}
BRAND_COLOR Highlight-Box Muster:
  background: "linear-gradient(90deg, rgba(BRAND_COLOR, 0.28), transparent 95%)"
  border: "1px solid rgba(BRAND_COLOR, 0.35)"
  boxShadow: "0 0 0 1px rgba(BRAND_COLOR, 0.25) inset, 0 0 24px rgba(BRAND_COLOR, 0.25)"
  backdropFilter: "blur(6px)"


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 8: components/landing/StatsAndTargetSection.tsx  ("use client")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Props: stats, targetGroups aus blueprintConfig

OBEN: 4 animierte Stat-Karten (SimpleGrid 1-4 Spalten)
- Jede Karte: weißer Hintergrund, borderRadius="xl", hover: translateY(-4px)
- Zahl in BRAND_COLOR (große Schrift 3xl-5xl), darunter Label (grau, uppercase)
- COUNT-UP ANIMATION: IntersectionObserver (threshold 0.3) + requestAnimationFrame Count-Up (2000ms)
  → Zahl zählt von 0 auf den Zielwert hoch sobald die Section ins Viewport scrollt

MITTE: Überschrift "Für wen ist [PRODUKT_NAME] gedacht?"

UNTEN: 3 Zielgruppen-Karten (SimpleGrid 1-3 Spalten)
- Jede Karte: bg="white", borderRadius="2xl", minH="400px"
- Icon (40px, BRAND_COLOR fill) in blauer Hintergrundbox
- Titel (fett, dunkel)
- Beschreibung (grau)
- Am unteren Rand: Link "[CTA Text] ›" in BRAND_COLOR mit Underline, Smooth-Scroll zu #hero-section

STYLING: bg="gray.50" (weißgrauer Hintergrund im Kontrast zu schwarzen Sections)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 9: components/landing/PhasesSection.tsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Props: phases aus blueprintConfig

HEADER (zentriert):
- Uppercase Label "So funktioniert's" in BRAND_COLOR
- Überschrift "Bring dein [PRODUKT_TYP] aufs [BRAND_COLOR Highlight-Box: nächste Level.]"

3 PHASEN-KARTEN (VStack gap={8}):
- Abwechselndes Layout: Phase 1+3 = Bild rechts, Phase 2 = Bild links (row-reverse)
  → Stack direction { base: "column", md: "row" bzw. "row-reverse" }
- Karte: bg mit dunklem Hintergrund, borderRadius="2xl", border="2px solid BRAND_COLOR 30%"
  boxShadow mit BRAND_COLOR Glow, _hover: stärkere Border + Glow, transition 0.3s
- LINKS (oder rechts): Phase-Label (BRAND_COLOR, fett), Titel (weiß), Beschreibung (grau),
  3 Bullet Points mit blauen Punkten
- RECHTS (oder links): Bild 180×180px borderRadius="xl" (nur desktop display md+)
  → Platzhalter: Box mit bg="rgba(255,255,255,0.05)" und zentriertem "[BILD]" Text

STYLING: bg="black" (via Section-Wrapper), py={16-24}, maxW="6xl"


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALLGEMEINE ANFORDERUNGEN FÜR ALLE KOMPONENTEN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DARK THEME: Alle Sections auf schwarzem/dunkelgrauem Hintergrund außer StatsAndTargetSection (gray.50)
2. RESPONSIVE: Jede Komponente muss Mobile (base) und Desktop (md+) abdecken
3. PLATZHALTER: Alle Texte, Bilder, Preise aus blueprintConfig beziehen -- KEINE hartcodierten Inhalte in den Komponenten
4. BRAND_COLOR überall konsistent verwenden (Buttons, Borders, Highlights, Icons)
5. TRANSITIONS: Hover-Effekte mit "all 0.2s ease" oder "all 0.3s ease"
6. ZAHLUNGS-ICONS: Apple Pay, Mastercard, Google Pay, Visa als inline SVG (kein externes Bild)
7. MOBILE FOOTER: Der MobileCTAFooter ist IMMER die erste gerenderte Komponente in der Page-Datei (auch wenn er visuell unten erscheint) -- das ist wichtig für z-index Stacking
8. KEINE NAVBAR: Der Inline-Style-Block der Page blendet Navbar aus (display: none für nav, header, [role="banner"])
9. BODY PADDING-BOTTOM: Die Page setzt padding-bottom: 120px damit der fixe Footer den Content nicht verdeckt

Starte mit der blueprintConfig, dann MobileCTAFooter, dann HeroSection.
Alle anderen Sections danach. Zuletzt die Page-Datei die alles zusammensetzt.
```

---

## SCHRITT 3: Nach der Implementierung

Ersetze die Platzhalter in `config/blueprint-config.ts`:

- [ ] `brand.name` und `brand.tagline`
- [ ] `product.headline` und `product.subheadline`
- [ ] `product.videoId` (Vimeo Video-ID)
- [ ] Alle `features[]` mit echten Produkt-Features
- [ ] Alle `founder.*` Felder mit echten Infos
- [ ] Alle `stats[]` mit echten Zahlen
- [ ] Alle `phases[]` mit echten Inhalten
- [ ] Alle `reviews[]` mit echten Bewertungen
- [ ] Alle `targetGroups[]` mit echter Zielgruppe
- [ ] Pricing-Konfiguration (nur wenn paid)
- [ ] `socialLinks` mit echten URLs
- [ ] `/placeholder-founder.jpg` ersetzen
- [ ] `/placeholder-phase1/2/3.jpg` ersetzen

---

## SCHRITT 4: UI-Design (projektbasiert)

Das Design ist bewusst NICHT im Blueprint festgelegt.
Passe nach der Implementierung an:

- `MARKENFARBE` in `blueprintConfig.brand.color` anpassen
- Typografie (Font-Family) in deinem Chakra-Theme setzen
- Hintergrundfarben der Sections (Standard: schwarz / gray.50)
- Border-Styles und Glow-Intensitäten
- Button-Shapes (borderRadius)

---

*Blueprint Version 1.0 -- Basierend auf dem SNT Landing Page System*
