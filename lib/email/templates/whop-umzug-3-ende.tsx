import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailButton,
  EmailDivider,
  EmailHeading,
  EmailQuote,
  EmailLink,
  EmailSmall,
  EmailText,
} from "../layout/components";
import { EMAIL_TOKENS as T } from "../layout/styles";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";
import { LIFETIME_PREIS } from "@/config/lifetime";
import { TEAM_POSTFACH, passwortVergessen } from "@/config/team";
import { PREISZEILEN, datumLang, kaufUrl } from "@/config/whop-umzug";

interface Props {
  vorname: string | null;
  zugangBis: string;
  abmeldeLink: string;
}

/**
 * Mail 3 des Whop-Umzugs: der Zugang ist beendet, und hier ist der Weg zurück.
 *
 * ── Warum sie im Rückblick spricht ──────────────────────────────────────────
 *
 * Verschickt wird sie, sobald der bezahlte Zeitraum vorbei ist — der Nachtlauf
 * hat `is_paid` dann in derselben Nacht auf falsch gesetzt
 * (`lib/whop-umzug/ablauf.ts`), und die Mitgliederrolle ist weg. „Dein Zugang
 * endet heute" wäre je nach Uhrzeit des Versands schon falsch; „ist beendet"
 * stimmt in jedem Fall, und niemand sucht danach vergeblich nach einer
 * Schaltfläche, die er noch hätte drücken können.
 *
 * ── Ton ─────────────────────────────────────────────────────────────────────
 *
 * Keine Mahnung und kein Vorwurf. Diese Leute haben bis zum letzten Tag
 * bezahlt und sind nicht abgesprungen, sondern einem Umzug nicht gefolgt. Die
 * Mail sagt, was Sache ist, was bleibt, und wie man zurückkommt — in dieser
 * Reihenfolge.
 */
export default function WhopUmzug3Ende({ vorname, zugangBis, abmeldeLink }: Props) {
  const appUrl = getAppUrl();
  const bis = datumLang(zugangBis);

  return (
    <BaseEmail
      previewText="Dein Zugang ruht, dein Konto und dein Fortschritt bleiben"
      unsubscribeUrl={abmeldeLink}
    >
      <EmailHeading>{vorname ? `${vorname}, dein Zugang ruht jetzt` : "Dein Zugang ruht jetzt"}</EmailHeading>

      <EmailText>
        der Zeitraum, den du bei Whop bezahlt hattest, ist am {bis} abgelaufen. Damit ist dein Zugang zum Institut
        und zu den Mitgliederkanälen bis auf Weiteres zu. Danke, dass du bis zum letzten Tag dabei warst.
      </EmailText>

      <EmailQuote>
        <strong style={{ color: T.gold }}>Verloren ist nichts.</strong>
        <br />
        Dein Konto, dein Lernfortschritt und deine Notizen bleiben gespeichert. Schliesst du wieder ab, machst du in
        derselben Lektion weiter, in der du aufgehört hast, und dein Platz auf dem Discord-Server ist auch wieder
        da.
      </EmailQuote>

      <EmailText>Der Weg zurück ist derselbe Knopf wie vorher:</EmailText>
      <EmailButton href={kaufUrl(appUrl, "monthly")}>Wieder einsteigen</EmailButton>

      <EmailText muted>
        Auch möglich:{" "}
        {PREISZEILEN.filter((p) => p.plan !== "monthly").map((p, i, arr) => (
          <React.Fragment key={p.plan}>
            <EmailLink href={kaufUrl(appUrl, p.plan)}>{p.text}</EmailLink>
            {i < arr.length - 1 ? " · " : ""}
          </React.Fragment>
        ))}
        . Oder Lifetime für {LIFETIME_PREIS} einmalig, ohne weitere Abbuchung. Die Karte dazu findest du nach dem
        Anmelden unter Einstellungen → Abonnement.
      </EmailText>

      <EmailDivider />

      <EmailText muted>
        Noch ein Hinweis, weil es sonst teuer wird: Falls du dein <strong>Whop-Abo noch nicht gekündigt</strong>{" "}
        hast, hol das bitte nach. Dort läuft nichts mehr, abgebucht wird aber weiter, bis du kündigst.
      </EmailText>

      <EmailSmall>
        Schreib uns an {TEAM_POSTFACH}, wenn etwas hakt. {passwortVergessen(appUrl)}
      </EmailSmall>
    </BaseEmail>
  );
}

export async function sendWhopUmzug3(props: Props & { an: string; replyTo?: string }): Promise<SendResult> {
  return sendEmail({
    to: props.an,
    subject: "Dein Zugang ruht, dein Fortschritt bleibt gespeichert",
    replyTo: props.replyTo,
    jsx: <WhopUmzug3Ende vorname={props.vorname} zugangBis={props.zugangBis} abmeldeLink={props.abmeldeLink} />,
  });
}
