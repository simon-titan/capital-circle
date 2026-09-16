import * as React from "react";
import { CAMPAIGN_TOKENS as T } from "./styles";

/**
 * Kampagnen-Bausteine der Migrations-Mails — v3.2 „Champagner auf Graphit“,
 * Inter für alles. Gleiche Sprache wie `lib/email/layout/components.tsx`;
 * hier zusätzlich Badge, FAQ-Frage und Bild-Platzhalter.
 */

interface ChildrenProps {
  children: React.ReactNode;
}

export function CampaignHeading({ children }: ChildrenProps) {
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

export function CampaignText({
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

export function CampaignSmall({ children }: ChildrenProps) {
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

/** Hauptaktion: Champagner-Verlauf mit Vollton-Fallback, dunkle Schrift. */
export function CampaignButton({ href, children }: { href: string } & ChildrenProps) {
  return (
    <table role="presentation" cellSpacing={0} cellPadding={0} style={{ margin: "24px auto" }}>
      <tbody>
        <tr>
          <td
            align="center"
            style={{
              borderRadius: "8px",
              backgroundColor: T.accent,
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
                color: T.accentOn,
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

/** Hinweis-Box: Panel-Fläche mit Champagner-Haarlinie rundum. */
export function CampaignHighlight({ children }: ChildrenProps) {
  return (
    <table
      role="presentation"
      width="100%"
      cellSpacing={0}
      cellPadding={0}
      style={{
        backgroundColor: T.bg,
        border: `1px solid ${T.brandSoft}`,
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

/** Versal-Label über der Headline, Champagner. Nur Text, kein Fill. */
export function CampaignBadge({ children }: ChildrenProps) {
  return (
    <p
      style={{
        margin: "0 0 10px",
        fontFamily: T.fontBody,
        fontSize: "12px",
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: T.brand,
      }}
    >
      {children}
    </p>
  );
}

/** Nummerierte FAQ-Frage — Champagner-Ziffer, weiße Frage, grauer Antworttext. */
export function CampaignQuestion({
  number,
  question,
  children,
}: { number: number; question: string } & ChildrenProps) {
  return (
    <table
      role="presentation"
      width="100%"
      cellSpacing={0}
      cellPadding={0}
      style={{ margin: "0 0 28px" }}
    >
      <tbody>
        <tr>
          <td style={{ width: "36px", verticalAlign: "top", paddingTop: "2px" }}>
            <span
              style={{
                fontFamily: T.fontHeading,
                fontSize: "20px",
                fontWeight: 600,
                color: T.brand,
              }}
            >
              {number}.
            </span>
          </td>
          <td style={{ verticalAlign: "top" }}>
            <p
              style={{
                margin: "0 0 8px",
                fontFamily: T.fontBody,
                fontSize: "16px",
                fontWeight: 600,
                color: T.text,
              }}
            >
              {question}
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: T.fontBody,
                fontSize: "14px",
                lineHeight: 1.65,
                color: T.textMuted,
              }}
            >
              {children}
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Platzhalter für ein noch fehlendes Bild-Asset (z. B. Dashboard-Screenshot).
 * Gestrichelter Rahmen macht in der Vorschau sofort sichtbar, dass hier später
 * ein echtes Bild eingesetzt wird — bewusst ohne Bild-Tag, damit kein kaputtes
 * Bild-Symbol in Postfächern erscheint, solange die Datei fehlt.
 */
export function CampaignImagePlaceholder({ label }: { label: string }) {
  return (
    <table
      role="presentation"
      width="100%"
      cellSpacing={0}
      cellPadding={0}
      style={{ margin: "8px 0 24px" }}
    >
      <tbody>
        <tr>
          <td
            align="center"
            style={{
              border: `1px dashed ${T.borderStrong}`,
              borderRadius: "12px",
              padding: "40px 16px",
              backgroundColor: T.bgCard,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: T.fontBody,
                fontSize: "12px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: T.textMuted,
              }}
            >
              {label}
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
