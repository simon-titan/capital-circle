import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailHeading,
  EmailText,
  EmailButton,
} from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";

interface Props {
  firstName: string;
  email: string;
  userId: string;
}

export default function PaymentFailed3Email({ firstName }: Props) {
  const appUrl = getAppUrl();
  return (
    <BaseEmail previewText="Dein Zugang ist pausiert — jetzt reaktivieren">
      <EmailHeading>Dein Zugang ist pausiert, {firstName}</EmailHeading>
      <EmailText>
        wir mussten deinen Zugang vorübergehend deaktivieren, weil wir keine
        gültige Zahlung einziehen konnten. Deine Daten und dein Fortschritt
        bleiben gespeichert — nichts geht verloren.
      </EmailText>

      <EmailText>
        Sobald du eine neue Zahlungsmethode hinterlegst, bist du innerhalb
        weniger Minuten wieder voll dabei.
      </EmailText>

      <EmailButton href={`${appUrl}/billing`}>Jetzt reaktivieren</EmailButton>

      <EmailText muted>
        Du willst nicht reaktivieren? Auch okay — du bekommst nach diesem
        Reminder keine weiteren Mahnungen mehr.
      </EmailText>
    </BaseEmail>
  );
}

export async function sendPaymentFailed3(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "Dein Zugang ist pausiert — jetzt reaktivieren",
    jsx: (
      <PaymentFailed3Email firstName={props.firstName} />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "payment_failed",
      step: 3,
    },
  });
}
