# Agent-Paket 2 — Email-Infrastruktur

> **Voraussetzung:** Paket 0 abgeschlossen.
> **Kann parallel zu Paket 1 ausgeführt werden.**
> **Paket 3 und Paket 4 sind von diesem Paket abhängig.**
> **Verbindliche Source-of-Truth:** `docs/implementation-notes.md`

---

## Mission

Baue die komplette Email-Infrastruktur auf Basis von **Resend + React-Email**:
- Basis-Layout-Komponente im Gold-Design
- ~13 Email-Templates
- Sequence-Log-Helper (Idempotenz)
- DSGVO-Unsubscribe-Endpoint
- Migration der bestehenden HTML-String-Mail auf neues System

**Stripe- oder DB-Logik gehört NICHT in dieses Paket.**

---

## Cross-Cutting-Regeln

1. **Stack:** Next.js 16.2.1, React 19.2.4, Chakra UI v2, Supabase SSR
2. **Tabelle:** `profiles`, Admin via `requireAdmin()`
3. **Hosting:** Vercel
4. **Design:** Gold `#D4AF37`, BG `#0C0D10`, Text `#F0F0F2` — **kein Blau**
5. **DSGVO:** Jede ausgehende Mail MUSS einen Unsubscribe-Link enthalten
6. **React-Email:** `@react-email/components` ist deprecated. Nutze eigene Komponenten + `render()` aus `@react-email/render`

---

## 1. Resend-Client `lib/email/resend.ts`

```ts
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY missing');

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM = `${process.env.RESEND_FROM_NAME ?? 'Capital Circle'} <${process.env.RESEND_FROM_EMAIL}>`;
```

---

## 2. Email-Base-Layout `lib/email/layout/BaseEmail.tsx`

Erstelle eine wiederverwendbare Basis-Layout-Komponente für alle Templates.

**Design-Tokens (hartcodiert aus DESIGN.json — NICHT ändern):**
- Background: `#0C0D10`
- Text primär: `#F0F0F2`
- Text sekundär: `#9A9AA4`
- Akzent Gold: `#D4AF37`
- Akzent Gold Light: `#E8C547`
- Border: `rgba(255,255,255,0.09)`

**Props:**
```ts
interface BaseEmailProps {
  children: React.ReactNode;
  previewText: string;
  unsubscribeToken?: string;  // für Footer-Link
}
```

**Layout-Struktur:**
- Äußerer Container: `max-width: 600px`, `margin: 0 auto`, BG `#0C0D10`
- Header: Logo „Capital Circle" in Radley-Font, Gold, centered
- Goldene Trennlinie (2px, `linear-gradient(90deg, #D4AF37, #A67C00)`)
- Content-Block: weiße Cards auf dunklem Hintergrund, `border-radius: 16px`, `border: 1px solid rgba(255,255,255,0.09)`
- Footer: Klein, `#606068`, Links in Gold — muss enthalten:
  - „Capital Circle Institut"
  - Impressum (Link zu `${APP_URL}/impressum`)
  - Datenschutz (Link zu `${APP_URL}/datenschutz`)
  - **Unsubscribe-Link** wenn `unsubscribeToken` übergeben: `${APP_URL}/api/unsubscribe?token=${unsubscribeToken}`

**Font-Hinweis in Email:**
Da Webfonts in Emails nicht zuverlässig laden, System-Fallbacks nutzen:
- Heading: `'Georgia', serif` (steht Radley nahe)
- Body: `'Helvetica Neue', Helvetica, Arial, sans-serif`
- Mono: `'Courier New', monospace`

---

## 3. Sequence-Log-Helper `lib/email/sequence-log.ts`

