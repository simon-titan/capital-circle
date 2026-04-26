# Agent-Paket 5 — Pricing, Checkout & Billing UI

> **Voraussetzung:** Pakete 0, 1, 2 und 4 müssen abgeschlossen sein.
> **Kann parallel zu Paketen 6 und 7 ausgeführt werden.**
> **Verbindliche Source-of-Truth:** `docs/implementation-notes.md`

---

## Mission

Baue die komplette Bezahlstrecke als Frontend:
- Pricing-Seite mit Video, 2 Pricing-Cards, Calendly-CTA
- Embedded Stripe Checkout
- Checkout-Success mit Polling
- Billing-Seite (Abo-Verwaltung, Payment-History, Stripe-Portal)

**Alles in Gold-Design — kein Blau!**

---

## Cross-Cutting-Regeln

1. **Stack:** Next.js 16.2.1, React 19.2.4, Chakra UI v2
2. **Design:** Gold `#D4AF37`, Glassmorphism aus `DESIGN.json`, Radley/Inter/JetBrains Mono
3. **Kein Blau** — der Master-Prompt erwähnt Blau im Header, das ist veraltet. Primär-Akzent = Gold.
4. **Video:** HTML5 `<video>` Tag mit MP4 von Hetzner-S3. **Kein Mux, kein Cloudflare Stream.**
5. **Route-Groups:** Pricing in `app/(marketing)/pricing/`, Checkout/Billing in `app/(platform)/`
6. **Responsive:** Cards untereinander auf Mobile (<768px), Lifetime zuerst

---

## 1. Pricing-Seite `app/(marketing)/pricing/page.tsx`

### Layout (Desktop)

```
┌─────────────────────────────────────────────────────────┐
│           Die Investition in dein Trading               │
│      (Radley, ~48px, weiß, zentriert)                   │
│   Subline: Inter, 18px, #9A9AA4, zentriert              │
│                                                         │
│    ┌────────────────────────────────────────────┐       │
│    │         SALES VIDEO (16:9)                 │       │
│    │  <video> HTML5, autoplay muted, poster     │       │
│    │  max-width: 768px, border-radius: 16px     │       │
│    └────────────────────────────────────────────┘       │
│                                                         │
│  ┌──────────────────┐    ┌──────────────────┐           │
│  │    MONATLICH     │    │ ⭐ BELIEBTESTE    │           │
│  │   97 € / Monat   │    │                  │           │
│  │  (JetBrains Mono)│    │     LIFETIME     │           │
│  │ ✓ Feature 1      │    │     699 €        │           │
│  │ ✓ Feature 2      │    │    einmalig      │           │
│  │ ✓ Feature 3      │    │ ✓ Alles Monthly  │           │
│  │                  │    │ ✓ Lebensl. Zugang│           │
│  │ [Jetzt starten]  │    │ ✓ Spare 465 €    │           │
│  │ (Ghost/Outline)  │    │[Lifetime sichern]│           │
│  └──────────────────┘    │ (Gold Primary)   │           │
│                           └──────────────────┘           │
│          ─── oder ───                                    │
│   Du willst 1:1 Betreuung von Emre persönlich?          │
│   [ Kostenloses Strategie-Gespräch buchen → ]           │
└─────────────────────────────────────────────────────────┘
```

### Pricing-Cards Styling

**Monthly (Ghost):**
```css
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(16px);
border: 1px solid rgba(255, 255, 255, 0.09);
border-radius: 16px;
padding: 32px;
```
Button: `outline`-Variante aus DESIGN.json (Gold-outlined, transparent BG)

**Lifetime (Hervorgehoben):**
```css
/* Alles wie Monthly, plus: */
border: 2px solid rgba(212, 175, 55, 0.40);
box-shadow: 0 0 60px rgba(212, 175, 55, 0.20), 0 8px 32px rgba(0,0,0,0.60);
transform: scale(1.05);  /* nur Desktop md+ */
position: relative;      /* für Badge */
```
Button: `primary`-Variante (Gold Gradient, aus DESIGN.json `button.variants.primary`)

**Lifetime-Badge** (absolut positioniert, oben-mitte):
```css
position: absolute;
top: -16px;
left: 50%;
transform: translateX(-50%);
background: linear-gradient(135deg, #D4AF37 0%, #A67C00 100%);
color: #07080A;
font-family: 'JetBrains Mono', monospace;
font-size: 11px;
font-weight: 700;
letter-spacing: 0.08em;
text-transform: uppercase;
padding: 4px 14px;
border-radius: 9999px;
white-space: nowrap;
```
Text: „⭐ BELIEBTESTE WAHL"

**Savings-Subline unter dem Preis:**
```
"Spare 465 € im 1. Jahr"
```
Styling: Inter, 14px, Gold-Light `#E8C547`, zentriert, bold

### Preise (JetBrains Mono)
```tsx
// Preis:
<span style={{ fontFamily: 'JetBrains Mono', fontSize: '36px', fontWeight: 700 }}>
  97 €
</span>
<span style={{ fontFamily: 'Inter', fontSize: '14px', color: '#9A9AA4' }}>
  / Monat
</span>
```

### Feature-Liste
```tsx
// Icon: Lucide CheckCircle2, size=16, color='#D4AF37'
// Text: Inter 15px, #E8E8EA
const monthlyFeatures = [
  'Täglicher Market-Bias',
  'Live-Sessions 3× pro Woche',
  'Kompletter Kursbereich',
  'Private Community',
  'Tradingplan-Vorlagen',
];
const lifetimeFeatures = [
  ...monthlyFeatures,
  'Lebenslanger Zugang',
  'Alle zukünftigen Updates',
  'Priority Support',
];
```

### Click-Verhalten

