import * as React from "react";
import { EMAIL_TOKENS as T } from "./styles";
import { getAppUrl } from "../resend";

interface BaseEmailProps {
  children: React.ReactNode;
  previewText: string;
  /** Wenn gesetzt, wird im Footer der DSGVO-Unsubscribe-Link gerendert. */
  unsubscribeToken?: string;
}

/**
 * Basis-Layout für ALLE Capital-Circle-Mails.
 *
 * Render-Pipeline: JSX -> `@react-email/render` -> HTML-String -> Resend.
 *
 * Layout-Strategie:
 *   - Outer-Wrapper-Table für Outlook-Kompatibilität
 *   - max-width 600px (Mail-Standard)
 *   - PreviewText: hidden span, das in Inbox-Listen als Snippet erscheint
 *   - Footer mit Impressum + Datenschutz + (optional) Unsubscribe
 */
export function BaseEmail({
  children,
  previewText,
  unsubscribeToken,
}: BaseEmailProps) {
  const appUrl = getAppUrl();
  const unsubscribeUrl = unsubscribeToken
    ? `${appUrl}/api/unsubscribe?token=${unsubscribeToken}`
    : null;

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
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: T.bgPage,
          color: T.text,
          fontFamily: T.fontBody,
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
                            fontSize: "24px",
                            fontWeight: 400,
                            color: T.gold,
                            letterSpacing: "0.04em",
                          }}
                        >
                          Capital Circle
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "12px 0 24px" }}>
                        <div
                          style={{
                            height: "2px",
                            width: "100%",
                            background: `linear-gradient(90deg, transparent, ${T.gold} 30%, ${T.goldDark} 70%, transparent)`,
                          }}
                        />
                      </td>
                    </tr>

                    <tr>
                      <td>{children}</td>
                    </tr>

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
                            fontFamily: T.fontBody,
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
                            fontFamily: T.fontBody,
                            fontSize: "12px",
                            color: T.textFooter,
                            lineHeight: 1.6,
                          }}
                        >
                          <a
                            href={`${appUrl}/impressum`}
                            style={{
                              color: T.gold,
                              textDecoration: "none",
                              margin: "0 8px",
                            }}
                          >
                            Impressum
                          </a>
                          <span style={{ color: T.textFooter }}>·</span>
                          <a
                            href={`${appUrl}/datenschutz`}
                            style={{
                              color: T.gold,
                              textDecoration: "none",
                              margin: "0 8px",
                            }}
                          >
                            Datenschutz
                          </a>
                          {unsubscribeUrl && (
                            <>
                              <span style={{ color: T.textFooter }}>·</span>
                              <a
                                href={unsubscribeUrl}
                                style={{
                                  color: T.gold,
                                  textDecoration: "none",
                                  margin: "0 8px",
                                }}
                              >
                                Abmelden
                              </a>
                            </>
                          )}
                        </p>
                        <p
                          style={{
                            margin: "16px 0 0",
                            fontFamily: T.fontBody,
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
