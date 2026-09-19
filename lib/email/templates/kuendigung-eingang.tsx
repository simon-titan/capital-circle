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
import {
  ART_LABEL,
  BETREIBER_EMAIL,
  ergebnisText,
  formatEingang,
  PLAN_LABEL,
  planVon,
  zeitpunktText,
  type KuendigungsBeleg,
} from "@/lib/kuendigung/shared";

/**
 * Eingangsbestätigung für den Kündigungsbutton (§ 312k Abs. 4 BGB).
 *
 * Muss in Textform enthalten: den Inhalt der Kündigungserklärung, Datum und
 * Uhrzeit des Eingangs und den Zeitpunkt, zu dem der Vertrag enden soll.
 * Alle drei stehen hier in denselben Worten wie auf der Bestätigungsseite —
 * beide lesen aus `lib/kuendigung/shared.ts`.
 *
 * Bewusst **ohne** Angebot, Rabatt oder „Bleib doch"-Knopf: Der gesetzliche
 * Weg hat keine Umwege. Der Hinweis auf die Rücknahme steht nur als leiser
 * Link da, für den Fall, dass jemand anderes gekündigt hat.
 */

interface Props {
  beleg: KuendigungsBeleg;
  appUrl: string;
  /** Kopie an die Konto-Adresse, weil die Bestätigung an eine andere Adresse ging. */
  kopieAnKonto?: boolean;
}

export default function KuendigungEingangEmail({ beleg, appUrl, kopieAnKonto = false }: Props) {
  const eingang = formatEingang(beleg.eingegangenAm);
  const ergebnis = beleg.ergebnis;
  const plan = planVon(ergebnis);
  const vertrag = plan ? (PLAN_LABEL[plan] ?? plan) : null;
  const ruecknahmeMoeglich = ergebnis.art === "ausgefuehrt";

  const zeilen: [string, string][] = [
    ["Eingangsnummer", beleg.referenz],
    ["Eingegangen am", eingang.komplett],
    ["Art der Kündigung", ART_LABEL[beleg.art]],
    ...(beleg.grund ? ([["Grund", beleg.grund]] as [string, string][]) : []),
    ["Name", beleg.name],
    ["E-Mail-Adresse des Kontos", beleg.email],
    ["Angaben zum Vertrag", beleg.vertragAngabe ?? "—"],
    ...(vertrag ? ([["Zugeordneter Vertrag", vertrag]] as [string, string][]) : []),
    ["Gewünschter Zeitpunkt", zeitpunktText(beleg.zeitpunktWunsch)],
    ["Bestätigung an", beleg.bestaetigungEmail],
  ];

  return (
    <BaseEmail previewText={`Eingang deiner Kündigung am ${eingang.komplett}`}>
      <EmailEyebrow>Kündigung eingegangen</EmailEyebrow>
      <EmailHeading>Deine Kündigung ist bei uns eingegangen.</EmailHeading>
      <EmailText>
        Wir bestätigen den Eingang deiner Kündigung am{" "}
        <strong style={{ color: T.text }}>{eingang.datum}</strong> um{" "}
        <strong style={{ color: T.text }}>{eingang.uhrzeit}</strong>.
      </EmailText>

      {kopieAnKonto ? (
        <EmailText muted>
          Du erhältst diese Nachricht, weil zu deinem Konto eine Kündigung eingegangen ist. Die Bestätigung ging
          außerdem an {beleg.bestaetigungEmail}.
        </EmailText>
      ) : null}

      <EmailSubheading>Wie es weitergeht</EmailSubheading>
      <EmailHighlight>{ergebnisText(beleg)}</EmailHighlight>

      {ruecknahmeMoeglich ? (
        <EmailText muted>
          Du hast die Kündigung nicht selbst abgeschickt oder überlegst es dir anders? Solange der Vertrag läuft,
          kannst du sie in deinem Konto zurücknehmen:{" "}
          <EmailLink href={`${appUrl}/einstellungen/abonnement`}>Einstellungen → Abonnement</EmailLink>.
        </EmailText>
      ) : null}

      <EmailSubheading>Inhalt deiner Kündigung</EmailSubheading>
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

      <EmailDivider />
      <EmailSmall>
        Diese E-Mail ist die Bestätigung deiner Kündigung in Textform (§ 312k Abs. 4 BGB). Bitte bewahre sie auf.
      </EmailSmall>
      <EmailSmall>
        Fragen zu deiner Kündigung? Antworte einfach auf diese E-Mail oder schreib an {BETREIBER_EMAIL}.
      </EmailSmall>
    </BaseEmail>
  );
}

export async function sendKuendigungEingang({
  an,
  beleg,
  kopieAnKonto = false,
}: {
  an: string;
  beleg: KuendigungsBeleg;
  kopieAnKonto?: boolean;
}): Promise<SendResult> {
  const eingang = formatEingang(beleg.eingegangenAm);
  return sendEmail({
    to: an,
    subject: `Bestätigung deiner Kündigung — eingegangen am ${eingang.datum}`,
    replyTo: BETREIBER_EMAIL,
    jsx: <KuendigungEingangEmail beleg={beleg} appUrl={getAppUrl()} kopieAnKonto={kopieAnKonto} />,
  });
}
