# Agent-Paket 3 — Free-Funnel & Bewerber-Review

> **Voraussetzung:** Pakete 0, 1 und 2 müssen abgeschlossen sein.
> **Kann parallel zu Paket 4 ausgeführt werden.**
> **Verbindliche Source-of-Truth:** `docs/implementation-notes.md`

---

## Mission

Baue den kompletten Free-Funnel:
- Öffentliche Bewerbungsseite `/free` (3-Sektionen-Form)
- API-Endpoints für Bewerbung + Admin-Review
- Admin-Panel für Bewerber-Übersicht
- Pending-Review-Warteseite
- Cron für 5-Tage-Email-Sequenz

---

## Cross-Cutting-Regeln

1. **Stack:** Next.js 16.2.1, React 19.2.4, Chakra UI v2, Supabase SSR
2. **Tabelle:** `profiles`. Admin via `requireAdmin()` aus `lib/supabase/admin-auth.ts`
3. **Middleware:** `proxy.ts` — Routing-Änderungen hier eintragen
4. **Design:** Gold `#D4AF37`, Glassmorphism aus DESIGN.json, `HERO-UI-SPEZIFIKATION.md` als Stil-Referenz. **Kein Blau.**
5. **Route-Groups:** Marketing-Seiten in `app/(marketing)/`, Auth-geschützte Seiten in `app/(platform)/`, Admin in `app/(admin)/admin/`
6. **DSGVO:** Öffentliche Forms brauchen Turnstile + Rate-Limit

---

## 1. Öffentliche Bewerbungsseite `app/(marketing)/free/page.tsx`

### Route-Group anlegen (falls nicht vorhanden)
Erstelle `app/(marketing)/layout.tsx` — minimales Layout ohne Auth-Gate.

### Form-Design (3 Sektionen, Progressive Disclosure)

**Sektion 1 — Account**
- Felder: Vollständiger Name, Email, Passwort (min. 8 Zeichen)
- Submit → `supabase.auth.signUp()` → Email-Verify-Hinweis
- Bei Fehler (Email schon vergeben etc.) → inline Error-State
- Cloudflare Turnstile Widget vor Submit-Button

**Sektion 2 — 3 Pflichtfragen** (erscheint nach erfolgreichem Signup)
- Frage 1: „Wie viel Erfahrung hast du im Trading?" (Textarea, min. 30 Zeichen)
- Frage 2: „Was ist aktuell dein größtes Problem?" (Textarea, min. 50 Zeichen)
- Frage 3: „Was willst du in den nächsten 6 Monaten erreichen?" (Textarea, min. 50 Zeichen)
- Submit → `POST /api/applications/create`

**Sektion 3 — Thank-You**
- Text: „Deine Bewerbung ist eingegangen. Wir prüfen innerhalb 24–48h und du hörst per Email von uns."
- Kein Plattform-Zugang vor Approve

**Styling:**
```
// Card-Container (DESIGN.json glassmorphism.medium):
background: rgba(255, 255, 255, 0.05)
backdrop-filter: blur(16px)
border: 1px solid rgba(255, 255, 255, 0.09)
border-radius: 16px
padding: 32px
max-width: 560px
margin: 0 auto
```
Heading in Radley-Font. Labels/Text in Inter. Inputs mit Gold-Focus-Border.
Primary-Button: Gold Gradient (aus DESIGN.json `button.variants.primary`).

### Cloudflare Turnstile-Integration
```tsx
// Einfache Script-Tag-Integration (kein npm-Package nötig):
// <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
// <div class="cf-turnstile" data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}></div>
// Server-Side-Verify: POST https://challenges.cloudflare.com/turnstile/v0/siteverify
```

---

## 2. API `app/api/applications/create/route.ts`

