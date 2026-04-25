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

export default function WelcomeFreeCourseEmail({ firstName }: Props) {
  const appUrl = getAppUrl();
  return (
    <BaseEmail
      previewText={`Willkommen bei Capital Circle, ${firstName} — dein Zugang ist aktiv`}
    >
      <EmailHeading>Willkommen, {firstName}.</EmailHeading>
      <EmailText>
        deine Bewerbung wurde geprüft — und du bist dabei. Ab jetzt hast du
        Zugang zu unserem 5-Tage-Onboarding-Kurs, in dem wir dir die wichtigsten
        Grundlagen unseres Trading-Ansatzes zeigen.
      </EmailText>
      <EmailHighlight>
        Über die nächsten Tage bekommst du täglich eine kurze Lektion per Mail.
        Plane jeweils ca. 15 Minuten ein — kompakt, ohne Fluff.
      </EmailHighlight>
      <EmailText>
        Klick unten auf den Button, um direkt einzusteigen. Tag 1 wartet schon
        in deinem Dashboard.
      </EmailText>
      <EmailButton href={`${appUrl}/dashboard`}>
        Zur Plattform
      </EmailButton>
      <EmailText muted>
        Bei Fragen antworte einfach auf diese Mail — wir lesen mit.
      </EmailText>
    </BaseEmail>
  );
}

export async function sendWelcomeFreeCourse(
  props: Props & { applicationId?: string },
): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "Willkommen bei Capital Circle! Dein Zugang ist aktiv",
    jsx: <WelcomeFreeCourseEmail firstName={props.firstName} />,
    log: {
      userId: props.userId,
      applicationId: props.applicationId,
      recipientEmail: props.email,
      sequence: "free_course_welcome",
      step: 0,
    },
  });
}
