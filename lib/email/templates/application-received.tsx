import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailHeading,
  EmailText,
  EmailHighlight,
} from "../layout/components";
import { generateUnsubscribeToken } from "../unsubscribe-token";
import { sendEmail, type SendResult } from "../send";

interface Props {
  firstName: string;
  email: string;
  userId: string;
}

export default function ApplicationReceivedEmail({ firstName, userId }: Props) {
  const token = generateUnsubscribeToken(userId);
  return (
    <BaseEmail
      previewText={`Deine Bewerbung bei Capital Circle ist eingegangen, ${firstName}`}
      unsubscribeToken={token}
    >
      <EmailHeading>Hallo {firstName},</EmailHeading>
      <EmailText>
        deine Bewerbung bei Capital Circle ist eingegangen. Vielen Dank, dass
        du dir die Zeit genommen hast.
      </EmailText>
      <EmailHighlight>
        Wir prüfen deine Bewerbung innerhalb von 24–48 Stunden und melden uns
        anschließend per E-Mail bei dir.
      </EmailHighlight>
      <EmailText>
        Solange deine Bewerbung in Prüfung ist, steht die Plattform noch nicht
        offen. Sobald wir eine Entscheidung getroffen haben, bekommst du sofort
        Bescheid — du musst nichts weiter tun.
      </EmailText>
      <EmailText muted>
        Bei Fragen antworte einfach auf diese Mail — wir lesen mit.
      </EmailText>
      <EmailText muted>— Das Capital-Circle-Team</EmailText>
    </BaseEmail>
  );
}

export async function sendApplicationReceived(
  props: Props & { applicationId?: string },
): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "Deine Bewerbung ist eingegangen — Capital Circle",
    jsx: (
      <ApplicationReceivedEmail
        firstName={props.firstName}
        email={props.email}
        userId={props.userId}
      />
    ),
    log: {
      userId: props.userId,
      applicationId: props.applicationId,
      recipientEmail: props.email,
      sequence: "application_received",
      step: 0,
    },
  });
}
