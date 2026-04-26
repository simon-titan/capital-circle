import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailText } from "../layout/components";
import { sendEmail, type SendResult } from "../send";

interface Props {
  firstName: string;
  email: string;
  userId: string;
}

export default function FreeCourseDay1Email({ firstName }: Pick<Props, "firstName">) {
  return (
    <BaseEmail previewText="Sie scheitern daran, dass sie jahrelang die falschen Dinge lernen.">
      <EmailText>Hey {firstName},</EmailText>
      <EmailText>
        die meisten Trader scheitern nicht daran, dass sie es nicht ernst meinen.
      </EmailText>
      <EmailText>
        Sie scheitern daran, dass sie jahrelang die falschen Dinge lernen.
      </EmailText>
      <EmailText>
        Ein bisschen hier, ein bisschen da. Einzelne Konzepte, einzelne Begriffe,
        einzelne Setups. Aber nie ein echtes Fundament.
      </EmailText>
      <EmailText>
        Genau deshalb drehen sich so viele im Kreis, obwohl sie Zeit investieren,
        Mühe reinstecken und eigentlich vorankommen wollen.
      </EmailText>
      <EmailText>
        Wenn du diesen Free Kurs richtig anschaust, solltest du anfangen zu
        erkennen, dass Trading auf einem hohen Niveau nichts mit oberflächlichem
        Content-Konsum zu tun hat.
      </EmailText>
      <EmailText>
        Und genau das ist die eigentliche Chance, die du hier bekommen hast.
      </EmailText>
      <EmailText muted>Emre</EmailText>
    </BaseEmail>
  );
}

export async function sendFreeCourseDay1(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "Die meisten Trader scheitern nicht an Motivation",
    jsx: <FreeCourseDay1Email firstName={props.firstName} />,
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "free_course_welcome",
      step: 1,
    },
  });
}
