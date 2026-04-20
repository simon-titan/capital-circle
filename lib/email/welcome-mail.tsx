import * as React from "react";
import { render } from "@react-email/render";
import { getResend, getFrom, getAppUrl } from "./resend";
import AdminCredentialsEmail from "./templates/admin-credentials";

/**
 * Sendet die Welcome-Mail mit Login-Daten nach Admin-Nutzererstellung.
 *
 * Migriert von HTML-String auf React-Email (Paket 2 — Email-Infrastruktur).
 * Die öffentliche API bleibt UNVERÄNDERT — alle bestehenden Caller
 * (`app/api/admin/users/...`) funktionieren ohne Anpassung weiter.
 *
 * Ohne `RESEND_API_KEY` wird nichts versendet (nur Log-Hinweis), damit
 * Admin-Aktionen in lokalen Dev-Umgebungen nicht failen.
 */
export async function sendWelcomeMail(
  email: string,
  password: string,
  fullName?: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEnv = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey) {
    console.warn(
      "[welcome-mail] RESEND_API_KEY fehlt — Welcome-Mail wird nicht versendet.",
    );
    return;
  }
  if (!fromEnv) {
    console.warn(
      "[welcome-mail] RESEND_FROM_EMAIL fehlt — Welcome-Mail wird nicht versendet.",
    );
    return;
  }

  const baseUrl = (
    process.env.WELCOME_MAIL_PUBLIC_URL?.trim() || getAppUrl()
  ).replace(/\/$/, "");
  const loginUrl = `${baseUrl}/login`;

  const html = await render(
    <AdminCredentialsEmail
      email={email}
      password={password}
      fullName={fullName}
      loginUrl={loginUrl}
    />,
  );

  const resend = getResend();
  const { error } = await resend.emails.send({
    from: getFrom(),
    to: email.trim(),
    subject: "Deine Zugangsdaten für Capital Circle",
    html,
  });

  if (error) {
    throw new Error(error.message ?? "Resend: unbekannter Fehler");
  }
}
