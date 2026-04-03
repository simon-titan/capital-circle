import { Resend } from "resend";

/** Capital Circle Design-Tokens (E-Mail: überwiegend Inline-Styles) */
const BG = "#07080A";
const BG_CARD = "#0C0D10";
const GOLD = "#D4AF37";
const TEXT = "#F0F0F2";
const TEXT_MUTED = "#9A9AA4";
const BORDER = "1px solid rgba(212, 175, 55, 0.35)";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildWelcomeEmailHtml(params: {
  email: string;
  password: string;
  fullName?: string;
  loginUrl: string;
  logoUrl: string;
}): string {
  const { email, password, fullName, loginUrl, logoUrl } = params;
  const greeting = fullName?.trim()
    ? `Hallo ${escapeHtml(fullName.trim())},`
    : "Hallo,";

  const safeEmail = escapeHtml(email);
  const safePassword = escapeHtml(password);
  const safeLoginUrl = escapeHtml(loginUrl);
  const safeLogoUrl = escapeHtml(logoUrl);

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Capital Circle — Zugangsdaten</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=JetBrains+Mono:wght@400&family=Radley:ital@0;1&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:'Inter',system-ui,-apple-system,sans-serif;color:${TEXT};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;">
          <tr>
            <td style="padding-bottom:8px;text-align:center;">
              <img
                src="${safeLogoUrl}"
                alt="Capital Circle"
                width="200"
                height="56"
                style="display:block;margin:0 auto;max-width:200px;width:100%;height:auto;border:0;outline:none;text-decoration:none;"
              />
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;text-align:center;">
              <div style="height:1px;width:120px;background:linear-gradient(90deg,transparent,${GOLD},transparent);margin:16px auto 0;"></div>
            </td>
          </tr>
          <tr>
            <td style="background-color:${BG_CARD};border:${BORDER};border-radius:12px;padding:28px 24px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${TEXT};">
                ${greeting}
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${TEXT_MUTED};">
                dein Zugang zur Plattform wurde eingerichtet. Hier sind deine Anmeldedaten:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${BG};border-radius:8px;border:1px solid rgba(212,175,55,0.2);">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:${TEXT_MUTED};">E-Mail</p>
                    <p style="margin:0 0 18px;font-family:'JetBrains Mono','Consolas',monospace;font-size:15px;color:${TEXT};word-break:break-all;">${safeEmail}</p>
                    <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:${TEXT_MUTED};">Passwort</p>
                    <p style="margin:0;font-family:'JetBrains Mono','Consolas',monospace;font-size:15px;color:${TEXT};word-break:break-all;">${safePassword}</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px auto 0;">
                <tr>
                  <td align="center" style="border-radius:8px;background:linear-gradient(135deg,${GOLD} 0%,#b8922a 100%);">
                    <a href="${safeLoginUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:${BG};text-decoration:none;font-family:'Inter',system-ui,sans-serif;">
                      Zur Anmeldung
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:${TEXT_MUTED};max-width:480px;margin-left:auto;margin-right:auto;">
                Aus Sicherheitsgründen empfehlen wir dir, das Passwort nach dem ersten Login unter den Kontoeinstellungen zu ändern.
              </p>
              <p style="margin:16px 0 0;font-size:12px;color:${TEXT_MUTED};opacity:0.85;">
                © Capital Circle
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sendet die Welcome-Mail mit Login-Daten nach Admin-Nutzererstellung.
 * Ohne `RESEND_API_KEY` wird nichts versendet (nur Log-Hinweis).
 */
export async function sendWelcomeMail(
  email: string,
  password: string,
  fullName?: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey) {
    console.warn("[welcome-mail] RESEND_API_KEY fehlt — Welcome-Mail wird nicht versendet.");
    return;
  }
  if (!from) {
    console.warn("[welcome-mail] RESEND_FROM_EMAIL fehlt — Welcome-Mail wird nicht versendet.");
    return;
  }

  /** Öffentliche Basis für Mail-Links (Button, Logo). Standard: Produktionsdomain. Override z. B. für lokale Resend-Tests: `WELCOME_MAIL_PUBLIC_URL=http://localhost:3000`. */
  const defaultPublicBase = "https://www.capitalcircletrading.com";
  const baseUrl = (
    process.env.WELCOME_MAIL_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    defaultPublicBase
  ).replace(/\/$/, "");
  const loginUrl = `${baseUrl}/login`;
  /** Gleiche Datei wie in `components/brand/Logo.tsx` (onDark) — muss öffentlich unter dieser URL erreichbar sein. */
  const logoUrl = `${baseUrl}/logo/logo-white.png`;

  const html = buildWelcomeEmailHtml({
    email,
    password,
    fullName,
    loginUrl,
    logoUrl,
  });

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: email.trim(),
    subject: "Deine Zugangsdaten für Capital Circle",
    html,
  });

  if (error) {
    throw new Error(error.message ?? "Resend: unbekannter Fehler");
  }
}
