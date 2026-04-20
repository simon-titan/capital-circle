# Agent-Paket 6 — Churn-Prevention

> **Voraussetzung:** Pakete 0, 1, 2 und 4 müssen abgeschlossen sein.
> **Kann parallel zu Paketen 5 und 7 ausgeführt werden.**
> **Verbindliche Source-of-Truth:** `docs/implementation-notes.md`

---

## Mission

Implementiere alle 3 Churn-Prevention-Szenarien:
1. Inaktivität 7 / 14 Tage → Email
2. Payment-Failed Dunning (+24h, +48h, +7d)
3. Kündigung-Offboarding → Survey → 14d Reaktivierungs-Angebot

Plus: Login-Tracking (`last_login_at`) und 60-Tage-HT-Upsell-Cron.

---

## Cross-Cutting-Regeln

1. **Stack:** Next.js 16.2.1, React 19.2.4, Chakra UI v2, Supabase SSR
2. **Tabelle:** `profiles`, Admin via `requireAdmin()`
3. **Hosting:** Vercel — Cron via `vercel.json` (Bearer-Auth gegen `CRON_SECRET`)
4. **Idempotenz:** Alle Crons müssen doppelt laufen ohne Schaden
5. **Design:** Gold `#D4AF37`, kein Blau
6. **DSGVO:** `unsubscribed_at IS NULL` vor jedem Mail-Versand prüfen

---

## 1. Last-Login-Tracking `lib/auth/middleware-last-login.ts`

```ts
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Aktualisiert last_login_at maximal 1× pro Stunde (verhindert DB-Spam).
 * Muss in proxy.ts nach Auth-Check aufgerufen werden.
 */
export async function updateLastLoginIfNeeded(
  supabase: SupabaseClient,
  userId: string,
  currentLastLoginAt: string | null
) {
  const now = new Date();
  const lastLogin = currentLastLoginAt ? new Date(currentLastLoginAt) : null;

  // Nur updaten wenn letzter Login > 1h zurück oder null
  if (lastLogin && now.getTime() - lastLogin.getTime() < 60 * 60 * 1000) {
    return; // noch keine Stunde vergangen
  }

  await supabase
    .from('profiles')
    .update({ last_login_at: now.toISOString() })
    .eq('id', userId);
}
```

**Integration in `proxy.ts`:**
- Profil-Select um `last_login_at` erweitern
- `updateLastLoginIfNeeded()` nach dem Profil-Load aufrufen (nicht awaiten, fire-and-forget)
- **Login-Reset:** Wenn User sich einloggt und `churn_email_1_sent_at` oder `churn_email_2_sent_at` gesetzt ist → beide auf NULL:

```ts
// In proxy.ts nach Profil-Load:
if (profile?.churn_email_1_sent_at || profile?.churn_email_2_sent_at) {
  // Fire-and-forget (nicht awaiten)
  supabase.from('profiles').update({
    churn_email_1_sent_at: null,
    churn_email_2_sent_at: null,
  }).eq('id', user.id);
}
```

---

## 2. Cron: Inaktivitäts-Check `app/api/cron/check-inactive-users/route.ts`

```ts
export const runtime = 'nodejs';

// GET /api/cron/check-inactive-users
// Auth: Bearer CRON_SECRET-Check

// Ablauf:
// 1. Bearer-Check: req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
//    Falls fail → 401

// TAG 7:
// SELECT p.id, p.full_name, p.email, p.last_login_at
// FROM profiles p
// WHERE p.is_paid = true
// AND p.last_login_at < now() - interval '7 days'
// AND p.churn_email_1_sent_at IS NULL
// AND p.unsubscribed_at IS NULL
// Pro Treffer:
//   - Resend: churn-inactive-7d.tsx Template
//   - UPDATE profiles SET churn_email_1_sent_at=now() WHERE id=p.id
//   - logEmailSent({ sequence: 'churn_inactive', step: 7, ... })

// TAG 14:
// SELECT p.id, p.full_name, p.email
// FROM profiles p
// WHERE p.is_paid = true
// AND p.last_login_at < now() - interval '14 days'
// AND p.churn_email_2_sent_at IS NULL
// AND p.unsubscribed_at IS NULL
// Pro Treffer:
//   - Resend: churn-inactive-14d.tsx Template
//   - UPDATE profiles SET churn_email_2_sent_at=now() WHERE id=p.id

// Response: { sent: { tag7: X, tag14: Y } }
```

---

## 3. Cron: Dunning (Payment-Failed) `app/api/cron/process-dunning/route.ts`

```ts
export const runtime = 'nodejs';

// GET /api/cron/process-dunning
// Auth: Bearer CRON_SECRET
// Läuft alle 6h (vercel.json: "0 */6 * * *")

// +24h-Mail (Mail 2):
// SELECT p.* FROM profiles p
// JOIN subscriptions s ON s.user_id = p.id
// WHERE p.payment_failed_email_1_sent_at + interval '24 hours' < now()
// AND p.payment_failed_email_2_sent_at IS NULL
// AND s.status = 'past_due'
// AND p.unsubscribed_at IS NULL
// → Resend: payment-failed-2.tsx
// → UPDATE profiles SET payment_failed_email_2_sent_at=now()

// +48h-Mail (Mail 3):
// WHERE p.payment_failed_email_1_sent_at + interval '48 hours' < now()
// AND p.payment_failed_email_3_sent_at IS NULL
// AND s.status = 'past_due'
// → Resend: payment-failed-3.tsx
// → UPDATE profiles SET payment_failed_email_3_sent_at=now()
// Zugang bereits gesperrt durch access_until aus Webhook

// +7d: Admin-Notification (Closer DM):
// WHERE p.payment_failed_email_1_sent_at + interval '7 days' < now()
// AND p.payment_failed_email_3_sent_at IS NOT NULL  (alle 3 Mails raus)
// AND s.status = 'past_due'
// → Slack-Webhook (falls SLACK_WEBHOOK_URL gesetzt) ODER Flag in Admin-Panel
// Slack-Payload: { text: "⚠️ Closer DM nötig: {name} ({email}) — Zahlung seit 7d offen" }
// Falls kein Slack: TODO-Item in Admin-Panel (einfaches Flag, User-Notiz)

// Response: { sent: { mail2: X, mail3: Y, closerDm: Z } }
```

