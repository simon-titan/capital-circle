import { createServiceClient } from "@/lib/supabase/service";

export interface SequenceLogEntry {
  userId: string;
  applicationId?: string;
  recipientEmail: string;
  /** z. B. `free_course_welcome`, `payment_failed`, `churn_inactive` ... */
  sequence: string;
  /** Schritt innerhalb der Sequence (0 = initial). */
  step: number;
  /** Optionale Resend-Message-ID (für Webhook-Korrelation in Paket 8). */
  resendMessageId?: string;
}

/**
 * Idempotenter Email-Log.
 *
 * Setzt voraus, dass die Tabelle `email_sequence_log` existiert (Paket 1,
 * Migration `041_*`) und ein UNIQUE-Constraint über
 * (recipient_email, sequence, step) existiert.
 *
 * Rückgabe:
 *   - `true`  → Log-Eintrag wurde geschrieben (Mail darf gesendet werden).
 *   - `false` → Log-Eintrag existierte bereits (Mail wurde schon geschickt).
 *
 * Doppelter Aufruf ist sicher: kein Throw, kein Doppelversand.
 */
export async function logEmailSent(entry: SequenceLogEntry): Promise<boolean> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("email_sequence_log").insert({
    user_id: entry.userId,
    application_id: entry.applicationId ?? null,
    recipient_email: entry.recipientEmail,
    sequence: entry.sequence,
    step: entry.step,
    resend_message_id: entry.resendMessageId ?? null,
  });

  if (error?.code === "23505") {
    return false;
  }
  if (error) {
    throw error;
  }
  return true;
}

/**
 * Read-only Check, ob eine Mail in dieser Sequence/Step bereits gesendet wurde.
 * Nutze `logEmailSent()` als atomic Check+Insert wenn möglich; `wasEmailSent()`
 * ist für Cron-Jobs gedacht, die VOR dem teuren Render-Schritt filtern wollen.
 */
export async function wasEmailSent(
  recipientEmail: string,
  sequence: string,
  step: number,
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("email_sequence_log")
    .select("id")
    .eq("recipient_email", recipientEmail)
    .eq("sequence", sequence)
    .eq("step", step)
    .maybeSingle();
  return Boolean(data);
}
