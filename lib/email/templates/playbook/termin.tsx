import * as React from "react";
import { BaseEmail } from "../../layout/BaseEmail";
import { EmailButton, EmailLink, EmailText } from "../../layout/components";
import { terminZeit } from "@/lib/mailsystem/zeit";
import { FehlendeDaten } from "./free-kurs";

/**
 * Gesprächs- und Terminmails aus Emres E-Mail-Playbook 1.0 (07.11.2026):
 * B01–B03 (Kalender offen, kein Termin), T01–T04 (gebuchter Termin),
 * R01–R03 (Umbuchung, Absage), N01/N02 (bestätigter No-Show).
 * **Texte unverändert aus dem Playbook.**
 *
 * B kommt von Emre, T/R/N vom zuständigen Berater (`[Beratername] | Capital Circle`).
 * Fehlt ein Pflichtfeld (Berater, Einwahllink, Datum), wirft `FehlendeDaten` —
 * dann geht nichts raus und das Team bekommt Bescheid (Kapitel 10).
 */

export type TerminMailId = "B01" | "B02" | "B03" | "T01" | "T02" | "T03" | "T04" | "R01" | "R02" | "R03" | "N01" | "N02";

export const TERMIN_MAIL_IDS: TerminMailId[] = ["B01", "B02", "B03", "T01", "T02", "T03", "T04", "R01", "R02", "R03", "N01", "N02"];

export type TerminMailDaten = {
  vorname: string;
  /** qualified_calendar_url — Kalender der vorhandenen Anfrage, ohne neue Bewerbung. */
  kalenderUrl: string;
  /** Nur für T/R/N. */
  termin?: {
    start: Date;
    ende: Date | null;
    zeitzone: string | null;
    beraterName: string | null;
    /** meeting_join_url */
    joinUrl: string | null;
    /** booking_manage_url */
    verwaltenUrl: string | null;
    /** calendar_event_url (.ics) */
    kalenderEintragUrl: string | null;
  };
  /** R01: der bisherige Termin. */
  alterStart?: Date | null;
  /** R02 „kein Interesse": nur bestätigen und danken. */
  keinInteresse?: boolean;
  /** appointment_video_5_url */
  video5Url?: string | null;
  unsubscribeUrl?: string;
};

export type TerminMail = { betreff: string; vorschau: string; jsx: React.ReactElement };

const b = (t: React.ReactNode) => <strong>{t}</strong>;

function Hallo({ vorname }: { vorname: string }) {
  return <EmailText>Hi {vorname},</EmailText>;
}

function Emre() {
  return (
    <EmailText>
      Emre
      <br />
      Capital Circle
    </EmailText>
  );
}

function Berater({ name, gruss }: { name: string; gruss?: string }) {
  return (
    <EmailText>
      {gruss ? (
        <>
          {gruss}
          <br />
        </>
      ) : null}
      {name}
      <br />
      Capital-Circle-Team
    </EmailText>
  );
}

function pflicht<T>(wert: T | null | undefined, was: string): T {
  if (wert === null || wert === undefined || wert === "") throw new FehlendeDaten(`${was} fehlt`);
  return wert;
}

