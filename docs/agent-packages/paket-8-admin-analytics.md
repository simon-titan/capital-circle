# Agent-Paket 8 — Admin-Analytics & Polishing

> **Voraussetzung:** Alle Pakete 0–7 müssen abgeschlossen sein.
> **Letzte Welle — kein paralleles Paket.**
> **Verbindliche Source-of-Truth:** `docs/implementation-notes.md`

---

## Mission

Baue das Admin-Analytics-Dashboard und die Polishing-Features:
- MRR, Churn-Rate, Funnel-Konversion
- Payments-Log und Cancellations-Inbox
- Email-Performance via Resend-Webhook
- Manueller User-Tier-Override mit Audit-Log

---

## Cross-Cutting-Regeln

1. **Stack:** Next.js 16.2.1, React 19.2.4, Chakra UI v2, Supabase SSR
2. **Tabelle:** `profiles`, Admin via `requireAdmin()`
3. **Design:** Gold `#D4AF37`, Glassmorphism, DESIGN.json `statWidget`-Tokens. **Kein Blau.**
4. **Hosting:** Vercel

---

## 1. Admin-Analytics-Dashboard `app/(admin)/admin/dashboard/page.tsx`

### Gate
```ts
await requireAdmin();
```

### Sections

#### MRR-Karte
```sql
-- Aktive monatliche Abos × 97 + Lifetime-Revenue letzte 30 Tage
SELECT
  COUNT(*) FILTER (WHERE membership_tier='monthly' AND is_paid=true) * 97 AS mrr_from_subs,
  COALESCE(SUM(amount_cents) FILTER (
    WHERE created_at > now() - interval '30 days'
    AND status = 'succeeded'
  ), 0) / 100 AS lifetime_revenue_30d
FROM profiles, payments
```

Zeige: MRR (total), Anzahl aktive Abos, Lifetime-Käufe (letzte 30d)

**Styling:** `DESIGN.json statWidget.base` (Glassmorphism, `border-radius: 20px`, JetBrains Mono für Zahlen)

#### Churn-Rate
```sql
-- canceled last 30d / active at start of 30d
SELECT
  COUNT(*) FILTER (WHERE canceled_at > now() - interval '30 days') AS canceled_30d,
  COUNT(*) FILTER (WHERE created_at < now() - interval '30 days' AND is_paid=true) AS active_start
FROM cancellations, profiles
```

Zeige als Prozentzahl (JetBrains Mono), mit Trend-Indikator (Pfeil + Farbe)

#### Funnel-Konversion
Drei Kennzahlen für 7d + 30d (Tab-Toggle):
- **Registrierungen:** `COUNT(profiles) WHERE created_at > now()-30d`
- **Approval-Rate:** `approved / (approved + rejected)` aus `applications`
- **Paid-Konversion:** User die nach Approval innerhalb 30d `is_paid=true` wurden

Visualisierung: Funnel-Steps als horizontale Progress-Bars (Gold-Fill, DESIGN.json progressBar)

#### Payments-Log (letzte 30 Tage)
Tabelle mit: Datum, User (Name/Email), Betrag, Typ (Monthly/Lifetime), Status
Filter: Alle / Succeeded / Failed
Links zu Stripe-Invoice-PDF (aus `payments.stripe_invoice_id`)

Styling: `DESIGN.json adminPanel.table*`

#### Cancellations-Inbox
Liste der letzten Cancellation-Survey-Antworten:
- Name, Email, Datum, Structured-Reason (Badge), Freitext
- Sortiert nach Datum absteigend

#### Email-Performance
Tabelle pro Sequence/Template:
- Gesendet (count), Geöffnet (count), Click-Rate
- Daten aus `email_sequence_log` + `opened_at`/`clicked_at`

Hinweis: Daten werden erst nach Resend-Webhook-Integration (Abschnitt 2) befüllt.

---

## 2. Resend-Webhook `app/api/resend/webhook/route.ts`

