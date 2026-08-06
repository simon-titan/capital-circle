/**
 * Whop-Migrations-Kampagne (Reaktivierung unbezahlter Mitglieder).
 *
 * Capital Circle ist von der eigenen Plattform vollständig auf Whop
 * umgezogen. Diese Kampagne erreicht alle Mitglieder ohne Paid-Account mit
 * einer klassischen 3-Mail-Sequenz. Wording, Ziel-URL und Timing stehen
 * bewusst NUR hier — Änderungen sind damit eine Ein-Datei-Änderung, ohne
 * Templates oder Cron-Logik anzufassen.
 *
 * Segmentierung (siehe `app/api/cron/whop-migration-followups/route.ts`):
 *   Mail 1 → an alle
 *   Mail 2 → nur an Nicht-Öffner von Mail 1 (Tag 3)
 *   Mail 3 → nur an Öffner ohne Klick von Mail 1 ODER Mail 2 (Tag 6)
 */
export const WHOP_MIGRATION = {
  /** Sequence-Name im `email_sequence_log` (steps 0/1/2 = Mail 1/2/3). */
  sequence: "whop_migration",
  /** Einziges Ziel aller CTAs — identisch mit dem Telegram-Bot-Button. */
  joinUrl: "https://whop.com/capital-circle/capital-circle-academy/",
  /** Tage nach Mail 1, ab denen Mail 2 fällig ist (Nicht-Öffner). */
  mail2DueDays: 3,
  /** Tage nach Mail 1, ab denen Mail 3 fällig ist (Öffner ohne Klick). */
  mail3DueDays: 6,
  subjects: {
    mail1: "Der Grund, warum du nicht dabei bist",
    mail2: "Falls das hier bei dir untergegangen ist",
    mail3: "Die 3 Fragen, die mir am häufigsten gestellt werden",
  },
} as const;
