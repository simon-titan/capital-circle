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
import { LIFETIME_PREIS } from "@/config/lifetime";
import { TEAM_POSTFACH, passwortVergessen } from "@/config/team";
import {
  PREISZEILEN,
  WHOP_KUENDIGUNG_SCHRITTE,
  datumLang,
  kaufUrl,
  whopKuendigungHilfe,
} from "@/config/whop-umzug";

interface Props {
  vorname: string | null;
  /** Ende des bei Whop bezahlten Zeitraums, ISO. Steht in jeder Nachricht. */
  zugangBis: string;
  abmeldeLink: string;
}

/**
 * Mail 1 des Whop-Umzugs: Was sich ändert, bis wann der Zugang bleibt, was zu
 * tun ist.
 *
 * ── Die Reihenfolge der Absätze ist die Botschaft ──────────────────────────
 *
 * Zuerst die Beruhigung („dein Zugang bleibt bis <Datum>"), dann erst die
 * Aufgabe („kündige bei Whop"). Andersherum gelesen wäre die erste
 * Information dieser Mail eine Aufforderung an jemanden, der gerade erfährt,
 * dass sein Anbieter umgezogen ist — und die zweite eine Preisliste.
 *
 * Das Datum steht drei Mal: in der Betreffzeile, im Hinweiskasten und im
 * Abschnitt zur Kündigung. Es ist die einzige Zahl, auf die es hier ankommt,
 * und sie ist bei jedem Empfänger eine andere.
 *
 * ── Warum trotzdem ein Abmeldelink darin steht ─────────────────────────────
 *
 * Der Kern ist Vertragspost, der Preisblock ist Werbung. Die Begründung steht
 * ausführlich in `config/whop-umzug.ts`; kurz: Die Mail geht an alle, auch an
 * Widersprechende, trägt aber Abmeldelink und den Hinweis nach § 7 Abs. 3
 * Nr. 4 UWG, damit der Werbeteil abbestellbar bleibt.
 */
