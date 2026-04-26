import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailText, EmailButton, EmailHighlight } from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";

interface Props {
  firstName: string;
  email: string;
  userId: string;
}

export default function FreeCourseDay5Email({ firstName }: Pick<Props, "firstName">) {
  const appUrl = getAppUrl();
  return (
    <BaseEmail previewText="Die Bewerbung für Capital Circle steht dir jetzt offen.">
      <EmailText>Hey {firstName},</EmailText>
      <EmailText>
        wenn du die letzten Tage richtig genutzt hast, dann solltest du
        inzwischen gemerkt haben, dass es hier um deutlich mehr geht als nur
        um einen Free Kurs.
      </EmailText>
      <EmailHighlight>
        Capital Circle ist kein öffentlicher Bereich und kein Ort für Leute,
        die einfach nur ein bisschen Content konsumieren wollen.
      </EmailHighlight>
      <EmailText>
        Es ist ein exklusiver Raum für Menschen, die Trading wirklich verstehen,
        sauber lernen und mit der richtigen Struktur vorankommen wollen.
      </EmailText>
      <EmailText>
        Wenn du für dich erkannt hast, dass du nicht weiter allein herumprobieren
        willst und verstanden hast, wie groß die Chance ist, die du hier bekommen
        hast, dann kannst du jetzt den nächsten Schritt gehen.
      </EmailText>
      <EmailText>
        Die Bewerbung für Capital Circle steht dir jetzt offen.
      </EmailText>
      <EmailButton href={`${appUrl}/bewerbung`}>
        Zur Bewerbung
      </EmailButton>
      <EmailText>
        Beantworte die Fragen sauber und nimm dir dafür kurz bewusst Zeit.
      </EmailText>
      <EmailText>
        Wenn deine Bewerbung passt, melden wir uns persönlich bei dir.
      </EmailText>
      <EmailText muted>Emre</EmailText>
    </BaseEmail>
  );
}

export async function sendFreeCourseDay5(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "Nicht jeder bekommt die Möglichkeit, den nächsten Schritt zu gehen.",
    jsx: (
      <FreeCourseDay5Email firstName={props.firstName} />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "free_course_welcome",
      step: 5,
    },
  });
}
