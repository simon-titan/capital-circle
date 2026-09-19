import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailButton,
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailSmall,
  EmailText,
} from "../layout/components";
import { EMAIL_TOKENS as T } from "../layout/styles";
import { sendEmail, type SendResult } from "../send";

/**
 * Link für ein neues Passwort („Passwort vergessen" auf `/passwort-vergessen`).
 *
 * Der Link ist derselbe wie in der Willkommensmail nach einem Gast-Kauf
 * (`lib/auth/password-link.ts` → `/auth/confirm` → `/set-password`). Deshalb
 * funktioniert diese Mail auch für jemanden, der nach dem Kauf **noch nie** ein
 * Passwort gesetzt hat — der Weg ist für beide Fälle derselbe.
 *
 * Bewusst **keine Dauer** im Text: Wie lange der Link gilt, steht in den
 * Supabase-Einstellungen („Email OTP Expiration"), nicht im Code. Eine Zahl hier
 * wäre falsch, sobald dort jemand dreht. Wahr bleibt in jedem Fall: einmal
 * benutzbar, und jede neue Anforderung ersetzt die alte.
 *
 * Transaktional, also ohne Abmeldelink.
 */

interface Props {
  /** Fertiger Link aus `createSetPasswordLink()`. */
  link: string;
  /** Die Adresse, für die der Link gilt — steht im Text, damit klar ist, welches Konto gemeint ist. */
  email: string;
}

export default function PasswortZuruecksetzenEmail({ link, email }: Props) {
  return (
    <BaseEmail previewText="Dein Link für ein neues Passwort bei Capital Circle">
      <EmailEyebrow>Passwort zurücksetzen</EmailEyebrow>
      <EmailHeading>Neues Passwort wählen</EmailHeading>
      <EmailText>
        Für dein Konto <strong style={{ color: T.text }}>{email}</strong> wurde gerade ein neues Passwort
        angefordert. Über den Knopf wählst du eins — danach bist du direkt eingeloggt.
      </EmailText>

      <EmailButton href={link}>Neues Passwort wählen</EmailButton>

      <EmailText muted>
        Der Link funktioniert genau einmal und nur für begrenzte Zeit. Hast du mehrere dieser Mails bekommen, nimm
        die neueste: Jede neue Anforderung macht die älteren Links ungültig.
      </EmailText>

      <EmailDivider />
      <EmailSmall>Der Knopf funktioniert nicht? Kopiere diese Adresse in deinen Browser:</EmailSmall>
      <p
        style={{
          margin: "0 0 16px",
          fontFamily: T.fontBody,
          fontSize: "12px",
          lineHeight: 1.5,
          color: T.goldLight,
          wordBreak: "break-all",
        }}
      >
        {link}
      </p>
      <EmailSmall>
        Du hast kein neues Passwort angefordert? Dann ignoriere diese Mail einfach. Dein bisheriges Passwort bleibt
        gültig, und ohne diesen Link lässt sich daran nichts ändern.
      </EmailSmall>
    </BaseEmail>
  );
}

/**
 * Versand ohne eigenen Log-Eintrag: Den Eintrag in `email_sequence_log` legt
 * `lib/auth/passwort-reset.ts` selbst an — **bevor** der Link entsteht. Der
 * übliche Weg über `sendEmail({ log })` legt ihn erst beim Versand an, also
 * nach `generateLink`; ein Doppelklick hätte dann schon den Link der ersten
 * Mail entwertet, bevor die Sperre greift.
 */
export async function sendPasswortZuruecksetzen({
  an,
  link,
}: {
  an: string;
  link: string;
}): Promise<SendResult> {
  return sendEmail({
    to: an,
    subject: "Dein Link für ein neues Passwort",
    jsx: <PasswortZuruecksetzenEmail link={link} email={an} />,
  });
}
