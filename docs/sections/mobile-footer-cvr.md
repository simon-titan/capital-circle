# BLUEPRINT: Mobile Pricing Footer (Conversion-Komponente)

Diese Komponente ist ein **fixed, immer sichtbarer CTA-Footer** der ausschließlich auf Mobile erscheint.
Sie ist eine der wirkungsvollsten Conversion-Elemente auf Verkaufsseiten, da sie permanent im Blick bleibt
und mit einem Tap direkt in den Checkout führt.

Einsetzbar auf **jeder** Verkaufsseite -- unabhängig vom Rest der Page.

---

## SCHRITT 1: Konfiguration (PFLICHTANGABEN)

```
PREIS_MODELL: "[paid_subscription | paid_onetime | free]"
  → paid_subscription = Wiederkehrende Zahlung (monatlich/quartalsweise/jährlich)
  → paid_onetime      = Einmalzahlung (ein fester Preis)
  → free              = Kostenlos (Registrierung/Anmeldung)

PRODUKT_NAME: "[Name des Angebots, z.B. 'XYZ Premium' / 'Das Coaching' / 'Der Kurs']"

PRODUKT_TYP: "[Was genau wird beworben, z.B. 'Mitgliedschaft' / 'Kurs' / 'Coaching' / 'Tool']"

BRAND_COLOR: "[Primärfarbe als HEX, z.B. #068CEF]"

--- NUR RELEVANT BEI paid_subscription ---
PREIS_MONATLICH: "[z.B. 47]"
PREIS_QUARTERLY: "[z.B. 127]"   (optional, kann weggelassen werden)
PREIS_JAEHRLICH:  "[z.B. 367]"  (optional, kann weggelassen werden)
PLAN_OPTIONEN_LABEL: "[z.B. '3 Optionen' oder '2 Optionen']"

--- NUR RELEVANT BEI paid_onetime ---
PREIS_EINMALIG: "[z.B. 297]"
PREIS_LABEL: "[z.B. 'Einmalig' / 'Nur jetzt' / 'Lifetime-Zugang']"

--- NUR RELEVANT BEI free ---
CTA_LABEL: "[z.B. 'KOSTENLOS ANMELDEN' / 'JETZT BEWERBEN' / 'GRATIS STARTEN']"
DISCLAIMER: "[z.B. '100% kostenlos • Keine Kreditkarte' oder leer lassen]"
```

---

## SCHRITT 2: Der Prompt

Kopiere alles ab hier und sende es an den AI-Agenten.
Ersetze vorher alle `[VARIABLE]`-Platzhalter.

---