```ts
async function handleSelectPlan(plan: 'monthly' | 'lifetime') {
  // Nicht eingeloggt → /login?next=/pricing&plan={plan}
  if (!user) { router.push(`/login?next=/pricing&plan=${plan}`); return; }
  
  // Bereits Lifetime → beide Buttons disabled mit Text "Du hast Lifetime ⚡"
  // Bereits Monthly → Monthly-Button disabled "Dein aktueller Plan", Lifetime klickbar
  
  // POST /api/stripe/create-checkout-session
  const { clientSecret } = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  }).then(r => r.json());
  
  router.push(`/checkout?plan=${plan}&cs=${clientSecret}`);
}
```

### Video

```tsx
// KEIN Mux, KEIN Cloudflare Stream
<div style={{ maxWidth: '768px', margin: '0 auto', borderRadius: '16px', overflow: 'hidden', aspectRatio: '16/9' }}>
  <video
    src={process.env.NEXT_PUBLIC_PRICING_VIDEO_URL}
    autoPlay
    muted
    loop
    playsInline
    poster="/pricing-video-poster.jpg"  // optionales Poster-Bild
    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
  />
</div>
```

### Calendly-CTA

```tsx
// Trennlinie
<div style={{ textAlign: 'center', margin: '48px 0', color: '#3A3A40', fontSize: '14px' }}>
  ─── oder ───
</div>

<div style={{ textAlign: 'center' }}>
  <p style={{ color: '#9A9AA4', marginBottom: '16px' }}>
    Du willst 1:1-Betreuung von Emre persönlich? Buch dir ein kostenloses Strategie-Gespräch.
  </p>
  <a
    href={process.env.NEXT_PUBLIC_CALENDLY_URL}
    target="_blank"
    rel="noopener noreferrer"
    // Ghost-Button-Styling aus DESIGN.json
  >
    Kostenloses Strategie-Gespräch buchen →
  </a>
</div>
```

**`target="_blank"` + `rel="noopener"` ist PFLICHT. Kein Calendly-Embed.**

### Responsive (<768px)

- Cards untereinander (Column-Layout)
- Lifetime-Card **oben** (erste)
- `transform: scale(1.05)` entfernen
- Beide Cards gleiche Breite

---

## 2. Checkout-Seite `app/(platform)/checkout/page.tsx`

```tsx
'use client';

import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { useSearchParams } from 'next/navigation';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CheckoutPage() {
  const params = useSearchParams();
  const clientSecret = params.get('cs');  // aus Query-Param
  const plan = params.get('plan');

  // Falls kein clientSecret → direkt fetchen (falls User über /pricing kam)
  // Falls kein plan und kein cs → redirect /pricing

  const options = clientSecret ? { clientSecret } : undefined;

  return (
    <div style={{
      maxWidth: '720px', margin: '80px auto', padding: '0 24px'
    }}>
      {/* Glassmorphism-Container */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '24px',
        padding: '32px',
      }}>
        <h1 style={{ fontFamily: "'Radley', serif", fontSize: '28px', color: '#F0F0F2', marginBottom: '24px' }}>
          Checkout
        </h1>
        {options && (
          <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        )}
      </div>
    </div>
  );
}
```

**Kein Übermalen des Stripe-Iframes** — der Glassmorphism-Container ist nur der äußere Wrapper.

---

## 3. Checkout-Success `app/(platform)/checkout/success/page.tsx`

```tsx
// Server Component liest ?session_id
// Zeigt: "Zahlung erfolgreich! Dein Zugang wird aktiviert..."
// Polling alle 2s auf profiles.membership_tier !== 'free'
// Nach max 20s → Redirect /dashboard oder Fehlermeldung "Bitte Seite neu laden"

// Client-seitiges Polling:
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// alle 2s: fetch('/api/auth/me') oder direkt Supabase-Client
// wenn membership_tier !== 'free' → router.push('/dashboard')
// nach 10 Versuchen → Fehlermeldung anzeigen
```

---

## 4. Billing-Seite `app/(platform)/billing/page.tsx`

Server-Component mit Auth-Check.

**Inhalt:**
- Aktuelles Abo: Tier-Badge (Monthly/Lifetime/HT), nächste Abbuchung, Betrag
- Payments-History letzte 12 Einträge: Datum, Betrag, Status, PDF-Link
- Button „Abo verwalten" → POST `/api/stripe/create-portal-session` → Redirect zu Stripe Portal
- Bei Lifetime: „Du hast lebenslangen Zugang ⚡" (kein Portal-Button für Abo-Kündigung)

**Styling:**
- Nutze `DESIGN.json adminPanel.table*` für Payments-Tabelle
- Tier-Badges aus `DESIGN.json badge.variants` (Gold für Premium, White für Monthly)

---

## Acceptance-Criteria

19. Pricing-UI Desktop: 2 Cards, Lifetime mit Gold-Badge/Border/Glow/scale-105/Savings-Text
20. Pricing-UI Mobile (<768px): Cards untereinander, Lifetime oben, kein scale
21. Video-Player zeigt HTML5-Video (kein Mux/CloudflareStream-Fehler)
22. Calendly-CTA öffnet in neuem Tab, kein Embed
23. Bereits-Monthly-User: Monthly-Button zeigt „Dein aktueller Plan" (disabled), Lifetime klickbar
24. Lifetime-User: Beide Buttons zeigen „Du hast Lifetime ⚡" (disabled)
25. Nicht-eingeloggter User: Click → Login-Redirect mit `?next=/pricing&plan=X`
26. Checkout-Seite lädt Stripe Embedded Checkout korrekt
27. Checkout-Success-Polling: nach Webhook → Redirect /dashboard
28. Billing-Seite zeigt Tier, Payments, Portal-Button

---

## Commit

```
feat(paket5): add pricing page, checkout, billing UI in gold design
```