```ts
import { createServiceClient } from '@/lib/supabase/service';  // Service-Role-Client

interface LogEntry {
  userId: string;
  applicationId?: string;
  recipientEmail: string;
  sequence: string;
  step: number;
  resendMessageId?: string;
}

/**
 * Loggt gesendete Email. Gibt false zurück wenn bereits gesendet (UNIQUE-Verletzung).
 * Idempotent — doppelter Aufruf = kein Fehler, kein Doppelversand.
 */
export async function logEmailSent(entry: LogEntry): Promise<boolean> {
  const supabase = createServiceClient();
  const { error } = await supabase.from('email_sequence_log').insert({
    user_id: entry.userId,
    application_id: entry.applicationId,
    recipient_email: entry.recipientEmail,
    sequence: entry.sequence,
    step: entry.step,
    resend_message_id: entry.resendMessageId,
  });
  if (error?.code === '23505') return false;  // UNIQUE-Verletzung = bereits gesendet
  if (error) throw error;
  return true;
}

/**
 * Prüft ob Email bereits gesendet (ohne Insert-Versuch).
 */
export async function wasEmailSent(recipientEmail: string, sequence: string, step: number): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('email_sequence_log')
    .select('id')
    .eq('recipient_email', recipientEmail)
    .eq('sequence', sequence)
    .eq('step', step)
    .maybeSingle();
  return !!data;
}
```

**Hinweis:** `lib/supabase/service.ts` muss einen Service-Role-Supabase-Client exportieren
(mit `SUPABASE_SERVICE_ROLE_KEY`). Falls noch nicht vorhanden, anlegen:

```ts
// lib/supabase/service.ts
import { createClient } from '@supabase/supabase-js';
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
```

---

## 4. Unsubscribe-Token-Helper `lib/email/unsubscribe-token.ts`

```ts
import { createHmac } from 'crypto';

const SECRET = process.env.UNSUBSCRIBE_TOKEN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function generateUnsubscribeToken(userId: string): string {
  const payload = `${userId}:unsubscribe`;
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
  return Buffer.from(JSON.stringify({ userId, sig })).toString('base64url');
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const { userId, sig } = JSON.parse(Buffer.from(token, 'base64url').toString());
    const expected = createHmac('sha256', SECRET).update(`${userId}:unsubscribe`).digest('base64url');
    if (sig !== expected) return null;
    return userId;
  } catch {
    return null;
  }
}
```

---

## 5. Unsubscribe-Endpoint `app/api/unsubscribe/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return new NextResponse('Token fehlt', { status: 400 });

  const userId = verifyUnsubscribeToken(token);
  if (!userId) return new NextResponse('Ungültiger Token', { status: 400 });

  const supabase = createServiceClient();
  await supabase
    .from('profiles')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('id', userId);

  // Redirect zu einer Bestätigungs-Seite (kann einfache Inline-HTML-Response sein)
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Abgemeldet</title></head>
    <body style="font-family:sans-serif;text-align:center;padding:60px;background:#07080A;color:#F0F0F2">
    <h1 style="color:#D4AF37">Erfolgreich abgemeldet</h1>
    <p>Du erhältst keine weiteren Emails von Capital Circle.</p>
    </body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  );
}
```

---

## 6. Email-Templates

Erstelle alle Templates unter `lib/email/templates/`.
Jedes Template ist eine React-Komponente (`.tsx`) und exportiert einen `send`-Helper.

**Gemeinsame Template-Struktur:**
```tsx
import { render } from '@react-email/render';
import { resend, FROM } from '../resend';
import { BaseEmail } from '../layout/BaseEmail';
import { generateUnsubscribeToken } from '../unsubscribe-token';

interface Props {
  firstName: string;
  email: string;
  userId: string;
  // ... weitere Props
}

function EmailTemplate({ firstName, userId, ...props }: Props) {
  const unsubToken = generateUnsubscribeToken(userId);
  return (
    <BaseEmail previewText="..." unsubscribeToken={unsubToken}>
      {/* Content */}
    </BaseEmail>
  );
}

