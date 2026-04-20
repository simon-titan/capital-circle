import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailHeading,
  EmailText,
  EmailButton,
  EmailSubheading,
  EmailDivider,
  EmailHighlight,
} from "../layout/components";
import { generateUnsubscribeToken } from "../unsubscribe-token";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";

interface Props {
  firstName: string;
  email: string;
  userId: string;
}

export default function FreeCourseDay5Email({ firstName, userId }: Props) {
  const appUrl = getAppUrl();
  const token = generateUnsubscribeToken(userId);
  return (
    <BaseEmail
      previewText="Tag 5 — Bereit für den nächsten Level?"
      unsubscribeToken={token}
    >
      <EmailHeading>Tag 5 — Was jetzt, {firstName}?</EmailHeading>
      <EmailText>
        Du hast die Grundlagen durch. Tag 1 bis 3 haben dir gezeigt, wie wir bei
        Capital Circle denken — heute geht es darum, was als Nächstes kommt.
      </EmailText>

      <EmailSubheading>Wo stehst du jetzt</EmailSubheading>
      <EmailText>
        Du hast jetzt mehr Klarheit über Risiko, Setup-Selektion und
        Markt-Antizipation als 90 % der Retail-Trader. Die Frage ist: Lässt du
        es bei „nice to know“ — oder gehst du den Schritt in die echte
        Umsetzung?
      </EmailText>

      <EmailDivider />

      <EmailHighlight>
        Im Vollzugang bekommst du den kompletten Lehrplan, wöchentliche
        Live-Sessions, das Trading-Journal und unseren Community-Discord.
      </EmailHighlight>

      <EmailButton href={`${appUrl}/pricing`}>
        Mitgliedschaft ansehen
      </EmailButton>

      <EmailText muted>
        Kein Druck. Wenn du noch Zeit brauchst — du hast deinen Free-Zugang
        weiterhin.
      </EmailText>
    </BaseEmail>
  );
}

export async function sendFreeCourseDay5(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "[Tag 5] Bereit für den nächsten Level?",
    jsx: (
      <FreeCourseDay5Email
        firstName={props.firstName}
        email={props.email}
        userId={props.userId}
      />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "free_course_welcome",
      step: 5,
    },
  });
}
