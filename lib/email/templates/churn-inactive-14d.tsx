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

export default function ChurnInactive14dEmail({ firstName, userId }: Props) {
  const appUrl = getAppUrl();
  const token = generateUnsubscribeToken(userId);
  return (
    <BaseEmail
      previewText={`Hey ${firstName}, alles okay bei dir?`}
      unsubscribeToken={token}
    >
      <EmailHeading>Hey {firstName}, alles okay bei dir?</EmailHeading>
      <EmailText>
        zwei Wochen ohne Login — wir wollten kurz nachfragen. Trading ist
        anstrengend, das Leben drumherum auch. Wenn dir gerade etwas im Weg
        steht, ist das vollkommen normal.
      </EmailText>

      <EmailHighlight>
        Wenn du eine kurze Pause brauchst: Sag uns Bescheid (einfach auf diese
        Mail antworten). Wir können den Account auch temporär pausieren, ohne
        dass du den Zugang verlierst.
      </EmailHighlight>

      <EmailText>
        Falls du einfach den Wiedereinstieg suchst — der einfachste Weg ist
        eine der Live-Sessions. Da bist du nicht allein und kannst Fragen
        stellen.
      </EmailText>

      <EmailButton href={`${appUrl}/live-sessions`}>
        Nächste Live-Session ansehen
      </EmailButton>
    </BaseEmail>
  );
}

export async function sendChurnInactive14d(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: `Hey ${props.firstName}, alles okay bei dir?`,
    jsx: (
      <ChurnInactive14dEmail
        firstName={props.firstName}
        email={props.email}
        userId={props.userId}
      />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "churn_inactive",
      step: 14,
    },
  });
}
