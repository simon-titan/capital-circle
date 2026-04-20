import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailHeading,
  EmailText,
  EmailButton,
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

export default function ReactivationOfferEmail({ firstName, userId }: Props) {
  const appUrl = getAppUrl();
  const token = generateUnsubscribeToken(userId);
  return (
    <BaseEmail
      previewText="Wir würden dich gern zurückbegrüßen"
      unsubscribeToken={token}
    >
      <EmailHeading>Wir würden dich gern zurück haben, {firstName}</EmailHeading>
      <EmailText>
        es sind zwei Wochen vergangen, seit du gegangen bist. In dieser Zeit
        haben wir den Lehrplan überarbeitet und ein paar Dinge eingebaut, die
        wir früher hätten tun sollen.
      </EmailText>

      <EmailHighlight>
        Als kleines Dankeschön für deinen früheren Vertrauensvorschuss: Reaktiviere
        innerhalb der nächsten 7 Tage und du bekommst deinen ersten Monat
        kostenlos.
      </EmailHighlight>

      <EmailButton href={`${appUrl}/pricing`}>Reaktivieren</EmailButton>

      <EmailText muted>
        Kein Druck — wenn du nicht willst, hörst du nichts mehr von uns zu
        diesem Thema.
      </EmailText>
    </BaseEmail>
  );
}

export async function sendReactivationOffer(
  props: Props,
): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "Wir würden dich gern zurückbegrüßen",
    jsx: (
      <ReactivationOfferEmail
        firstName={props.firstName}
        email={props.email}
        userId={props.userId}
      />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "reactivation",
      step: 0,
    },
  });
}