```
Erstelle eine einzelne React-Komponente "MobileCTAFooter" für eine Next.js (App Router)
Seite mit Chakra UI v3 und @phosphor-icons/react.

Konfiguration:
- Preismodell: [PREIS_MODELL]
- Produkt: [PRODUKT_NAME] ([PRODUKT_TYP])
- Primärfarbe (BRAND_COLOR): [BRAND_COLOR]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALLGEMEINE ANFORDERUNGEN (für alle Varianten):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Die Komponente MUSS:
- "use client" Direktive haben
- position="fixed", bottom={0}, left={0}, right={0}, zIndex={1000}
- display={{ base: "block", md: "none" }}  ← NUR auf Mobile sichtbar
- bg="rgba(40, 40, 40, 0.98)", backdropFilter="blur(20px)"
- borderTop="1px solid rgba(255,255,255,0.1)"
- boxShadow="0 -4px 20px rgba(0,0,0,0.3)"
- KEINE Props benötigen (alle Preise intern konfiguriert)
- Einen <Spacer>-Companion haben der padding-bottom: 120px setzt
  (damit der Seiten-Content nicht verdeckt wird -- als separate Export-Funktion
   oder als zweites Element im Fragment)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[NUR WENN PREIS_MODELL = paid_subscription]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DATEI: components/MobileCTAFooter.tsx

STATE:
- selectedPlan: "monthly" | "quarterly" | "annual" = "monthly"
- isModalOpen: boolean = false
- modalView: "selection" | "checkout" = "selection"

INTERNE KONFIGURATION (hardcoded in der Datei, nicht als Props):
const PRICING = {
  monthly:  { price: [PREIS_MONATLICH], label: "[PREIS_MONATLICH]€ pro Monat" },
  quarterly:{ price: [PREIS_QUARTERLY], label: "[PREIS_QUARTERLY]€ alle 3 Monate" },
  annual:   { price: [PREIS_JAEHRLICH], label: "[PREIS_JAEHRLICH]€ pro Jahr" },
};

AUFBAU DES FOOTERS (VStack px={4} py={4}):

ZEILE 1 — HStack justify="space-between":
  Links:
    Text (color="white", fontSize="md", fontWeight="medium"):
      → Zeigt PRICING[selectedPlan].label dynamisch

  Rechts:
    Klickbare Box (onClick → setIsModalOpen(true), setModalView("selection")):
      → Text "[PLAN_OPTIONEN_LABEL]" + CaretDown Icon (Phosphor, size=16, weight="bold")
      → color="white", fontSize="sm", cursor="pointer"
      → display="flex", alignItems="center", gap={1}

ZEILE 2 — HStack gap={3}:

  LINKE HÄLFTE (flex=1, h=48px): CTA-BUTTON (Haupt-Konversion)
    Button:
    - bg=BRAND_COLOR, color="white", h="48px", borderRadius="lg", w="full"
    - fontWeight="bold"
    - Inhalt: HStack mit Lock-Icon (Phosphor, weight="fill", size=16) + "SICHER ZUR KASSE"
    - onClick:
        setSelectedPlan("monthly")
        setModalView("checkout")
        setIsModalOpen(true)

  RECHTE HÄLFTE (flex=1, h=48px): SEKUNDÄR-BUTTON (optional, z.B. mehr Info oder leer lassen)
    Variante A (empfohlen): Leer (Box flex=1) -- der CTA braucht keine Konkurrenz
    Variante B: Ein "Mehr erfahren" Ghost-Button mit Scroll-to-Anchor

ZEILE 3 — Zahlungs-Icons (unter ZEILE 2, nur unter dem CTA-Button):
  HStack gap={3} justify="center":
  Apple Pay SVG Icon (weißer Hintergrund, gerundete Ecken)
  Mastercard SVG Icon
  Google Pay SVG Icon
  Visa SVG Icon
  → Jeder Icon: Box w={10} h={7} display="flex" alignItems="center" justifyContent="center"
  → Alle Icons als INLINE SVG (kein img-Tag, kein externes Icon)


BOTTOM-SHEET MODAL (bei isModalOpen === true):

WRAPPER:
  position="fixed", inset={0}, zIndex={9999}
  bg="rgba(0,0,0,0.7)", backdropFilter="blur(4px)"
  display="flex", alignItems="flex-end", justifyContent="center"
  onClick → schließen (nur wenn view === "selection" und Klick auf Backdrop)

PANEL:
  bg="rgba(40,40,40,0.98)", backdropFilter="blur(20px)"
  borderTopRadius="2xl", w="full"
  maxW={{ base: "full", md: "50%" }}  ← Desktop: mittig, nicht full-width
  maxH="90vh", overflowY="auto"
  boxShadow="0 -10px 40px rgba(BRAND_COLOR, 0.3)"
  borderTop="2px solid rgba(BRAND_COLOR, 0.3)"
  Animation: CSS keyframes slideUp (translateY 100% → 0, 0.3s ease-out)

DRAG HANDLE: Box 40px × 4px, bg="rgba(255,255,255,0.3)", mx="auto", mt={3}, mb={4}, borderRadius="full"

HEADER (HStack justify="space-between" px={6} mb={6}):
  VIEW "selection":
    Links: leerer Spacer (w="32px")
    Mitte: "WÄHLE DEINEN PLAN" (fett, weiß, textAlign="center")
    Rechts: X-IconButton (Phosphor X, size=20) → schließt Modal
  VIEW "checkout":
    Links: ArrowLeft-IconButton → wechselt zurück zu "selection"
    Mitte: leer
    Rechts: X-IconButton → schließt Modal

CONTENT VIEW "selection" (VStack px={6} pb={6}):

  3 Radio-Cards (VStack gap={3}):

  KARTE MONATLICH (mit EMPFEHLUNG-Badge):
    Box als button, p={4}, borderRadius="lg", w="full"
    Border: 2px solid BRAND_COLOR wenn ausgewählt, sonst 1px rgba(255,255,255,0.1)
    BG: rgba(BRAND_COLOR, 0.15) wenn ausgewählt, sonst rgba(255,255,255,0.02)
    Position absolute top-right: Badge bg="red.500" "EMPFEHLUNG" (fontSize="2xs", fontWeight="bold")
    Inhalt HStack: Custom Radio-Dot (Box rund, gefüllt wenn ausgewählt) + VStack (Produktname + Preis / "Monatliches Abo")
    onClick → setSelectedPlan("monthly")

  KARTE QUARTERLY:
    Gleiche Struktur ohne Badge
    Preis-Zeile: "3-Monatiges Abo — Spare ca. XX€" (Ersparnis vs. 3x monatlich)
    onClick → setSelectedPlan("quarterly")

  KARTE JÄHRLICH:
    Gleiche Struktur ohne Badge
    Preis-Zeile: "Jährliches Abo — Spare ca. XX€"
    onClick → setSelectedPlan("annual")

  CTA-BEREICH (VStack gap={3} mt={4}):

  [OPTIONAL: PayPal Express Button -- nur einbauen wenn PayPal als Zahlungsanbieter genutzt wird]
  Falls PayPal:
    Box relative w="full" h="48px" borderRadius="lg" overflow="hidden":
      - Echter PayPal SDK Button unsichtbar (opacity=0, pointerEvents="auto", z-index 1)
        Container-ID: "paypal-modal-container"
      - Weißer Overlay (absolute, z-index 2):
        → Zeigt "Lädt..." wenn SDK nicht geladen
        → Zeigt PayPal-Logo SVG wenn geladen
        → pointerEvents="none" sobald Button gerendert → Klick geht durch zum echten Button
    "oder" Trenner (HStack mit Linien und Text)

  Haupt-CTA-Button (w="full", size="lg", bg=BRAND_COLOR):
    Lock Icon + "JETZT SICHER ZUR KASSE"
    onClick → setModalView("checkout")

  Zahlungs-Icons (gleiche SVGs wie im Footer)

CONTENT VIEW "checkout" (VStack px={6} pb={6}):
  [CHECKOUT EMBED PLATZHALTER]
  Box w="full" minH="400px" bg="rgba(255,255,255,0.03)" borderRadius="xl"
  border="1px solid rgba(255,255,255,0.1)" display="flex" alignItems="center" justifyContent="center":
    VStack gap={3}:
      Text color="gray.400" fontSize="sm": "Checkout wird geladen..."
      Text color="gray.600" fontSize="xs": "Ersetze diesen Block mit deinem Checkout-Embed
        (z.B. Stripe, Digistore24, Outseta, Copecart, oder eigenes Formular)"
      Text color="gray.600" fontSize="xs": "Gewählter Plan: {selectedPlan}"


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[NUR WENN PREIS_MODELL = paid_onetime]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DATEI: components/MobileCTAFooter.tsx

STATE:
- isModalOpen: boolean = false

AUFBAU DES FOOTERS (VStack px={4} py={4}):

ZEILE 1 — HStack justify="space-between":
  Links: Text "[PREIS_EINMALIG]€ [PREIS_LABEL]" (weiß, fontWeight="medium")
  Rechts: Text "[PRODUKT_NAME]" (grau, fontSize="sm") -- oder leer

ZEILE 2 — Einzelner Button (full width, h=48px):
  bg=BRAND_COLOR, color="white", fontWeight="bold", borderRadius="lg"
  Lock Icon + "JETZT KAUFEN"
  onClick → setIsModalOpen(true)

ZEILE 3 — Zahlungs-Icons (wie oben)

CHECKOUT MODAL (keine Plan-Auswahl nötig):
- Gleiche Wrapper/Panel-Struktur wie subscription
- Kein "selection"-View, direkt "checkout" mit Platzhalter für Checkout-Embed
- Header: "[PRODUKT_NAME] kaufen" + X-Button


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[NUR WENN PREIS_MODELL = free]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DATEI: components/MobileCTAFooter.tsx

STATE:
- isModalOpen: boolean = false

AUFBAU DES FOOTERS (p={4}):

VStack gap={3} w="full" maxW="400px" mx="auto":

  VStack gap={1} textAlign="center":
    Text fontWeight="bold" color="white" fontSize="sm": "[PRODUKT_NAME]"
    Text color="gray.300" fontSize="xs": "[PLATZHALTER: kurze Einladung, 1 Satz]"

  Button (w="full", h="48px", bg=BRAND_COLOR, color="white", fontWeight="bold"):
    Lock Icon + "[CTA_LABEL]"
    onClick → setIsModalOpen(true)
    boxShadow: "0 4px 20px rgba(BRAND_COLOR, 0.4)"

  Wenn DISCLAIMER nicht leer:
    Text fontSize="2xs" color="gray.400" textAlign="center": "[DISCLAIMER]"

REGISTRIERUNGS-MODAL (bei isModalOpen === true):
  Gleiche Wrapper/Panel-Struktur
  Header: "Registrierung" + X-Button
  Formular-Platzhalter:
    Box mit Text "[REGISTRIERUNGSFORMULAR HIER einbauen]
    z.B. E-Mail-Formular, Typeform-Embed, Outseta Registration, o.ä."


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EINBINDUNG IN DIE SEITE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Die Komponente wird in der Page-Datei als ERSTES Element im JSX gerendert
(vor allem anderen Content), damit der z-index korrekt funktioniert:

// app/deine-seite/page.tsx (oder pages/deine-seite.tsx)
export default function Page() {
  return (
    <>
      {/* 1. Mobile Footer -- immer zuerst */}
      <MobileCTAFooter />
      
      {/* 2. Seiteninhalt */}
      <main style={{ paddingBottom: '120px' }}>
        {/* ... dein restlicher Page-Content ... */}
      </main>
    </>
  );
}

Alternativ kann padding-bottom: 120px auch als globales CSS für diese Seite gesetzt werden.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBALE CSS-ANFORDERUNG:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Füge folgenden Inline-Style-Block in der Page-Datei ein:

<style>{`
  /* Mobile Footer sicherstellen */
  @media (max-width: 768px) {
    body {
      padding-bottom: 120px !important;
    }
  }
  
  /* Slide-Up Animation für das Modal */
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  .mobile-footer-modal {
    animation: slideUp 0.3s ease-out;
  }
