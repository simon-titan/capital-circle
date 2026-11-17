import * as React from "react";
import { BaseEmail } from "../../layout/BaseEmail";
import { EmailButton, EmailText } from "../../layout/components";
import { datumBerlin } from "@/lib/mailsystem/zeit";

/**
 * Kundenmails aus Emres E-Mail-Playbook 1.0 (07.11.2026):
 * U01/U02 (nur 799-€-Ausbildung, Tag 14 und 30), V01/V02 (enthaltener Live-
 * Zugang endet / ist beendet), Q02 (Live-Abo-Kündigung bestätigt).
 * W01 und Q01 stecken in der Kaufbestätigung (`mentoring-bestaetigung.tsx`).
 * **Texte unverändert aus dem Playbook.** Absender Emre | Capital Circle.
 */

export type KundeMailId = "U01" | "U02" | "V01" | "V02" | "Q02";
export const KUNDE_MAIL_IDS: KundeMailId[] = ["U01", "U02", "V01", "V02", "Q02"];

export type KundeMailDaten = {
  vorname: string;
  /** analysis_application_url (U) */
  gespraechUrl: string;
  /** live_subscription_checkout_url (V) */
  liveAboUrl: string;
  /** account_url (Q02) */
  accountUrl: string;
  /** V01/V02: Ende des enthaltenen Live-Zugangs; Q02: Ende des Abos. */
  endeAm: Date | null;
  unsubscribeUrl?: string;
};

const b = (t: React.ReactNode) => <strong>{t}</strong>;

function Emre() {
  return (
    <EmailText>
      Emre
      <br />
      Capital Circle
    </EmailText>
  );
}

