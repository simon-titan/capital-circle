# Deploy nach Vercel — Checkliste

Stand 16.09.2026, gegen die Datenbank geprüft. Alle Werte liegen in `.env.local`; diese Datei sagt nur, **welche**
Schlüssel nach Vercel gehören und **welche Werte dort anders lauten müssen** als lokal.

Projekt: `simon-titan/capital-circle` · Domain `capitalcircletrading.com`

---

## 1. Umgebungsvariablen in Vercel

Vercel → Project → Settings → Environment Variables. Scope jeweils
**Production + Preview + Development**, sofern nicht anders vermerkt.

### Pflicht — ohne diese startet die App nicht

| Variable | Quelle | Anders als lokal? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | nein |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | nein |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` | nein |
| `RESEND_API_KEY` | `.env.local` | nein |
| `STRIPE_SECRET_KEY` | Stripe Dashboard | **ja — `sk_live_…` statt `sk_test_…`** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard | **ja — `pk_live_…`** |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhook-Endpoint | **ja — `whsec_…` des Produktions-Endpoints** |
| `CRON_SECRET` | `.env.local` | nein (schützt die sieben Cron-Routen) |

### Kritisch — falscher Wert bricht Checkout, Mails und Discord

| Variable | Wert für Produktion |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://capitalcircletrading.com` — **lokal steht hier `http://localhost:3000`.** Stripe-Redirects, Discord-OAuth, Willkommensmail und Portal-Rückläufer hängen alle daran. |
| `DISCORD_REDIRECT_URI` | `https://capitalcircletrading.com/api/discord/callback` — muss **identisch** im Discord Developer Portal unter „Redirects" eingetragen sein. |

### Cloudflare Stream + R2 (neu aus dieser Umstellung)

