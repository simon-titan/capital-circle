import * as React from "react";
import { BaseEmail } from "../../layout/BaseEmail";
import { EmailButton, EmailText } from "../../layout/components";
import { datumBerlin, uhrzeitBerlin } from "@/lib/mailsystem/zeit";

/**
 * Die Free-Kurs-Mails aus Emres E-Mail-Playbook 1.0 (07.11.2026), Vorlagen
 * A01–A03, S01/S02, L01–L04, I01–I03 und E01–E05 — **Texte unverändert** aus
 * dem Playbook (Kapitel 14: „alle 36 Texte sind die operative Basis").
 * Wer hier formuliert, ändert Emres freigegebene Wortwahl.
 *
 * Absender „Emre | Capital Circle", Antworten an das Team-Postfach
 * (`lib/mailsystem/versand.ts`). Klasse M trägt den Abmeldelink.
 */

export type FreeMailId =
  | "A01" | "A02" | "A03"
  | "S01" | "S02"
  | "L01" | "L02" | "L03" | "L04"
  | "I01" | "I02" | "I03"
  | "E01" | "E02" | "E03" | "E04" | "E05";

export const FREE_MAIL_IDS: FreeMailId[] = [
  "A01", "A02", "A03", "S01", "S02", "L01", "L02", "L03", "L04", "I01", "I02", "I03", "E01", "E02", "E03", "E04", "E05",
];

export type FreeMailDaten = {
  vorname: string;
  /** Direkt in Lektion n (1-basiert): free_lesson_n_url. */
  lektionUrl: (n: number) => string;
  /** resume_free_course_url */
  weiterUrl: string;
  /** Vitrine `/ergebnisse` mit den Discord-Beiträgen (Ziel von L03 seit 17.11.2026). */
  vitrineUrl: string;
  /** analysis_application_url bzw. analysis_entry_router_url (E05) */
  gespraechUrl: string;
  /** whatsapp_extension_url — Pflicht für E02 */
  whatsappUrl: string | null;
  /** Ende des Zugangs, auf das sich die Mail bezieht (Original oder Verlängerung). */
  endeAm: Date | null;
  /** Nur Klasse M. */
  unsubscribeUrl?: string;
};

export type FreeMail = { betreff: string; vorschau: string; jsx: React.ReactElement };

function Gruss() {
  return (
    <EmailText>
      Emre
      <br />
      Capital Circle
    </EmailText>
  );
}

function Hallo({ vorname }: { vorname: string }) {
  return <EmailText>Hi {vorname},</EmailText>;
}

const b = (t: string) => <strong>{t}</strong>;

/** Pflichtfelder fehlen → kein Versand (Playbook Kapitel 10: keine wörtlichen Klammern an Kunden). */
export class FehlendeDaten extends Error {}

function ende(d: FreeMailDaten): Date {
  if (!d.endeAm) throw new FehlendeDaten("Enddatum fehlt");
  return d.endeAm;
}

