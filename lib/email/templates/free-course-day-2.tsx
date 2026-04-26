import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailText, EmailHighlight } from "../layout/components";
import { sendEmail, type SendResult } from "../send";

interface Props {
  firstName: string;
  email: string;
  userId: string;
}

export default function FreeCourseDay2Email({ firstName }: Pick<Props, "firstName">) {
  return (
    <BaseEmail previewText="Es fehlt nicht an Strategie — es fehlt am Fundament.">
      <EmailText>Hey {firstName},</EmailText>
      <EmailText>
        viele glauben, sie bräuchten einfach nur eine bessere Strategie.
      </EmailText>
      <EmailText>
        In Wirklichkeit fehlt ihnen meistens etwas ganz anderes:
        ein sauberes Verständnis dafür, wie Märkte wirklich funktionieren.
      </EmailText>
      <EmailHighlight>
        Kontext. Auktion. Volumen. Liquidität. Struktur. Teilnehmerverhalten.
        Fundamentale Einordnung.
      </EmailHighlight>
      <EmailText>
        Solange diese Dinge nicht sauber zusammenspielen, bleibt Trading für
        die meisten Stückwerk.
      </EmailText>
      <EmailText>
        Genau deshalb ist der Unterschied zwischen oberflächlichem Wissen und
        echtem Marktverständnis so groß.
      </EmailText>
      <EmailText>
        Wenn du aufmerksam bist, solltest du inzwischen merken, dass du hier
        nicht einfach nur kostenlosen Content bekommen hast, sondern Zugang zu
        einer ganz anderen Denkweise.
      </EmailText>
      <EmailText muted>Emre</EmailText>
    </BaseEmail>
  );
}

export async function sendFreeCourseDay2(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "Warum die meisten nie wirklich lernen, den Markt zu lesen",
    jsx: (
      <FreeCourseDay2Email firstName={props.firstName} />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "free_course_welcome",
      step: 2,
    },
  });
}
