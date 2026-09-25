import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailHeading, EmailRows, EmailSmall, EmailText } from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";
import { TEAM_POSTFACH } from "@/config/team";

/**
 * Betriebspost zum TradingView-Indikator (Migration 105).
 *
 * Zwei Anlässe:
 *   - `anfrage`: ein Mitglied hat seinen TradingView-Namen eingetragen oder
 *     geändert → auf TradingView freischalten, im Admin abhaken.
 *   - `entzug`: Sammelmeldung aus dem Nachtlauf → diese Namen auf TradingView
 *     austragen, im Admin abhaken.
 *
 * Der Name steht in `mono`, weil er abgetippt bzw. kopiert wird.
 */

type Anfrage = { art: "anfrage"; name: string; email: string; tvName: string; vorher: string | null };
type Entzug = { art: "entzug"; eintraege: { name: string; email: string; tvName: string }[] };
type Props = (Anfrage | Entzug) & { adminUrl: string };

export default function TradingViewBetreiberEmail(props: Props) {
  if (props.art === "anfrage") {
    return (
      <BaseEmail previewText={`TradingView freischalten: ${props.tvName}`}>
        <EmailSmall>TradingView-Indikator · Freischalten</EmailSmall>
        <EmailHeading>Neue Anfrage für den Indikator</EmailHeading>
        <EmailText>
          {props.name} ({props.email}) möchte Zugang zum Capital Circle Indicator.
          {props.vorher ? ` Der Name wurde geändert, vorher: ${props.vorher}. Den alten Namen bitte austragen.` : ""}
        </EmailText>
        <EmailRows rows={[["TradingView-Name", props.tvName]]} mono />
        <EmailButton href={props.adminUrl}>TradingView-Zugänge im Admin öffnen</EmailButton>
        <EmailSmall>Nach dem Freischalten auf TradingView im Admin auf „Freigeschaltet“ klicken.</EmailSmall>
      </BaseEmail>
    );
  }

  return (
    <BaseEmail previewText={`${props.eintraege.length} TradingView-Zugänge entziehen`}>
      <EmailSmall>TradingView-Indikator · Entziehen</EmailSmall>
      <EmailHeading>Zugänge entziehen</EmailHeading>
      <EmailText>
        Diese Mitglieder haben keinen Zugang zur Plattform mehr. Bitte ihre Namen auf TradingView aus dem
        Invite-only-Script austragen.
      </EmailText>
      <EmailRows rows={props.eintraege.map((e) => [e.tvName, `${e.name} (${e.email})`] as const)} mono />
      <EmailButton href={props.adminUrl}>TradingView-Zugänge im Admin öffnen</EmailButton>
      <EmailSmall>Danach im Admin unter „Entziehen“ jeweils auf „Entzogen“ klicken.</EmailSmall>
    </BaseEmail>
  );
}

export async function sendTradingViewBetreiber(daten: Anfrage | Entzug): Promise<SendResult> {
  const adminUrl = `${getAppUrl()}/admin/tradingview`;
  const subject =
    daten.art === "anfrage"
      ? `TradingView freischalten: ${daten.tvName}`
      : `TradingView: ${daten.eintraege.length} ${daten.eintraege.length === 1 ? "Zugang" : "Zugänge"} entziehen`;
  return sendEmail({
    to: TEAM_POSTFACH,
    subject,
    jsx: <TradingViewBetreiberEmail {...daten} adminUrl={adminUrl} />,
  });
}