```ts
// POST /api/applications/create
// Body: { experience, biggest_problem, goal_6_months, turnstileToken }
// Auth-Check: eingeloggter User (supabase.auth.getUser())

// Ablauf:
// 1. Supabase-Auth-Check
// 2. Turnstile-Server-Side-Verify
// 3. Rate-Limit: prüfe ob bereits eine Application für diese user_id existiert (unique pro User)
// 4. Validierung: alle 3 Felder + Mindestlängen
// 5. INSERT in applications + UPDATE profiles.application_status = 'pending'
// 6. IP + User-Agent aus Request-Headers loggen
// 7. Response: { ok: true, applicationId }
// KEINE Email senden — das macht erst der Admin-Approve
```

---

## 3. API `app/api/admin/applications/[id]/approve/route.ts`

```ts
// POST /api/admin/applications/[id]/approve
// Auth: requireAdmin()

// Ablauf (alles in einer Transaktion via RPC oder sequenziell):
// 1. isAdmin-Check
// 2. UPDATE applications SET status='approved', reviewed_at=now(), reviewed_by=auth.uid(),
//    welcome_sequence_started_at=now() WHERE id=$id AND status='pending'
// 3. Wenn 0 affected rows → 409 Conflict (bereits reviewed oder nicht gefunden)
// 4. UPDATE profiles SET application_status='approved' WHERE id=application.user_id
// 5. Nach Commit (async, nicht awaiten für Response):
//    - resend: welcome-free-course Template
//    - logEmailSent({ sequence: 'free_course_welcome', step: 0, ... })
// 6. Response: { ok: true }
```

---

## 4. API `app/api/admin/applications/[id]/reject/route.ts`

```ts
// POST /api/admin/applications/[id]/reject
// Body: { reason?: string }  // intern, NICHT im Email-Body
// Auth: requireAdmin()

// Ablauf:
// 1. isAdmin-Check
// 2. UPDATE applications SET status='rejected', reviewed_at=now(),
//    reviewed_by=auth.uid(), rejection_reason=reason WHERE id=$id AND status='pending'
// 3. Wenn 0 affected rows → 409 Conflict
// 4. UPDATE profiles SET application_status='rejected' WHERE id=application.user_id
// 5. Nach Commit (async):
//    - resend: application-rejected Template (KEIN Grund im Email-Body)
//    - logEmailSent({ sequence: 'application_rejected', step: 0, ... })
// 6. Response: { ok: true }
```

---

## 5. Admin-Panel `app/(admin)/admin/applications/page.tsx`

### Gate
```ts
// Erste Zeile der Server-Component:
await requireAdmin();  // aus lib/supabase/admin-auth.ts — wirft bei Non-Admin
```

### UI-Struktur

```
┌─────────────────────────────────────────────────────────┐
│  Bewerbungen                                            │
│  [Pending 12] [Approved 45] [Rejected 8] [All]          │
│                                                         │
│  Filter: [Email suchen...] [Datum von] [Datum bis]      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 🟡 Max Mustermann · max@example.com · vor 2h    │    │
│  │ ▼ (aufgeklappt):                                │    │
│  │ Erfahrung: ...                                  │    │
│  │ Problem: ...                                    │    │
│  │ Ziel: ...                                       │    │
│  │              [ ✓ Annehmen ] [ ✗ Ablehnen ]      │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Komponenten:**
- Tabs mit Live-Counter: Pending (Default) / Approved / Rejected / All
- Expandable Cards: zugeklappt = Name + Email + Datum; aufgeklappt = 3 Antworten voll
- **Pending Cards:** Zwei Buttons:
  - „✓ Annehmen" → Gold Primary Button → POST `/api/admin/applications/[id]/approve`
  - „✗ Ablehnen" → Danger Ghost Button → öffnet Modal
- **Reject-Modal:** Optionales Grund-Feld (intern, nicht im Email-Body), Confirm-Button
- **Approved/Rejected Cards:** Buttons ausgeblendet, Badge „✓ Angenommen am [Datum] durch [Name]"
- Filter: Email-Suche (Client-Side), Datum-Range

**Styling:** Nutze `DESIGN.json adminPanel.table*` Tokens.
Badges: Pending = Warning-Yellow, Approved = Success-Green, Rejected = Error-Red (aus `DESIGN.json semantic.*`).

---

## 6. Pending-Review-Seite `app/(platform)/pending-review/page.tsx`

Einfache Seite für User mit `application_status = 'pending'`:
- Heading: „Deine Bewerbung wird geprüft"
- Text: „Wir melden uns innerhalb von 24–48h per Email bei dir."
- Kein Logout-Button nötig (Nav ist sowieso ausgeblendet oder minimal)

---

## 7. Cron `app/api/cron/free-course-sequence/route.ts`

```ts
export const runtime = 'nodejs';

