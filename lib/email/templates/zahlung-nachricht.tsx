import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailHeading, EmailLink, EmailText } from "../layout/components";
import { sendEmail, type SendResult } from "../send";

interface Props {
  ueberschrift: string;
  absaetze: string[];
  knopfText: string;
  knopfUrl: string;
  /** Abmeldelink im Fuss, sobald die Mail einen Werbehinweis trägt (Lifetime). */
  abmeldeToken?: string;
}

interface SendProps extends Props {
  an: string;
  betreff: string;
}

/**
 * Nachrichten zu einem Zahlungsfall, als Mail: erste Nachricht, Erinnerungen,
 * Sperre, Aufschub und Antworten aus der Fallakte.
 *
 * Ersetzt `payment-failed-1/2/3.tsx` (übernommen aus MoonTrading,
 * `zahlung-nachricht.tsx`).
 *
 * ── Warum derselbe Text wie in Discord ──────────────────────────────────────
 *
 * Weil es dieselbe Nachricht ist. Der Text kommt aus `config/zahlung.ts`, nur
 * mit `kanal: "mail"` (anderer Rückweg, kein Knopf-Hinweis). Zwei getrennt
 * gepflegte Fassungen liefen auseinander, und dann läse ein Kunde in der Mail
 * eine andere Frist als in Discord.
 *
 * ── Keine Einmaligkeit über `email_sequence_log` ────────────────────────────
 *
 * Mit Absicht ohne `log`: Die alte Mahnstrecke war über
 * (Adresse, Sequenz, Schritt) eindeutig, und damit bekam ein zweiter
 * Zahlungsausfall desselben Kunden **keine einzige Mail** mehr. Die
 * Einmaligkeit steckt jetzt im Fall selbst (eine Rechnung, ein Fall, ein
 * Erinnerungszähler).
 *
 * ── Transaktional ───────────────────────────────────────────────────────────
 *
 * Sie betrifft den bezahlten Zugang des Empfängers und geht deshalb auch an
 * Abgemeldete. Trägt sie den Lifetime-Hinweis (nur ohne Werbewiderspruch),
 * bekommt sie den Abmeldelink im Fuss.
 */

const URL_MUSTER = /(https?:\/\/[^\s]+)/g;

/** Zeilenumbrüche erhalten und nackte Adressen anklickbar machen. */
function Absatz({ text }: { text: string }) {
  const zeilen = text.split("\n");
  return (
    <EmailText>
      {zeilen.map((zeile, i) => (
        <React.Fragment key={i}>
          {zeile.split(URL_MUSTER).map((teil, j) =>
            /^https?:\/\//.test(teil) ? (
              <EmailLink key={j} href={teil}>
                {teil}
              </EmailLink>
            ) : (
              <React.Fragment key={j}>{teil}</React.Fragment>
            ),
          )}
          {i < zeilen.length - 1 ? <br /> : null}
        </React.Fragment>
      ))}
    </EmailText>
  );
}

export default function ZahlungNachrichtEmail({ ueberschrift, absaetze, knopfText, knopfUrl, abmeldeToken }: Props) {
  return (
    <BaseEmail
      previewText={ueberschrift}
      hideFooter={!abmeldeToken}
      unsubscribeToken={abmeldeToken}
    >
      <EmailHeading>{ueberschrift}</EmailHeading>
      {absaetze.map((a, i) => (
        <Absatz key={i} text={a} />
      ))}
      <EmailButton href={knopfUrl}>{knopfText}</EmailButton>
    </BaseEmail>
  );
}

export async function sendZahlungNachricht(props: SendProps): Promise<SendResult> {
  return sendEmail({
    to: props.an,
    subject: props.betreff,
    jsx: (
      <ZahlungNachrichtEmail
        ueberschrift={props.ueberschrift}
        absaetze={props.absaetze}
        knopfText={props.knopfText}
        knopfUrl={props.knopfUrl}
        abmeldeToken={props.abmeldeToken}
      />
    ),
  });
}