`}</style>
```

---

## SCHRITT 3: Checkout-Embed einbauen

Im "checkout"-View (oder beim Einzel-Button bei onetime/free) kommt dein
tatsächlicher Checkout-Provider rein. Gängige Optionen:

| Provider | Einbindung |
|----------|-----------|
| **Stripe** | `<stripe-pricing-table>` HTML-Element oder Redirect zu Stripe Checkout |
| **Digistore24** | iFrame-Embed oder Redirect-Link |
| **Outseta** | `<OutsetaCheckoutEmbed planUid="..." />` Komponente |
| **Copecart** | iFrame oder Link |
| **Elopage** | iFrame oder Link |
| **Eigenes Formular** | React-Formular mit Name/Email + API-Call |
| **Formular + Redirect** | Formular Submit → Redirect zu Checkout-URL |

Ersetze einfach den Platzhalter-Block im "checkout"-View.

---

## SCHRITT 4: PayPal einbinden (optional, nur bei paid)

Falls du PayPal als Zahlungsanbieter nutzt, ersetze den PayPal-Platzhalter so:

1. Erstelle ein PayPal Subscription-Produkt in deinem PayPal Developer Dashboard
2. Notiere die `plan_id` für jeden Preisplan (monthly, quarterly, annual)
3. Lade das PayPal SDK dynamisch:

