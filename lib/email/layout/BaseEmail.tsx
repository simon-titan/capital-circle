import * as React from "react";
import { EMAIL_TOKENS as T } from "./styles";
import { getAppUrl } from "../resend";
import { anbieter } from "@/config/legal";

interface BaseEmailProps {
  children: React.ReactNode;
  /** Der Satz, den Postfächer neben dem Betreff als Vorschau zeigen. */
  previewText: string;
  /**
   * Abmeldelink für Werbe-Mails. Baut `${appUrl}/api/unsubscribe?token=...`.
   * Für abweichende Routen (z. B. Kampagnen ohne `profiles`-Zeile) stattdessen
   * `unsubscribeUrl` nutzen — am einfachsten über `abmeldeUrl()` aus
   * `lib/email/abmeldung.ts`.
   */
  unsubscribeToken?: string;
  /**
   * Vollständige Abmelde-URL — hat Vorrang vor `unsubscribeToken`. Ist eine
   * gesetzt, erscheinen in der Fußzeile der Link „Abmelden" und der
   * Widerspruchshinweis nach § 7 Abs. 3 Nr. 4 UWG.
   */
  unsubscribeUrl?: string;
}

/**
 * Das Gerüst aller Capital-Circle-Mails.
 *
 * Render-Pipeline: JSX → `@react-email/render` → HTML-String → Resend.
 *
 * ── Der Aufbau, und warum er so kurz ist (20.09.2026) ──────────────────────
 *
 * Wortmarke, eine Karte, Fußzeile. Mehr nicht. Vorher stand über dem Inhalt
 * eine Wortmarke aus gesperrtem Text mit einer Champagner-Lichtkante darunter,
 * der Inhalt lag frei auf dem Grund, und jede zweite Vorlage baute sich aus
 * Panel-Kästen mit Goldrahmen ihre eigene Gliederung. Auf Wunsch des Nutzers
 * ist das raus: „so schlicht wie möglich".
 *
 * Geblieben ist der Grund (Graphit), das Gold (nur Knopf und Link) und die
 * Marke — jetzt als echtes Logo statt als Schriftzug.
 *
 * ── Warum das Logo absolut verlinkt ist ────────────────────────────────────
 *
 * Eine Mail hat keine Basis-URL. `/logo/cc-wortmarke-weiss.png` zeigt im
 * Postfach ins Leere, deshalb steht `getAppUrl()` davor. Breite und Höhe
 * stehen als Attribut **und** im Stil: Outlook nimmt sonst die Originalgröße
 * der Datei (1585 px) und sprengt das Layout.
 *
 * Der `alt`-Text ist gestaltet, nicht nur gesetzt. Viele Postfächer laden
 * Bilder erst auf Klick; dann steht an der Stelle des Logos „Capital Circle"
 * in Versalien und hell auf Graphit, und die Mail sieht immer noch nach etwas
 * aus.
 *
 * ── Dunkel bleibt dunkel ───────────────────────────────────────────────────
 *
 * `color-scheme: dark` sagt den Clients, dass die Mail bereits dunkel ist —
 * ohne das kehren einige sie im Dunkelmodus ein zweites Mal um. Zusätzlich
 * trägt jede Fläche ihre Farbe als `bgcolor`-Attribut, weil Outlook (Word-
 * Engine) `background-color` auf `<body>` ignoriert.
 */
