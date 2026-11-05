import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailButton,
  EmailDivider,
  EmailHeading,
  EmailLink,
  EmailRows,
  EmailSmall,
  EmailSubheading,
  EmailText,
} from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";
import { PRODUKTE, euro, type KassenProdukt } from "@/config/mentoring";
import {
  anbieter,
  anbieterAnschriftEinzeilig,
  rechtsPfade,
  rechtstexteStand,
  rechtsUrl,
} from "@/config/legal";

/**
 * Kaufbestätigung für die Mentoring-Programme und das Live-Abo
 * (`config/mentoring.ts`), verschickt aus `lib/stripe/webhooks/mentoring.ts`.
 *
 * Mehr als eine Willkommensmail: Sie ist die Bestätigung auf dauerhaftem
 * Datenträger nach § 312f BGB und trägt deshalb den Vertragsinhalt — die
 * Leistungen mit ihren Laufzeiten und bei Raten den Ratenplan. Gruppencall,
 * WhatsApp-Support und Privatstunden stehen sonst nirgends schriftlich beim
 * Kunden, und genau danach fragt er nach drei Monaten.
 */

interface Props {
  firstName: string;
  email: string;
  userId: string;
  kaufId: string;
  produkt: KassenProdukt;
  /** 1 = Einmalzahlung. */
  raten: number;
  rateCents: number | null;
  gesamtCents: number;
  /** Ende des Live-Zugangs (ISO), bei Programmen gesetzt. */
  liveBis: string | null;
  /** Nur für Konten ohne Passwort (gerade über die Kasse entstanden). */
  setPasswordUrl?: string;
}

function datum(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
}

export default function MentoringBestaetigungEmail(props: Omit<Props, "email" | "userId" | "kaufId">) {
  const appUrl = getAppUrl();
  const produkt = PRODUKTE[props.produkt];
  const istLive = props.produkt === "live";

  const zahlung: [string, string] =
    istLive
      ? ["Preis", `${euro(produkt.preisCents)} pro Monat, monatlich kündbar`]
      : props.raten > 1 && props.rateCents
        ? ["Zahlung", `${props.raten} Monatsraten à ${euro(props.rateCents)}, zusammen ${euro(props.rateCents * props.raten)}, ohne Aufschlag`]
        : ["Zahlung", `${euro(props.gesamtCents)} einmalig`];

  const zeilen: [string, string][] = [["Programm", produkt.name], zahlung];
  if (props.liveBis) zeilen.push(["Live-Zugang bis", datum(props.liveBis)]);

  return (
    <BaseEmail previewText={`${produkt.name}: dein Zugang ist aktiv`}>
      <EmailHeading>Willkommen, {props.firstName}.</EmailHeading>
      <EmailText>
        deine Zahlung ist eingegangen. {istLive ? "Dein Live-Zugang ist wieder offen." : `${props.produkt === "ausbildung" ? "Deine" : "Dein"} ${produkt.name} startet jetzt.`}
      </EmailText>

      <EmailRows rows={zeilen} />

      {props.raten > 1 && !istLive ? (
        <EmailText muted>
          Die erste Rate ist bezahlt. Die weiteren werden jeweils einen Monat später von derselben Zahlungsart
          abgebucht. Nach der letzten Rate endet die Ratenzahlung von selbst, du musst nichts kündigen.
        </EmailText>
      ) : null}

      <EmailSubheading>Was enthalten ist</EmailSubheading>
      <EmailText>
        {produkt.enthalten.map((l, i) => (
          <React.Fragment key={l.text}>
            {i > 0 ? <br /> : null}• {l.text}
            {l.detail ? ` (${l.detail})` : ""}
          </React.Fragment>
        ))}
      </EmailText>

      <EmailButton href={props.setPasswordUrl ?? `${appUrl}/dashboard`}>
        {props.setPasswordUrl ? "Passwort setzen" : "Zum Dashboard"}
      </EmailButton>

      {!istLive ? (
        <EmailText muted>
          Termine für Gruppencall, WhatsApp-Support und Privatstunden stimmen wir in den nächsten Tagen mit dir ab,
          soweit sie zu deinem Programm gehören. Eine Rechnung erhältst du separat von unserem Zahlungsanbieter.
        </EmailText>
      ) : null}

      {/*
        Bestätigung auf dauerhaftem Datenträger (§ 312f Abs. 2 und 3 BGB), gleicher
        Wortlaut wie in `welcome-paid.tsx` — er spiegelt das Pflicht-Häkchen der
        Kasse (`lib/stripe/kasse-recht.ts`).
      */}
      <EmailDivider />
      <EmailSmall>
        <strong>Vertragsbestätigung.</strong> Mit deinem Kauf ist ein Vertrag über das {produkt.name} mit{" "}
        {anbieter.name} ({anbieter.marke}, {anbieterAnschriftEinzeilig()}) zustande gekommen. In der Kasse hast du
        ausdrücklich verlangt, dass wir vor Ablauf der Widerrufsfrist mit der Leistung beginnen, und bestätigt, dass
        dir bekannt ist: Für die digitalen Inhalte erlischt dein Widerrufsrecht damit mit Beginn der Bereitstellung;
        für die Dienstleistungen erlischt es mit ihrer vollständigen Erbringung, und bei einem Widerruf schuldest du
        für die bis dahin erbrachten Dienstleistungen anteiligen Wertersatz. Es gelten unsere{" "}
        <EmailLink href={rechtsUrl(rechtsPfade.agb, appUrl)}>AGB</EmailLink> und die{" "}
        <EmailLink href={rechtsUrl(rechtsPfade.widerruf, appUrl)}>Widerrufsbelehrung</EmailLink> (Stand{" "}
        {rechtstexteStand}).
      </EmailSmall>
    </BaseEmail>
  );
}

export async function sendMentoringBestaetigung(props: Props): Promise<SendResult> {
  const produkt = PRODUKTE[props.produkt];
  return sendEmail({
    to: props.email,
    subject: props.produkt === "live" ? "Dein Live-Zugang ist wieder aktiv" : `${props.produkt === "ausbildung" ? "Deine" : "Dein"} ${produkt.name} ist aktiv`,
    jsx: (
      <MentoringBestaetigungEmail
        firstName={props.firstName}
        produkt={props.produkt}
        raten={props.raten}
        rateCents={props.rateCents}
        gesamtCents={props.gesamtCents}
        liveBis={props.liveBis}
        setPasswordUrl={props.setPasswordUrl}
      />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      // Je Kauf eine eigene Sequenz: Der Log ist eindeutig über (Adresse,
      // Sequenz, Schritt), und ein zweites Programm derselben Person darf
      // nicht als „schon verschickt" gelten.
      sequence: `mentoring_kauf:${props.kaufId}`,
      step: 0,
    },
  });
}
