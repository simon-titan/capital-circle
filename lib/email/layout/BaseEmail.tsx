import * as React from "react";
import { EMAIL_TOKENS as T } from "./styles";
import { getAppUrl } from "../resend";

interface BaseEmailProps {
  children: React.ReactNode;
  previewText: string;
  /**
   * Nur wirksam wenn `hideFooter={false}`: DSGVO-Unsubscribe-Link im Footer.
   * Baut `${appUrl}/api/unsubscribe?token=...`. Für abweichende Routen
   * (z. B. Kampagnen ohne `profiles`-Zeile) stattdessen `unsubscribeUrl` nutzen.
   */
  unsubscribeToken?: string;
  /** Vollständige Unsubscribe-URL — hat Vorrang vor `unsubscribeToken`. */
  unsubscribeUrl?: string;
  /** Standard: Wortmarke „CAPITAL CIRCLE“ in Weiß. Bei `false` in Champagner. */
  headerLogo?: boolean;
  /** Standard: kein rechtlicher Footer. Bei `false` Impressum, Datenschutz, optional Abmelden. */
  hideFooter?: boolean;
  /**
   * Optionaler CSS-`background-image` für die Lichtkante unter der Wortmarke.
   * Standard: Champagner-Verlauf (Vollton-Fallback bleibt die Champagner-Haarlinie).
   */
  accentGradient?: string;
  /** Farbe der Footer-Links (Impressum/Datenschutz/Abmelden). Standard: Champagner. */
  footerLinkColor?: string;
  /** Überschreibt `fontFamily` von Body + Footer. Standard: `EMAIL_TOKENS.fontBody` (Inter). */
  bodyFontFamily?: string;
  /**
   * Stylesheet im `<head>` (Standard: Inter von Google Fonts). Nur Clients, die
   * externe Stylesheets laden (u. a. Apple/iOS Mail), nutzen es; sonst greift
   * der System-Fallback im Font-Stack.
   */
  headFontLinkHref?: string;
}

/**
 * Basis-Layout für ALLE Capital-Circle-Mails — v3.2 „Champagner auf Graphit“.
 *
 * Render-Pipeline: JSX -> `@react-email/render` -> HTML-String -> Resend.
 *
 * Layout-Strategie:
 *   - Outer-Wrapper-Table für Outlook-Kompatibilität, Graphit-Grund
 *   - max-width 600px (Mail-Standard)
 *   - PreviewText: hidden span, das in Inbox-Listen als Snippet erscheint
 *   - Kopf: Wortmarke als Text (wie `components/brand/Logo.tsx`), darunter Champagner-Lichtkante
 *   - Optional: `headerLogo={false}` / `hideFooter={false}` / `unsubscribeToken` für klassisches Layout
 */
export function BaseEmail({
  children,
  previewText,
  unsubscribeToken,
  unsubscribeUrl: unsubscribeUrlProp,
  headerLogo = true,
  hideFooter = true,
  accentGradient,
  footerLinkColor,
  bodyFontFamily,
  headFontLinkHref,
}: BaseEmailProps) {
  const appUrl = getAppUrl();
  const unsubscribeUrl =
    unsubscribeUrlProp ??
    (unsubscribeToken ? `${appUrl}/api/unsubscribe?token=${unsubscribeToken}` : null);
  const linkColor = footerLinkColor ?? T.gold;
  const bodyFont = bodyFontFamily ?? T.fontBody;
  const fontHref = headFontLinkHref ?? T.fontLinkHref;

  const footerLink = { color: linkColor, textDecoration: "none", margin: "0 8px" } as const;

  return (
    <html lang="de">
      {/* eslint-disable-next-line @next/next/no-head-element -- React-Email rendert pures HTML, kein Next.js-Head möglich */}
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
        <title>Capital Circle</title>
        <link rel="stylesheet" href={fontHref} />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: T.bgPage,
          color: T.text,
          fontFamily: bodyFont,
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <span
          style={{
            display: "none",
            overflow: "hidden",
            lineHeight: "1px",
            opacity: 0,
            maxHeight: 0,
            maxWidth: 0,
            color: T.bgPage,
          }}
        >
          {previewText}
        </span>

        <table
          role="presentation"
          width="100%"
          cellSpacing={0}
          cellPadding={0}
          style={{
            backgroundColor: T.bgPage,
            padding: "32px 16px",
          }}
        >
          <tbody>
            <tr>
              <td align="center">
                <table
                  role="presentation"
                  width="100%"
                  cellSpacing={0}
                  cellPadding={0}
                  style={{ maxWidth: "600px", margin: "0 auto" }}
                >
                  <tbody>
                    <tr>
                      <td style={{ padding: "8px 0 0", textAlign: "center" }}>
                        <span
                          style={{
                            fontFamily: T.fontHeading,
                            fontSize: "15px",
                            fontWeight: 600,
                            letterSpacing: "0.32em",
                            textTransform: "uppercase",
                            color: headerLogo ? T.text : T.goldLight,
                          }}
                        >
                          Capital Circle
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "14px 0 28px" }}>
                        <div
                          style={{
                            height: "1px",
                            lineHeight: "1px",
                            fontSize: "1px",
                            width: "100%",
                            backgroundColor: T.borderGold,
                            backgroundImage:
                              accentGradient ??
                              `linear-gradient(90deg, ${T.bgPage} 0%, ${T.gold} 35%, ${T.goldLight} 50%, ${T.gold} 65%, ${T.bgPage} 100%)`,
                          }}
                        >
                          &nbsp;
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td>{children}</td>
                    </tr>

                    {!hideFooter ? (
                      <tr>
                        <td
                          style={{
                            paddingTop: "32px",
                            borderTop: `1px solid ${T.border}`,
                            marginTop: "24px",
                            textAlign: "center",
                          }}
                        >
                          <p
                            style={{
                              margin: "16px 0 8px",
                              fontFamily: bodyFont,
                              fontSize: "12px",
                              color: T.textFooter,
                              lineHeight: 1.6,
                            }}
                          >
                            Capital Circle Institut
                          </p>
                          <p
                            style={{
                              margin: "0 0 12px",
                              fontFamily: bodyFont,
                              fontSize: "12px",
                              color: T.textFooter,
                              lineHeight: 1.6,
                            }}
                          >
                            <a href={`${appUrl}/impressum`} style={footerLink}>
                              Impressum
                            </a>
                            <span style={{ color: T.textFooter }}>·</span>
                            <a href={`${appUrl}/datenschutz`} style={footerLink}>
                              Datenschutz
                            </a>
                            {unsubscribeUrl && (
                              <>
                                <span style={{ color: T.textFooter }}>·</span>
                                <a href={unsubscribeUrl} style={footerLink}>
                                  Abmelden
                                </a>
                              </>
                            )}
                          </p>
                          <p
                            style={{
                              margin: "16px 0 0",
                              fontFamily: bodyFont,
                              fontSize: "11px",
                              color: T.textFooter,
                              opacity: 0.7,
                            }}
                          >
                            © {new Date().getFullYear()} Capital Circle. Alle
                            Rechte vorbehalten.
                          </p>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