export function terminMail(id: TerminMailId, d: TerminMailDaten): TerminMail {
  const u = d.unsubscribeUrl;

  if (id === "B01" || id === "B02" || id === "B03") {
    if (id === "B01")
      return {
        betreff: "Dein nächster Schritt bei Capital Circle",
        vorschau: "Wähle jetzt einen passenden Termin für dein Analysegespräch.",
        jsx: (
          <BaseEmail previewText="Wähle jetzt einen passenden Termin für dein Analysegespräch." unsubscribeUrl={u}>
            <Hallo vorname={d.vorname} />
            <EmailText>deine Angaben für eine mögliche Zusammenarbeit mit Capital Circle liegen uns vor.</EmailText>
            <EmailText>{b("Der nächste Schritt ist dein persönliches Analysegespräch mit meinem Team.")}</EmailText>
            <EmailText>Dort knüpfen wir an deine Antworten an und schauen genauer hin:</EmailText>
            <EmailText>
              Wo stehst du aktuell? Was möchtest du verändern? Und an welcher Stelle könnte unsere Begleitung für dich
              sinnvoll sein?
            </EmailText>
            <EmailText>{b("Wähle dafür einen Termin, den du dir wirklich freihalten kannst.")}</EmailText>
            <EmailText>
              Nicht zwischen zwei anderen Verpflichtungen oder nebenbei unterwegs. Nimm dir einen ruhigen Moment, damit wir
              deine Situation vernünftig besprechen können.
            </EmailText>
            <EmailText>Über den folgenden Button gelangst du direkt zur Terminwahl:</EmailText>
            <EmailButton href={d.kalenderUrl}>Meinen Gesprächstermin auswählen</EmailButton>
            <EmailText>
              Sobald du gebucht hast, bekommst du die Bestätigung mit deinem Ansprechpartner und allen Informationen zum
              Gespräch.
            </EmailText>
            <Emre />
          </BaseEmail>
        ),
      };
    if (id === "B02")
      return {
        betreff: "Passt dir keiner der Termine?",
        vorschau: "Oder gibt es vor dem Gespräch noch eine offene Frage?",
        jsx: (
          <BaseEmail previewText="Oder gibt es vor dem Gespräch noch eine offene Frage?" unsubscribeUrl={u}>
            <Hallo vorname={d.vorname} />
            <EmailText>
              du hast deine Anfrage für eine mögliche Zusammenarbeit gestellt. Ein Gesprächstermin ist bisher noch nicht
              eingetragen.
            </EmailText>
            <EmailText>
              {b("Deshalb möchte ich kurz nachfragen: Passt dir keiner der angebotenen Termine, oder ist vorher noch etwas unklar?")}
            </EmailText>
            <EmailText>
              Wenn es an den Zeiten liegt, antworte kurz mit den Zeitfenstern, die bei dir grundsätzlich möglich wären. Mein
              Team prüft, ob wir einen passenden Termin finden.
            </EmailText>
            <EmailText>Und wenn du eine Frage zum Ablauf oder zur Begleitung hast, schreib sie uns direkt.</EmailText>
            <EmailText>{b("Du musst offene Fragen nicht erst alleine klären, bevor du mit uns sprichst.")}</EmailText>
            <EmailText>
              Genau dafür möchten wir deine Situation kennenlernen und gemeinsam herausfinden, ob eine Zusammenarbeit passt.
            </EmailText>
            <EmailText>Antworte einfach auf diese Nachricht und sag uns, was gerade noch im Weg steht.</EmailText>
            <Emre />
          </BaseEmail>
        ),
      };
    return {
      betreff: "Lass deine Anfrage nicht einfach liegen.",
      vorschau: "Wenn du deine nächsten Schritte klären möchtest, wähle jetzt deinen Termin.",
      jsx: (
        <BaseEmail previewText="Wenn du deine nächsten Schritte klären möchtest, wähle jetzt deinen Termin." unsubscribeUrl={u}>
          <Hallo vorname={d.vorname} />
          <EmailText>
            du hast dir die Zeit genommen, uns deine Situation zu schildern und eine mögliche Zusammenarbeit anzufragen.
          </EmailText>
          <EmailText>{b("Lass es jetzt nicht bei einer ausgefüllten Bewerbung bleiben.")}</EmailText>
          <EmailText>
            Wenn du weiterhin an deinem Trading arbeiten und prüfen möchtest, ob Capital Circle dich dabei unterstützen
            kann, dann wähle deinen Gesprächstermin.
          </EmailText>
          <EmailText>Wir sprechen nicht darüber, wie viele Tradingbegriffe du auswendig kennst.</EmailText>
          <EmailText>
            {b("Es geht um dein tatsächliches Vorgehen:")} Was du bisher gemacht hast, wo du festhängst und welche
            Unterstützung für dich sinnvoll sein könnte.
          </EmailText>
          <EmailText>
            Bring dafür deine wichtigste Frage mit. Keine perfekte Präsentation und keine Antworten, von denen du glaubst,
            dass wir sie hören möchten.
          </EmailText>
          <EmailText>{b("Eine ehrliche Ausgangslage ist für uns wertvoller.")}</EmailText>
          <EmailText>Wähle einen Termin, an dem du in Ruhe sprechen kannst:</EmailText>
          <EmailButton href={d.kalenderUrl}>Meinen Gesprächstermin auswählen</EmailButton>
          <EmailText>
            Falls du den nächsten Schritt aktuell nicht gehen möchtest, genügt eine kurze Antwort. Dann wissen wir Bescheid
            und stoppen die weiteren Terminaufforderungen.
          </EmailText>
          <Emre />
        </BaseEmail>
      ),
    };
  }

  if (id === "T02") {
    const video = pflicht(d.video5Url, "Video-5-Link");
    return {
      betreff: "Bevor du mit meinem Team sprichst, schau dir das an.",
      vorschau: "Dieser Einblick ist die Grundlage für unser Gespräch.",
      jsx: (
        <BaseEmail previewText="Dieser Einblick ist die Grundlage für unser Gespräch." unsubscribeUrl={u}>
          <Hallo vorname={d.vorname} />
          <EmailText>dein Analysegespräch mit meinem Team steht an.</EmailText>
          <EmailText>
            {b("Bevor ihr miteinander sprecht, möchte ich, dass du verstehst, worauf es mir bei Capital Circle wirklich ankommt.")}
          </EmailText>
          <EmailText>Deshalb schau dir bitte Video 5 an: {b("„Warum meine Schüler nicht meine Trades kopieren.“")}</EmailText>
          <EmailText>
            Darin zeige ich dir echte Einblicke aus unserer Community, erkläre unseren Ausbildungsansatz und die Rolle der
            persönlichen Begleitung.
          </EmailText>
          <EmailText>
            {b(
              "Ich möchte keine Menschen ausbilden, die dauerhaft auf meinen nächsten Trade warten. Ich möchte, dass sie lernen, eigene Entscheidungen zu treffen und diese nachvollziehbar zu begründen.",
            )}
          </EmailText>
          <EmailText>Genau darauf baut unser Analysegespräch auf.</EmailText>
          <EmailText>Falls du das Video bereits gesehen hast, schau es dir diesmal mit einer konkreten Frage an:</EmailText>
          <EmailText>
            {b("Was möchtest du an deinem eigenen Trading verändern — und wobei würdest du dir persönliche Rückmeldung wünschen?")}
          </EmailText>
          <EmailText>Du brauchst darauf noch keine perfekte Antwort. Aber nimm dir den Moment, ehrlich darüber nachzudenken.</EmailText>
          <EmailText>
            Im Gespräch geht es anschließend um {b("deine Situation")}: deinen bisherigen Weg, deine offenen Fragen und
            darum, ob unsere Begleitung der passende nächste Schritt ist.
          </EmailText>
          <EmailButton href={video}>Video 5 ansehen</EmailButton>
          <EmailText>
            Mir ist wichtig, dass du nicht einfach irgendeinen Termin wahrnimmst.{" "}
            {b("Du sollst wissen, wofür Capital Circle steht, und deine eigenen Fragen mitbringen.")}
          </EmailText>
          <Emre />
        </BaseEmail>
      ),
    };
  }

  // ── Ab hier: Mails zu einer konkreten Terminversion ──
  const t = pflicht(d.termin, "Termin");
  const berater = pflicht(t.beraterName, "Berater");
  const z = terminZeit(t.start, t.ende, t.zeitzone);

  if (id === "N01")
    return {
      betreff: "Buche jetzt deinen neuen Gesprächstermin.",
      vorschau: "Wähle ein Zeitfenster, das du dir verbindlich freihalten kannst.",
      jsx: (
        <BaseEmail previewText="Wähle ein Zeitfenster, das du dir verbindlich freihalten kannst." unsubscribeUrl={u}>
          <Hallo vorname={d.vorname} />
          <EmailText>unser vereinbartes Analysegespräch hat nicht stattgefunden.</EmailText>
          <EmailText>
            {b("Damit wir deine Situation und deine nächsten Schritte im Trading besprechen können, buche jetzt deinen neuen Termin:")}
          </EmailText>
          <EmailButton href={d.kalenderUrl}>Neuen Gesprächstermin buchen</EmailButton>
          <EmailText>
            Wähle dafür ein Zeitfenster, das du dir wirklich freihalten kannst. Wir reservieren diese Zeit für dich und
            bereiten uns anhand deiner Angaben auf das Gespräch vor.
          </EmailText>
          <EmailText>{b("Eine sinnvolle Zusammenarbeit beginnt mit verbindlichen Absprachen — auf beiden Seiten.")}</EmailText>
          <EmailText>
            Deine Bewerbung liegt uns bereits vor. Du musst nichts erneut ausfüllen, sondern nur den neuen Termin auswählen.
          </EmailText>
          <EmailText>
            Bring deine wichtigste Frage mit. Dann können wir konkret besprechen, wo du stehst und ob Capital Circle dich
            sinnvoll unterstützen kann.
          </EmailText>
          <Berater name={berater} />
        </BaseEmail>
      ),
    };

  if (id === "N02")
    return {
      betreff: `Wie möchtest du weitermachen, ${d.vorname}?`,
      vorschau: "Ein klarer nächster Schritt ist besser als eine offene Anfrage.",
      jsx: (
        <BaseEmail previewText="Ein klarer nächster Schritt ist besser als eine offene Anfrage." unsubscribeUrl={u}>
          <Hallo vorname={d.vorname} />
          <EmailText>
            du hattest ein Analysegespräch mit uns vereinbart. Wir konnten bisher nicht miteinander sprechen und haben noch
            keine Rückmeldung von dir.
          </EmailText>
          <EmailText>{b("Deshalb möchte ich den nächsten Schritt einmal klar machen.")}</EmailText>
          <EmailText>Wenn du deine Situation weiterhin mit uns besprechen möchtest, wähle einen passenden Termin:</EmailText>
          <EmailButton href={d.kalenderUrl}>Gespräch nachholen</EmailButton>
          <EmailText>Wenn es aktuell nicht passt, genügt eine kurze Antwort. Du musst dafür keine lange Erklärung schreiben.</EmailText>
          <EmailText>
            {b("Eine Zusammenarbeit beginnt für uns mit ehrlicher Kommunikation und verbindlichen Absprachen. Das gilt für beide Seiten.")}
          </EmailText>
          <EmailText>Nach dieser Nachricht werde ich wegen dieses verpassten Termins nicht weiter nachhaken.</EmailText>
          <Berater name={berater} />
        </BaseEmail>
      ),
    };

  if (id === "R02") {
    return {
      betreff: "Deine Terminabsage ist bestätigt.",
      vorschau: `Das Gespräch am ${z.datum} findet nicht statt.`,
      jsx: (
        <BaseEmail previewText={`Das Gespräch am ${z.datum} findet nicht statt.`}>
          <Hallo vorname={d.vorname} />
          <EmailText>deine Absage ist bei uns angekommen.</EmailText>
          <EmailText>{b(`Das Analysegespräch am ${z.datum} um ${z.uhrzeit} findet nicht statt.`)}</EmailText>
          <EmailText>Danke, dass du uns Bescheid gegeben hast.</EmailText>
          {d.keinInteresse ? null : (
            <>
              <EmailText>
                Wenn du das Gespräch weiterhin führen möchtest und nur der Zeitpunkt nicht passt, kannst du hier einen neuen
                Termin auswählen:
              </EmailText>
              <EmailButton href={d.kalenderUrl}>Neuen Gesprächstermin auswählen</EmailButton>
              <EmailText>Deine bisherigen Angaben bleiben erhalten.</EmailText>
              <EmailText>Falls du zunächst eine Frage klären möchtest, antworte direkt auf diese E-Mail.</EmailText>
            </>
          )}
          <Berater name={berater} />
        </BaseEmail>
      ),
    };
  }

  if (id === "R03")
    return {
      betreff: "Bitte buche deinen Ersatztermin.",
      vorschau: "Unser bisheriger Termin entfällt. Hier kannst du direkt neu buchen.",
      jsx: (
        <BaseEmail previewText="Unser bisheriger Termin entfällt. Hier kannst du direkt neu buchen.">
          <Hallo vorname={d.vorname} />
          <EmailText>leider müssen wir unser Analysegespräch am {b(`${z.datum} um ${z.uhrzeit}`)} absagen.</EmailText>
          <EmailText>{b("Die Änderung liegt auf unserer Seite. Entschuldige bitte die Umstände.")}</EmailText>
          <EmailText>Bitte wähle über den folgenden Link direkt einen neuen Termin, den du dir freihalten kannst:</EmailText>
          <EmailButton href={d.kalenderUrl}>Neuen Gesprächstermin buchen</EmailButton>
          <EmailText>Deine bisherigen Angaben bleiben erhalten. Du musst keine neue Bewerbung ausfüllen.</EmailText>
          <EmailText>Sobald du gebucht hast, bekommst du die aktualisierte Bestätigung mit allen Informationen.</EmailText>
          <Berater name={berater} />
        </BaseEmail>
      ),
    };

  // T01, T03, T04, R01 brauchen Einwahl und Verwaltung.
  const join = pflicht(t.joinUrl, "Einwahllink");
  const verwalten = pflicht(t.verwaltenUrl, "Verwaltungslink");

  if (id === "T01")
    return {
      betreff: `Dein Analysegespräch steht, ${d.vorname}.`,
      vorschau: "Hier findest du deinen Termin, deinen Ansprechpartner und den Gesprächslink.",
      jsx: (
        <BaseEmail previewText="Hier findest du deinen Termin, deinen Ansprechpartner und den Gesprächslink.">
          <Hallo vorname={d.vorname} />
          <EmailText>{b("dein Analysegespräch mit Capital Circle ist gebucht.")}</EmailText>
          <EmailText>Ich bin {berater} aus Emres Team und werde das Gespräch mit dir führen.</EmailText>
          <EmailText>Hier sind deine Termindaten:</EmailText>
          <EmailText>
            {b("Datum:")} {z.tag}
            <br />
            {b("Uhrzeit:")} {z.spanne}
            <br />
            {b("Gesprächspartner:")} {berater}
          </EmailText>
          <EmailButton href={join}>Am Analysegespräch teilnehmen</EmailButton>
          <EmailText>
            Wir knüpfen an deine Angaben aus der Bewerbung an. Gemeinsam schauen wir auf deine aktuelle Situation, deine
            Schwierigkeiten und darauf, ob unsere Begleitung zu deinem nächsten Schritt passt.
          </EmailText>
          <EmailText>{b("Du musst dich nicht besonders darstellen. Uns hilft eine ehrliche Ausgangslage.")}</EmailText>
          <EmailText>
            Reserviere dir das Zeitfenster bewusst und nimm möglichst von einem ruhigen Ort aus teil. So können wir uns
            vernünftig auf dein Anliegen konzentrieren.
          </EmailText>
          {t.kalenderEintragUrl ? (
            <EmailText>
              Hier kannst du den Termin in deinen Kalender übernehmen: <EmailLink href={t.kalenderEintragUrl}>Zum Kalender hinzufügen</EmailLink>
            </EmailText>
          ) : null}
          <EmailText>
            Falls etwas dazwischenkommt, kannst du deinen Termin hier verschieben oder absagen:{" "}
            <EmailLink href={verwalten}>Termin verwalten</EmailLink>
          </EmailText>
          <EmailText>Ich freue mich darauf, dich kennenzulernen.</EmailText>
          <Berater name={berater} />
        </BaseEmail>
      ),
    };

  if (id === "T03")
    return {
      betreff: "Morgen sprechen wir. Bring deine wichtigste Frage mit.",
      vorschau: "Du brauchst keine perfekte Vorbereitung — eine konkrete Situation hilft.",
      jsx: (
        <BaseEmail previewText="Du brauchst keine perfekte Vorbereitung — eine konkrete Situation hilft.">
          <Hallo vorname={d.vorname} />
          <EmailText>morgen um {b(z.uhrzeit)} sprechen wir über deine aktuelle Trading-Situation.</EmailText>
          <EmailText>
            Deine Angaben aus der Bewerbung liegen mir vor. {b("Wir müssen deshalb nicht bei null anfangen.")}
          </EmailText>
          <EmailText>Für unser Gespräch möchte ich dir eine kleine Vorbereitung mitgeben:</EmailText>
          <EmailText>{b("Denk an eine konkrete Situation, bei der du zuletzt nicht weitergekommen bist.")}</EmailText>
          <EmailText>
            Vielleicht verstehst du eine Erklärung, kannst sie aber am eigenen Chart nicht sicher anwenden. Vielleicht fehlt
            dir ein fester Ablauf. Oder du weißt noch nicht, welcher Ansatz überhaupt in deinen Alltag passt.
          </EmailText>
          <EmailText>Was auch immer es ist: Bring genau dieses Beispiel mit.</EmailText>
          <EmailText>
            Falls du bereits eine eigene Analyse oder eine Journalnotiz dazu hast, kannst du sie bereithalten.{" "}
            {b("Du musst dafür nichts neu erstellen.")} Und wenn du gerade erst anfängst, reicht deine wichtigste Frage.
          </EmailText>
          <EmailText>
            So sprechen wir nicht nur allgemein darüber, dass du „besser traden“ möchtest. Wir können konkret einordnen, was
            dich beschäftigt und ob unsere Begleitung dazu passt.
          </EmailText>
          <EmailText>{b(`Dein Termin: ${z.datum}, ${z.spanne}`)}</EmailText>
          <EmailButton href={join}>Am Analysegespräch teilnehmen</EmailButton>
          <EmailText>
            Solltest du verhindert sein, verschiebe oder storniere bitte rechtzeitig hier:{" "}
            <EmailLink href={verwalten}>Termin verwalten</EmailLink>
          </EmailText>
          <Berater name={berater} gruss="Bis morgen" />
        </BaseEmail>
      ),
    };

  if (id === "T04")
    return {
      betreff: "In 30 Minuten: dein Analysegespräch",
      vorschau: "Hier ist dein direkter Gesprächslink.",
      jsx: (
        <BaseEmail previewText="Hier ist dein direkter Gesprächslink.">
          <Hallo vorname={d.vorname} />
          <EmailText>{b("in 30 Minuten beginnt unser Analysegespräch.")}</EmailText>
          <EmailText>
            {b(`Heute, ${z.datum}, um ${z.uhrzeit}`)}
            <br />
            Dein Gesprächspartner: {b(berater)}
          </EmailText>
          <EmailButton href={join}>Jetzt zum Gespräch</EmailButton>
          <EmailText>Halte deine wichtigste Frage bereit und wähle einen ruhigen Ort mit stabiler Verbindung.</EmailText>
          <EmailText>
            Wir schauen auf deine Situation und besprechen, ob und wie Capital Circle dich bei deinem nächsten Schritt
            begleiten kann.
          </EmailText>
          <EmailText>Falls beim Einwählen etwas nicht funktioniert, antworte direkt auf diese E-Mail.</EmailText>
          <Berater name={berater} gruss="Bis gleich" />
          <EmailText muted>
            <em>
              Verhindert? <EmailLink href={verwalten}>Termin verwalten</EmailLink>
            </em>
          </EmailText>
        </BaseEmail>
      ),
    };

  // R01 — Umbuchung bestätigt
  const alt = d.alterStart ? terminZeit(d.alterStart, null, t.zeitzone) : null;
  return {
    betreff: "Dein neuer Gesprächstermin steht.",
    vorschau: "Hier findest du die aktualisierten Angaben.",
    jsx: (
      <BaseEmail previewText="Hier findest du die aktualisierten Angaben.">
        <Hallo vorname={d.vorname} />
        <EmailText>{b("dein Analysegespräch wurde verschoben.")}</EmailText>
        {alt ? <EmailText>Der bisherige Termin am {b(`${alt.datum} um ${alt.uhrzeit}`)} entfällt.</EmailText> : null}
        <EmailText>Wir sprechen jetzt:</EmailText>
        <EmailText>
          {b("Datum:")} {z.tag}
          <br />
          {b("Uhrzeit:")} {z.spanne}
          <br />
          {b("Gesprächspartner:")} {berater}
        </EmailText>
        <EmailButton href={join}>Am Analysegespräch teilnehmen</EmailButton>
        <EmailText>Deine Angaben aus der Bewerbung bleiben erhalten. Du musst nichts erneut ausfüllen.</EmailText>
        {t.kalenderEintragUrl ? (
          <EmailText>
            Hier kannst du den aktualisierten Termin in deinen Kalender übernehmen:{" "}
            <EmailLink href={t.kalenderEintragUrl}>Kalender aktualisieren</EmailLink>
          </EmailText>
        ) : null}
        <EmailText>
          Sollte sich nochmals etwas ändern, verwalte deinen Termin bitte hier: <EmailLink href={verwalten}>Termin verwalten</EmailLink>
        </EmailText>
        <Berater name={berater} gruss="Bis zu unserem Gespräch" />
      </BaseEmail>
    ),
  };
}
