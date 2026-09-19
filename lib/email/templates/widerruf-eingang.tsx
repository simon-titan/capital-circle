import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailDivider,
  EmailEyebrow,
  EmailHeading,
  EmailHighlight,
  EmailLink,
  EmailSmall,
  EmailSubheading,
  EmailText,
} from "../layout/components";
import { EMAIL_TOKENS as T } from "../layout/styles";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";
import { rechtsPfade, rechtsUrl } from "@/config/legal";
import { BETREIBER_EMAIL, belegZeilen, formatEingang, weiterText, type WiderrufsBeleg } from "@/lib/widerruf/shared";

/**
 * Eingangsbestätigung der Widerrufsfunktion (§ 356a Abs. 4 BGB).
 *
 * Muss auf einem dauerhaften Datenträger unverzüglich übermittelt werden und
 * mindestens enthalten: den Inhalt der Widerrufserklärung nach Abs. 2 (Name,
 * Angaben zum Vertrag, Weg der Bestätigung) sowie Datum und Uhrzeit ihres
 * Eingangs. Alles steht in denselben Worten wie auf der Bestätigungsseite —
 * beide lesen aus `lib/widerruf/shared.ts`.
 *
 * Transaktionsmail: kein Abmeldelink, kein Angebot, kein „Bleib doch".
 */

interface Props {
  beleg: WiderrufsBeleg;
  appUrl: string;
  /** Kopie an die Konto-Adresse, weil die Bestätigung an eine andere Adresse ging. */
  kopieAnKonto?: boolean;
}

export default function WiderrufEingangEmail({ beleg, appUrl, kopieAnKonto = false }: Props) {
  const eingang = formatEingang(beleg.eingegangenAm);
  const zeilen = belegZeilen(beleg);

  return (
    <BaseEmail previewText={`Eingang deines Widerrufs am ${eingang.komplett}`}>
      <EmailEyebrow>Widerruf eingegangen</EmailEyebrow>
      <EmailHeading>Dein Widerruf ist bei uns eingegangen.</EmailHeading>
      <EmailText>
        Wir bestätigen den Eingang deines Widerrufs am <strong style={{ color: T.text }}>{eingang.datum}</strong> um{" "}
        <strong style={{ color: T.text }}>{eingang.uhrzeit}</strong>.
      </EmailText>

      {kopieAnKonto ? (
        <EmailText muted>
          Du erhältst diese Nachricht, weil zu deinem Konto ein Widerruf eingegangen ist. Die Bestätigung ging
          außerdem an {beleg.bestaetigungEmail}. Hast du den Widerruf nicht selbst abgeschickt, antworte bitte auf
          diese E-Mail.
        </EmailText>
      ) : null}

      <EmailSubheading>Wie es weitergeht</EmailSubheading>
      <EmailHighlight>{weiterText()}</EmailHighlight>

      <EmailSubheading>Inhalt deines Widerrufs</EmailSubheading>
      <table
        role="presentation"
        width="100%"
        cellSpacing={0}
        cellPadding={0}
        style={{
          backgroundColor: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: "10px",
          margin: "0 0 16px",
        }}
      >
        <tbody>
          {zeilen.map(([label, wert], i) => (
            <tr key={label}>
              <td
                style={{
                  padding: "10px 16px",
                  borderTop: i === 0 ? "none" : `1px solid ${T.border}`,
                  fontFamily: T.fontBody,
                  fontSize: "13px",
                  lineHeight: 1.5,
                  color: T.textMuted,
                  verticalAlign: "top",
                  width: "40%",
                }}
              >
                {label}
              </td>
              <td
                style={{
                  padding: "10px 16px",
                  borderTop: i === 0 ? "none" : `1px solid ${T.border}`,
                  fontFamily: T.fontBody,
                  fontSize: "14px",
                  lineHeight: 1.5,
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

      <EmailText muted>
        Die Folgen des Widerrufs stehen in der{" "}
        <EmailLink href={rechtsUrl(rechtsPfade.widerruf, appUrl)}>Widerrufsbelehrung</EmailLink>.
      </EmailText>

      <EmailDivider />
      <EmailSmall>
        Diese E-Mail ist die Eingangsbestätigung deines Widerrufs auf einem dauerhaften Datenträger (§ 356a Abs. 4
        BGB). Bitte bewahre sie auf.
      </EmailSmall>
      <EmailSmall>
        Fragen zu deinem Widerruf? Antworte einfach auf diese E-Mail oder schreib an {BETREIBER_EMAIL}.
      </EmailSmall>
    </BaseEmail>
  );
}

export async function sendWiderrufEingang({
  an,
  beleg,
  kopieAnKonto = false,
}: {
  an: string;
  beleg: WiderrufsBeleg;
  kopieAnKonto?: boolean;
}): Promise<SendResult> {
  const eingang = formatEingang(beleg.eingegangenAm);
  return sendEmail({
    to: an,
    subject: `Eingangsbestätigung deines Widerrufs — eingegangen am ${eingang.datum}`,
    replyTo: BETREIBER_EMAIL,
    jsx: <WiderrufEingangEmail beleg={beleg} appUrl={getAppUrl()} kopieAnKonto={kopieAnKonto} />,
  });
}
