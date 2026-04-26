# Agent-Paket 7 — High-Ticket Bewerbung

> **Voraussetzung:** Pakete 0, 1 und 2 müssen abgeschlossen sein. Paket 4 hilfreich (für Stripe-CTAs), aber nicht zwingend.
> **Kann parallel zu Paketen 5 und 6 ausgeführt werden.**
> **Verbindliche Source-of-Truth:** `docs/implementation-notes.md`

---

## Mission

Baue die dedizierte High-Ticket-Bewerbungsseite:
- Multi-Step-Form mit 8 Fragen + Budget-Split
- Zwei separate Thank-You-Seiten je nach Budget
- Admin-Panel für HT-Bewerbungen

Die 8 Fragen kommen aus `config/ht-questions.ts` (anpassbar ohne Deploy).

---

## Cross-Cutting-Regeln

1. **Stack:** Next.js 16.2.1, React 19.2.4, Chakra UI v2
2. **Tabelle:** `profiles`, Admin via `requireAdmin()`
3. **Design:** Gold `#D4AF37`, Glassmorphism, Radley/Inter/JetBrains Mono. **Kein Blau.**
4. **DSGVO:** Öffentliche Form mit Turnstile + Rate-Limit
5. **Route-Groups:** `/apply` in `app/(marketing)/apply/`, Admin in `app/(admin)/admin/`
6. **Konfigurierbar:** Fragen in `config/ht-questions.ts` — kein Deploy nötig für Text-Änderungen

---

## 1. Fragen-Konfiguration `config/ht-questions.ts`

```ts
export interface HTQuestion {
  id: string;
  question: string;
  placeholder: string;
  type: 'textarea' | 'text' | 'select';
  options?: string[];  // nur für type='select'
  required: boolean;
  minLength?: number;
}

export const HT_QUESTIONS: HTQuestion[] = [
  {
    id: 'current_situation',
    question: 'Beschreibe deine aktuelle Trading-Situation. Wie lange tradest du bereits?',
    placeholder: 'z. B. Ich trade seit 2 Jahren hauptsächlich Forex...',
    type: 'textarea',
    required: true,
    minLength: 50,
  },
  {
    id: 'biggest_challenge',
    question: 'Was ist dein größtes Problem oder deine größte Herausforderung im Trading?',
    placeholder: 'z. B. Ich verliere Disziplin bei großen Bewegungen...',
    type: 'textarea',
    required: true,
    minLength: 50,
  },
  {
    id: 'goals',
    question: 'Was möchtest du in den nächsten 6–12 Monaten im Trading erreichen?',
    placeholder: 'z. B. Konsistent 5-10% monatlich erzielen...',
    type: 'textarea',
    required: true,
    minLength: 50,
  },
  {
    id: 'previous_mentoring',
    question: 'Hast du bereits an Trading-Coachings oder Mentoring-Programmen teilgenommen?',
    placeholder: 'Falls ja, beschreibe kurz die Erfahrung...',
    type: 'textarea',
    required: false,
  },
  {
    id: 'motivation',
    question: 'Warum möchtest du jetzt mit uns zusammenarbeiten? Was hat dich auf uns aufmerksam gemacht?',
    placeholder: 'z. B. Ich habe Emres Videos auf YouTube gesehen...',
    type: 'textarea',
    required: true,
    minLength: 30,
  },
  {
    id: 'time_commitment',
    question: 'Wie viele Stunden pro Woche kannst du realistisch in dein Trading und das Mentoring investieren?',
    placeholder: 'z. B. 15-20 Stunden pro Woche',
    type: 'text',
    required: true,
  },
  {
    id: 'whatsapp_number',
    question: 'Deine WhatsApp-Nummer (für die Kontaktaufnahme innerhalb 2h nach Bewerbung)',
    placeholder: '+49 170 1234567',
    type: 'text',
    required: true,
  },
  {
    id: 'budget',
    question: 'Wie viel kannst du aktuell in deine Trading-Ausbildung investieren?',
    placeholder: '',
    type: 'select',
    options: ['under_2000', 'over_2000'],
    required: true,
  },
];

// Display-Labels für Budget-Optionen
export const BUDGET_LABELS: Record<string, string> = {
  under_2000: 'Bis 2.000 € (Mitgliedschaft)',
  over_2000: 'Über 2.000 € (1:1 Mentoring)',
};
```

---

