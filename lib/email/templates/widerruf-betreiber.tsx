import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailEyebrow, EmailHeading, EmailHighlight, EmailSmall, EmailText } from "../layout/components";
import { EMAIL_TOKENS as T } from "../layout/styles";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";
import { BETREIBER_EMAIL, erstattungFaelligBis, formatEingang, formatTag, PLAN_LABEL, type WiderrufsBeleg } from "@/lib/widerruf/shared";

/**
 * Benachrichtigung an den Betreiber über jeden Widerruf aus `/widerrufen`.
 *
 * Jeder Widerruf braucht eine Entscheidung (Widerrufsrecht noch da?
 * Wertersatz? Erstattung?), deshalb geht die Mail bei jedem Eingang raus. Sie
 * ist zugleich der Rückfall-Beleg, falls die Datenbankzeile fehlt
 * (`gespeichert: false`, etwa solange Migration 090 nicht eingespielt ist).
 */

export interface BetreiberInfo {
  pruefHinweis: string;
  userId: string | null;
  eingeloggt: boolean;
  plan: string | null;
  stripeSubscriptionId: string | null;
  vertragsschlussAm: string | null;
  fristEnde: string | null;
  fristgerecht: boolean | null;
  gespeichert: boolean;
  speicherFehler: string | null;
  bestaetigungVersendet: boolean;
}

interface Props {
  beleg: WiderrufsBeleg;
  info: BetreiberInfo;
  adminUrl: string;
}

function fristText(info: BetreiberInfo): string {
  if (info.fristgerecht === null) return "nicht bestimmbar";
  return info.fristgerecht
    ? `innerhalb der regulären Frist (bis ${formatTag(info.fristEnde)})`
    : `NACH der regulären Frist (endete ${formatTag(info.fristEnde)})`;
}

export default function WiderrufBetreiberEmail({ beleg, info, adminUrl }: Props) {
  const eingang = formatEingang(beleg.eingegangenAm);

  const zeilen: [string, string][] = [
    ["Eingangsnummer", beleg.referenz],
    ["Eingegangen am", eingang.komplett],
    ["Erstattung spätestens bis", formatTag(erstattungFaelligBis(beleg.eingegangenAm))],
    ["Name", beleg.name],
    ["Konto-E-Mail (angegeben)", beleg.email],
    ["Bestätigung an", beleg.bestaetigungEmail],
    ["Angaben zum Vertrag", beleg.vertragAngabe ?? "—"],
    ["Zugeordneter Vertrag", info.plan ? (PLAN_LABEL[info.plan] ?? info.plan) : "—"],
    ["Vertragsschluss", info.vertragsschlussAm ? formatTag(info.vertragsschlussAm) : "—"],
    ["Frist", fristText(info)],
    ["Konto (user_id)", info.userId ?? "—"],
    ["Eingeloggt abgeschickt", info.eingeloggt ? "ja" : "nein"],
    ["Stripe-Abo", info.stripeSubscriptionId ?? "—"],
    ["In der Datenbank", info.gespeichert ? "ja" : `NEIN — ${info.speicherFehler ?? "unbekannter Fehler"}`],
    ["Eingangsbestätigung an Kunden", info.bestaetigungVersendet ? "versendet" : "FEHLGESCHLAGEN"],
  ];

  return (
    <BaseEmail previewText={`Widerruf: ${beleg.name} (${beleg.referenz})`}>
      <EmailEyebrow>Widerrufsfunktion · Bitte prüfen</EmailEyebrow>
      <EmailHeading>Neuer Widerruf über /widerrufen</EmailHeading>
      <EmailText>
        {beleg.name} ({beleg.email}) hat am {eingang.komplett} den Vertrag widerrufen.
      </EmailText>

      <EmailHighlight>{info.pruefHinweis}</EmailHighlight>

      {!info.gespeichert ? (
        <EmailText>
          <strong style={{ color: T.red }}>
            Der Widerruf konnte nicht in der Datenbank gespeichert werden. Diese Mail ist der einzige Beleg — bitte
            aufbewahren.
          </strong>
        </EmailText>
      ) : null}

      <table
        role="presentation"
        width="100%"
        cellSpacing={0}
        cellPadding={0}
        style={{
          backgroundColor: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: "10px",
          margin: "16px 0",
        }}
      >
        <tbody>
          {zeilen.map(([label, wert], i) => (
            <tr key={label}>
              <td
                style={{
                  padding: "8px 14px",
                  borderTop: i === 0 ? "none" : `1px solid ${T.border}`,
                  fontFamily: T.fontBody,
                  fontSize: "12px",
                  color: T.textMuted,
                  verticalAlign: "top",
                  width: "38%",
                }}
              >
                {label}
              </td>
              <td
                style={{
                  padding: "8px 14px",
                  borderTop: i === 0 ? "none" : `1px solid ${T.border}`,
                  fontFamily: T.fontBody,
                  fontSize: "13px",
                  color: T.text,
                  verticalAlign: "top",
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
                }}
              >
                {wert}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <EmailButton href={adminUrl}>Widerrufe im Admin öffnen</EmailButton>
      <EmailSmall>
        Nichts wurde automatisch beendet oder erstattet. Zu entscheiden: Besteht das Widerrufsrecht noch (Frist,
        Zustimmung zum sofortigen Beginn in der Kasse)? Welcher Wertersatz ist für bereits erbrachte Leistungen
        angemessen? Dann Abo in Stripe beenden, erstatten, dem Kunden per E-Mail antworten und den Widerruf im
        Admin als erledigt markieren. Antworten auf diese Mail gehen an {beleg.bestaetigungEmail}.
      </EmailSmall>
    </BaseEmail>
  );
}

export async function sendWiderrufBetreiber({
  beleg,
  info,
}: {
  beleg: WiderrufsBeleg;
  info: BetreiberInfo;
}): Promise<SendResult> {
  return sendEmail({
    to: BETREIBER_EMAIL,
    subject: `Widerruf — bitte prüfen: ${beleg.name} (${beleg.referenz})`,
    replyTo: beleg.bestaetigungEmail,
    jsx: <WiderrufBetreiberEmail beleg={beleg} info={info} adminUrl={`${getAppUrl()}/admin/widerrufe`} />,
  });
}
