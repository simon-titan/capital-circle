import * as React from "react";
import { BaseEmail } from "../../layout/BaseEmail";
import { EmailButton, EmailText } from "../../layout/components";

/**
 * Einmal-Kampagnen (15.11.2026), verschickt über `/admin/kampagnen`:
 *
 *   RT01 — Retargeting an die ehemaligen Free-Kurs-Mitglieder (altes `/free`).
 *          Text von Emre. Abweichung, Entscheidung Simon: Statt der Bewerbung
 *          schaltet der Link den Zugang direkt für 30 Tage frei. Deshalb sind
 *          die drei Sätze zur Bewerbung angepasst, alles andere steht wörtlich.
 *   TP01 — Bitte um eine Trustpilot-Bewertung an alle zahlenden Mitglieder.
 *          Entwurf, von Emre noch nicht abgenommen.
 *
 * Beide sind Klasse M (Werbung im Sinne des UWG — auch die Bitte um eine
 * Bewertung): Abmeldelink, kein Versand an Abgemeldete.
 */

export type KampagnenMailId = "RT01" | "TP01";
export const KAMPAGNEN_MAIL_IDS: KampagnenMailId[] = ["RT01", "TP01"];

export type KampagnenMailDaten = {
  vorname: string | null;
  /** RT01: persönlicher Aktivierungslink; TP01: Bewertungsseite auf Trustpilot. */
  zielUrl: string;
  unsubscribeUrl?: string;
};

function Emre() {
  return (
    <EmailText>
      Emre
      <br />
      Capital Circle
    </EmailText>
  );
}

export function kampagnenMail(
  id: KampagnenMailId,
  d: KampagnenMailDaten,
): { betreff: string; vorschau: string; jsx: React.ReactElement } {
  const hallo = d.vorname ? `Hey ${d.vorname},` : "Hey,";
  const u = d.unsubscribeUrl;

  if (id === "RT01") {
    const vorschau = "Ich habe die Ausbildung überarbeitet. Dein kostenloser Zugang ist vorbereitet.";
    return {
      betreff: "Kostenloser Trading-Kurs + exklusiver Trading Blueprint",
      vorschau,
      jsx: (
        <BaseEmail previewText={vorschau} unsubscribeUrl={u}>
          <EmailText>{hallo}</EmailText>
          <EmailText>vor einiger Zeit hast du dich für meine kostenlose Trading-Ausbildung interessiert.</EmailText>
          <EmailText>Seitdem hat sich bei Capital Circle einiges verändert.</EmailText>
          <EmailText>
            Ich habe die Ausbildung überarbeitet und möchte dir die Möglichkeit geben, sie dir erneut kostenlos
            anzusehen.
          </EmailText>
          <EmailText>
            <strong>Was erwartet dich?</strong>
          </EmailText>
          <EmailText>
            Du lernst, wie du Finanzmärkte besser verstehst, Marktstrukturen erkennst und mithilfe von Auction Market
            Theory und Volume Profile relevante Preisbereiche identifizierst.
          </EmailText>
          <EmailText>
            Vor allem geht es darum, einen klaren Tradingprozess aufzubauen, statt jeden Tag planlos nach dem nächsten
            Entry zu suchen.
          </EmailText>
          <EmailText>Zusätzlich bekommst du meinen neuen Trading Blueprint geschenkt.</EmailText>
          <EmailText>
            Darin zeige ich dir, wie ich mich auf meine Trading-Session vorbereite, Märkte analysiere, meine Trades
            plane und anschließend auswerte.
          </EmailText>
          <EmailText>Dazu erhältst du ein Workbook, mit dem du deinen eigenen Tradingprozess entwickeln kannst.</EmailText>
          <EmailText>
            Die Ausbildung ist vollständig kostenlos. Dein Zugang ist bereits vorbereitet: Ein Klick genügt, und er ist
            für 30 Tage freigeschaltet.
          </EmailText>
          <EmailButton href={d.zielUrl}>Kostenlosen Zugang aktivieren</EmailButton>
          <EmailText>Wir sehen uns im Kurs.</EmailText>
          <Emre />
        </BaseEmail>
      ),
    };
  }

  const vorschau = "Zwei Minuten, die anderen Tradern bei ihrer Entscheidung helfen.";
  return {
    betreff: "Eine kurze Bitte von mir",
    vorschau,
    jsx: (
      <BaseEmail previewText={vorschau} unsubscribeUrl={u}>
        <EmailText>{hallo}</EmailText>
        <EmailText>du bist Teil von Capital Circle, und dafür erst einmal danke.</EmailText>
        <EmailText>Ich habe eine kurze Bitte an dich: Teile deine Erfahrung mit Capital Circle auf Trustpilot.</EmailText>
        <EmailText>
          Wer sich für Capital Circle interessiert, will wissen, wie es wirklich ist: die Ausbildung, die Live-Sessions,
          die Community. Das kann niemand besser beantworten als die Menschen, die jeden Tag damit arbeiten.
        </EmailText>
        <EmailText>
          Deine Bewertung dauert etwa zwei Minuten. Schreib einfach ehrlich, was dir gefällt, und auch, was wir besser
          machen können. Beides hilft: anderen Tradern bei ihrer Entscheidung und uns dabei, Capital Circle
          weiterzuentwickeln.
        </EmailText>
        <EmailButton href={d.zielUrl}>Jetzt auf Trustpilot bewerten</EmailButton>
        <EmailText>Danke, dass du dabei bist.</EmailText>
        <Emre />
      </BaseEmail>
    ),
  };
}
