/**
 * Plattform-Migrations-Kampagne (Whop-Abonnenten zurück auf die eigene Plattform).
 *
 * Umkehrung der ursprünglichen Whop-Migration (siehe `config/whop-migration-campaign.ts`):
 * Capital Circle ist zurück auf der eigenen Plattform, aktive Whop-Zahler sollen so
 * reibungslos wie möglich wechseln. Gleiche 3-Mail-Mechanik/Segmentierung wie dort
 * (siehe `app/api/cron/platform-migration-followups/route.ts`), nur andere Richtung:
 * `joinUrl` zeigt jetzt auf den eigenen Checkout statt auf Whop.
 *
 * Zielgruppe kommt NICHT aus `profiles` (die meisten existieren nur bei Whop), sondern
 * aus einem manuellen CSV-Export im Whop-Dashboard, importiert über
 * `scripts/import-whop-members-to-platform-segment.mjs` in das Resend-Segment
 * `RESEND_PLATFORM_MIGRATION_SEGMENT_ID`.
 *
 * ACHTUNG — Versand ist bewusst NICHT freigegeben, solange die Go-Live-Blocker aus
 * `GO-LIVE.md` offen sind (DB-Migrationen 062–066 nicht angewendet, Impressum/
 * Datenschutz/AGB/Widerruf fehlen). Erst danach `POST /api/admin/campaigns/
 * platform-migration` auslösen — siehe dortige Route-Dokumentation.
 */
export const PLATFORM_MIGRATION = {
  /** Sequence-Name im `email_sequence_log` (steps 0/1/2 = Mail 1/2/3). */
  sequence: "platform_migration",
  /** Einziges Ziel aller CTAs — eigener Self-Checkout, einheitlich 99 €/Monat. */
  joinUrl: "https://www.capitalcircletrading.com/#angebot",
  /** Tage nach Mail 1, ab denen Mail 2 fällig ist (Nicht-Öffner). */
  mail2DueDays: 3,
  /** Tage nach Mail 1, ab denen Mail 3 fällig ist (Öffner ohne Klick). */
  mail3DueDays: 6,
  subjects: {
    mail1: "Capital Circle ist zurück: dein Zugang wartet",
    mail2: "Falls das hier bei dir untergegangen ist",
    mail3: "Die 3 Fragen, die uns zum Wechsel am häufigsten gestellt werden",
  },
} as const;