export async function sendWelcomeFreeCourse({ firstName, email, userId }: Props) {
  const html = await render(<EmailTemplate firstName={firstName} email={email} userId={userId} />);
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `Willkommen bei Capital Circle, ${firstName}!`,
    html,
  });
}
```

### Template-Liste (alle erstellen)

| Dateiname | `sequence`-Key | Trigger | Subject |
|-----------|---------------|---------|---------|
| `welcome-free-course.tsx` | `free_course_welcome` | Admin Approve | `Willkommen bei Capital Circle! Dein Zugang ist aktiv` |
| `application-rejected.tsx` | `application_rejected` | Admin Reject | `Deine Bewerbung bei Capital Circle` |
| `free-course-day-1.tsx` | `free_course_welcome` step 1 | Cron Tag +1 | `[Tag 1] Dein erster Schritt — Capital Circle` |
| `free-course-day-2.tsx` | `free_course_welcome` step 2 | Cron Tag +2 | `[Tag 2] Das Fundament deines Tradings` |
| `free-course-day-3.tsx` | `free_course_welcome` step 3 | Cron Tag +3 | `[Tag 3] Der entscheidende Unterschied` |
| `free-course-day-5.tsx` | `free_course_welcome` step 5 | Cron Tag +5 | `[Tag 5] Bereit für den nächsten Level?` |
| `welcome-paid.tsx` | `paid_welcome` | Stripe-Webhook | `🎉 Dein Capital Circle Zugang ist aktiv` |
| `payment-failed-1.tsx` | `payment_failed` step 1 | Stripe-Webhook | `Zahlungsproblem — bitte jetzt beheben` |
| `payment-failed-2.tsx` | `payment_failed` step 2 | Cron +24h | `Du verlierst bald deinen Zugang` |
| `payment-failed-3.tsx` | `payment_failed` step 3 | Cron +48h | `Dein Zugang ist pausiert — jetzt reaktivieren` |
| `churn-inactive-7d.tsx` | `churn_inactive` step 7 | Cron Tag +7 | `Du verpasst gerade etwas...` |
| `churn-inactive-14d.tsx` | `churn_inactive` step 14 | Cron Tag +14 | `Hey {{firstName}}, alles okay bei dir?` |
| `cancellation-survey.tsx` | `cancellation` step 0 | Stripe-Webhook `subscription.deleted` | `Danke für deine Zeit — kurzes Feedback?` |
| `reactivation-offer.tsx` | `reactivation` step 0 | Cron +14d nach Cancellation | `Wir würden dich gern zurückbegrüßen` |
| `ht-upsell-60d.tsx` | `ht_upsell` step 0 | Cron +60d | `Bereit für den nächsten Schritt, {{firstName}}?` |

**Content-Hinweis:** Alle Templates bekommen **Platzhalter-Copy** in Deutsch.
Struktur: Hook → Value → CTA. Emre ersetzt später nur Text, nicht Struktur.

**`free-course-day-5.tsx`** enthält zusätzlich einen Soft-Pitch CTA-Button zu `/pricing`.

**`cancellation-survey.tsx`** enthält einen Token-Link zu `/survey/cancellation?token=XXX`
(Token via `generateUnsubscribeToken` — gleiche Logik, eigener Pfad).

**`ht-upsell-60d.tsx`** enthält Calendly-Link (aus `process.env.NEXT_PUBLIC_CALENDLY_URL`).

---

## 7. Bestehende Welcome-Mail migrieren

`lib/email/welcome-mail.ts` (HTML-String) → auf neues System umstellen.
Die öffentliche API der Datei (exportierte Funktion) darf sich **nicht ändern** — nur intern auf React-Email migrieren.

---

## Acceptance-Criteria

1. `lib/email/resend.ts` — Client-Export mit ENV-Guard
2. `lib/email/layout/BaseEmail.tsx` — Basis-Layout mit Gold-Design, Unsubscribe-Footer
3. `lib/email/sequence-log.ts` — `logEmailSent()`, `wasEmailSent()` mit Idempotenz
4. `lib/email/unsubscribe-token.ts` — HMAC-basierte Token-Generierung + Verifizierung
5. `app/api/unsubscribe/route.ts` — GET mit Token-Param, setzt `profiles.unsubscribed_at`
6. Alle 15 Templates vorhanden (Platzhalter-Copy okay)
7. Jedes Template enthält Unsubscribe-Link
8. `lib/supabase/service.ts` exportiert `createServiceClient()`
9. Bestehende `lib/email/welcome-mail.ts` weiterhin funktional (kein Breaking-Change)

---

## Commit

```
feat(paket2): add email infrastructure with react-email, 15 templates, unsubscribe endpoint
```
