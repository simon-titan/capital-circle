import * as React from "react";
import { EMAIL_TOKENS as T } from "./styles";

/**
 * Die Bausteine, aus denen jede Mail besteht — mehr gibt es nicht.
 *
 * Eine Vorlage bringt **keine** eigenen Stile mit. Steht in einem Template ein
 * `style={{ … }}` mit Farbe, Größe oder Abstand, gehört daraus ein Baustein
 * hierher. Genau daran sind die Mails vorher auseinandergelaufen: Jede zweite
 * Vorlage hatte ihre eigene Datenzeile, ihr eigenes Zitat, ihre eigene
 * Trust-Zeile.
 *
 * Alle Maße und Farben kommen aus `styles.ts`.
 *
 * Kein `@react-email/components` (laut `docs/implementation-notes.md`
 * deprecated), sondern pure HTML-Tags in JSX. Tabellen statt `flex`/`grid`,
 * weil Outlook das eine kann und das andere nicht.
 */

interface ChildrenProps {
  children: React.ReactNode;
}

/** Die eine Überschrift der Mail. */
export function EmailHeading({ children }: ChildrenProps) {
  return (
    <h1
      style={{
        margin: `0 0 ${T.gap}`,
        fontFamily: T.font,
        fontSize: T.sizeHeading,
        lineHeight: 1.3,
        fontWeight: 600,
        color: T.text,
        letterSpacing: "-0.01em",
        overflowWrap: "break-word",
        wordBreak: "break-word",
      }}
    >
      {children}
    </h1>
  );
}

/**
 * Zwischenüberschrift — nur für Mails, die wirklich Abschnitte haben
 * (Kündigung, Widerruf, Willkommen). Bewusst in Textfarbe: Gold ist dem
 * Knopf vorbehalten.
 */
export function EmailSubheading({ children }: ChildrenProps) {
  return (
    <h2
      style={{
        margin: `${T.gapBlock} 0 ${T.gap}`,
        fontFamily: T.font,
        fontSize: T.sizeSubheading,
        lineHeight: 1.4,
        fontWeight: 600,
        color: T.text,
        overflowWrap: "break-word",
        wordBreak: "break-word",
      }}
    >
      {children}
    </h2>
  );
}

/** Fließtext. `muted` für Nachsätze, Absender und Nebenbemerkungen. */
export function EmailText({
  children,
  muted,
}: ChildrenProps & { muted?: boolean }) {
  return (
    <p
      style={{
        margin: `0 0 ${T.gap}`,
        fontFamily: T.font,
        fontSize: T.sizeText,
        lineHeight: T.lineHeight,
        color: muted ? T.textMuted : T.text,
        overflowWrap: "break-word",
        wordBreak: "break-word",
      }}
    >
      {children}
    </p>
  );
}

/** Kleingedrucktes: Rechtsbausteine, Hinweise, Fallback-Adressen. */
export function EmailSmall({ children }: ChildrenProps) {
  return (
    <p
      style={{
        margin: `0 0 ${T.gap}`,
        fontFamily: T.font,
        fontSize: T.sizeSmall,
        lineHeight: T.lineHeight,
        color: T.textMuted,
        overflowWrap: "break-word",
        wordBreak: "break-word",
      }}
    >
      {children}
    </p>
  );
}

/**
 * Der einzige Ort, an dem Rot vorkommt: eine Störung, die jemand sehen muss —
 * „nicht gespeichert", „Versand fehlgeschlagen". Steht nur in den
 * Betriebsmails ans Team. Semantisch, kein Schmuck.
 */
export function EmailError({ children }: ChildrenProps) {
  return (
    <p
      style={{
        margin: `0 0 ${T.gap}`,
        fontFamily: T.font,
        fontSize: T.sizeText,
        lineHeight: T.lineHeight,
        fontWeight: 600,
        color: T.red,
        overflowWrap: "break-word",
        wordBreak: "break-word",
      }}
    >
      {children}
    </p>
  );
}

/**
 * Die eine Aktion der Mail. Champagner als Vollton — kein Verlauf, kein
 * Schatten: Outlook rechnet Verläufe ohnehin weg, und zwei Knöpfe hat keine
 * dieser Mails.
 */
