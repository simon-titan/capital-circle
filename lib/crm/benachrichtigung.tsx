import * as React from "react";
import { BaseEmail } from "@/lib/email/layout/BaseEmail";
import { EmailButton, EmailHeading, EmailText } from "@/lib/email/layout/components";
import { sendEmail } from "@/lib/email/send";
import { getAppUrl } from "@/lib/site-url";
import { createServiceClient } from "@/lib/supabase/service";
import type { TeamMitglied } from "./zuweisung";

/**
 * Benachrichtigungen an Closer — vorbereitet, aber aus, bis
 * **`CRM_BENACHRICHTIGUNGEN=1`** gesetzt ist (Entscheidung Simon 07.11.2026:
 * „nicht zwingend, vorbereiten").
 *
 *   termin    neuer Termin wurde dir zugewiesen
 *   no_show   Termin hat vor 15 Minuten begonnen und ist noch „gebucht" → Status setzen / anrufen
 *
 * Wirft nie.
 */
export function crmBenachrichtigungenAktiv(): boolean {
  return process.env.CRM_BENACHRICHTIGUNGEN?.trim() === "1";
}

export async function benachrichtigeCloser(
  closer: TeamMitglied,
  n: { art: "termin" | "no_show"; kontaktEmail: string; kontaktName: string | null; start: string; kontaktId?: string },
): Promise<void> {
  if (!crmBenachrichtigungenAktiv()) return;
  try {
    const { data } = await createServiceClient().auth.admin.getUserById(closer.user_id);
    const an = data?.user?.email;
    if (!an) return;
    const wer = n.kontaktName ?? n.kontaktEmail;
    const wann = new Date(n.start).toLocaleString("de-DE", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Berlin" });
    const link = `${getAppUrl()}/crm${n.kontaktId ? `/kontakte/${n.kontaktId}` : ""}`;
    const titel = n.art === "termin" ? `Neuer Termin: ${wer}` : `Status setzen: ${wer}`;
    await sendEmail({
      to: an,
      subject: titel,
      jsx: (
        <BaseEmail previewText={titel}>
          <EmailHeading>{titel}</EmailHeading>
          <EmailText>
            {n.art === "termin"
              ? `Dir wurde ein Analysegespräch am ${wann} Uhr zugewiesen.`
              : `Das Gespräch hat um ${wann} Uhr begonnen und steht noch auf „gebucht". Ist ${wer} nicht erschienen, jetzt anrufen und im CRM festhalten.`}
          </EmailText>
          <EmailButton href={link}>Im CRM öffnen</EmailButton>
        </BaseEmail>
      ),
    });
  } catch (err) {
    console.error("[crm] Benachrichtigung fehlgeschlagen:", err);
  }
}
