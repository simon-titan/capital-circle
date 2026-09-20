import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailHeading, EmailText } from "../layout/components";
import { abmeldeUrl } from "../abmeldung";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";

interface Props {
  firstName: string;
  email: string;
  userId: string;
}

export default function ChurnInactive14dEmail({ firstName, abmeldeLink }: Pick<Props, "firstName"> & { abmeldeLink?: string }) {
  const appUrl = getAppUrl();
  return (
    <BaseEmail previewText={`Hey ${firstName}, alles okay bei dir?`} unsubscribeUrl={abmeldeLink}>
      <EmailHeading>Hey {firstName}, alles okay bei dir?</EmailHeading>
      <EmailText>
        zwei Wochen ohne Login. Wir wollten kurz nachfragen. Trading ist
        anstrengend, das Leben drumherum auch. Wenn dir gerade etwas im Weg
        steht, ist das vollkommen normal.
      </EmailText>

      <EmailText>
        Wenn du eine kurze Pause brauchst: Sag uns Bescheid (einfach auf diese
        Mail antworten). Wir können den Account auch temporär pausieren, ohne
        dass du den Zugang verlierst.
      </EmailText>

      <EmailText>
        Falls du einfach den Wiedereinstieg suchst: Der einfachste Weg ist
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
      <ChurnInactive14dEmail firstName={props.firstName} abmeldeLink={abmeldeUrl({ userId: props.userId, email: props.email })} />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "churn_inactive",
      step: 14,
    },
  });
}