export function BaseEmail({
  children,
  previewText,
  unsubscribeToken,
  unsubscribeUrl: unsubscribeUrlProp,
}: BaseEmailProps) {
  const appUrl = getAppUrl();
  const unsubscribeUrl =
    unsubscribeUrlProp ??
    (unsubscribeToken ? `${appUrl}/api/unsubscribe?token=${unsubscribeToken}` : null);

  const fussText = {
    margin: `0 0 8px`,
    fontFamily: T.font,
    fontSize: T.sizeFooter,
    lineHeight: T.lineHeight,
    color: T.textMuted,
  } as const;
  const fussLink = { color: T.textMuted, textDecoration: "underline" } as const;

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
          fontFamily: T.font,
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
          bgcolor={T.bgPage}
          style={{ backgroundColor: T.bgPage }}
        >
          <tbody>
            <tr>
              {/*
                Der Seitenrand sitzt auf der Zelle, nicht auf der Tabelle:
                `width="100%"` plus `padding` an derselben Tabelle ergibt
                Fensterbreite **plus** 32 px, und die Mail lässt sich auf dem
                Handy seitwärts schieben.
              */}
              <td
                align="center"
                bgcolor={T.bgPage}
                style={{ padding: "32px 16px", backgroundColor: T.bgPage }}
              >
                <table
                  role="presentation"
                  width="100%"
                  cellSpacing={0}
                  cellPadding={0}
                  style={{ maxWidth: T.maxWidth, margin: "0 auto" }}
                >
                  <tbody>
                    {/* Marke */}
                    <tr>
                      <td
                        align="center"
                        bgcolor={T.bgPage}
                        style={{ padding: "0 0 28px", backgroundColor: T.bgPage }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- Eine Mail hat kein next/image; das Postfach lädt die Datei selbst */}
                        <img
                          src={`${appUrl}/logo/cc-wortmarke-weiss.png`}
                          alt="Capital Circle"
                          width={T.logoWidth}
                          height={T.logoHeight}
                          style={{
                            display: "block",
                            width: `${T.logoWidth}px`,
                            maxWidth: `${T.logoWidth}px`,
                            height: `${T.logoHeight}px`,
                            border: 0,
                            outline: "none",
                            textDecoration: "none",
                            fontFamily: T.font,
                            fontSize: "13px",
                            fontWeight: 600,
                            letterSpacing: "0.28em",
                            textTransform: "uppercase",
                            color: T.text,
                          }}
                        />
                      </td>
                    </tr>

                    {/* Die eine Karte */}
                    <tr>
                      <td
                        bgcolor={T.bgCard}
                        style={{
                          backgroundColor: T.bgCard,
                          border: `1px solid ${T.line}`,
                          borderRadius: T.radius,
                          padding: T.cardPadding,
                        }}
                      >
                        {children}
                      </td>
                    </tr>

                    {/* Fußzeile */}
                    <tr>
                      <td
                        align="center"
                        bgcolor={T.bgPage}
                        style={{
                          padding: "28px 8px 0",
                          textAlign: "center",
                          backgroundColor: T.bgPage,
                        }}
                      >
                        <p style={fussText}>Capital Circle Institut</p>
                        <p style={fussText}>
                          <a href={`${appUrl}/impressum`} style={fussLink}>
                            Impressum
                          </a>
                          <span> · </span>
                          <a href={`${appUrl}/datenschutz`} style={fussLink}>
                            Datenschutz
                          </a>
                          {unsubscribeUrl ? (
                            <>
                              <span> · </span>
                              <a href={unsubscribeUrl} style={fussLink}>
                                Abmelden
                              </a>
                            </>
                          ) : null}
                        </p>
                        {unsubscribeUrl ? (
                          // Hinweis nach § 7 Abs. 3 Nr. 4 UWG — bei jeder Werbe-Mail, klar und deutlich.
                          <p style={{ ...fussText, maxWidth: "440px", margin: "0 auto 8px" }}>
                            Du möchtest solche E-Mails nicht mehr bekommen? Du kannst ihnen jederzeit
                            widersprechen:{" "}
                            <a href={unsubscribeUrl} style={fussLink}>
                              hier abmelden
                            </a>{" "}
                            oder per E-Mail an {anbieter.email}. Dafür entstehen dir keine anderen als die
                            Übermittlungskosten nach den Basistarifen.
                          </p>
                        ) : null}
                        <p style={{ ...fussText, margin: 0 }}>
                          © {new Date().getFullYear()} Capital Circle
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
