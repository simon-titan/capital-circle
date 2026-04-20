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

export default function PaymentFailed2Email({ firstName, userId }: Props) {
  const appUrl = getAppUrl();
  const token = generateUnsubscribeToken(userId);
  return (
    <BaseEmail
      previewText="Du verlierst bald deinen Zugang"
      unsubscribeToken={token}
    >
      <EmailHeading>Letzter Reminder, {firstName}</EmailHeading>
      <EmailText>
        die Zahlung konnten wir auch beim zweiten Versuch nicht einziehen. Wenn
        wir bis morgen keine gültigen Zahlungsdaten haben, müssen wir deinen
        Zugang pausieren.
      </EmailText>

      <EmailHighlight>
        Das ist kein Problem, das du nicht in 60 Sekunden lösen kannst — alte
        Karte raus, neue Karte rein, fertig.
      </EmailHighlight>

      <EmailButton href={`${appUrl}/billing`}>Jetzt aktualisieren</EmailButton>

      <EmailText muted>
        Antworte uns direkt auf diese Mail, wenn etwas nicht funktioniert. Wir
        helfen.
      </EmailText>
    </BaseEmail>
  );
}

export async function sendPaymentFailed2(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "Du verlierst bald deinen Zugang",
    jsx: (
      <PaymentFailed2Email
        firstName={props.firstName}
        email={props.email}
        userId={props.userId}
      />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "payment_failed",
      step: 2,
    },
  });
}