export function freeMail(id: FreeMailId, d: FreeMailDaten): FreeMail {
  const u = d.unsubscribeUrl;
  switch (id) {
    case "A01":
      return {
        betreff: "Deine Bewerbung ist bei mir angekommen.",
        vorschau: "Ich schaue mir deine Antworten persönlich an.",
        jsx: (
          <BaseEmail previewText="Ich schaue mir deine Antworten persönlich an.">
            <Hallo vorname={d.vorname} />
            <EmailText>hier ist Emre.</EmailText>
            <EmailText>{b("Deine Bewerbung für das kostenlose Capital-Circle-Training ist bei mir angekommen.")}</EmailText>
            <EmailText>Ich werde mir deine Antworten persönlich anschauen, bevor ich über deinen Zugang entscheide.</EmailText>
            <EmailText>
              Dabei interessiert mich nicht, ob du schon jahrelang tradest oder gerade erst anfängst. Ich möchte erkennen,
              dass du wirklich lernen und dich mit deinem eigenen Trading auseinandersetzen willst.
            </EmailText>
            <EmailText>Sobald ich deine Bewerbung geprüft habe, bekommst du meine Entscheidung per E-Mail.</EmailText>
            <EmailText>{b("Du musst vorerst nichts weiter tun. Ich melde mich bei dir.")}</EmailText>
            <Gruss />
          </BaseEmail>
        ),
      };

    case "A02": {
      const e = ende(d);
      return {
        betreff: `Du bist dabei, ${d.vorname}.`,
        vorschau: "Dein Zugang steht. Jetzt möchte ich, dass du ihn wirklich nutzt.",
        jsx: (
          <BaseEmail previewText="Dein Zugang steht. Jetzt möchte ich, dass du ihn wirklich nutzt.">
            <Hallo vorname={d.vorname} />
            <EmailText>ich habe mir deine Bewerbung angeschaut.</EmailText>
            <EmailText>{b("Sie hat mich überzeugt. Du bist dabei.")}</EmailText>
            <EmailText>
              Dein Zugang zum kostenlosen Capital-Circle-Training ist jetzt für {b(`30 Tage freigeschaltet — bis zum ${datumBerlin(e)}.`)}
            </EmailText>
            <EmailText>Und ich möchte dir direkt etwas Persönliches mitgeben:</EmailText>
            <EmailText>
              {b("Ich hätte mir zu meinen Anfangszeiten genau so einen Einstieg gewünscht.")} Nicht noch ein einzelnes Setup
              oder das nächste Gewinnversprechen. Sondern jemanden, der mir seine Denkweise erklärt und zeigt, wie aus
              einzelnen Tradingbegriffen ein nachvollziehbarer Zusammenhang entsteht.
            </EmailText>
            <EmailText>Genau diesen Einblick bekommst du hier.</EmailText>
            <EmailText>
              Dass ich das Training kostenlos bereitstelle, heißt nicht, dass du es beiläufig behandeln solltest. Dahinter
              stecken meine Erfahrungen, meine Arbeit und die bewusste Entscheidung, dir diesen Einstieg zu ermöglichen.
            </EmailText>
            <EmailText>{b("Das ist keine Selbstverständlichkeit. Deshalb erwarte ich, dass du diese Chance ernst nimmst.")}</EmailText>
            <EmailText>
              Lass den Zugang nicht in deinem Postfach liegen. Nimm dir einen ruhigen Moment, leg Ablenkungen beiseite und
              arbeite mit den Inhalten. Mach dir Notizen. Hinterfrage dein bisheriges Vorgehen.
            </EmailText>
            <EmailText>Du musst heute nicht alles durcharbeiten. {b("Aber fang an.")}</EmailText>
            <EmailText>Deine erste Lektion heißt: {b("„Trading ist mehr als der nächste Payout.“")}</EmailText>
            <EmailText>{b("Lock in. Jetzt bist du dran.")}</EmailText>
            <EmailButton href={d.lektionUrl(1)}>Meine erste Lektion starten</EmailButton>
            <EmailText>Schön, dass du dabei bist.</EmailText>
            <Gruss />
          </BaseEmail>
        ),
      };
    }

    case "A03":
      return {
        betreff: "Meine Entscheidung zu deiner Bewerbung",
        vorschau: "Ich habe mir deine Bewerbung angeschaut.",
        jsx: (
          <BaseEmail previewText="Ich habe mir deine Bewerbung angeschaut.">
            <Hallo vorname={d.vorname} />
            <EmailText>ich habe mir deine Bewerbung für das kostenlose Capital-Circle-Training angeschaut.</EmailText>
            <EmailText>{b("Nach der Prüfung habe ich mich gegen eine Aufnahme entschieden.")}</EmailText>
            <EmailText>
              Der Zugang wird bewusst nicht automatisch vergeben. Deshalb gehört zu unserem Aufnahmeverfahren auch,
              Bewerbungen abzulehnen.
            </EmailText>
            <EmailText>
              Wie vor deiner Bewerbung angekündigt, ist diese Entscheidung für den kostenlosen Lernbereich endgültig. Eine
              erneute Bewerbung ist nicht möglich.
            </EmailText>
            <EmailText>Danke, dass du dir die Zeit für deine Bewerbung genommen hast.</EmailText>
            <Gruss />
          </BaseEmail>
        ),
      };

    case "S01": {
      const e = ende(d);
      return {
        betreff: "Mir fehlten nur noch zehn Dollar.",
        vorschau: "Warum ich dir diese Geschichte gleich in der ersten Lektion erzähle.",
        jsx: (
          <BaseEmail previewText="Warum ich dir diese Geschichte gleich in der ersten Lektion erzähle." unsubscribeUrl={u}>
            <Hallo vorname={d.vorname} />
            <EmailText>
              bei meiner ersten Trading-Challenge haben mir nach Wochen noch {b("zehn Dollar")} zum Bestehen gefehlt.
            </EmailText>
            <EmailText>
              Ich saß mit einem Kollegen im Auto, schaute auf mein Handy und wollte diese letzten Dollar unbedingt noch
              holen.
            </EmailText>
            <EmailText>{b("Am Ende habe ich die komplette Challenge verloren.")}</EmailText>
            <EmailText>Warum erzähle ich dir das?</EmailText>
            <EmailText>
              Weil Trading nicht nur daran scheitern kann, dass dir ein Setup fehlt. Es kann auch daran scheitern, was du
              tust, wenn Ungeduld, Gier oder ein bestimmtes Ziel deine Entscheidungen übernehmen.
            </EmailText>
            <EmailText>Genau mit dieser Geschichte beginnt dein Capital-Circle-Training.</EmailText>
            <EmailText>
              Ich möchte dir nicht nur erklären, wie ich heute auf die Märkte schaue. Ich möchte dir auch zeigen, welche
              Erfahrungen meine heutige Arbeitsweise geprägt haben.
            </EmailText>
            <EmailText>{b("Deine Aufnahme war der erste Schritt. Jetzt geht es darum, mit den Inhalten zu arbeiten.")}</EmailText>
            <EmailText>Starte mit {b("„Trading ist mehr als der nächste Payout“")} und halte eine Sache fest:</EmailText>
            <EmailText>
              <em>
                In welcher Situation wolltest du zuletzt unbedingt ein Ergebnis erzwingen — statt nach einem klaren Ablauf
                zu handeln?
              </em>
            </EmailText>
            <EmailText>
              Falls du noch keine eigene Tradingerfahrung hast: Notiere dir, welche Erwartungen du bisher an Trading
              hattest.
            </EmailText>
            <EmailText>
              Du brauchst heute nicht den ganzen Kurs zu schaffen. {b("Eine Lektion. Ein ehrlicher Gedanke. Fang damit an.")}
            </EmailText>
            <EmailButton href={d.lektionUrl(1)}>Erste Lektion ansehen</EmailButton>
            <Gruss />
            <EmailText muted>
              <em>Dein kostenloser Zugang bleibt bis zum {datumBerlin(e)} verfügbar.</em>
            </EmailText>
          </BaseEmail>
        ),
      };
    }

    case "S02":
      return {
        betreff: "Was steht deinem Start gerade im Weg?",
        vorschau: "Eine kurze Antwort reicht, damit wir dir passend weiterhelfen können.",
        jsx: (
          <BaseEmail previewText="Eine kurze Antwort reicht, damit wir dir passend weiterhelfen können." unsubscribeUrl={u}>
            <Hallo vorname={d.vorname} />
            <EmailText>dein kostenloser Zugang zu Capital Circle ist freigeschaltet.</EmailText>
            <EmailText>Falls du bisher noch nicht ins Training eingestiegen bist, möchte ich einen Punkt verstehen:</EmailText>
            <EmailText>{b("Was steht deinem Start gerade im Weg?")}</EmailText>
            <EmailText>Ist es ein Problem beim Einloggen, fehlt dir gerade die Zeit oder bist du unsicher, wo du anfangen sollst?</EmailText>
            <EmailText>{b("Antworte einfach auf diese E-Mail. Ein ehrlicher Satz reicht.")}</EmailText>
            <EmailText>
              Bei einem technischen Problem hilft dir unser Team mit dem Zugang. Wenn dir die Orientierung fehlt, zeigen wir
              dir, wo du beginnen kannst.
            </EmailText>
            <EmailText>
              Und falls es gerade hauptsächlich an der Zeit liegt: Warte nicht darauf, dass irgendwann ein ganzer Tag frei
              wird. Such dir einen konkreten Termin für die erste Lektion.
            </EmailText>
            <EmailText>
              Du hast dich für dieses Training beworben. {b("Jetzt möchte ich, dass du auch etwas daraus mitnimmst.")}
            </EmailText>
            <Gruss />
          </BaseEmail>
        ),
      };

    case "L01":
      return {
        betreff: "Eine eingezeichnete Zone ist noch kein Tradingplan.",
        vorschau: "Entscheidend ist, was du an diesem Bereich überhaupt untersuchen möchtest.",
        jsx: (
          <BaseEmail previewText="Entscheidend ist, was du an diesem Bereich überhaupt untersuchen möchtest." unsubscribeUrl={u}>
            <Hallo vorname={d.vorname} />
            <EmailText>eine Zone einzeichnen kann man schnell.</EmailText>
            <EmailText>{b("Zu erklären, warum sie interessant ist und was dort passieren müsste, ist eine andere Sache.")}</EmailText>
            <EmailText>
              Vielleicht kennst du das: Der Preis erreicht einen markierten Bereich, und sofort entsteht der Gedanke: „Hier
              könnte ich einsteigen.“
            </EmailText>
            <EmailText>Aber was macht diesen Bereich überhaupt relevant?</EmailText>
            <EmailText>Was hat der Markt vorher gemacht? Und was würde deine ursprüngliche Idee wieder infrage stellen?</EmailText>
            <EmailText>{b("Genau mit diesen Fragen beginnt meine Marktbetrachtung. Nicht mit dem Einstieg.")}</EmailText>
            <EmailText>
              Deshalb habe ich der Auction Market Theory im kostenlosen Training eine eigene ausführliche Lektion gewidmet.
            </EmailText>
            <EmailText>
              Ich zeige dir, wie ich Marktphasen einordne, welche Informationen mir das Volume Profile liefert und warum
              derselbe Preisbereich zu unterschiedlichen Entwicklungen führen kann.
            </EmailText>
            <EmailText>Nicht als Sammlung weiterer Begriffe, sondern an vorbereiteten Grafiken und einem praktischen Marktbeispiel.</EmailText>
            <EmailText>{b("Mein Anspruch ist, dass du deine Überlegung erklären kannst — statt nur eine Linie nachzuzeichnen.")}</EmailText>
            <EmailText>
              Nimm dir für diese Lektion bewusst Zeit. Schreib dir eine Frage auf, die du künftig beantworten möchtest,
              bevor du über einen Trade nachdenkst.
            </EmailText>
            <EmailButton href={d.lektionUrl(3)}>Auction Market Theory verstehen</EmailButton>
            <Gruss />
          </BaseEmail>
        ),
      };

    case "L02":
      return {
        betreff: "Passt dein Trading überhaupt in deinen Alltag?",
        vorschau: "Eine Frage, die vor der Auswahl eines Handelsmodells kommen sollte.",
        jsx: (
          <BaseEmail previewText="Eine Frage, die vor der Auswahl eines Handelsmodells kommen sollte." unsubscribeUrl={u}>
            <Hallo vorname={d.vorname} />
            <EmailText>stell dir zwei Menschen vor.</EmailText>
            <EmailText>Der eine kann regelmäßig zur US-Aktienmarkteröffnung konzentriert am Chart sitzen.</EmailText>
            <EmailText>Der andere arbeitet zu dieser Zeit und hat nur wechselnde Zeitfenster am Morgen oder Abend.</EmailText>
            <EmailText>{b("Warum sollte ich beiden automatisch denselben Handelsansatz empfehlen?")}</EmailText>
            <EmailText>Genau deshalb möchte ich zuerst verstehen, wie jemand seinen Alltag tatsächlich gestaltet.</EmailText>
            <EmailText>
              Nicht, wie viel Zeit er theoretisch gerne hätte. Sondern wann er wirklich vorbereitet und konzentriert arbeiten
              kann.
            </EmailText>
            <EmailText>
              Ich nutze unterschiedliche Modelle für unterschiedliche Bedingungen — beispielsweise mögliche Gegenbewegungen im
              S&amp;P 500 und Trendfortsetzungen im Nasdaq.
            </EmailText>
            <EmailText>
              {b("Das bedeutet nicht, dass für jeden Menschen zu jeder Uhrzeit ein Trade bereitsteht.")} Es bedeutet, dass wir
              die Anforderungen eines Modells mit den tatsächlichen Voraussetzungen vergleichen müssen.
            </EmailText>
            <EmailText>
              In der Lektion {b("„Welche Tradingstrategie passt wirklich zu dir?“")} zeige ich dir, welche Fragen dabei für
              mich wichtig sind.
            </EmailText>
            <EmailText>Halte beim Anschauen einmal fest:</EmailText>
            <EmailText>
              {b(
                "Wann kannst du regelmäßig konzentriert arbeiten — und passt dein bisheriges Vorgehen überhaupt in dieses Zeitfenster?",
              )}
            </EmailText>
            <EmailText>Das ist ein konkreter Ausgangspunkt, um deinen Lernweg zu hinterfragen.</EmailText>
            <EmailButton href={d.lektionUrl(4)}>Meinen Tradingansatz einordnen</EmailButton>
            <Gruss />
          </BaseEmail>
        ),
      };

    case "L03":
      return {
        betreff: "Ich möchte nicht, dass du auf meinen nächsten Trade wartest.",
        vorschau: "Genau deshalb habe ich Capital Circle nicht als Signalgruppe aufgebaut.",
        jsx: (
          <BaseEmail previewText="Genau deshalb habe ich Capital Circle nicht als Signalgruppe aufgebaut." unsubscribeUrl={u}>
            <Hallo vorname={d.vorname} />
            <EmailText>natürlich freue ich mich, wenn Mitglieder erfolgreiche Trades oder Auszahlungen teilen.</EmailText>
            <EmailText>{b("Aber für das Ziel meiner Ausbildung ist noch etwas anderes entscheidend:")}</EmailText>
            <EmailText>
              Kann jemand erklären, warum er eine Situation interessant fand? Hat er einen eigenen Plan entwickelt? Kann er
              seine Entscheidung anschließend nachvollziehen?
            </EmailText>
            <EmailText>Genau darauf möchte ich mit Capital Circle hinarbeiten.</EmailText>
            <EmailText>{b("Du sollst nicht dauerhaft darauf angewiesen sein, dass ich dir sage, wann du kaufen oder verkaufen sollst.")}</EmailText>
            {/* Bis 17.11.2026 verwies L03 auf das letzte Kursvideo („Das System in der
                Praxis"). Das ist aus dem Kurs raus — der Absatz zeigt jetzt auf die
                Vitrine mit den Discord-Beiträgen (Entscheidung Simon). */}
            <EmailText>
              In unserer Vitrine findest du echte Beiträge aus unserer Community, so wie Mitglieder sie im Discord geteilt
              haben.
            </EmailText>
            <EmailText>
              Schau dabei nicht nur auf einzelne Ergebniszahlen. Ein erfolgreicher Trade allein sagt noch nichts über
              langfristige Profitabilität aus.
            </EmailText>
            <EmailText>Achte darauf, {b("wie Mitglieder über ihren Weg schreiben und woran sie gearbeitet haben.")}</EmailText>
            <EmailText>
              Das ist für mich der Unterschied zwischen dem Konsumieren fremder Tradingideen und dem Aufbau eines eigenen
              Prozesses.
            </EmailText>
            <EmailText>Und es ist die Richtung, in die ich Capital Circle entwickeln möchte:</EmailText>
            <EmailText>{b("Eine Ausbildung und ein Netzwerk, in dem Menschen verstehen, selbst entscheiden und voneinander lernen.")}</EmailText>
            <EmailText>Verstehen statt kopieren.</EmailText>
            <EmailButton href={d.vitrineUrl}>Einblicke aus der Community ansehen</EmailButton>
            <Gruss />
          </BaseEmail>
        ),
      };

    case "L04":
      return {
        betreff: "Wann persönliche Begleitung für dich sinnvoll sein kann",
        vorschau: "Nicht jede offene Frage braucht ein Mentoring. Aber manche Probleme lassen sich nicht durch weiteres Zuschauen klären.",
        jsx: (
          <BaseEmail
            previewText="Nicht jede offene Frage braucht ein Mentoring. Aber manche Probleme lassen sich nicht durch weiteres Zuschauen klären."
            unsubscribeUrl={u}
          >
            <Hallo vorname={d.vorname} />
            <EmailText>vielleicht verstehst du eine Erklärung im Video problemlos.</EmailText>
            <EmailText>Du schaust auf den Chart, siehst die Markierungen und denkst: „Ja, ergibt Sinn.“</EmailText>
            <EmailText>{b("Die Unsicherheit beginnt erst, wenn du selbst entscheiden musst.")}</EmailText>
            <EmailText>
              Ist das wirklich die Situation, die du gelernt hast? Welche Bedingung fehlt noch? Hast du die Idee sauber
              begründet — oder suchst du gerade nach einer Rechtfertigung für einen Trade?
            </EmailText>
            <EmailText>Genau hier kann persönliche Rückmeldung hilfreich sein.</EmailText>
            <EmailText>
              Nicht, damit dir jemand die Entscheidung abnimmt. Sondern damit du deine eigene Überlegung erklärst,
              Rückfragen bekommst und erkennst, woran du arbeiten musst.
            </EmailText>
            <EmailText>{b("Das ist ein wesentlicher Teil unseres Mentorings.")}</EmailText>
            <EmailText>
              Wir verbinden die Ausbildung mit exklusiven Gruppencalls und persönlichem WhatsApp-Support während der
              vereinbarten Betreuung. Im Premium-Mentoring kommen private Einzelstunden mit mir hinzu.
            </EmailText>
            <EmailText>Ob diese Begleitung für dich sinnvoll ist, hängt von deiner Ausgangslage ab.</EmailText>
            <EmailText>Wenn du selbstständig gut vorankommst, arbeite weiter mit deinem Lernweg.</EmailText>
            <EmailText>
              Wenn du merkst, dass dir Struktur und konkrete Rückmeldung bei deiner Umsetzung fehlen, dann lass uns genau
              darüber sprechen.
            </EmailText>
            <EmailText>
              {b("Im Analysegespräch schaut sich mein Team deine persönliche Situation an:")} Wo stehst du gerade? Was möchtest
              du erreichen? Und was hält dich aktuell zurück?
            </EmailText>
            <EmailText>Gemeinsam findet ihr heraus, ob Capital Circle der passende nächste Schritt für dich ist.</EmailText>
            <EmailButton href={d.gespraechUrl}>Jetzt Analysegespräch anfragen</EmailButton>
            <Gruss />
          </BaseEmail>
        ),
      };

    case "I01":
      return {
        betreff: "Was möchtest du vorher noch wissen?",
        vorschau: "Bevor du den nächsten Schritt machst, sollte deine wichtigste Frage geklärt sein.",
        jsx: (
          <BaseEmail previewText="Bevor du den nächsten Schritt machst, sollte deine wichtigste Frage geklärt sein." unsubscribeUrl={u}>
            <Hallo vorname={d.vorname} />
            <EmailText>
              vielleicht kannst du dir eine Zusammenarbeit mit Capital Circle grundsätzlich vorstellen, aber eine Frage ist
              noch offen.
            </EmailText>
            <EmailText>
              Wie funktioniert die persönliche Begleitung? Passt sie zu deinem Alltag? Oder bist du unsicher, ob wir dich bei
              deiner aktuellen Schwierigkeit überhaupt unterstützen können?
            </EmailText>
            <EmailText>{b("Dann behalte diese Frage nicht einfach für dich.")}</EmailText>
            <EmailText>Antworte direkt auf diese E-Mail:</EmailText>
            <EmailText>{b("Was möchtest du wissen, bevor du ein Analysegespräch anfragst?")}</EmailText>
            <EmailText>Du brauchst keine lange Nachricht zu schreiben. Sag uns konkret, welcher Punkt für dich noch ungeklärt ist.</EmailText>
            <EmailText>Mein Team schaut sich deine Antwort an und geht darauf ein.</EmailText>
            <EmailText>
              Ich möchte, dass du den nächsten Schritt mit Klarheit machst — nicht aus einem kurzen Motivationsschub und
              auch nicht mit Erwartungen, die wir gar nicht erfüllen können.
            </EmailText>
            <EmailText>{b("Also: Was ist deine Frage?")}</EmailText>
            <Gruss />
          </BaseEmail>
        ),
      };

    case "I02":
      return {
        betreff: "Was wir im Analysegespräch tatsächlich besprechen",
        vorschau: "Es geht um deine Ausgangslage — nicht darum, wie viele Tradingbegriffe du kennst.",
        jsx: (
          <BaseEmail previewText="Es geht um deine Ausgangslage — nicht darum, wie viele Tradingbegriffe du kennst." unsubscribeUrl={u}>
            <Hallo vorname={d.vorname} />
            <EmailText>bevor du ein Analysegespräch anfragst, solltest du wissen, was dich dort erwartet.</EmailText>
            <EmailText>{b("Du sprichst mit einem Mitarbeiter aus meinem Capital-Circle-Team.")}</EmailText>
            <EmailText>Wir knüpfen an deine Angaben aus der Bewerbung an und schauen uns deine Situation genauer an:</EmailText>
            <EmailText>
              Wo stehst du aktuell? Was hast du bereits versucht? An welcher Stelle kommst du nicht weiter? Und wie viel Zeit
              kannst du tatsächlich in dein Trading investieren?
            </EmailText>
            <EmailText>{b("Erst danach sprechen wir darüber, ob und welche Form unserer Begleitung zu dir passt.")}</EmailText>
            <EmailText>Du musst dafür keinen perfekten Tradingplan vorlegen. Du musst auch nicht bereits erfolgreich handeln.</EmailText>
            <EmailText>
              Was wir brauchen, ist eine ehrliche Ausgangslage und die Bereitschaft, dich mit deinem Vorgehen
              auseinanderzusetzen.
            </EmailText>
            <EmailText>
              Das Gespräch ist keine Session, in der du einen Trade zum Nachklicken bekommst. Es geht darum, deinen Bedarf zu
              verstehen und eine mögliche Zusammenarbeit konkret zu besprechen.
            </EmailText>
            <EmailText>Dabei sollst du genauso deine Fragen stellen.</EmailText>
            <EmailText>{b("Du prüfst uns. Wir prüfen, ob wir dich sinnvoll unterstützen können.")}</EmailText>
            <EmailText>Wenn das für beide Seiten passt, besprechen wir den weiteren Ablauf. Wenn nicht, sagen wir das offen.</EmailText>
            <EmailButton href={d.gespraechUrl}>Jetzt Analysegespräch anfragen</EmailButton>
            <Gruss />
          </BaseEmail>
        ),
      };

    case "I03":
      return {
        betreff: "Bevor du wieder mit einer neuen Strategie anfängst",
        vorschau: "Prüfe zuerst, was dir bei deinem bisherigen Vorgehen tatsächlich fehlt.",
        jsx: (
          <BaseEmail previewText="Prüfe zuerst, was dir bei deinem bisherigen Vorgehen tatsächlich fehlt." unsubscribeUrl={u}>
            <Hallo vorname={d.vorname} />
            <EmailText>bevor du dich mit dem nächsten Tradingkonzept beschäftigst, möchte ich dir eine kleine Aufgabe geben.</EmailText>
            <EmailText>Nimm einen deiner letzten Trades oder eine Marktanalyse, die du selbst erstellt hast.</EmailText>
            <EmailText>Beantworte dazu drei Fragen:</EmailText>
            <EmailText>{b("Welche Bedingungen haben deine Idee begründet?")}</EmailText>
            <EmailText>{b("Was hätte dagegen gesprochen, sie umzusetzen?")}</EmailText>
            <EmailText>{b("Was möchtest du anhand deiner Auswertung beim nächsten Mal überprüfen?")}</EmailText>
            <EmailText>
              Wenn du noch keine eigenen Trades gemacht hast, nutze dafür ein historisches Beispiel aus dem Training. Dafür
              musst du kein Geld einsetzen.
            </EmailText>
            <EmailText>
              Vielleicht kannst du diese Fragen bereits nachvollziehbar beantworten. Dann hast du einen konkreten
              Ansatzpunkt, um selbstständig weiterzuarbeiten.
            </EmailText>
            <EmailText>
              Vielleicht merkst du aber auch, dass du zwar das Ergebnis kennst — Gewinn oder Verlust —, deine Entscheidung
              selbst jedoch kaum erklären kannst.
            </EmailText>
            <EmailText>{b("Dann weißt du zumindest genauer, woran du arbeiten musst.")}</EmailText>
            <EmailText>
              Genau um diese Unterscheidung geht es mir: Fehlt dir tatsächlich ein neues Handelsmodell? Oder fehlt dir ein
              klarer Umgang mit dem, was du schon gelernt hast?
            </EmailText>
            <EmailText>Persönliche Begleitung ist nicht automatisch die Antwort auf jede Schwierigkeit.</EmailText>
            <EmailText>
              {b(
                "Wenn du aber immer wieder an derselben Stelle festhängst und Rückmeldung zu deiner Umsetzung suchst, dann lass uns darüber sprechen.",
              )}
            </EmailText>
            <EmailText>
              Im Analysegespräch schaut sich mein Team deine Situation an und prüft mit dir, ob Capital Circle dafür der
              passende nächste Schritt ist.
            </EmailText>
            <EmailButton href={d.gespraechUrl}>Jetzt Analysegespräch anfragen</EmailButton>
            <Gruss />
          </BaseEmail>
        ),
      };

    case "E01": {
      const e = ende(d);
      return {
        betreff: "Morgen endet dein kostenloser Trainingszugang.",
        vorschau: "Setze heute dort an, wo du aufgehört hast.",
        jsx: (
          <BaseEmail previewText="Setze heute dort an, wo du aufgehört hast." unsubscribeUrl={u}>
            <Hallo vorname={d.vorname} />
            <EmailText>
              {b(`morgen, am ${datumBerlin(e)} um ${uhrzeitBerlin(e)} (deutsche Zeit), endet dein kostenloser Zugang zu den Kursvideos.`)}
            </EmailText>
            <EmailText>Falls noch eine Lektion offen ist, plane dir heute einen ruhigen Moment dafür ein.</EmailText>
            <EmailText>
              Nicht, um das Video einfach nebenbei laufen zu lassen.{" "}
              {b("Sondern um einen Gedanken daraus wirklich zu verstehen und für dich festzuhalten.")}
            </EmailText>
            <EmailText>
              Welche Erklärung hat deine Sicht auf den Markt verändert? Was möchtest du an deinem eigenen Vorgehen überprüfen?
            </EmailText>
            <EmailText>Genau solche Fragen machen aus einem angeschauten Video etwas, womit du weiterarbeiten kannst.</EmailText>
            <EmailButton href={d.weiterUrl}>Training fortsetzen</EmailButton>
            <EmailText>Nach Ablauf werden die kostenlosen Kursvideos gesperrt. Dein Account bleibt bestehen.</EmailText>
            <Gruss />
          </BaseEmail>
        ),
      };
    }

    case "E02":
      if (!d.whatsappUrl) throw new FehlendeDaten("WhatsApp-Link fehlt (TRAINING_WHATSAPP_NUMMER)");
      return {
        betreff: "Dein Trainingszeitraum ist beendet.",
        vorschau: "Noch nicht fertig? Über mein Team erhältst du einmalig sieben zusätzliche Tage.",
        jsx: (
          <BaseEmail previewText="Noch nicht fertig? Über mein Team erhältst du einmalig sieben zusätzliche Tage." unsubscribeUrl={u}>
            <Hallo vorname={d.vorname} />
            <EmailText>{b("dein 30-tägiger Zugang zum kostenlosen Capital-Circle-Training ist abgelaufen.")}</EmailText>
            <EmailText>Die kostenlosen Kursvideos sind deshalb aktuell nicht mehr freigeschaltet. Dein Account bleibt bestehen.</EmailText>
            <EmailText>
              {b(
                "Falls du noch nicht fertig geworden bist oder einzelne Inhalte noch einmal durcharbeiten möchtest, kannst du deinen Zugang einmalig um sieben Tage verlängern lassen.",
              )}
            </EmailText>
            <EmailText>Schreib dafür meinem Team direkt auf WhatsApp:</EmailText>
            <EmailButton href={d.whatsappUrl}>Verlängerung über WhatsApp anfragen</EmailButton>
            <EmailText>Die zusätzliche Woche beginnt, sobald dein Zugang tatsächlich verlängert wurde.</EmailText>
            <EmailText>
              {b("Nutze diese Zeit bewusst.")} Es geht nicht darum, die Videos irgendwie durchzubekommen, sondern die
              Erklärungen für dich einzuordnen.
            </EmailText>
            <EmailText>
              Wenn du an einer bestimmten Stelle festhängst, sag meinem Team auch kurz, worum es geht. Dann können wir besser
              verstehen, was dir gerade fehlt.
            </EmailText>
            <Gruss />
          </BaseEmail>
        ),
      };

    case "E03": {
      const e = ende(d);
      return {
        betreff: "Deine zusätzliche Woche ist freigeschaltet.",
        vorschau: `Du kannst bis zum ${datumBerlin(e)} wieder auf das Training zugreifen.`,
        jsx: (
          <BaseEmail previewText={`Du kannst bis zum ${datumBerlin(e)} wieder auf das Training zugreifen.`}>
            <Hallo vorname={d.vorname} />
            <EmailText>{b("mein Team hat deinen kostenlosen Kurszugang einmalig um sieben Tage verlängert.")}</EmailText>
            <EmailText>
              Du kannst die Videos jetzt wieder ansehen — bis zum {b(`${datumBerlin(e)} um ${uhrzeitBerlin(e)} (deutsche Zeit)`)}.
            </EmailText>
            <EmailText>Dein bisheriger Lernfortschritt bleibt erhalten. Du musst nicht von vorne anfangen.</EmailText>
            <EmailText>{b("Mach aus dieser zusätzlichen Woche einen konkreten Plan.")}</EmailText>
            <EmailText>
              Welche Lektion möchtest du abschließen? Welchen Zusammenhang noch einmal nachvollziehen? Und welche Frage
              möchtest du dabei für dich beantworten?
            </EmailText>
            <EmailText>Such dir einen sinnvollen nächsten Schritt aus und nimm dir bewusst Zeit dafür.</EmailText>
            <EmailButton href={d.weiterUrl}>Mein Training fortsetzen</EmailButton>
            <EmailText>Diese Verlängerung ist einmalig. Danach endet der kostenlose Videozugang.</EmailText>
            <Gruss />
          </BaseEmail>
        ),
      };
    }

    case "E04": {
      const e = ende(d);
      return {
        betreff: "Deine zusätzliche Lernwoche endet morgen.",
        vorschau: `Bis zum ${datumBerlin(e)}, ${uhrzeitBerlin(e)} kannst du das Training noch nutzen.`,
        jsx: (
          <BaseEmail previewText={`Bis zum ${datumBerlin(e)}, ${uhrzeitBerlin(e)} kannst du das Training noch nutzen.`} unsubscribeUrl={u}>
            <Hallo vorname={d.vorname} />
            <EmailText>{b("morgen endet deine einmalige Verlängerung des kostenlosen Capital-Circle-Trainings.")}</EmailText>
            <EmailText>
              Bis zum {b(`${datumBerlin(e)} um ${uhrzeitBerlin(e)} (deutsche Zeit)`)} kannst du noch auf die Kursvideos
              zugreifen.
            </EmailText>
            <EmailText>
              Wenn eine Lektion offen ist, setze heute dort an. Und nimm dir zum Abschluss einen Moment für deine eigenen
              Notizen:
            </EmailText>
            <EmailText>{b("Was hast du verstanden? Was ist noch unklar? Und woran möchtest du als Nächstes arbeiten?")}</EmailText>
            <EmailText>
              Du brauchst heute kein fertiger Trader zu sein. Aber du solltest für dich benennen können, was du aus dem
              Training mitnimmst.
            </EmailText>
            <EmailButton href={d.weiterUrl}>Training fortsetzen</EmailButton>
            <EmailText>
              Anschließend endet der kostenlose Videozugang. Dein Account bleibt erhalten; eine weitere kostenlose
              Verlängerung ist nicht vorgesehen.
            </EmailText>
            <Gruss />
          </BaseEmail>
        ),
      };
    }

    case "E05":
      return {
        betreff: "Dein kostenloser Zugang ist beendet. So geht es weiter.",
        vorschau: "Dein Account bleibt bestehen. Deinen nächsten Schritt kannst du jetzt mit meinem Team besprechen.",
        jsx: (
          <BaseEmail
            previewText="Dein Account bleibt bestehen. Deinen nächsten Schritt kannst du jetzt mit meinem Team besprechen."
            unsubscribeUrl={u}
          >
            <Hallo vorname={d.vorname} />
            <EmailText>{b("deine zusätzliche Lernwoche bei Capital Circle ist abgelaufen.")}</EmailText>
            <EmailText>Damit endet dein kostenloser Zugang zu den Kursvideos. Dein Account bleibt bestehen.</EmailText>
            <EmailText>
              Mit diesem Training wollte ich dir zeigen, wie ich Märkte betrachte und warum mir eines besonders wichtig ist:{" "}
              {b("Verstehen statt kopieren.")}
            </EmailText>
            <EmailText>
              Vielleicht kannst du mit den Inhalten bereits eigenständig weiterarbeiten. Vielleicht merkst du aber auch, dass
              du bei deiner eigenen Umsetzung noch Struktur und persönliche Rückmeldung brauchst.
            </EmailText>
            <EmailText>{b("Genau darüber können wir sprechen.")}</EmailText>
            <EmailText>Falls du noch keinen Termin für ein Analysegespräch gebucht hast, kannst du das hier nachholen:</EmailText>
            <EmailButton href={d.gespraechUrl}>Jetzt Analysegespräch anfragen</EmailButton>
            <EmailText>
              Mein Team schaut sich mit dir an, wo du aktuell stehst, was du verändern möchtest und welche Schwierigkeiten dir
              dabei im Weg stehen.
            </EmailText>
            <EmailText>Anschließend prüft ihr gemeinsam, ob Capital Circle der passende nächste Schritt für dich ist.</EmailText>
            <EmailText>
              {b("Wenn du ernsthaft an deinem eigenen Tradingprozess arbeiten möchtest, dann lass uns deine Situation konkret besprechen.")}
            </EmailText>
            <Gruss />
            <EmailText muted>
              <em>
                Du hast bereits einen Termin vereinbart oder mit meinem Team gesprochen? Dann bleibt euer vereinbarter
                nächster Schritt bestehen. Du musst keinen zusätzlichen Termin buchen.
              </em>
            </EmailText>
          </BaseEmail>
        ),
      };
  }
}
