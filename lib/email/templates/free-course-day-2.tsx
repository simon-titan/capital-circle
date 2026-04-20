import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailHeading,
  EmailText,
  EmailButton,
  EmailSubheading,
} from "../layout/components";
import { generateUnsubscribeToken } from "../unsubscribe-token";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";

interface Props {
  firstName: string;
  email: string;
  userId: string;
}

export default function FreeCourseDay2Email({ firstName, userId }: Props) {
  const appUrl = getAppUrl();
  const token = generateUnsubscribeToken(userId);
  return (
    <BaseEmail
      previewText="Tag 2 — Das Fundament deines Tradings"
      unsubscribeToken={token}
    >
      <EmailHeading>Tag 2 — Das Fundament, {firstName}</EmailHeading>
      <EmailText>
        Die meisten Strategien scheitern nicht am Setup, sondern an der Basis
        darunter: Risikomanagement und ein klarer Trade-Plan.
      </EmailText>
      <EmailSubheading>Heute lernst du</EmailSubheading>
      <EmailText>
        Wie du in 5 Minuten pro Trade entscheidest, ob er dein Risiko überhaupt
        wert ist — bevor du den Chart aufmachst.
      </EmailText>
      <EmailButton href={`${appUrl}/dashboard`}>Tag 2 starten</EmailButton>
      <EmailText muted>
        Morgen kommt der entscheidende Unterschied — verpass es nicht.
      </EmailText>
    </BaseEmail>
  );
}

export async function sendFreeCourseDay2(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "[Tag 2] Das Fundament deines Tradings",
    jsx: (
      <FreeCourseDay2Email
        firstName={props.firstName}
        email={props.email}
        userId={props.userId}
      />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "free_course_welcome",
      step: 2,
    },
  });
}
