import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailHeading, EmailHighlight, EmailText } from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";
import { LIFETIME_PREIS, lifetimeUrl } from "@/config/lifetime";

interface Props {
  vorname: string | null;
  abmeldeLink: string;
}

/**
 * Die Mail der vorbereiteten Rückgewinnungs-Kampagne (`config/rueckgewinnung.ts`).
 *
 * Werbung: Abmeldelink und Widerspruchshinweis im Fuss über `unsubscribeUrl`
 * (`lib/email/abmeldung.ts`). Kein Eintrag in `email_sequence_log` — die
 * Merkliste der Kampagne ist `kampagne_versand`, und die kennt auch die
 * Direktnachricht.
 */
export default function RueckgewinnungLifetimeEmail({ vorname, abmeldeLink }: Props) {
  const appUrl = getAppUrl();
  return (
    <BaseEmail previewText="Einmal zahlen, dauerhaft dabei" unsubscribeUrl={abmeldeLink}>
      <EmailHeading>{vorname ? `Hey ${vorname}, dein Platz ist noch da` : "Dein Platz ist noch da"}</EmailHeading>
      <EmailText>
        dein Konto, dein Journal und dein Fortschritt im Institut sind noch gespeichert. Wenn du wieder einsteigst, machst
        du genau dort weiter, wo du aufgehört hast.
      </EmailText>
      <EmailHighlight>
        Neu für ehemalige Mitglieder: Lifetime. Du zahlst einmalig {LIFETIME_PREIS} und bist dauerhaft dabei — ohne
        Abo, ohne Verlängerung, ohne Abbuchung jeden Monat.
      </EmailHighlight>
      <EmailButton href={lifetimeUrl(appUrl)}>Lifetime ansehen</EmailButton>
      <EmailText muted>
        Nach dem Anmelden findest du unter Einstellungen → Abonnement auch die normalen Laufzeiten. Passwort vergessen?{" "}
        {`${appUrl}/passwort-vergessen`}
      </EmailText>
    </BaseEmail>
  );
}

export async function sendRueckgewinnungLifetime(props: Props & { an: string; replyTo?: string }): Promise<SendResult> {
  return sendEmail({
    to: props.an,
    subject: "Einmal zahlen, dauerhaft dabei",
    replyTo: props.replyTo,
    jsx: <RueckgewinnungLifetimeEmail vorname={props.vorname} abmeldeLink={props.abmeldeLink} />,
  });
}
