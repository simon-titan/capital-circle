import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailHeading,
  EmailText,
  EmailButton,
  EmailHighlight,
} from "../layout/components";
import { EMAIL_TOKENS as T } from "../layout/styles";

interface Props {
  email: string;
  password: string;
  fullName?: string;
  loginUrl: string;
}

/**
 * Mail mit Login-Daten nach Admin-Nutzererstellung.
 *
 * KEIN Unsubscribe-Link, da transaktional (rechtlich erforderliche
 * System-Mail — kein Marketing).
 */
export default function AdminCredentialsEmail({
  email,
  password,
  fullName,
  loginUrl,
}: Props) {
  const greeting = fullName?.trim() ? `Hallo ${fullName.trim()},` : "Hallo,";

  return (
    <BaseEmail previewText="Deine Capital Circle Zugangsdaten">
      <EmailHeading>{greeting}</EmailHeading>
      <EmailText>
        dein Zugang zur Plattform wurde eingerichtet. Hier sind deine
        Anmeldedaten:
      </EmailText>

      <EmailHighlight>
        <span
          style={{
            display: "block",
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: T.textMuted,
            marginBottom: "4px",
          }}
        >
          E-Mail
        </span>
        <span
          style={{
            display: "block",
            fontFamily: T.fontMono,
            fontSize: "15px",
            color: T.text,
            wordBreak: "break-all",
            marginBottom: "16px",
          }}
        >
          {email}
        </span>
        <span
          style={{
            display: "block",
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: T.textMuted,
            marginBottom: "4px",
          }}
        >
          Passwort
        </span>
        <span
          style={{
            display: "block",
            fontFamily: T.fontMono,
            fontSize: "15px",
            color: T.text,
            wordBreak: "break-all",
          }}
        >
          {password}
        </span>
      </EmailHighlight>

      <EmailButton href={loginUrl}>Zur Anmeldung</EmailButton>

      <EmailText muted>
        Aus Sicherheitsgründen empfehlen wir dir, das Passwort nach dem ersten
        Login unter den Kontoeinstellungen zu ändern.
      </EmailText>
    </BaseEmail>
  );
}
