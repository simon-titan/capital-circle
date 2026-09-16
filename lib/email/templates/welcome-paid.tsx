import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailHeading,
  EmailText,
  EmailButton,
  EmailSubheading,
  EmailHighlight,
} from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";

interface Props {
  firstName: string;
  email: string;
  userId: string;
  /** Beeinflusst die Begrüßungs-Copy. `lifetime` ist nur noch Bestand, kein Verkaufsweg. */
  tier?: "monthly" | "quarterly" | "yearly" | "lifetime" | "ht_1on1";
  /**
   * Nur beim Gast-Checkout gesetzt: Das Konto ist gerade entstanden und hat
   * noch kein Passwort. Dann führt der Knopf zum Setzen des Passworts statt
   * ins Dashboard — ein Dashboard-Link wäre für dieses Konto eine Sackgasse.
   */
  setPasswordUrl?: string;
}

export default function WelcomePaidEmail({
  firstName,
  tier,
  setPasswordUrl,
}: Pick<Props, "firstName" | "tier" | "setPasswordUrl">) {
  const appUrl = getAppUrl();
  const tierLabel =
    tier === "lifetime"
      ? "Lifetime-Zugang"
      : tier === "ht_1on1"
        ? "1-on-1-Coaching"
        : tier === "quarterly"
          ? "Mitgliedschaft (vierteljährlich)"
          : tier === "yearly"
            ? "Mitgliedschaft (jährlich)"
            : "Mitgliedschaft";

  return (
    <BaseEmail previewText={`Dein Capital-Circle-${tierLabel} ist aktiv`}>
      <EmailHeading>Willkommen im Inner Circle, {firstName}.</EmailHeading>
      <EmailText>
        deine Zahlung ist eingegangen — dein {tierLabel} ist ab sofort aktiv.
      </EmailText>

      <EmailSubheading>Was du jetzt tun solltest</EmailSubheading>
      <EmailHighlight>
        {setPasswordUrl ? "1. Setz dein Passwort über den Knopf unten" : "1. Vervollständige dein Profil im Dashboard"}
        <br />
        2. Tritt unserem Discord-Server bei (Link im Dashboard)
        <br />
        3. Schau in den Live-Session-Kalender und blockiere dir den nächsten Termin
      </EmailHighlight>

      <EmailButton href={setPasswordUrl ?? `${appUrl}/dashboard`}>
        {setPasswordUrl ? "Passwort setzen" : "Zum Dashboard"}
      </EmailButton>

      <EmailText muted>
        Eine Rechnung erhältst du separat von unserem Zahlungs-Provider. Bei
        Fragen zur Abrechnung antworte direkt auf diese Mail.
      </EmailText>
    </BaseEmail>
  );
}

export async function sendWelcomePaid(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "Dein Capital Circle Zugang ist aktiv",
    jsx: (
      <WelcomePaidEmail
        firstName={props.firstName}
        tier={props.tier}
        setPasswordUrl={props.setPasswordUrl}
      />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "paid_welcome",
      step: 0,
    },
  });
}
