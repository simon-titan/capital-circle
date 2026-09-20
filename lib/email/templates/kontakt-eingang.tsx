import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailHeading, EmailQuote, EmailSmall, EmailText } from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { KONTAKT_EMAIL } from "@/lib/support/kontakt";

/**
 * Bestätigung an jemanden, der das Kontaktformular ohne Anmeldung benutzt hat.
 *
 * Trägt den Link zum Verlauf: Ohne Konto ist er der einzige Weg zurück zum
 * Ticket. Transaktionsmail, kein Abmeldelink.
 */

interface Props {
  name: string;
  betreff: string;
  auszug: string;
  verlaufUrl: string;
}

export default function KontaktEingangEmail({ name, betreff, auszug, verlaufUrl }: Props) {
  const vorname = name.trim().split(/\s+/)[0] || "";
  return (
    <BaseEmail previewText={`Wir haben deine Nachricht erhalten: ${betreff}`}>
      <EmailHeading>{vorname ? `Hallo ${vorname},` : "Hallo,"}</EmailHeading>
      <EmailText>deine Nachricht ist bei uns angekommen. Wir melden uns so schnell wie möglich per E-Mail.</EmailText>
      <EmailText muted>
        <strong>Betreff:</strong> {betreff}
      </EmailText>
      <EmailQuote>{auszug}</EmailQuote>
      <EmailText>Über diesen Link siehst du unsere Antworten und kannst selbst nachschreiben:</EmailText>
      <EmailButton href={verlaufUrl}>Verlauf öffnen</EmailButton>
      <EmailSmall>
        Der Link gehört nur dir. Gib ihn bitte nicht weiter, denn wer ihn hat, kann den Verlauf lesen. Du hast diese
        Nachricht nicht abgeschickt? Dann kannst du diese E-Mail ignorieren.
      </EmailSmall>
      <EmailSmall>Fragen? Antworte auf diese E-Mail oder schreib an {KONTAKT_EMAIL}.</EmailSmall>
    </BaseEmail>
  );
}

export async function sendKontaktEingang({
  an,
  name,
  betreff,
  nachricht,
  verlaufUrl,
}: {
  an: string;
  name: string;
  betreff: string;
  nachricht: string;
  verlaufUrl: string;
}): Promise<SendResult> {
  return sendEmail({
    to: an,
    subject: `Wir haben deine Nachricht erhalten: ${betreff}`,
    replyTo: KONTAKT_EMAIL,
    jsx: <KontaktEingangEmail name={name} betreff={betreff} auszug={nachricht.slice(0, 220)} verlaufUrl={verlaufUrl} />,
  });
}
