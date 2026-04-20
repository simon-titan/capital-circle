import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailHeading,
  EmailText,
  EmailButton,
  EmailSubheading,
  EmailHighlight,
} from "../layout/components";
import { generateUnsubscribeToken } from "../unsubscribe-token";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";

interface Props {
  firstName: string;
  email: string;
  userId: string;
}

export default function HtUpsell60dEmail({ firstName, userId }: Props) {
  const appUrl = getAppUrl();
  const token = generateUnsubscribeToken(userId);
  const calendlyUrl =
    process.env.NEXT_PUBLIC_CALENDLY_URL?.trim() || `${appUrl}/apply`;

  return (
    <BaseEmail
      previewText={`Bereit für den nächsten Schritt, ${firstName}?`}
      unsubscribeToken={token}
    >
      <EmailHeading>
        Bereit für den nächsten Schritt, {firstName}?
      </EmailHeading>
      <EmailText>
        du bist seit 60 Tagen Teil von Capital Circle. Damit gehörst du zu den
        Mitgliedern, die wirklich an sich arbeiten — nicht nur konsumieren.
      </EmailText>

      <EmailSubheading>1-on-1-Coaching</EmailSubheading>
      <EmailText>
        Wir öffnen aktuell wieder Plätze für unser High-Ticket-1-on-1-Programm.
        Das ist nichts für jeden — und wir nehmen nicht jeden auf. Aber wenn
        du den Sprung von „verstanden“ zu „konstant umgesetzt“ machen willst,
        ist genau das der Weg.
      </EmailText>

      <EmailHighlight>
        Wir nehmen pro Quartal nur eine sehr begrenzte Zahl an Trader:innen
        auf — die Auswahl läuft über ein Erstgespräch.
      </EmailHighlight>

      <EmailButton href={calendlyUrl}>Erstgespräch buchen</EmailButton>

      <EmailText muted>
        Kein Sales-Pitch. Wenn wir gemeinsam feststellen, dass es nicht passt,
        ist auch das ein gutes Ergebnis.
      </EmailText>
    </BaseEmail>
  );
}

export async function sendHtUpsell60d(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: `Bereit für den nächsten Schritt, ${props.firstName}?`,
    jsx: (
      <HtUpsell60dEmail
        firstName={props.firstName}
        email={props.email}
        userId={props.userId}
      />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "ht_upsell",
      step: 0,
    },
  });
}
