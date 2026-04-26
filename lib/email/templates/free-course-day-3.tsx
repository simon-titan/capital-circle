import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailText, EmailHighlight, EmailButton } from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";

interface Props {
  firstName: string;
  email: string;
  userId: string;
}

export default function FreeCourseDay3Email({ firstName }: Pick<Props, "firstName">) {
  const appUrl = getAppUrl();
  return (
    <BaseEmail previewText="Du bekommst Einblick in den Sonntags-Call — kostenlos.">
      <EmailText>Hey {firstName},</EmailText>
      <EmailText>
        als Teil dieses Zugangs bekommst du nicht nur die Inhalte des Free Kurses.
      </EmailText>
      <EmailHighlight>
        Du bekommst auch kostenlos Einblick in meinen Sonntags-Call, in dem ich
        die Märkte vor der Woche einordne und mein Framework offen zeige.
      </EmailHighlight>
      <EmailText>
        Auch das ist nicht selbstverständlich.
      </EmailText>
      <EmailText>
        Die meisten sehen irgendwo online nur Einstiege, Schlagwörter oder
        Ausschnitte. Aber sie sehen nie, wie ein Markt wirklich vorbereitet,
        gelesen und strukturiert wird.
      </EmailText>
      <EmailText>
        Genau deshalb ist so ein Zugang wertvoll.
      </EmailText>
      <EmailText>
        Nutze diese Möglichkeit nicht wie irgendeinen kostenlosen Bonus, sondern
        wie das, was sie ist: eine echte Chance, Dinge auf einem anderen Niveau
        zu verstehen.
      </EmailText>
      <EmailButton href={`${appUrl}/stream`}>
        Zum Live-Stream
      </EmailButton>
      <EmailText muted>Emre</EmailText>
    </BaseEmail>
  );
}

export async function sendFreeCourseDay3(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "Kostenloser Community Call bei Capital Circle!",
    jsx: (
      <FreeCourseDay3Email firstName={props.firstName} />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "free_course_welcome",
      step: 3,
    },
  });
}
