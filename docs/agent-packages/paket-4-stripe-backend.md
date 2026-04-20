# Agent-Paket 4 — Stripe-Backend

> **Voraussetzung:** Pakete 0, 1 und 2 müssen abgeschlossen sein.
> **Kann parallel zu Paket 3 ausgeführt werden.**
> **Pakete 5, 6 und 8 sind von diesem Paket abhängig.**
> **Verbindliche Source-of-Truth:** `docs/implementation-notes.md`

---

## Mission

Implementiere den kompletten Stripe-Backend-Stack:
- Stripe-Client (Server + Client)
- Checkout-Session + Portal-Session API
- Stripe-Webhook mit Idempotenz
- Event-Handler für alle 7 relevanten Events
- Access-Control-Helper
- Integration in `proxy.ts`

**Kein Frontend-Code** — Pricing-UI und Checkout-UI gehören in Paket 5.

---

## Cross-Cutting-Regeln

1. **Stack:** Next.js 16.2.1, React 19.2.4, Chakra UI v2, Supabase SSR
2. **Tabelle:** `profiles`, Admin via `requireAdmin()`
3. **Hosting:** Vercel — Webhooks als `export const runtime = 'nodejs'` (raw body!)
4. **Stripe-Mode:** Test-Keys zuerst, Live-Keys erst nach grüner Acceptance-Liste
5. **Idempotenz:** Webhook-Events nur einmal verarbeiten (via `stripe_webhook_events`)
6. **Schema-Sync:** Stripe-Handler schreiben IMMER beide Felder: `is_paid` + `membership_tier`

---

## 1. Stripe-Server-Client `lib/stripe/server.ts`

```ts
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY missing');

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // API-Version: aktuell empfohlene Version von stripe@22 verwenden
  // Kommentar: Version beim Deployment aus Stripe-Docs prüfen und hier eintragen
  typescript: true,
  appInfo: { name: 'Capital Circle', version: '1.0.0' },
});
```

---

## 2. Stripe-Client-Helper `lib/stripe/client.ts`

```ts
import { loadStripe } from '@stripe/stripe-js';

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  console.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY missing');
}

export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);
```

---

## 3. Checkout-Session `app/api/stripe/create-checkout-session/route.ts`

```ts
// POST /api/stripe/create-checkout-session
// Body: { plan: 'monthly' | 'lifetime' }
// Auth: eingeloggter User

// Ablauf:
// 1. Auth-Check (supabase.auth.getUser())
// 2. Profil laden (stripe_customer_id, email)
// 3. Falls kein stripe_customer_id:
//    → stripe.customers.create({ email, metadata: { user_id: user.id } })
//    → UPDATE profiles SET stripe_customer_id=newId WHERE id=user.id
// 4. stripe.checkout.sessions.create({
//      ui_mode: 'embedded',
//      mode: plan === 'monthly' ? 'subscription' : 'payment',
//      customer: stripeCustomerId,
//      line_items: [{ price: process.env[plan === 'monthly' ? 'STRIPE_PRICE_MONTHLY' : 'STRIPE_PRICE_LIFETIME'], quantity: 1 }],
//      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
//      automatic_tax: { enabled: true },
//      allow_promotion_codes: true,
//      metadata: { user_id: user.id, plan },
//    })
// 5. Response: { clientSecret: session.client_secret }
```

---

## 4. Portal-Session `app/api/stripe/create-portal-session/route.ts`

```ts
// POST /api/stripe/create-portal-session
// Auth: eingeloggter User

// Ablauf:
// 1. Auth-Check
// 2. stripe_customer_id aus profiles laden
// 3. Falls kein stripe_customer_id → 400 (kein Abo)
// 4. stripe.billingPortal.sessions.create({
//      customer: stripeCustomerId,
//      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
//    })
// 5. Response: { url: session.url }
// Client: window.location.href = url
```

---

## 5. Stripe-Webhook `app/api/stripe/webhook/route.ts`

```ts
export const runtime = 'nodejs';    // PFLICHT — kein Edge (raw body benötigt)
export const dynamic = 'force-dynamic';

// POST /api/stripe/webhook
// Headers: stripe-signature

// Ablauf:
// 1. sig = headers.get('stripe-signature')
// 2. body = await req.text()   // RAW body — niemals json() davor aufrufen!
// 3. event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
//    Bei Fehler → 400
// 4. Idempotenz-Check:
//    SELECT * FROM stripe_webhook_events WHERE id = event.id
//    Falls processed_at gesetzt → 200 'already processed'
// 5. UPSERT stripe_webhook_events SET { id, type, payload }
// 6. await handleStripeEvent(event, supabase)
// 7. UPDATE stripe_webhook_events SET processed_at=now() WHERE id=event.id
// 8. Bei Handler-Fehler: UPDATE stripe_webhook_events SET error=... → 500
```

---

## 6. Event-Handler `lib/stripe/webhooks/handler.ts`

Hauptdatei dispatcht auf Einzel-Handler:

```ts
export async function handleStripeEvent(event: Stripe.Event, supabase: SupabaseClient) {
  switch (event.type) {
    case 'checkout.session.completed':
      return handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase);
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      return handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase);
    case 'customer.subscription.deleted':
      return handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase);
    case 'customer.subscription.paused':
      return handleSubscriptionPaused(event.data.object as Stripe.Subscription, supabase);
    case 'invoice.paid':
      return handleInvoicePaid(event.data.object as Stripe.Invoice, supabase);
    case 'invoice.payment_failed':
      return handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, supabase);
    default:
      // unbekannte Events ignorieren (kein Fehler)
  }
}
```

### Handler-Details

