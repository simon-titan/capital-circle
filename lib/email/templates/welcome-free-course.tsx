import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
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

export default function WelcomeFreeCourseEmail({ firstName }: Pick<Props, "firstName">) {
  const appUrl = getAppUrl();
  return (
    <BaseEmail
      previewText={`Deine Bewerbung wurde angenommen — lies das hier durch.`}
    >
      <EmailText>Hey {firstName},</EmailText>
      <EmailText>
        deine Bewerbung wurde geprüft und du wurdest für den Free Kurs angenommen.
      </EmailText>
      <EmailHighlight>
        Wichtig ist, dass du verstehst: Dieser Zugang ist nicht dafür gedacht,
        einfach nur ein paar kostenlose Inhalte mitzunehmen und dann wieder
        weiterzuziehen.
      </EmailHighlight>
      <EmailText>
        Du hast hier gerade die Möglichkeit bekommen, Einblicke in eine Denkweise
        und Herangehensweise zu bekommen, die die meisten Trader nie wirklich lernen.
      </EmailText>
      <EmailText>
        Nimm das ernst.
      </EmailText>
      <EmailText>
        Schau dir die Inhalte aufmerksam an, mach dir Notizen und versuch nicht
        nur Informationen mitzunehmen, sondern die Denkweise dahinter zu verstehen.
      </EmailText>
      <EmailText>
        Wer diese Chance richtig nutzt, merkt sehr schnell, wie groß der
        Unterschied zwischen normalem Trading-Content und echtem Marktverständnis ist.
      </EmailText>
      <EmailButton href={`${appUrl}/dashboard`}>
        Zur Plattform
      </EmailButton>
      <EmailText muted>Emre</EmailText>
    </BaseEmail>
  );
}

export async function sendWelcomeFreeCourse(
  props: Props & { applicationId?: string },
): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "Deine Bewerbung bei Capital Circle wurde angenommen!",
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
