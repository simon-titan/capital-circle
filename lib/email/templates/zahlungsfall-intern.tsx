import * as React from "react";
import { getAppUrl } from "@/lib/site-url";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailHeading, EmailHighlight, EmailText } from "../layout/components";
import { sendEmail, type SendResult } from "../send";

type Props =
  | {
      art: "neu";
      name: string;
      email: string;
      paket: string;
      betrag: string;
      versuche: number;
      frist: string;
      fallUrl: string;
    }
  | {
      art: "antwort";
      name: string;
      email: string;
      auszug: string;
      fallUrl: string;
    };

type SendProps = { an: string; fallId: string } & (
  | { art: "neu"; name: string; email: string; paket: string; betrag: string; versuche: number; frist: string }
  | { art: "antwort"; name: string; email: string; auszug: string }
);

/**
 * Betriebspost ans Team: ein neuer Zahlungsfall, oder eine Antwort des Kunden.
 *
 * Übernommen aus MoonTrading (`zahlungsfall-intern.tsx`). Ersetzt den
 * Slack-„Closer-Alarm" nach sieben Tagen: Das Team erfährt **am ersten Tag**
 * von einem Ausfall, und nicht erst, wenn der Zugang schon weg ist.
 *
 * ── Warum die Antwort eine eigene Meldung bekommt ──────────────────────────
 *
 * Im Hintergrund läuft eine Uhr. Wer am dritten Tag schreibt „neue Karte kommt
 * Freitag", darf nicht am fünften die Mahnung und am siebten die Sperre
 * bekommen, weil niemand die Antwort gesehen hat.
 *
 * Interne Post: kein Abmeldelink, Name und Adresse des Kunden stehen drin.
 */
export default function ZahlungsfallInternEmail(props: Props) {
  if (props.art === "antwort") {
    return (
      <BaseEmail previewText={`Antwort zu einem Zahlungsfall: ${props.name}`}>
        <EmailHeading>Antwort zu einem Zahlungsfall</EmailHeading>
        <EmailText>
          <strong>
            {props.name} · {props.email}
          </strong>
        </EmailText>
        <EmailHighlight>{props.auszug}</EmailHighlight>
        <EmailText muted>
          Geschrieben über den Knopf in Discord. Beantwortet wird in der Fallakte — die Antwort geht als
          Direktnachricht und per Mail an den Kunden.
        </EmailText>
        <EmailButton href={props.fallUrl}>Fall öffnen</EmailButton>
      </BaseEmail>
    );
  }

  return (
    <BaseEmail previewText={`Zahlung fehlgeschlagen: ${props.name}, ${props.betrag}`}>
      <EmailHeading>Zahlung fehlgeschlagen</EmailHeading>
      <EmailText>
        <strong>
          {props.name} · {props.betrag}
        </strong>
      </EmailText>
      <EmailText muted>
        {props.email} · Tarif {props.paket} · {props.versuche <= 1 ? "erster Versuch" : `${props.versuche}. Versuch`} ·
        Zugang ruht ab {props.frist}
      </EmailText>
      <EmailText muted>
        Der Kunde hat eine Mail und, falls Discord verknüpft ist, eine Direktnachricht mit dem Zahlungslink bekommen.
        Antwortet er über den Knopf, landet die Antwort in der Fallakte.
      </EmailText>
      <EmailButton href={props.fallUrl}>Fall öffnen</EmailButton>
    </BaseEmail>
  );
}

export async function sendZahlungsfallIntern(props: SendProps): Promise<SendResult> {
  const fallUrl = `${getAppUrl()}/admin/zahlungsstoerungen/${props.fallId}`;
  const betreff =
    props.art === "neu"
      ? `Zahlung fehlgeschlagen: ${props.name}, ${props.betrag}`
      : `Antwort zu Zahlungsfall: ${props.name}`;

  return sendEmail({
    to: props.an,
    subject: betreff,
    jsx:
      props.art === "neu" ? (
        <ZahlungsfallInternEmail
          art="neu"
          name={props.name}
          email={props.email}
          paket={props.paket}
          betrag={props.betrag}
          versuche={props.versuche}
          frist={props.frist}
          fallUrl={fallUrl}
        />
      ) : (
        <ZahlungsfallInternEmail
          art="antwort"
          name={props.name}
          email={props.email}
          auszug={props.auszug}
          fallUrl={fallUrl}
        />
      ),
  });
}
