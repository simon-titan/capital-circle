import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailHeading, EmailText } from "../layout/components";
import { sendEmail, type SendResult } from "../send";

interface Props {
  firstName: string;
  email: string;
  userId: string;
}

export default function ApplicationRejectedEmail({ firstName }: Props) {
  return (
    <BaseEmail previewText="Update zu deiner Bewerbung bei Capital Circle">
      <EmailHeading>Hallo {firstName},</EmailHeading>
      <EmailText>
        danke, dass du dir die Zeit genommen hast, dich bei Capital Circle zu
        bewerben. Wir haben deine Bewerbung sorgfältig geprüft.
      </EmailText>
      <EmailText>
        Aktuell können wir dir leider keinen Platz anbieten. Das liegt nicht
        zwingend an dir — wir nehmen pro Periode nur eine sehr begrenzte Zahl
        an Trader:innen auf, um die Qualität der Begleitung sicherzustellen.
      </EmailText>
      <EmailText muted>
        Wir wünschen dir alles Gute für deinen weiteren Weg an den Märkten.
      </EmailText>
      <EmailText muted>— Das Capital-Circle-Team</EmailText>
    </BaseEmail>
  );
}

export async function sendApplicationRejected(
  props: Props & { applicationId?: string },
): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "Deine Bewerbung bei Capital Circle",
    jsx: (
      <ApplicationRejectedEmail firstName={props.firstName} />
    ),
    log: {
      userId: props.userId,
      applicationId: props.applicationId,
      recipientEmail: props.email,
      sequence: "application_rejected",
      step: 0,
    },
  });
}
