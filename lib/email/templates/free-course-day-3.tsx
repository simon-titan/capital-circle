import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailHeading,
  EmailText,
  EmailButton,
  EmailHighlight,
} from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";

interface Props {
  firstName: string;
  email: string;
  userId: string;
}

export default function FreeCourseDay3Email({ firstName }: Props) {
  const appUrl = getAppUrl();
  return (
    <BaseEmail previewText="Tag 3 — Der entscheidende Unterschied">
      <EmailHeading>Tag 3 — Der Unterschied, {firstName}</EmailHeading>
      <EmailText>
        Heute kommt der Inhalt, der für die meisten unserer Mitglieder der
        Wendepunkt war: Der Unterschied zwischen reagieren und antizipieren.
      </EmailText>
      <EmailHighlight>
        Wer reagiert, ist immer zu spät. Wer antizipiert, hat den Trade schon,
        bevor andere ihn überhaupt sehen.
      </EmailHighlight>
      <EmailText>
        In der heutigen Lektion zeigen wir dir die zwei Marktphasen, in denen
        sich beide Welten klar trennen.
      </EmailText>
      <EmailButton href={`${appUrl}/dashboard`}>Tag 3 öffnen</EmailButton>
    </BaseEmail>
  );
}

export async function sendFreeCourseDay3(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "[Tag 3] Der entscheidende Unterschied",
    jsx: (
      <FreeCourseDay3Email firstName={props.firstName} />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "free_course_welcome",
      step: 3,
    },
  });
}