## 2. Bewerbungsseite `app/(marketing)/apply/page.tsx`

### Layout

```
┌─────────────────────────────────────────────────────────┐
│         [VIDEO 16:9 — 2-3 Min, "Was erwartet dich"]     │
│         HTML5 <video>, max-width: 768px                  │
│                                                          │
│  Step 3 von 8  ████████████░░░░░░░░  (Progress-Bar Gold) │
│                                                          │
│  ┌─── Glassmorphism-Card ───────────────────────────┐   │
│  │  Frage 3 von 8                                   │   │
│  │  "Was möchtest du in den nächsten 6-12 Monaten    │   │
│  │   im Trading erreichen?"                          │   │
│  │                                                   │   │
│  │  [Textarea / Input]                               │   │
│  │                                                   │   │
│  │  [← Zurück]           [Weiter →] (Gold Button)    │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Multi-Step-Logic

```tsx
'use client';

import { HT_QUESTIONS, BUDGET_LABELS } from '@/config/ht-questions';
import { useState } from 'react';

// State:
// currentStep: 0..HT_QUESTIONS.length-1
// answers: Record<string, string>
// isSubmitting: boolean

// Navigation:
// Zurück: currentStep > 0 → decrement
// Weiter: Validierung der aktuellen Frage → increment
// Letzter Step: Budget-Auswahl → Submit