export function EmailButton({ href, children }: { href: string } & ChildrenProps) {
  return (
    <table
      role="presentation"
      cellSpacing={0}
      cellPadding={0}
      style={{ margin: `${T.gapBlock} 0` }}
    >
      <tbody>
        <tr>
          <td
            align="center"
            bgcolor={T.gold}
            style={{ borderRadius: "6px", backgroundColor: T.gold }}
          >
            <a
              href={href}
              style={{
                display: "inline-block",
                padding: "13px 26px",
                fontFamily: T.font,
                fontSize: T.sizeText,
                fontWeight: 600,
                lineHeight: 1.2,
                color: T.onGold,
                textDecoration: "none",
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

/** Verweis im Fließtext — der zweite und letzte Ort, an dem Gold auftaucht. */
export function EmailLink({ href, children }: { href: string } & ChildrenProps) {
  return (
    <a href={href} style={{ color: T.gold, textDecoration: "underline", wordBreak: "break-word" }}>
      {children}
    </a>
  );
}

/**
 * Beschriftung und Wert, Zeile für Zeile: Zugangsdaten, der Inhalt einer
 * Kündigung, die Eckdaten eines Zahlungsfalls.
 *
 * Kein Kasten drumherum, nur Haarlinien zwischen den Zeilen — die Daten sind
 * der Inhalt, nicht die Umrandung. `mono` für alles, was jemand abtippt.
 */
export function EmailRows({
  rows,
  mono,
}: {
  rows: readonly (readonly [string, string])[];
  mono?: boolean;
}) {
  const letzte = rows.length - 1;
  return (
    <table
      role="presentation"
      width="100%"
      cellSpacing={0}
      cellPadding={0}
      style={{ margin: `${T.gapBlock} 0`, width: "100%" }}
    >
      <tbody>
        {rows.map(([label, wert], i) => (
          <tr key={label}>
            <td
              style={{
                padding: `${i === 0 ? 0 : 10}px 12px ${letzte === i ? 0 : 10}px 0`,
                borderTop: i === 0 ? "none" : `1px solid ${T.line}`,
                fontFamily: T.font,
                fontSize: T.sizeSmall,
                lineHeight: T.lineHeight,
                color: T.textMuted,
                verticalAlign: "top",
                width: "38%",
              }}
            >
              {label}
            </td>
            <td
              style={{
                padding: `${i === 0 ? 0 : 10}px 0 ${letzte === i ? 0 : 10}px`,
                borderTop: i === 0 ? "none" : `1px solid ${T.line}`,
                fontFamily: mono ? T.fontMono : T.font,
                fontSize: T.sizeSmall,
                lineHeight: T.lineHeight,
                color: T.text,
                verticalAlign: "top",
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
              }}
            >
              {wert}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Fremder Text in der Mail: die Support-Antwort, die Nachricht aus einem
 * Zahlungsfall. Eine senkrechte Haarlinie links, sonst nichts — so ist
 * sichtbar, wo das Zitat anfängt, ohne dass ein Kasten entsteht.
 */
export function EmailQuote({ children }: ChildrenProps) {
  return (
    <table
      role="presentation"
      width="100%"
      cellSpacing={0}
      cellPadding={0}
      style={{ margin: `${T.gapBlock} 0`, width: "100%" }}
    >
      <tbody>
        <tr>
          <td
            style={{
              borderLeft: `2px solid ${T.line}`,
              padding: "2px 0 2px 16px",
              fontFamily: T.font,
              fontSize: T.sizeText,
              lineHeight: T.lineHeight,
              color: T.textMuted,
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
              wordBreak: "break-word",
            }}
          >
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Eine Haarlinie, um das Kleingedruckte vom Text abzusetzen. Höchstens eine
 * pro Mail — zwei Linien übereinander sind der Anfang vom Ornament.
 */
export function EmailDivider() {
  return (
    <div
      style={{
        height: "1px",
        lineHeight: "1px",
        fontSize: "1px",
        margin: `${T.gapBlock} 0`,
        backgroundColor: T.line,
      }}
    >
      &nbsp;
    </div>
  );
}
