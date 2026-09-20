import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailHeading, EmailRows, EmailText } from "../layout/components";
import { getAppUrl } from "../resend";
import { sendEmail, type SendResult } from "../send";

interface ApplicationReceivedEmailProps {
  firstName: string;
  email: string;
  password: string;
}

interface SendApplicationReceivedProps
  extends ApplicationReceivedEmailProps {
  userId: string;
}

export default function ApplicationReceivedEmail({
  firstName,
  email,
  password,
}: ApplicationReceivedEmailProps) {
  const loginUrl = `${getAppUrl()}/login`;

  return (
    <BaseEmail
      previewText={`Deine Bewerbung bei Capital Circle ist eingegangen, ${firstName}`}
    >
      <EmailHeading>Hallo {firstName},</EmailHeading>
      <EmailText>
        deine Bewerbung bei Capital Circle ist eingegangen. Vielen Dank, dass
        du dir die Zeit genommen hast.
      </EmailText>
      <EmailText>
        Gleichzeitig ist dein Zugang zur Plattform angelegt. So kannst du dich
        später anmelden:
      </EmailText>

      <EmailRows
        mono
        rows={[
          ["E-Mail", email],
          ["Passwort", password],
        ]}
      />

      <EmailButton href={loginUrl}>Zur Anmeldung</EmailButton>

      <EmailText muted>
        Aus Sicherheitsgründen empfehlen wir dir, das Passwort nach dem ersten
        Login in den Kontoeinstellungen zu ändern.
      </EmailText>
      <EmailText>
        Wir prüfen deine Bewerbung innerhalb von 24–48 Stunden und melden uns
        anschließend per E-Mail bei dir.
      </EmailText>
      <EmailText>
        Solange deine Bewerbung in Prüfung ist, steht die Plattform noch nicht
        offen. Sobald wir eine Entscheidung getroffen haben, bekommst du sofort
        Bescheid, du musst nichts weiter tun.
      </EmailText>
      <EmailText muted>
        Bei Fragen antworte einfach auf diese Mail, wir lesen mit.
      </EmailText>
      <EmailText muted>Das Capital-Circle-Team</EmailText>
    </BaseEmail>
  );
}

export async function sendApplicationReceived(
  props: SendApplicationReceivedProps & { applicationId?: string },
): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "Deine Bewerbung bei Capital Circle ist eingegangen",
    jsx: (
      <ApplicationReceivedEmail
        firstName={props.firstName}
        email={props.email}
        password={props.password}
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
