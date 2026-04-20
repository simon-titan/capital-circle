import { render } from "@react-email/render";
import * as React from "react";
import { getResend, getFrom } from "./resend";
import { logEmailSent, type SequenceLogEntry } from "./sequence-log";
import { createServiceClient } from "@/lib/supabase/service";

interface SendOptions {
  to: string;
  subject: string;
  jsx: React.ReactElement;
  /** Optional: Reply-To-Adresse (z. B. `support@…` für CTA-Mails). */
  replyTo?: string;
  /**
   * Wenn gesetzt, wird VOR dem Versand `logEmailSent()` aufgerufen.
   * Gibt der Log-Insert `false` zurück (= bereits gesendet), bricht der Helper
   * idempotent ab und liefert `{ skipped: true }`.
   */
  log?: SequenceLogEntry;
}

export interface SendResult {
  skipped: boolean;
  resendMessageId?: string;
}

/**
 * Zentraler Render+Send-Helper.
 *
 * Pipeline:
 *   1. (Optional) Idempotenz-Check via `logEmailSent`
 *   2. JSX -> HTML via `@react-email/render`
 *   3. `resend.emails.send`
 *   4. (Optional) Resend-Message-ID nachträglich loggen — Skip falls schon
 *      eingetragen, denn der Insert in Schritt 1 hat bereits Idempotenz garantiert.
 *
 * Pipeline (mit Log):
 *   1. `logEmailSent()` → schreibt eine Row mit `resend_message_id = NULL`
 *      und garantiert per UNIQUE-Constraint Idempotenz.
 *   2. JSX → HTML render.
 *   3. `resend.emails.send()`.
 *   4. Nach erfolgreichem Send: UPDATE der Log-Row, damit die Resend-Message-ID
 *      gespeichert wird (für Webhook-Korrelation in Paket 8 → email.opened /
 *      email.clicked).
 */
export async function sendEmail(opts: SendOptions): Promise<SendResult> {
  if (opts.log) {
    const inserted = await logEmailSent(opts.log);
    if (!inserted) {
      return { skipped: true };
    }
  }

  const html = await render(opts.jsx);

  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: getFrom(),
    to: opts.to,
    subject: opts.subject,
    html,
    replyTo: opts.replyTo,
  });

  if (error) {
    throw new Error(error.message ?? "Resend: unbekannter Fehler");
  }

  // Resend-Message-ID nachträglich in den Log-Eintrag eintragen, damit der
  // Resend-Webhook (Open/Click) den richtigen Eintrag finden kann. Best-effort:
  // Fehler hier sollen den Send nicht rollbacken — die Mail ist bereits raus.
  if (opts.log && data?.id) {
    try {
      const supabase = createServiceClient();
      await supabase
        .from("email_sequence_log")
        .update({ resend_message_id: data.id })
        .eq("recipient_email", opts.log.recipientEmail)
        .eq("sequence", opts.log.sequence)
        .eq("step", opts.log.step)
        .is("resend_message_id", null);
    } catch (err) {
      console.error("[email/send] resend_message_id Update fehlgeschlagen:", err);
    }
  }

  return { skipped: false, resendMessageId: data?.id };
}
