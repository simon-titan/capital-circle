import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailButton,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailHighlight,
  EmailLink,
  EmailSmall,
  EmailText,
} from "../layout/components";
import { EMAIL_TOKENS as T } from "../layout/styles";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";
import { LIFETIME_PREIS } from "@/config/lifetime";
import { TEAM_POSTFACH } from "@/config/team";
import { PREISZEILEN, datumLang, kaufUrl, whopKuendigungHilfe } from "@/config/whop-umzug";

interface Props {
  vorname: string | null;
  zugangBis: string;
  /** Ganze Tage bis zum Ablauf. 0 = heute, 1 = morgen. */
  tageRest: number;
  abmeldeLink: string;
}

/**
 * Mail 2 des Whop-Umzugs: die Erinnerung, fünf Tage vor dem persönlichen
 * Ablauf (`ERINNERUNG_VORLAUF_TAGE`).
 *
 * Deutlich kürzer als Mail 1, und ohne die Whop-Anleitung: Wer sie bekommt,
 * hat die Ankündigung bereits gelesen. Was hier zählt, sind zwei Zahlen — die
 * Tage bis zum Ablauf und das Datum — und ein Knopf.
 *
 * Bewusst **ohne Dringlichkeitsrhetorik.** Kein „letzte Chance", kein
 * Countdown, kein Rabatt, der um Mitternacht verfällt. Der Ablauf ist ein
 * Termin, kein Druckmittel; wer später zurückkommt, zahlt denselben Preis.
 */
export default function WhopUmzug2Erinnerung({ vorname, zugangBis, tageRest, abmeldeLink }: Props) {
  const appUrl = getAppUrl();
  const bis = datumLang(zugangBis);
  const rest = tageRest <= 0 ? "heute" : tageRest === 1 ? "morgen" : `in ${tageRest} Tagen`;

  return (
    <BaseEmail
      previewText={`Dein bezahlter Zeitraum endet ${rest}, am ${bis}`}
      hideFooter={false}
      unsubscribeUrl={abmeldeLink}
    >
      <EmailEyebrow>Whop-Umzug</EmailEyebrow>
      <EmailHeading>
        {vorname ? `${vorname}, dein Zeitraum endet ${rest}` : `Dein Zeitraum endet ${rest}`}
      </EmailHeading>

      <EmailText>
        kurze Erinnerung, mehr ist es nicht: Der Zeitraum, den du bei Whop bezahlt hast, läuft am {bis} aus.
      </EmailText>

      <EmailHighlight>
        <strong style={{ color: T.goldLight }}>Danach ruht dein Zugang.</strong>
        <br />
        Institut und Mitgliederkanäle sind dann zu. Dein Konto, dein Fortschritt und deine Notizen bleiben
        gespeichert — du machst später genau dort weiter, wo du aufgehört hast.
      </EmailHighlight>

      <EmailText>Wenn du dabeibleiben möchtest, reicht ein Klick:</EmailText>
      <EmailButton href={kaufUrl(appUrl, "monthly")}>Mitgliedschaft fortsetzen</EmailButton>

      <EmailText muted>
        Auch möglich:{" "}
        {PREISZEILEN.filter((p) => p.plan !== "monthly").map((p, i, arr) => (
          <React.Fragment key={p.plan}>
            <EmailLink href={kaufUrl(appUrl, p.plan)}>{p.text}</EmailLink>
            {i < arr.length - 1 ? " · " : ""}
          </React.Fragment>
        ))}
        . Oder Lifetime für {LIFETIME_PREIS} einmalig — die Karte dazu steht nach dem Anmelden unter Einstellungen →
        Abonnement.
      </EmailText>

      <EmailDivider />

      <EmailText muted>
        Und falls es untergegangen ist: Dein <strong>Whop-Abo musst du selbst kündigen</strong>, sonst bucht Whop am{" "}
        {bis} erneut ab. Wie das geht, stand in unserer ersten Mail. {whopKuendigungHilfe()}
      </EmailText>

      <EmailSmall>Fragen? Antworte auf diese Mail oder schreib an {TEAM_POSTFACH}.</EmailSmall>
    </BaseEmail>
  );
}

export async function sendWhopUmzug2(props: Props & { an: string; replyTo?: string }): Promise<SendResult> {
  const rest = props.tageRest <= 0 ? "heute" : props.tageRest === 1 ? "morgen" : `in ${props.tageRest} Tagen`;
  return sendEmail({
    to: props.an,
    subject: `Dein Zugang endet ${rest} — am ${datumLang(props.zugangBis)}`,
    replyTo: props.replyTo,
    jsx: (
      <WhopUmzug2Erinnerung
        vorname={props.vorname}
        zugangBis={props.zugangBis}
        tageRest={props.tageRest}
        abmeldeLink={props.abmeldeLink}
      />
    ),
  });
}
