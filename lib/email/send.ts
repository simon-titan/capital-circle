import { render } from "@react-email/render";
import * as React from "react";
import { getResend, getFrom } from "./resend";
import { logEmailSent, type SequenceLogEntry } from "./sequence-log";

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
 * Hinweis: Die `Resend-Message-ID` wird im Insert noch nicht mitgeschrieben,
 * weil sie erst nach `send()` bekannt ist. Für die meisten Use-Cases reicht
 * das Sequence-Log ohne Message-ID; Webhook-Korrelation (Paket 8) macht den
 * Reverse-Lookup über die Message-ID separat.
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

  return { skipped: false, resendMessageId: data?.id };
}
