import * as React from "react";
import { EMAIL_TOKENS as T } from "./styles";

/**
 * Wiederverwendbare Bausteine für alle Templates.
 *
 * Hinweis: Wir verwenden BEWUSST kein `@react-email/components` — das Paket ist
 * laut `docs/implementation-notes.md` deprecated. Stattdessen pure HTML-Tags
 * in JSX, die `@react-email/render` zu Mail-tauglichem HTML rendert.
 *
 * Tabellen-Layout für Cards, weil viele Mail-Clients (Outlook!) `flex`/`grid`
 * nicht zuverlässig rendern.
 */

interface ChildrenProps {
  children: React.ReactNode;
}

export function EmailHeading({ children }: ChildrenProps) {
  return (
    <h1
      style={{
        margin: "0 0 16px",
        fontFamily: T.fontHeading,
        fontSize: "26px",
        lineHeight: 1.25,
        fontWeight: 400,
        color: T.text,
        letterSpacing: "-0.01em",
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
        fontSize: "19px",
        lineHeight: 1.3,
        fontWeight: 400,
        color: T.gold,
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
        color: muted ? T.textMuted : T.text,
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
              borderRadius: "10px",
              background: `linear-gradient(135deg, ${T.gold} 0%, ${T.goldDark} 100%)`,
              boxShadow: "0 4px 14px rgba(212,175,55,0.25)",
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
                color: T.bgPage,
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
        borderRadius: "16px",
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

export function EmailHighlight({ children }: ChildrenProps) {
  return (
    <table
      role="presentation"
      width="100%"
      cellSpacing={0}
      cellPadding={0}
      style={{
        backgroundColor: T.bgPage,
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
        margin: "24px 0",
        background: `linear-gradient(90deg, transparent, ${T.border}, transparent)`,
      }}
    />
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
        color: T.gold,
        textDecoration: "underline",
        textDecorationColor: T.borderGold,
        fontFamily: T.fontBody,
      }}
    >
      {children}
    </a>
  );
}
