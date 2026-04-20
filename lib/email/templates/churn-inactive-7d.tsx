import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailHeading,
  EmailText,
  EmailButton,
} from "../layout/components";
import { generateUnsubscribeToken } from "../unsubscribe-token";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";

interface Props {
  firstName: string;
  email: string;
  userId: string;
}

export default function ChurnInactive7dEmail({ firstName, userId }: Props) {
  const appUrl = getAppUrl();
  const token = generateUnsubscribeToken(userId);
  return (
    <BaseEmail
      previewText="Du verpasst gerade etwas..."
      unsubscribeToken={token}
    >
      <EmailHeading>Du warst lang nicht da, {firstName}</EmailHeading>
      <EmailText>
        wir haben dich seit über einer Woche nicht in der Plattform gesehen —
        und das gerade jetzt, wo wir frische Marktanalysen und neue Lektionen
        veröffentlicht haben.
      </EmailText>

      <EmailText>
        Du musst nicht jeden Tag online sein. Aber wenn du gerade in einer
        ruhigen Phase bist, hier sind ein paar Dinge, die dich vielleicht
        zurückholen:
      </EmailText>

      <EmailText muted>
        — Aktuelle Marktanalyse von dieser Woche
        <br />
        — 2 neue Strategie-Lektionen
        <br />— Live-Session-Replays der letzten 7 Tage
      </EmailText>

      <EmailButton href={`${appUrl}/dashboard`}>Schau wieder rein</EmailButton>
    </BaseEmail>
  );
}

export async function sendChurnInactive7d(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "Du verpasst gerade etwas...",
    jsx: (
      <ChurnInactive7dEmail
        firstName={props.firstName}
        email={props.email}
        userId={props.userId}
      />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "churn_inactive",
      step: 7,
    },
  });
}
