import * as React from "react";
import { EMAIL_TOKENS as T } from "./styles";

/**
 * Wiederverwendbare Bausteine für alle Templates — v3.2 „Champagner auf Graphit“.
 *
 * Hinweis: Wir verwenden BEWUSST kein `@react-email/components` — das Paket ist
 * laut `docs/implementation-notes.md` deprecated. Stattdessen pure HTML-Tags
 * in JSX, die `@react-email/render` zu Mail-tauglichem HTML rendert.
 *
 * Tabellen-Layout für Cards, weil viele Mail-Clients (Outlook!) `flex`/`grid`
 * nicht zuverlässig rendern. Verläufe immer mit Vollton-Fallback.
 */

interface ChildrenProps {
  children: React.ReactNode;
}

/** Versal-Label über der Headline, Champagner (wie die Karten-Labels der Plattform). */
export function EmailEyebrow({ children }: ChildrenProps) {
  return (
    <p
      style={{
        margin: "0 0 10px",
        fontFamily: T.fontBody,
        fontSize: "12px",
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: T.goldLight,
      }}
    >
      {children}
    </p>
  );
}

export function EmailHeading({ children }: ChildrenProps) {
  return (
    <h1
      style={{
        margin: "0 0 16px",
        fontFamily: T.fontHeading,
        fontSize: "26px",
        lineHeight: 1.25,
        fontWeight: 600,
        color: T.text,
        letterSpacing: "-0.02em",
      }}
    >
      {children}
    </h1>
  );
}

export function EmailSubheading({ children }: ChildrenProps) {
  return (
    <h2
      style={{
        margin: "32px 0 12px",
        fontFamily: T.fontHeading,
        fontSize: "18px",
        lineHeight: 1.3,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        color: T.goldLight,
      }}
    >
      {children}
    </h2>
  );
}

export function EmailText({
  children,
  muted,
}: ChildrenProps & { muted?: boolean }) {
  return (
    <p
      style={{
        margin: "0 0 16px",
        fontFamily: T.fontBody,
        fontSize: "15px",
        lineHeight: 1.65,
        color: muted ? T.textMuted : T.textSoft,
      }}
    >
      {children}
    </p>
  );
}

export function EmailSmall({ children }: ChildrenProps) {
  return (
    <p
      style={{
        margin: "0 0 8px",
        fontFamily: T.fontBody,
        fontSize: "12px",
        lineHeight: 1.5,
        color: T.textMuted,
      }}
    >
      {children}
    </p>
  );
}

/** Hauptaktion: Champagner-Verlauf (Vollton-Fallback), dunkle Schrift — wie Button-Variante `gold`. */
export function EmailButton({
  href,
  children,
}: { href: string } & ChildrenProps) {
  return (
    <table
      role="presentation"
      cellSpacing={0}
      cellPadding={0}
      style={{ margin: "24px auto" }}
    >
      <tbody>
        <tr>
          <td
            align="center"
            style={{
              borderRadius: "8px",
              backgroundColor: T.gold,
              backgroundImage: T.goldGrad,
              boxShadow: "0 6px 18px rgba(212,176,128,0.22)",
            }}
          >
            <a
              href={href}
              style={{
                display: "inline-block",
                padding: "14px 32px",
                fontFamily: T.fontBody,
                fontSize: "15px",
                fontWeight: 600,
                color: T.onGold,
                textDecoration: "none",
                letterSpacing: "0.01em",
              }}
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Graphit-Karte mit Haarlinie, 12px — wie `.cc-card`. */
export function EmailCard({ children }: ChildrenProps) {
  return (
    <table
      role="presentation"
      width="100%"
      cellSpacing={0}
      cellPadding={0}
      style={{
        backgroundColor: T.bgCard,
        border: `1px solid ${T.border}`,
        borderTop: `1px solid ${T.borderGold}`,
        borderRadius: "12px",
        margin: "0 0 16px",
      }}
    >
      <tbody>
        <tr>
          <td style={{ padding: "28px 26px" }}>{children}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** Hinweis-Box: Panel-Fläche mit Champagner-Haarlinie rundum. */
export function EmailHighlight({ children }: ChildrenProps) {
  return (
    <table
      role="presentation"
      width="100%"
      cellSpacing={0}
      cellPadding={0}
      style={{
        backgroundColor: T.bg,
        border: `1px solid ${T.borderGold}`,
        borderRadius: "10px",
        margin: "16px 0",
      }}
    >
      <tbody>
        <tr>
          <td
            style={{
              padding: "16px 18px",
              fontFamily: T.fontBody,
              fontSize: "14px",
              lineHeight: 1.6,
              color: T.text,
            }}
          >
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function EmailDivider() {
  return (
    <div
      style={{
        height: "1px",
        lineHeight: "1px",
        fontSize: "1px",
        margin: "24px 0",
        backgroundColor: T.border,
      }}
    >
      &nbsp;
    </div>
  );
}

export function EmailLink({
  href,
  children,
}: { href: string } & ChildrenProps) {
  return (
    <a
      href={href}
      style={{
        color: T.goldLight,
        textDecoration: "underline",
        textDecorationColor: T.borderGold,
        fontFamily: T.fontBody,
      }}
    >
      {children}
    </a>
  );
}