**`lib/stripe/webhooks/checkout-completed.ts`**
```
checkout.session.completed (mode='payment' = Lifetime):
  - user_id aus metadata
  - UPDATE profiles SET
      membership_tier='lifetime', is_paid=true,
      lifetime_purchased_at=now(), access_until=null
    WHERE id=user_id
  - Resend: welcome-paid.tsx Template senden
  - logEmailSent({ sequence: 'paid_welcome', step: 0 })

checkout.session.completed (mode='subscription'):
  → No-op (subscription.created/updated handled separately)
```

**`lib/stripe/webhooks/subscription-updated.ts`**
```
customer.subscription.created / customer.subscription.updated:
  - stripe_customer_id aus subscription.customer
  - user aus profiles WHERE stripe_customer_id = ...
  - UPSERT subscriptions SET {
      stripe_subscription_id, stripe_customer_id, stripe_price_id,
      status, current_period_start, current_period_end,
      cancel_at_period_end, canceled_at
    }
  - Falls status IN ('active', 'trialing'):
      UPDATE profiles SET
        membership_tier='monthly', is_paid=true,
        access_until=current_period_end
      WHERE id=user_id
```

**`lib/stripe/webhooks/subscription-deleted.ts`**
```
customer.subscription.deleted:
  - UPDATE subscriptions SET status='canceled', canceled_at=now()
  - UPDATE profiles SET
      membership_tier='free', is_paid=false, access_until=now()
    WHERE id=user_id
  - Resend: cancellation-survey.tsx (mit Token)
  - logEmailSent({ sequence: 'cancellation', step: 0 })
  - INSERT cancellations { user_id, subscription_id, canceled_at: now() }
```

**`lib/stripe/webhooks/invoice-paid.ts`**
```
invoice.paid:
  - INSERT payments { user_id, stripe_invoice_id, amount_cents, currency, status='succeeded', paid_at }
  - UPDATE subscriptions SET current_period_end=sub.current_period_end
  - UPDATE profiles SET access_until=sub.current_period_end
  - RESET: UPDATE profiles SET
      payment_failed_email_1_sent_at=null,
      payment_failed_email_2_sent_at=null,
      payment_failed_email_3_sent_at=null
    WHERE id=user_id AND membership_tier='monthly'
```

**`lib/stripe/webhooks/invoice-payment-failed.ts`**
```
invoice.payment_failed:
  - INSERT payments { user_id, stripe_invoice_id, amount_cents, status='failed', failure_reason, attempt_count }
  - 48h Grace Period:
      UPDATE profiles SET access_until=now()+interval '48 hours' WHERE id=user_id
  - Sofort Mail 1 senden (falls noch nicht gesendet):
      Falls payment_failed_email_1_sent_at IS NULL:
        → Resend: payment-failed-1.tsx
        → UPDATE profiles SET payment_failed_email_1_sent_at=now()
```

**`lib/stripe/webhooks/subscription-paused.ts` (für customer.subscription.paused)**
```
  - UPDATE profiles SET membership_tier='free', is_paid=false WHERE id=user_id
```

---

## 7. Access-Control `lib/access-control/has-access.ts`

```ts
interface AccessResult {
  hasAccess: boolean;
  tier: string;
  reason: string;
  accessUntil: Date | null;
}

export async function hasActivePaidAccess(userId: string): Promise<AccessResult> {
  // Lade membership_tier, access_until, is_paid aus profiles
  // Lifetime → immer hasAccess = true
  // Monthly →
  //   active: access_until > now() (deckt aktive Subs, 48h Grace, cancel_at_period_end)
  //   abgelaufen: hasAccess = false
  // Sonst → false
  return { hasAccess, tier, reason, accessUntil };
}
```

---

## 8. Proxy-Integration `proxy.ts`

Erweiterte Profil-Spalten und Access-Control einbinden (nach den Gating-Regeln aus Paket 3):

```ts
// Paid-Access-Check für (platform)-Routes (außer /pending-review, /checkout, /billing):
const protectedPlatformPaths = pathname.startsWith('/dashboard') ||
  pathname.startsWith('/ausbildung') || ... // weitere App-Routes

if (protectedPlatformPaths && profile?.membership_tier !== 'free') {
  // Lifetime → immer okay
  // Monthly → prüfe access_until
  if (profile?.membership_tier === 'monthly' && profile?.access_until) {
    const accessUntil = new Date(profile.access_until);
    if (accessUntil < new Date()) {
      return NextResponse.redirect(new URL('/pricing', request.url));
    }
  }
}
```

---

## Acceptance-Criteria

11. Checkout Monthly (`4242 4242 4242 4242`) → Webhook → `subscriptions`-Row + `membership_tier='monthly'` + `access_until` + Welcome-Mail
12. Checkout Lifetime → `membership_tier='lifetime'`, `access_until=null`, `is_paid=true`
13. Payment-Failed (`4000 0000 0000 9995`) → `access_until=now()+48h` + Mail 1
14. Cancellation im Portal → `cancel_at_period_end=true`, Zugang bleibt bis Periodenende. Nach `subscription.deleted` → `membership_tier='free'` + Umfrage-Mail
15. Idempotenz: Gleicher Webhook 2× geliefert → kein Doppel-Write, keine Doppel-Mail
16. Signatur-Fail → 400
17. RLS: User A kann Subs/Payments von User B nicht lesen
18. `stripe listen --forward-to localhost:3000/api/stripe/webhook` grün für alle 7 Events
19. `lib/stripe/webhooks/handler.ts` exportiert `handleStripeEvent`
20. `has-access.ts` deckt alle Szenarien: Lifetime, aktives Monthly, 48h-Grace, cancel_at_period_end

---

## Commit

```
feat(paket4): add stripe backend, webhook handler, access control
```