---

## 4. Kündigung-Offboarding (via Stripe-Webhook in Paket 4)

Der `subscription.deleted`-Handler in Paket 4 löst bereits aus:
1. `membership_tier='free'`, `is_paid=false`, `access_until=now()`
2. `cancellation-survey.tsx` Email mit Token-Link

### Survey-Seite `app/(platform)/survey/cancellation/page.tsx`

```tsx
// GET /survey/cancellation?token=XXX
// Token verifizieren (gleicher HMAC wie Unsubscribe-Token)
// Formular:
// - "Was hat gefehlt?" (Textarea)
// - "Was hätte besser sein können?" (Textarea)
// - Dropdown-Grund: "Zu teuer" | "Nicht genug Wert" | "Technische Probleme" | "Anderes"
// - Submit → POST /api/survey/cancellation

// Die Seite ist auch für nicht-eingeloggte User zugänglich (Token-Auth reicht)
// Nach Submit → Danke-Seite (inline, kein Redirect nötig)
```

### Survey-API `app/api/survey/cancellation/route.ts`

```ts
// POST /api/survey/cancellation
// Body: { token, reason, structured_reason, feedback }

// 1. Token verifizieren (userId extrahieren)
// 2. INSERT cancellations { user_id, reason, structured_reason, feedback }
// 3. Response: { ok: true }
```

---

## 5. Cron: Reaktivierungs-Angebot `app/api/cron/reactivation-offers/route.ts`

```ts
export const runtime = 'nodejs';

// GET /api/cron/reactivation-offers
// Auth: Bearer CRON_SECRET
// Läuft täglich (vercel.json: "0 6 * * *")

// SELECT c.user_id, p.email, p.full_name
// FROM cancellations c
// JOIN profiles p ON p.id = c.user_id
// WHERE c.canceled_at + interval '14 days' < now()
// AND p.is_paid = false
// AND NOT EXISTS (
//   SELECT 1 FROM email_sequence_log
//   WHERE recipient_email = p.email
//   AND sequence = 'reactivation'
//   AND step = 0
// )
// AND p.unsubscribed_at IS NULL
// → Resend: reactivation-offer.tsx (mit Stripe-Promo-Code-Hinweis oder Calendly-CTA)
// → logEmailSent({ sequence: 'reactivation', step: 0 })

// Response: { sent: X }
```

---

## 6. Cron: HT-Upsell `app/api/cron/ht-upsell-60d/route.ts`

```ts
export const runtime = 'nodejs';

// GET /api/cron/ht-upsell-60d
// Auth: Bearer CRON_SECRET
// Läuft täglich (vercel.json: "0 7 * * *")

// SELECT p.id, p.email, p.full_name, p.created_at
// FROM profiles p
// WHERE p.membership_tier = 'monthly'
// AND p.created_at + interval '60 days' < now()
// AND p.ht_upsell_email_sent_at IS NULL
// AND NOT EXISTS (
//   SELECT 1 FROM high_ticket_applications WHERE user_id = p.id
// )
// AND p.unsubscribed_at IS NULL
// → Resend: ht-upsell-60d.tsx (mit Calendly-Link)
// → UPDATE profiles SET ht_upsell_email_sent_at=now() WHERE id=p.id
// → logEmailSent({ sequence: 'ht_upsell', step: 0 })

// Response: { sent: X }
```

---

## 7. vercel.json — Cron-Schedules bestätigen

Die `vercel.json` aus Paket 0 enthält bereits alle Cron-Slots.
Für dieses Paket müssen folgende Endpoints erreichbar und funktional sein:
- `GET /api/cron/check-inactive-users`
- `GET /api/cron/process-dunning`
- `GET /api/cron/reactivation-offers`
- `GET /api/cron/ht-upsell-60d`

---

## Acceptance-Criteria

24. Inaktiv > 7d → Mail 1 kommt → `churn_email_1_sent_at` gesetzt
25. Einloggen nach Mail 1 → `churn_email_1_sent_at` = NULL (Reset)
26. Dunning: +24h Mail 2, +48h Mail 3 + Zugang bereits gesperrt (via Paket 4)
27. Nach Nachzahlung (invoice.paid) → alle `payment_failed_email_*` = NULL
28. Kündigung → Umfrage-Mail → Survey-Submit → `cancellations`-Row → nach 14d Reaktivierungs-Mail
29. 60d Monthly → HT-Upsell-Mail einmalig (nie doppelt)
30. Alle Cron-Endpoints prüfen Bearer-Token: falscher Token → 401
31. `unsubscribed_at IS NULL` wird vor jedem Versand geprüft

---

## Commit

```
feat(paket6): add churn prevention crons, dunning, survey, ht-upsell, login tracking
```