export function kundeMail(id: KundeMailId, d: KundeMailDaten): { betreff: string; vorschau: string; jsx: React.ReactElement } {
  const u = d.unsubscribeUrl;
  const ende = d.endeAm ? datumBerlin(d.endeAm) : "";
  switch (id) {
    case "U01":
      return {
        betreff: "Du musst nicht mit jeder Frage allein bleiben.",
        vorschau: "Wenn du dir Rückmeldung zu deiner Umsetzung wünschst, lass uns darüber sprechen.",
        jsx: (
          <BaseEmail previewText="Wenn du dir Rückmeldung zu deiner Umsetzung wünschst, lass uns darüber sprechen." unsubscribeUrl={u}>
            <EmailText>Hi {d.vorname},</EmailText>
            <EmailText>du bist jetzt seit zwei Wochen in der Capital-Circle-Ausbildung.</EmailText>
            <EmailText>
              Vielleicht arbeitest du dich gerade durch die Inhalte. Vielleicht hast du auch schon begonnen, die Konzepte an
              eigenen Marktbeispielen zu untersuchen.
            </EmailText>
            <EmailText>{b("Oft werden die konkreten Fragen erst bei dieser eigenen Anwendung sichtbar.")}</EmailText>
            <EmailText>
              Du verstehst die Erklärung im Video — bist bei deiner eigenen Analyse aber noch unsicher, ob du den
              Zusammenhang richtig eingeordnet hast.
            </EmailText>
            <EmailText>Genau hier kann persönliche Rückmeldung hilfreich sein.</EmailText>
            <EmailText>
              {b(
                "Deshalb gibt es bei Capital Circle neben der selbstständigen Ausbildung auch die Möglichkeit, im Mentoring mit uns an deiner Umsetzung zu arbeiten.",
              )}
            </EmailText>
            <EmailText>
              Dabei geht es nicht darum, dir die Entscheidungen abzunehmen. Sondern darum, deine Überlegungen zu besprechen,
              offene Fragen zu klären und daran weiterzuarbeiten.
            </EmailText>
            <EmailText>
              Wenn du dir diese Unterstützung wünschst, frage ein Analysegespräch mit meinem Team an. Gemeinsam schaut ihr, wo
              du gerade stehst und ob eine Begleitung für dich sinnvoll ist.
            </EmailText>
            <EmailButton href={d.gespraechUrl}>Jetzt Analysegespräch anfragen</EmailButton>
            <EmailText>Du musst dafür nicht erst den gesamten Kurs abgeschlossen haben.</EmailText>
            <Emre />
          </BaseEmail>
        ),
      };
    case "U02":
      return {
        betreff: "Was fehlt dir bei deiner eigenen Umsetzung?",
        vorschau: "Nimm dir einen Moment für diese Frage.",
        jsx: (
          <BaseEmail previewText="Nimm dir einen Moment für diese Frage." unsubscribeUrl={u}>
            <EmailText>Hi {d.vorname},</EmailText>
            <EmailText>seit einem Monat hast du Zugang zu deiner Capital-Circle-Ausbildung.</EmailText>
            <EmailText>
              {b("Nimm dir einmal einen Moment und frag dich: Was kann ich bereits selbstständig anwenden — und wo bin ich noch unsicher?")}
            </EmailText>
            <EmailText>
              Vielleicht gelingt es dir zunehmend, Marktphasen einzuordnen und deine Überlegungen klarer zu formulieren.
            </EmailText>
            <EmailText>Vielleicht merkst du aber auch, dass dir bei deinen eigenen Beispielen eine zweite Perspektive fehlt.</EmailText>
            <EmailText>{b("Genau dafür ist persönliche Begleitung da.")}</EmailText>
            <EmailText>
              Nicht, damit du dieselben Videos noch einmal erklärt bekommst. Sondern damit wir deine Fragen und deine
              tatsächliche Umsetzung besprechen können.
            </EmailText>
            <EmailText>
              Mein Ziel ist, dass du einen eigenen Tradingprozess entwickelst. Deshalb ist mir wichtig, dass du nicht nur
              verstehst, was ich auf meinem Chart mache, sondern auch deine eigenen Entscheidungen begründen kannst.
            </EmailText>
            <EmailText>{b("Wenn du an diesem Punkt Unterstützung möchtest, lass uns deine Situation konkret anschauen.")}</EmailText>
            <EmailText>
              Im Analysegespräch bespricht mein Team mit dir, woran du gerade arbeitest und welche Form der Begleitung dazu
              passen könnte.
            </EmailText>
            <EmailButton href={d.gespraechUrl}>Jetzt Analysegespräch anfragen</EmailButton>
            <Emre />
          </BaseEmail>
        ),
      };
    case "V01":
      return {
        betreff: "Weiter gemeinsam auf den Markt schauen?",
        vorschau: `Dein enthaltener Live-Trading-Zugang endet am ${ende}.`,
        jsx: (
          <BaseEmail previewText={`Dein enthaltener Live-Trading-Zugang endet am ${ende}.`} unsubscribeUrl={u}>
            <EmailText>Hi {d.vorname},</EmailText>
            <EmailText>{b(`dein enthaltener Zugang zu meinen regulären Live-Tradings endet am ${ende}.`)}</EmailText>
            <EmailText>
              Wenn du weiterhin dabei sein möchtest, kannst du deine Teilnahme über das {b("Live-Trading-Abo für 99 € im Monat")}{" "}
              fortsetzen.
            </EmailText>
            <EmailText>Damit erhältst du Zugang zu meinen {b("drei regulären Live-Trading-Sessions pro Woche")}.</EmailText>
            <EmailText>
              Du kannst meine Marktbetrachtung live verfolgen und nachvollziehen, welche Situationen ich beobachte, welche
              Überlegungen dahinterstehen und wann ich bewusst keinen Trade mache.
            </EmailText>
            <EmailText>
              {b("Nicht nur den fertigen Chart im Nachhinein sehen — sondern meinen Entscheidungsprozess während der Session verfolgen.")}
            </EmailText>
            <EmailButton href={d.liveAboUrl}>Live-Trading für 99 €/Monat weiterführen</EmailButton>
            <EmailText>Dein gekaufter Videokurs bleibt dir auch ohne dieses Abo dauerhaft erhalten.</EmailText>
            <EmailText>
              Das Anschlussabo umfasst ausschließlich die reguläre Live-Teilnahme.{" "}
              {b("Journal, Aufzeichnungen, exklusive Mentoringcalls und persönliche Betreuung sind nicht Bestandteil dieses Abos.")}
            </EmailText>
            <EmailText>Ohne zusätzliche Buchung entsteht kein Anschlussabo.</EmailText>
            <Emre />
          </BaseEmail>
        ),
      };
    case "V02":
      return {
        betreff: "Dein regulärer Live-Trading-Zugang ist beendet.",
        vorschau: "Dein Videokurs bleibt. Die Live-Teilnahme kannst du separat weiterbuchen.",
        jsx: (
          <BaseEmail previewText="Dein Videokurs bleibt. Die Live-Teilnahme kannst du separat weiterbuchen." unsubscribeUrl={u}>
            <EmailText>Hi {d.vorname},</EmailText>
            <EmailText>{b("der in deinem Programm enthaltene Zugang zu meinen regulären Live-Tradings ist jetzt abgelaufen.")}</EmailText>
            <EmailText>
              Dein gekaufter Videokurs bleibt weiterhin zugänglich. Auch andere noch laufende Leistungen deines Programms
              bleiben unverändert bestehen.
            </EmailText>
            <EmailText>{b("Du möchtest weiter bei meinen Live-Tradings dabei sein?")}</EmailText>
            <EmailText>
              Für {b("99 € im Monat")} kannst du die Teilnahme an den drei regulären Sessions pro Woche wieder hinzubuchen.
            </EmailText>
            <EmailButton href={d.liveAboUrl}>Live-Trading wieder freischalten</EmailButton>
            <EmailText>
              Das Abo gilt ausschließlich für die regulären Live-Tradings. Journal, Aufzeichnungen, exklusive Mentoringcalls
              und persönliche Betreuung werden dadurch nicht freigeschaltet oder verlängert.
            </EmailText>
            <EmailText>Ich freue mich, dich wieder in einer Session zu sehen.</EmailText>
            <Emre />
          </BaseEmail>
        ),
      };
    case "Q02":
      return {
        betreff: "Die Kündigung deines Live-Abos ist bestätigt.",
        vorschau: `Dein regulärer Live-Zugang bleibt bis zum ${ende} bestehen.`,
        jsx: (
          <BaseEmail previewText={`Dein regulärer Live-Zugang bleibt bis zum ${ende} bestehen.`}>
            <EmailText>Hi {d.vorname},</EmailText>
            <EmailText>{b("die Kündigung deines Capital-Circle-Live-Trading-Abos ist bestätigt.")}</EmailText>
            <EmailText>
              Dein Abo endet am {b(ende)}. Bis dahin kannst du weiterhin an den regulären Live-Trading-Sessions teilnehmen.
            </EmailText>
            <EmailText>Nach diesem Datum wird dein Abo nicht weiter verlängert und der zugehörige Live-Zugang endet.</EmailText>
            <EmailText>{b("Dein gekaufter Videokurs und andere unabhängig davon noch gültige Zugänge bleiben bestehen.")}</EmailText>
            <EmailText>Die Bestätigung und das Enddatum findest du auch in deinem Account.</EmailText>
            <EmailButton href={d.accountUrl}>Zu meinem Account</EmailButton>
            <EmailText>Danke für dein Vertrauen.</EmailText>
            <Emre />
          </BaseEmail>
        ),
      };
  }
}
