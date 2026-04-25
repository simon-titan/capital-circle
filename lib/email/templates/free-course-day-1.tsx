import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailHeading,
  EmailText,
  EmailButton,
  EmailSubheading,
} from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";

interface Props {
  firstName: string;
  email: string;
  userId: string;
}

export default function FreeCourseDay1Email({ firstName }: Props) {
  const appUrl = getAppUrl();
  return (
    <BaseEmail previewText="Tag 1 — Dein erster Schritt im Kurs">
      <EmailHeading>Tag 1 — Der erste Schritt, {firstName}</EmailHeading>
      <EmailText>
        Heute starten wir mit der wichtigsten Frage überhaupt: Warum verlieren
        die meisten Trader Geld — und was unterscheidet die wenigen, die
        konstant gewinnen?
      </EmailText>
      <EmailSubheading>Was dich heute erwartet</EmailSubheading>
      <EmailText>
        Ein 8-minütiges Video, das dir die drei häufigsten Denkfehler im Trading
        zeigt — und wie du sie ab heute vermeidest.
      </EmailText>
      <EmailButton href={`${appUrl}/dashboard`}>Lektion ansehen</EmailButton>
      <EmailText muted>
        Morgen geht es weiter mit Tag 2: Das Fundament jedes profitablen Setups.
      </EmailText>
    </BaseEmail>
  );
}

export async function sendFreeCourseDay1(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "[Tag 1] Dein erster Schritt — Capital Circle",
    jsx: <FreeCourseDay1Email firstName={props.firstName} />,
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "free_course_welcome",
      step: 1,
    },
  });
}