// GET /api/cron/free-course-sequence
// Auth: Bearer $CRON_SECRET

// Für jeden step in [1, 2, 3, 5]:
//   SELECT applications a JOIN profiles p ON p.id = a.user_id
//   WHERE a.status = 'approved'
//   AND a.welcome_sequence_started_at + interval '{step} days' < now()
//   AND NOT EXISTS (
//     SELECT 1 FROM email_sequence_log
//     WHERE recipient_email = a.email
//     AND sequence = 'free_course_welcome'
//     AND step = {step}
//   )
//   AND (p.unsubscribed_at IS NULL)
//
//   Pro Treffer:
//   - Template senden (free-course-day-{step})
//   - logEmailSent() (UNIQUE verhindert Dopplungen)
//
// Response: { sent: { step1: X, step2: Y, step3: Z, step5: W } }
```

`vercel.json` enthält bereits `"0 5 * * *"` für diesen Endpoint.

---

## 8. Proxy-Erweiterungen `proxy.ts`

Erweitere den bestehenden Profil-Query um neue Spalten:

```ts
// Bestehend:
.select("codex_accepted,intro_video_watched,usage_agreement_accepted,is_admin")
// Ersetzen durch:
.select("codex_accepted,intro_video_watched,usage_agreement_accepted,is_admin,is_paid,application_status,membership_tier,access_until")
```

Neue Gating-Regeln **nach** dem bestehenden Onboarding-Check einfügen:

```ts
// Neue öffentliche Paths ergänzen:
const PUBLIC_PATHS = ["/einsteig", "/login", "/register", "/free", "/pricing", "/apply"];

// Nach Onboarding-Check:
// User mit pending application → /pending-review
if (profile?.application_status === 'pending' && pathname !== '/pending-review') {
  return NextResponse.redirect(new URL('/pending-review', request.url));
}
// User auf /pending-review aber nicht mehr pending → /dashboard
if (profile?.application_status !== 'pending' && pathname === '/pending-review') {
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
```

---

## Acceptance-Criteria

1. `/free` → Form rendert korrekt, 3 Sektionen, Turnstile-Widget sichtbar
2. Signup über `/free` → Account erstellt, keine Email außer Supabase-Verify
3. 3-Fragen-Submit → `applications.status='pending'`, `profiles.application_status='pending'`
4. Eingeloggter User mit `pending` → `/pending-review` (kein Dashboard-Zugang)
5. Admin sieht Application im Panel Tab „Pending"
6. Admin klickt „Annehmen" → Welcome-Mail kommt, `profiles.application_status='approved'`
7. Doppel-Click „Annehmen" → 409, keine zweite Mail
8. Admin klickt „Ablehnen" mit Grund → Rejection-Mail (Grund nicht im Body), Status `rejected`
9. Cron `free-course-sequence` → Mail 1/2/3/5 nur an User mit passendem Intervall
10. UNIQUE in `email_sequence_log` verhindert Doppelversand
11. Non-Admin auf `/admin/applications` → 404 oder Dashboard-Redirect
12. Turnstile-Verify schlägt fehl → 403-Fehler, kein Insert

---

## Commit

```
feat(paket3): add free funnel, application review panel, free-course cron
```
