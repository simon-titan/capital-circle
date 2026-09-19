import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailHeading,
  EmailText,
  EmailButton,
} from "../layout/components";
import { generateSurveyToken } from "../unsubscribe-token";
import { abmeldeUrl, istAbgemeldet } from "../abmeldung";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";

interface Props {
  firstName: string;
  email: string;
  userId: string;
}

export default function CancellationSurveyEmail({
  firstName,
  userId,
  abmeldeLink,
}: Pick<Props, "firstName" | "userId"> & { abmeldeLink?: string }) {
  const appUrl = getAppUrl();
  const surveyToken = generateSurveyToken(userId);
  return (
    <BaseEmail previewText="Danke für deine Zeit — kurzes Feedback?" unsubscribeUrl={abmeldeLink}>
      <EmailHeading>Schade, dass du gehst, {firstName}</EmailHeading>
      <EmailText>
        deine Kündigung ist bei uns angekommen und ist verarbeitet. Bevor du
        verschwindest — ein letzter, kleiner Gefallen?
      </EmailText>

      <EmailText>
        Wir versuchen Capital Circle ständig zu verbessern. Wenn du uns 60
        Sekunden gibst, hilfst du den nächsten Trader:innen mehr, als du denkst.
      </EmailText>

      <EmailButton
        href={`${appUrl}/survey/cancellation?token=${surveyToken}`}
      >
        Kurzes Feedback geben (60 Sek.)
      </EmailButton>

      <EmailText muted>
        Falls du irgendwann zurückkommen willst — die Tür bleibt offen, dein
        Account bleibt für 30 Tage erhalten.
      </EmailText>
    </BaseEmail>
  );
}

/**
 * Eine Feedback-Bitte per Mail ist Werbung (BGH, Urteil vom 10.07.2018,
 * VI ZR 225/17) — deshalb Abmeldelink und die Prüfung auf `unsubscribed_at`
 * hier im Sender: Der Aufrufer (`customer.subscription.deleted`) filtert nicht.
 */
export async function sendCancellationSurvey(
  props: Props,
): Promise<SendResult> {
  if (await istAbgemeldet(props.userId)) {
    return { skipped: true };
  }
  return sendEmail({
    to: props.email,
    subject: "Danke für deine Zeit — kurzes Feedback?",
    jsx: (
      <CancellationSurveyEmail
        firstName={props.firstName}
        userId={props.userId}
        abmeldeLink={abmeldeUrl({ userId: props.userId, email: props.email })}
      />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "cancellation",
      step: 0,
    },
  });
}