export default function WhopUmzug1Ankuendigung({ vorname, zugangBis, abmeldeLink }: Props) {
  const appUrl = getAppUrl();
  const bis = datumLang(zugangBis);

  return (
    <BaseEmail
      previewText={`Dein Zugang bleibt bis zum ${bis} — was jetzt zu tun ist`}
      hideFooter={false}
      unsubscribeUrl={abmeldeLink}
    >
      <EmailEyebrow>Capital Circle zieht um</EmailEyebrow>
      <EmailHeading>
        {vorname ? `${vorname}, wir sind weg von Whop` : "Wir sind weg von Whop"}
      </EmailHeading>

      <EmailText>
        Capital Circle läuft ab sofort wieder auf der eigenen Plattform. Alles, was du kennst — das Institut, die
        Aufzeichnungen, dein Fortschritt und der Discord — liegt dort. Neu ist nur, wo deine Mitgliedschaft
        abgerechnet wird: bei uns direkt statt über Whop.
      </EmailText>

      <EmailHighlight>
        <strong style={{ color: T.goldLight }}>Dein Zugang bleibt bis zum {bis}.</strong>
        <br />
        Das ist das Ende des Zeitraums, den du bei Whop bereits bezahlt hast. Bis dahin ändert sich für dich
        nichts — du zahlst nichts doppelt und verlierst keinen Tag.
      </EmailHighlight>

      <EmailDivider />

      <EmailSubheading>Dein Konto liegt schon bereit</EmailSubheading>
      <EmailText>
        Wir haben es für dich angelegt, mit genau dieser E-Mail-Adresse. Ein Passwort hast du noch nicht — setz dir
        eines über <EmailLink href={`${appUrl}/passwort-vergessen`}>{`${appUrl}/passwort-vergessen`}</EmailLink>,
        dann bist du drin. Dein Discord-Zugang läuft weiter wie bisher.
      </EmailText>

      <EmailDivider />

      <EmailSubheading>Schritt 1: Dein Whop-Abo kündigen</EmailSubheading>
      <EmailText>
        Das können wir dir nicht abnehmen: An deinen Whop-Vertrag kommst nur du selbst heran. Kündigst du nicht,
        bucht Whop am {bis} erneut ab — für einen Zugang, der dort nicht mehr läuft.
      </EmailText>
      <SchritteListe schritte={WHOP_KUENDIGUNG_SCHRITTE} />
      <EmailText muted>{whopKuendigungHilfe()}</EmailText>

      <EmailDivider />

      <EmailSubheading>Schritt 2: Bei uns weitermachen</EmailSubheading>
      <EmailText>
        Such dir aus, was passt. Es sind dieselben Preise wie für alle — einen Umzugsrabatt gibt es nicht, und
        einen Haken auch nicht.
      </EmailText>

      <table role="presentation" width="100%" cellSpacing={0} cellPadding={0} style={{ margin: "8px 0 20px" }}>
        <tbody>
          {PREISZEILEN.map((p) => (
            <tr key={p.plan}>
              <td
                style={{
                  padding: "12px 16px",
                  border: `1px solid ${T.border}`,
                  borderRadius: "8px",
                  backgroundColor: T.bgCard,
                  fontFamily: T.fontBody,
                  fontSize: "15px",
                  color: T.text,
                }}
              >
                <strong>{p.text}</strong>
                <br />
                <EmailLink href={kaufUrl(appUrl, p.plan)}>Jetzt abschliessen</EmailLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <EmailText muted>
        Lieber einmal zahlen statt jeden Monat? Lifetime kostet {LIFETIME_PREIS}, einmalig, ohne weitere Abbuchung.
        Die Karte dazu findest du nach dem Anmelden unter Einstellungen → Abonnement.
      </EmailText>

      <EmailDivider />

      <EmailSubheading>Was bleibt, wie es ist</EmailSubheading>
      <EmailText>
        Dein Konto, dein Lernfortschritt, deine Notizen und dein Platz auf dem Discord-Server. Nichts davon hängt an
        Whop, und nichts davon geht verloren — auch dann nicht, wenn du dir mit dem Abschliessen Zeit lässt.
      </EmailText>

      <EmailSmall>
        Fragen? Antworte einfach auf diese Mail oder schreib an {TEAM_POSTFACH}. {passwortVergessen(appUrl)}
      </EmailSmall>
    </BaseEmail>
  );
}

/**
 * Die Kündigungsschritte als nummerierte Liste.
 *
 * Eigene kleine Komponente statt `<ol>` im Fluss: Outlook rendert
 * Listenmarken unzuverlässig und vergisst die Einrückung — die Zahlen stehen
 * deshalb als Text in einer Tabellenspalte.
 */
function SchritteListe({ schritte }: { schritte: readonly string[] }) {
  return (
    <table role="presentation" width="100%" cellSpacing={0} cellPadding={0} style={{ margin: "8px 0 12px" }}>
      <tbody>
        {schritte.map((s, i) => (
          <tr key={s}>
            <td
              width="28"
              valign="top"
              style={{
                padding: "4px 0 10px",
                fontFamily: T.fontBody,
                fontSize: "14px",
                fontWeight: 700,
                color: T.gold,
              }}
            >
              {i + 1}.
            </td>
            <td
              valign="top"
              style={{
                padding: "4px 0 10px",
                fontFamily: T.fontBody,
                fontSize: "14px",
                lineHeight: 1.6,
                color: T.textSoft,
              }}
            >
              {s}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export async function sendWhopUmzug1(props: Props & { an: string; replyTo?: string }): Promise<SendResult> {
  return sendEmail({
    to: props.an,
    subject: `Capital Circle zieht um — dein Zugang bleibt bis zum ${datumLang(props.zugangBis)}`,
    replyTo: props.replyTo,
    jsx: (
      <WhopUmzug1Ankuendigung
        vorname={props.vorname}
        zugangBis={props.zugangBis}
        abmeldeLink={props.abmeldeLink}
      />
    ),
  });
}
