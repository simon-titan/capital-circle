import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Last-Login-Tracking + Churn-Email-Reset.
 *
 * Wird in `proxy.ts` nach erfolgreichem Profil-Load fire-and-forget aufgerufen
 * (d. h. wir blocken das Request-Handling NICHT auf den DB-Write).
 *
 * Throttle: max. 1× pro Stunde — verhindert DB-Spam, da `proxy.ts` bei jedem
 * SSR-Request läuft. Auflösung pro Stunde reicht für Churn-Cron-Logik
 * (Trigger ist „länger als 7 Tage offline").
 *
 * Reset-Logik:
 *   Wenn der User sich nach einem Churn-Reminder zurückmeldet, wollen wir
 *   die `churn_email_*_sent_at`-Spalten zurücksetzen, damit eine zukünftige
 *   Inaktivitätsphase wieder mit Mail 1 startet (statt sofort Mail 2 zu
 *   überspringen). Das passiert hier in einem einzigen UPDATE zusammen mit
 *   `last_login_at`, falls überhaupt einer der beiden Sent-Timestamps gesetzt
 *   ist.
 */
export interface LastLoginContext {
  lastLoginAt: string | null;
  churnEmail1SentAt: string | null;
  churnEmail2SentAt: string | null;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function updateLastLoginIfNeeded(
  supabase: SupabaseClient,
  userId: string,
  ctx: LastLoginContext,
): Promise<void> {
  const now = new Date();
  const lastLogin = ctx.lastLoginAt ? new Date(ctx.lastLoginAt) : null;

  const dueForUpdate =
    !lastLogin ||
    Number.isNaN(lastLogin.getTime()) ||
    now.getTime() - lastLogin.getTime() >= ONE_HOUR_MS;

  const hasChurnReminder = Boolean(ctx.churnEmail1SentAt || ctx.churnEmail2SentAt);

  // Nichts zu tun → kein DB-Roundtrip.
  if (!dueForUpdate && !hasChurnReminder) return;

  const update: Record<string, string | null> = {};
  if (dueForUpdate) {
    update.last_login_at = now.toISOString();
  }
  if (hasChurnReminder) {
    update.churn_email_1_sent_at = null;
    update.churn_email_2_sent_at = null;
  }

  try {
    await supabase.from("profiles").update(update).eq("id", userId);
  } catch (err) {
    // Wir verschlucken Fehler bewusst — proxy.ts darf nicht hängen, nur weil
    // der Last-Login-Update gerade fehlschlägt. Loggen reicht.
    console.warn("[last-login] update failed:", err);
  }
}
