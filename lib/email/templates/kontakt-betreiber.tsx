import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailHeading, EmailQuote, EmailRows, EmailText } from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { KONTAKT_EMAIL } from "@/lib/support/kontakt";

/**
 * Hinweis an den Betreiber: Über das Kontaktformular ist eine neue Anfrage
 * eingegangen. Ohne die Mail läge sie unbemerkt im Ticketbereich.
 */

interface Props {
  name: string;
  email: string;
  kategorie: string;
  betreff: string;
  nachricht: string;
  ticketUrl: string;
}

export default function KontaktBetreiberEmail({ name, email, kategorie, betreff, nachricht, ticketUrl }: Props) {
  return (
    <BaseEmail previewText={`Neue Kontaktanfrage: ${betreff}`}>
      <EmailHeading>Neue Kontaktanfrage</EmailHeading>
      <EmailText>Über das Kontaktformular ohne Anmeldung ist eine Nachricht eingegangen.</EmailText>
      <EmailRows
        rows={[
          ["Name", name],
          ["E-Mail", email],
          ["Thema", kategorie],
          ["Betreff", betreff],
        ]}
      />
      <EmailQuote>{nachricht.slice(0, 600)}</EmailQuote>
      <EmailButton href={ticketUrl}>Ticket öffnen und antworten</EmailButton>
    </BaseEmail>
  );
}

export async function sendKontaktBetreiber(props: Props): Promise<SendResult> {
  return sendEmail({
    to: KONTAKT_EMAIL,
    subject: `Neue Kontaktanfrage: ${props.betreff}`,
    replyTo: props.email,
    jsx: <KontaktBetreiberEmail {...props} />,
  });
}
