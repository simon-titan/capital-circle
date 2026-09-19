import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailHeading, EmailRows, EmailText } from "../layout/components";

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

      <EmailRows
        mono
        rows={[
          ["E-Mail", email],
          ["Passwort", password],
        ]}
      />

      <EmailButton href={loginUrl}>Zur Anmeldung</EmailButton>

      <EmailText muted>
        Aus Sicherheitsgründen empfehlen wir dir, das Passwort nach dem ersten
        Login unter den Kontoeinstellungen zu ändern.
      </EmailText>
    </BaseEmail>
  );
}
