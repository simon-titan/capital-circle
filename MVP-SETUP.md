# Capital Circle MVP Setup

## 1) Migrationen und Seed ausfuehren

Fuehre in Supabase SQL Editor in dieser Reihenfolge aus:

1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_profile_trigger.sql`
4. `supabase/migrations/004_profiles_insert_policy.sql` (falls noch nicht)
5. `supabase/migrations/005_fix_profiles_rls_recursion.sql`
6. `supabase/migrations/006_dashboard.sql`
7. `supabase/migrations/007_video_system.sql`
8. `supabase/migrations/008_academy_flat.sql` (Akademie: Modul-Slug, Thumbnail, `last_video_id`, `video_progress_by_video`)
9. `supabase/migrations/009_profiles_is_paid.sql` (`profiles.is_paid` fuer Paid-Kurse)
10. `supabase/seed.sql`

**Free vs. Paid:** Module in Kursen mit `courses.is_free = true` sieht jeder eingeloggte Nutzer. Kurse mit `is_free = false` nur Nutzer mit `profiles.is_paid = true`. Lege z. B. zwei Kurse an (Free / Paid) und weise Module dem passenden Kurs zu. Paid-Zugang setzen: `update profiles set is_paid = true where id = '…';`

## 2) Nutzer anlegen

### Option A: Ueber die App

1. `/register` oeffnen
2. Konto erstellen
3. Profil wird automatisch via Trigger angelegt

### Option B: Ueber Script (empfohlen fuer Demo)

Voraussetzung: `.env.local` mit `NEXT_PUBLIC_SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY`.

```bash
npm run create:test-user -- demo@capital-circle.io DemoPass123! true
```

- Letzter Parameter `true|false` setzt `is_admin`.

### Option C: Supabase Dashboard

1. Authentication -> Users -> Invite user
2. Danach Admin-Rechte setzen:

```sql
update profiles
set is_admin = true
where id = '<user-uuid>';
```

## Troubleshooting: Next.js `courseSlug !== segment`

Unter `app/(platform)/ausbildung/` darf **nur** die erste dynamische Ebene `[segment]` existieren (plus optional `[segment]/[moduleId]` fuer Legacy-URLs).

Wenn du versehentlich wieder Ordner **`[courseSlug]`** oder **`[moduleId]`** auf derselben Ebene wie `[segment]` anlegst, bricht der Dev-Server mit genau diesem Fehler.

- Prüfen: `npm run check:routes`
- Beheben (PowerShell): `Remove-Item -LiteralPath 'app\(platform)\ausbildung\[courseSlug]' -Recurse -Force` (analog `[moduleId]`), dann `.next` loeschen und `npm run dev` neu starten.

## Hetzner: Intro-URL vs. S3-Scan

- **Intro-Video** (`NEXT_PUBLIC_INTRO_VIDEO_URL` oder Default): normale **HTTPS-URL** zur Datei — kein Listing noetig.
- **Admin „Bucket scannen“** / Presigned URLs: brauchen **S3-API** in `.env.local`:
  - `HETZNER_ENDPOINT` = z. B. `https://nbg1.your-objectstorage.com` (Region-Endpoint aus der Hetzner-Konsole, **nicht** die lange Public-Object-URL einzelner Keys).
  - `HETZNER_BUCKET_NAME`, `HETZNER_ACCESS_KEY`, `HETZNER_SECRET_KEY`

## 3) Demo-Flow fuer Praesentation

1. Login mit Demo-User
2. Codex bestaetigen
3. Intro-Video ansehen
4. Dashboard erklaeren (Streak/Stats)
5. Events mit iCal Export zeigen
6. Ausbildung + Quiz-Flow zeigen
7. Admin-Bereich zeigen (Kurse, Module, Mitglieder)