```ts
export const runtime = 'nodejs';

// POST /api/resend/webhook
// Header: svix-id, svix-timestamp, svix-signature (Resend nutzt Svix)

// Verifizierung:
// import { Webhook } from 'svix';
// const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!);
// const payload = wh.verify(rawBody, headers);

// Events:
// email.opened:
//   UPDATE email_sequence_log
//   SET opened_at = now()
//   WHERE resend_message_id = payload.data.email_id
//   AND opened_at IS NULL

// email.clicked:
//   UPDATE email_sequence_log
//   SET clicked_at = now()
//   WHERE resend_message_id = payload.data.email_id
//   AND clicked_at IS NULL

// Response: { ok: true }
```

**Hinweis:** `npm install svix` hinzufügen (für Resend-Webhook-Signatur-Verifizierung).

**Resend-Dashboard-Setup:**
1. Webhook-Endpoint unter `https://app.capitalcircletrading.com/api/resend/webhook` registrieren
2. Events: `email.opened`, `email.clicked` aktivieren
3. Signing Secret → `RESEND_WEBHOOK_SECRET` ENV

---

## 3. User-Tier-Override im Admin

### User-Detail in Admin erweitern

Im bestehenden `/admin/mitglieder`-Panel (oder neues `/admin/mitglieder/[id]/page.tsx`) ergänzen:

**Tier-Override-Form:**
```tsx
// Dropdown: free | monthly | lifetime | ht_1on1
// access_until: Datums-Input (optional, leerlassen = null)
// Submit: PATCH /api/admin/users/[id]/tier
```

### API `app/api/admin/users/[id]/tier/route.ts`

```ts
// PATCH /api/admin/users/[id]/tier
// Body: { membership_tier, access_until?: string }
// Auth: requireAdmin()

// Ablauf:
// 1. requireAdmin()
// 2. Alten Tier laden (für Audit-Log)
// 3. UPDATE profiles SET
//      membership_tier=newTier,
//      is_paid=(newTier !== 'free'),
//      access_until=newAccessUntil
//    WHERE id=$userId
// 4. INSERT user_audit_log {
//      target_user_id: userId,
//      admin_user_id: adminId,
//      action: 'manual_tier_override',
//      field: 'membership_tier',
//      old_value: oldTier,
//      new_value: newTier,
//      metadata: { access_until: newAccessUntil }
//    }
// 5. Response: { ok: true }
```

---

## 4. Audit-Log-Übersicht im Admin

Optional unter `/admin/mitglieder/[id]` oder als eigene Sektion:

Tabelle: Datum, Admin-Name, Action, Feld, Alt → Neu
Aus `user_audit_log` für diesen User.

---

## 5. Polishing-Aufgaben

### Linter-Bereinigung
Nach allen 8 Paketen: `next lint` laufen lassen, offensichtliche Fehler beheben.

### TypeScript-Checks
`npx tsc --noEmit` — alle Type-Fehler beheben.

### ENV-Check beim Server-Start
In `lib/env.ts` (neu erstellen):
```ts
const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY', 'STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET', 'CRON_SECRET',
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing required ENV variable: ${key}`);
  }
}
```

Diesen Check in einem Server-Only-Modul importieren (z. B. in `lib/stripe/server.ts` und `lib/email/resend.ts` sind bereits Guards — hier zentralisieren).

---

## Acceptance-Criteria

35. Dashboard zeigt aktuelle MRR-Zahl — ändert sich bei neuer `payments`-Row
36. Churn-Rate: manuell nachgerechnet stimmt
37. Funnel-Konversion: 3 Stufen (Registrierungen → Approvals → Paid) korrekt
38. Resend-Webhook empfängt `email.opened` → `email_sequence_log.opened_at` gesetzt
39. Admin-Tier-Override → `membership_tier` geändert, `user_audit_log`-Eintrag vorhanden
40. `npx tsc --noEmit` ohne Fehler
41. `next lint` ohne neue Fehler (pre-existierende Fehler können bestehen bleiben)

---

## Commit

```
feat(paket8): add admin analytics dashboard, resend webhook, tier override, audit log
```