```typescript
useEffect(() => {
  const script = document.createElement("script");
  script.src = `https://www.paypal.com/sdk/js?client-id=DEIN_CLIENT_ID&vault=true&intent=subscription&currency=EUR`;
  script.async = true;
  script.onload = () => renderPayPalButton();
  document.head.appendChild(script);
}, []);
```

4. Render den Button in `#paypal-modal-container` mit:

```typescript
(window as any).paypal.Buttons({
  createSubscription: (data, actions) => actions.subscription.create({
    plan_id: PLAN_IDS[selectedPlan],
  }),
  onApprove: (data) => {
    window.location.href = `/danke?subscription_id=${data.subscriptionID}`;
  },
}).render("#paypal-modal-container");
```

---

## SCHRITT 5: Design anpassen

Nach der Implementierung kannst du anpassen:

- **BRAND_COLOR**: In der Komponente als Konstante definiert → einmal ändern reicht
- **Footer-Höhe**: `py={4}` anpassen (Standard ~88-120px Gesamthöhe)
- **Modal-Hintergrund**: `rgba(40, 40, 40, 0.98)` → dunkleres oder helleres Grau
- **Glow-Farbe**: `boxShadow` auf dem Modal-Panel → BRAND_COLOR Intensität
- **Button-Radius**: `borderRadius="lg"` (8px) → `"xl"` (12px) → `"full"` (pill)
- **Zahlungs-Icons**: weitere hinzufügen oder weglassen

---

## Warum dieser Footer konvertiert

- **Immer sichtbar**: Kein Scrollen nötig -- der CTA ist permanent im Blickfeld
- **Reibungslos**: Ein Tap → Modal öffnet sich → ein weiterer Tap → Checkout
- **Vertrauenssignale**: Zahlungs-Icons direkt neben dem Button
- **Plan-Flexibilität** (bei subscription): "3 Optionen" gibt Kontrolle ohne zu überfordern
- **Empfehlung-Framing**: Monatlicher Plan als "EMPFEHLUNG" getaggt lenkt die Wahl
- **PayPal Express** (optional): Schnellste Zahlungsoption direkt im Footer

---

*Blueprint Version 1.0 -- Basierend auf dem SNT Mobile Pricing Footer System*