Alle acht 1:1 aus `.env.local` übernehmen:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_STREAM_API_TOKEN`
- `CLOUDFLARE_STREAM_SIGNING_KEY_ID`
- `CLOUDFLARE_STREAM_SIGNING_PRIVATE_KEY` — Base64, einzeilig; beim Einfügen darf kein Zeilenumbruch entstehen
- `NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN`
- `R2_ENDPOINT`
- `R2_BUCKET_NAME`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

### Stripe-Preise

`STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_QUARTERLY`, `STRIPE_PRICE_YEARLY`.
Die aktuellen IDs sind **Testmodus**. Für Produktion `npm run stripe:preise`
mit einem `sk_live_…`-Key laufen lassen und die drei neuen IDs eintragen.
`STRIPE_PRICE_LIFETIME` nur, falls das Lifetime-Angebot live gehen soll.

### Betrieb — aus `.env.local` übernehmen

`RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `RESEND_WHOP_SEGMENT_ID`,
`DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
`DISCORD_GUILD_ID`, `DISCORD_ROLE_ID`,
`NEXT_PUBLIC_CALENDLY_URL`, `CALENDLY_WEBHOOK_SIGNING_KEY`,
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
`NEXT_PUBLIC_FREE_FUNNEL_VIDEO_URL`, `NEXT_PUBLIC_INTRO_VIDEO_URL`,
`NEXT_PUBLIC_STEP2_BEWERBUNG_VIDEO_URL`,
`NEXT_PUBLIC_DISCORD_TERMIN_VIDEO_URL`.

### Nicht übernehmen

- `HETZNER_ENDPOINT`, `HETZNER_BUCKET_NAME`, `HETZNER_ACCESS_KEY`, `HETZNER_SECRET_KEY` —
  der Bucket existiert nicht mehr. Nur setzen, wenn zusätzlich `STORAGE_LEGACY_FALLBACK=1`
  gewünscht ist; ohne lebenden Bucket bringt das nichts.
- `VERCEL_OIDC_TOKEN` — setzt Vercel selbst.
- Leere Schlüssel (`UNSUBSCRIBE_TOKEN_SECRET`, `TURNSTILE_*`, `SLACK_WEBHOOK_URL`,
  `UPSTASH_*`, `RESEND_WEBHOOK_SECRET`) — der Code hat für alle einen Fallback.
  `UNSUBSCRIBE_TOKEN_SECRET` sollte vor dem ersten Massenversand aber gesetzt sein.

### Optional, im Code referenziert, nirgends gesetzt

`NEXT_PUBLIC_SITE_URL`, `WELCOME_MAIL_PUBLIC_URL`, `NEXT_PUBLIC_STORAGE_BASE_URL`,
`NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_HT_INTRO_VIDEO_*`,
`NEXT_PUBLIC_HT_THANKS_VIDEO_*`, `NEXT_PUBLIC_MEMBERSHIP_THANKS_VIDEO_*`,
`NEXT_PUBLIC_DISCORD_COMMUNITY_URL`, `NEXT_PUBLIC_DISCORD_CALENDLY_URL`,
`DISCORD_FUNNEL_ROLE_ID`, `DISCORD_WAITING_ROOM_ROLE_ID`,
`RESEND_PLATFORM_MIGRATION_SEGMENT_ID`, `YOUTUBE_CHANNEL_ID`.

Die URL-Varianten fallen alle auf `NEXT_PUBLIC_APP_URL` zurück — solange das stimmt,
funktioniert alles. Die Video-Poster bleiben leer, dann zeigt der Player nur das erste Bild.

---

## 2. Nach dem ersten Deploy

1. **Stripe-Webhook anlegen** — Stripe Dashboard → Developers → Webhooks →
   `https://capitalcircletrading.com/api/stripe/webhook`.
   Events: `checkout.session.completed`, `checkout.session.expired`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.payment_failed`, `invoice.payment_succeeded`.
   Danach das `whsec_…` als `STRIPE_WEBHOOK_SECRET` eintragen und **neu deployen**
   (Env-Änderungen greifen erst beim nächsten Build).
2. **Discord Redirect-URI** im Developer Portal ergänzen (siehe oben).
3. **Calendly-Webhook** auf die Produktionsdomain umstellen.
4. **R2-CORS** ist bereits korrekt: erlaubt sind `capitalcircletrading.com`,
   `www.capitalcircletrading.com`, `capital-circle-s5bg.vercel.app` und `localhost:3000`.
   **Achtung:** Branch-Preview-Deployments bekommen eigene URLs
   (`capital-circle-git-…vercel.app`) — dort schlagen Bild-Uploads mit CORS-Fehler fehl.
   Bei Bedarf die Origin nachtragen.
5. **Cron-Jobs** laufen automatisch aus `vercel.json` (7 Stück). Sie brauchen `CRON_SECRET`.

---

## 3. Bekannte Einschränkungen auf Vercel

- `proxyClientMaxBodySize: "2gb"` in `next.config.ts` gilt lokal. Vercel begrenzt
  Request-Bodies auf **100 MB**. Betroffen wäre nur der Admin-Upload-Proxy —
  Videos gehen per Direct-Upload zu Cloudflare Stream, Bilder per presigned PUT
  direkt zu R2, beide **am Server vorbei**. Der 2-GB-Wert ist damit folgenlos.
- Funktions-Timeout ist 300 s; keine der Routen kommt in die Nähe.

---

## 4. Wartungsmodus und die offene Vorschau

Der Wartungsmodus ist ein Schalter in der Datenbank (`app_settings`, Schlüssel
`maintenance_mode`), umlegbar unter `/admin/wartung`. Ist er an, schiebt `proxy.ts` alle
Nicht-Admins auf `/wartung`.

**Ausgenommen sind `/wartung`, `/login`, `/admin*` und `/vorschau`.**
`/vorschau` zeigt dieselbe Verkaufsseite wie `/`, ohne Anmeldung und ohne Wartungs-Gate —
die Adresse zum Herzeigen, während die Plattform zu ist. Sie trägt `noindex, nofollow`
und steht in `robots.ts` auf der Sperrliste, damit sie nicht neben der echten Startseite
im Suchindex landet.

Die Kauf-Schaltflächen dort zeigen auf `/go/<plan>` und bleiben im Wartungsmodus
gesperrt. Soll auch während der Wartung verkauft werden, muss `/go` in `proxy.ts`
ebenfalls in `maintenanceExempt`.

## 5. Was nach dem Deploy noch fehlt (inhaltlich, nicht technisch)

- Alle Vorschaubilder, PDFs, Zertifikate und Avatare sind mit dem Hetzner-Bucket
  verloren und müssen neu hochgeladen werden — R2 ist leer.
- **71 Videos liegen im unsortierten Stapel** — mit Cloudflare-UID, also abspielbar,
  nur keinem Modul zugeordnet.
- **38 Videos ohne Cloudflare-Pendant sind depubliziert** (`exports/tote-videos.csv`,
  Rückweg über `node scripts/unpublish-dead-videos.mjs --zurueck`). Drei veröffentlichte
  Module sind dadurch leer und fallen aus dem Institut: *Livetrades* (0 von 4),
  *Trade Recaps* (0 von 10), *Psychology* (0 von 0).
- **0 von 14 Modulen haben ein Cover** — die Cover-Anzeige im Institut zeigt derzeit
  nirgends etwas.
