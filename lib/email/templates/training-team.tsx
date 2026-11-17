import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailHeading, EmailRows, EmailText } from "../layout/components";
import { sendEmail } from "../send";
import { getAppUrl } from "../resend";
import { TEAM_POSTFACH } from "@/config/team";
import { TRAINING_VIDEO_ANZAHL, kanalLabel, stelleLabel, type GespraechStelle, type Kanal } from "@/config/training";

/**
 * Betriebspost ans Sales-Team zu Analysegesprächen aus dem Free Training
 * (Board `/admin/training`): einmal bei der Anfrage, einmal bei der Buchung.
 *
 * Empfänger: immer `TEAM_POSTFACH` (siehe `config/team.ts`, warum keine
 * Umgebungsvariable), dazu optional weitere Adressen aus
 * `TRAINING_LEAD_EMPFAENGER` (kommagetrennt, z. B. die Closer).
 *
 * **Wirft nie**: Eine fehlgeschlagene Benachrichtigung darf weder die Anfrage
 * noch den Calendly-Webhook kippen — der Lead steht ohnehin im Board.
 */

export type TrainingTeamLead = {
  name: string;
  email: string;
  phone: string | null;
  stelle: string;
  kanal: string | null;
  videosGesehen: number;
  terminAm?: string | null;
};

function empfaenger(): string[] {
  const extra = (process.env.TRAINING_LEAD_EMPFAENGER ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter((a) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a));
  return [...new Set([TEAM_POSTFACH, ...extra])];
}

function TrainingTeamEmail({ art, lead, adminUrl }: { art: "anfrage" | "termin"; lead: TrainingTeamLead; adminUrl: string }) {
  const termin = lead.terminAm
    ? new Date(lead.terminAm).toLocaleString("de-DE", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Berlin" })
    : null;
  const zeilen: [string, string][] = [
    ["Name", lead.name],
    ["E-Mail", lead.email],
    ["Telefon", lead.phone ?? "—"],
    ["Herkunft", kanalLabel[(lead.kanal ?? "direkt") as Kanal] ?? lead.kanal ?? "—"],
    ["Angefragt über", stelleLabel[lead.stelle as GespraechStelle] ?? lead.stelle],
    ["Training", `${lead.videosGesehen}/${TRAINING_VIDEO_ANZAHL} Videos gesehen`],
    ...(termin ? ([["Termin", termin]] as [string, string][]) : []),
  ];
  return (
    <BaseEmail previewText={art === "termin" ? `Termin gebucht: ${lead.name}` : `Neue Anfrage: ${lead.name}`}>
      <EmailHeading>{art === "termin" ? "Analysegespräch gebucht" : "Neue Anfrage aus dem Free Training"}</EmailHeading>
      <EmailText>
        {art === "termin"
          ? "Ein Lead aus dem Free Training hat seinen Termin im Kalender gebucht."
          : "Jemand aus dem Free Training möchte ein Analysegespräch. Der Termin folgt, sobald er im Kalender gebucht ist."}
      </EmailText>
      <EmailRows rows={zeilen} />
      <EmailButton href={adminUrl}>Im Board öffnen</EmailButton>
    </BaseEmail>
  );
}

export async function benachrichtigeTeamTraining(art: "anfrage" | "termin", lead: TrainingTeamLead): Promise<void> {
  try {
    const adminUrl = `${getAppUrl()}/admin/training`;
    const betreff =
      art === "termin" ? `Free Training: Termin gebucht – ${lead.name}` : `Free Training: neue Anfrage – ${lead.name}`;
    await Promise.all(
      empfaenger().map((an) =>
        sendEmail({ to: an, subject: betreff, replyTo: lead.email, jsx: <TrainingTeamEmail art={art} lead={lead} adminUrl={adminUrl} /> }),
      ),
    );
  } catch (err) {
    console.error(`[training-team] Benachrichtigung (${art}) fehlgeschlagen:`, err);
  }
}