// Budget-Step (letzte Frage, type='select'):
// Radio-Buttons statt Dropdown:
//   [○] Bis 2.000 € (Mitgliedschaft)
//   [○] Über 2.000 € (1:1 Mentoring)
```

### Submit

```ts
async function handleSubmit() {
  // 1. Turnstile-Token aus Widget holen
  // 2. POST /api/ht-applications/create mit { answers, turnstileToken }
  // 3. Redirect je nach budget_tier:
  //    - over_2000  → /apply/thanks-high-ticket
  //    - under_2000 → /apply/thanks-membership
}
```

### Progress-Bar Styling (Gold, aus DESIGN.json)
```css
height: 5px;
background: rgba(255,255,255,0.08);
border-radius: 9999px;
fill: linear-gradient(90deg, #A67C00 0%, #D4AF37 100%);
box-shadow: 0 0 8px rgba(212,175,55,0.30);
```

---

## 3. API `app/api/ht-applications/create/route.ts`

```ts
// POST /api/ht-applications/create
// Body: { answers: Record<string, string>, turnstileToken }
// Auth: Optional (User muss NICHT eingeloggt sein)

// Ablauf:
// 1. Turnstile-Verify
// 2. Rate-Limit: max 3 Bewerbungen pro IP pro 24h
// 3. Alle Felder aus answers extrahieren
//    - whatsapp_number aus answers.whatsapp_number
//    - budget_tier aus answers.budget (='under_2000'|'over_2000')
//    - email aus answers (falls kein eingeloggter User, als separates Feld)
// 4. INSERT high_ticket_applications { email, name, whatsapp_number, answers, budget_tier }
// 5. Falls budget_tier = 'over_2000' UND SLACK_WEBHOOK_URL gesetzt:
//    → Slack-Notification: "🔥 Neue HT-Bewerbung (über 2.000€): {name}, {email}, WhatsApp: {number}"
// 6. Response: { ok: true, budget_tier }
```

---

## 4. Thank-You Seiten

### `/apply/thanks-high-ticket/page.tsx` (für `over_2000`)

```
┌─────────────────────────────────────────────────────────┐
│  [VIDEO 16:9 — "Ich melde mich persönlich!"]            │
│                                                         │
│  Heading (Radley): "Danke für deine Bewerbung!"         │
│                                                         │
│  Text: "Du hörst innerhalb von 2 Stunden per WhatsApp   │
│  von mir persönlich. Schau auch in deine Emails."       │
│                                                         │
│  [Optionaler WhatsApp-Link als Fallback]                │
│  a href="https://wa.me/{NEXT_PUBLIC_WHATSAPP_NUMBER}"   │
│  target="_blank"                                        │
│                                                         │
│  KEIN Kauf-Button — KEIN Stripe-Link                    │
└─────────────────────────────────────────────────────────┘
```

### `/apply/thanks-membership/page.tsx` (für `under_2000`)

```
┌─────────────────────────────────────────────────────────┐
│  [VIDEO 16:9 — "Du hast bestanden / Plattform-Preview"] │
│                                                         │
│  Heading (Radley): "Du hast alle Voraussetzungen        │
│  erfüllt!"                                              │
│                                                         │
│  Sales-Copy (Inter): Warum Capital Circle, was dich     │
│  erwartet, soziale Beweise                              │
│                                                         │
│  ┌─── Pricing-CTA ───────────────────────────────────┐  │
│  │  [97 € / Monat →]  [699 € Lifetime →]             │  │
│  │  (Gold Primary Buttons → /checkout?plan=monthly)   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  [Doch lieber Fragen? → Calendly] (Ghost, klein)        │
└─────────────────────────────────────────────────────────┘
```

**ENV-Variable:** `NEXT_PUBLIC_WHATSAPP_NUMBER` für WhatsApp-Link auf thanks-high-ticket.

---

## 5. Admin-Panel HT-Bewerbungen `app/(admin)/admin/ht-applications/page.tsx`

### Gate
```ts
await requireAdmin();
```

### UI-Struktur

```
┌─────────────────────────────────────────────────────────┐
│  HT-Bewerbungen                                         │
│  Filter: [Budget: Alle / Unter 2k / Über 2k]            │
│           [Outcome: Alle / Pending / Won / Lost / NoShow]│
│                                                         │
│  ┌── 🔥 über_2000 ──────────────────────────────────┐  │
│  │  Max Mustermann · max@example.com · vor 1h        │  │
│  │  WhatsApp: +49 170 123456 [Link]                  │  │
│  │  Budget: Über 2.000 € (🔥 PRIORITY)               │  │
│  │  [Alle 8 Antworten aufklappen]                    │  │
│  │  Outcome: [Pending ▼] Notes: [____________]       │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌── under_2000 ─────────────────────────────────────┐  │
│  │  ...                                              │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Komponenten:**
- `over_2000`-Bewerbungen immer oben mit 🔥-Priority-Badge (Gold-accentBorder-Card)
- Expandable Cards: zugeklappt = Name/Email/Budget/Datum; aufgeklappt = alle 8 Antworten
- WhatsApp-Link: `href="https://wa.me/{nummer}"` (formatiere Zahl)
- Outcome-Dropdown: `closed_won | closed_lost | no_show | pending` → PUT-API
- Notes-Feld: inline editierbar → PATCH-API
- Bei `closed_won`: Button „Zugang aktivieren" → setzt `membership_tier='ht_1on1'` + `is_paid=true` in `profiles`

**Outcome-API `app/api/admin/ht-applications/[id]/outcome/route.ts`:**
```ts
// PATCH /api/admin/ht-applications/[id]/outcome
// Body: { outcome, internal_notes? }
// Auth: requireAdmin()
// UPDATE high_ticket_applications SET outcome=..., internal_notes=... WHERE id=$id
// Falls outcome='closed_won':
//   UPDATE profiles SET membership_tier='ht_1on1', is_paid=true WHERE id=application.user_id
//   INSERT user_audit_log { action: 'manual_tier_upgrade', field: 'membership_tier', new_value: 'ht_1on1', admin_user_id }
```

---

## 6. Slack-Notification

```ts
// lib/notifications/slack.ts
export async function sendSlackNotification(message: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;  // Kein Slack konfiguriert → silent skip

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });
}
```

---

## Acceptance-Criteria

30. `/apply` zeigt Video + 8 Fragen als Multi-Step mit Gold-Progress-Bar
31. Navigation Vor/Zurück funktioniert, Validierung pro Schritt
32. Submit `over_2000` → `/apply/thanks-high-ticket` (kein Kaufbutton, WhatsApp-Link)
33. Submit `under_2000` → `/apply/thanks-membership` (Gold Stripe-CTAs, Calendly-Sekundär)
34. `high_ticket_applications`-Row mit `answers` JSONB korrekt
35. Admin-Panel zeigt `over_2000` mit 🔥-Badge oben
36. Admin kann Outcome setzen (Dropdown), Notes speichern
37. Admin-Button „Zugang aktivieren" → `membership_tier='ht_1on1'` + `user_audit_log`-Eintrag
38. Slack-Notification bei neuer `over_2000`-Bewerbung (wenn SLACK_WEBHOOK_URL gesetzt)
39. Turnstile-Fehler → kein Insert

---

## Commit

```
feat(paket7): add high-ticket application flow, thanks pages, admin ht panel
```
