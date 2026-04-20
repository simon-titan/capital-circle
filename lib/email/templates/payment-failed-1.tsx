import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailHeading,
  EmailText,
  EmailButton,
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

export default function PaymentFailed1Email({ firstName, userId }: Props) {
  const appUrl = getAppUrl();
  const token = generateUnsubscribeToken(userId);
  return (
    <BaseEmail
      previewText="Zahlungsproblem — bitte jetzt beheben"
      unsubscribeToken={token}
    >
      <EmailHeading>Zahlung fehlgeschlagen, {firstName}</EmailHeading>
      <EmailText>
        wir konnten deine letzte Zahlung leider nicht einziehen. Das passiert
        meistens, wenn die Karte abgelaufen ist oder das Tageslimit erreicht wurde.
      </EmailText>

      <EmailHighlight>
        Solange das Problem nicht behoben ist, bleibt dein Zugang vollständig
        aktiv. Du musst nichts überstürzen — aber je früher, desto besser.
      </EmailHighlight>

      <EmailButton href={`${appUrl}/billing`}>
        Zahlungsdaten aktualisieren
      </EmailButton>

      <EmailText muted>
        Wir versuchen die Zahlung in den nächsten Tagen automatisch erneut.
        Sobald sie durchgeht, bist du wieder vollständig versorgt.
      </EmailText>
    </BaseEmail>
  );
}

export async function sendPaymentFailed1(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "Zahlungsproblem — bitte jetzt beheben",
    jsx: (
      <PaymentFailed1Email
        firstName={props.firstName}
        email={props.email}
        userId={props.userId}
      />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "payment_failed",
      step: 1,
    },
  });
}
