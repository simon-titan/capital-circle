import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailButton,
  EmailDivider,
  EmailHeading,
  EmailLink,
  EmailSmall,
  EmailSubheading,
  EmailText,
} from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";
import {
  anbieter,
  anbieterAnschriftEinzeilig,
  rechtsPfade,
  rechtstexteStand,
  rechtsUrl,
} from "@/config/legal";

interface Props {
  firstName: string;
  email: string;
  userId: string;
  /** Beeinflusst die Begrüßungs-Copy. `lifetime` ist nur noch Bestand, kein Verkaufsweg. */
  tier?: "monthly" | "quarterly" | "yearly" | "lifetime" | "ht_1on1";
  /**
   * Nur beim Gast-Checkout gesetzt: Das Konto ist gerade entstanden und hat
   * noch kein Passwort. Dann führt der Knopf zum Setzen des Passworts statt
   * ins Dashboard — ein Dashboard-Link wäre für dieses Konto eine Sackgasse.
   */
  setPasswordUrl?: string;
}

export default function WelcomePaidEmail({
  firstName,
  tier,
  setPasswordUrl,
}: Pick<Props, "firstName" | "tier" | "setPasswordUrl">) {
  const appUrl = getAppUrl();
  const tierLabel =
    tier === "lifetime"
      ? "Lifetime-Zugang"
      : tier === "ht_1on1"
        ? "1-on-1-Coaching"
        : tier === "quarterly"
          ? "Mitgliedschaft (vierteljährlich)"
          : tier === "yearly"
            ? "Mitgliedschaft (jährlich)"
            : "Mitgliedschaft";

  return (
    <BaseEmail previewText={`Dein Capital-Circle-${tierLabel} ist aktiv`}>
      <EmailHeading>Willkommen im Inner Circle, {firstName}.</EmailHeading>
      <EmailText>
        deine Zahlung ist eingegangen, dein {tierLabel} ist ab sofort aktiv.
      </EmailText>

      <EmailSubheading>Was du jetzt tun solltest</EmailSubheading>
      <EmailText>
        {setPasswordUrl ? "1. Setz dein Passwort über den Knopf unten" : "1. Vervollständige dein Profil im Dashboard"}
        <br />
        2. Tritt unserem Discord-Server bei (Link im Dashboard)
        <br />
        3. Schau in den Live-Session-Kalender und blockiere dir den nächsten Termin
      </EmailText>

      <EmailButton href={setPasswordUrl ?? `${appUrl}/dashboard`}>
        {setPasswordUrl ? "Passwort setzen" : "Zum Dashboard"}
      </EmailButton>

      <EmailText muted>
        Eine Rechnung erhältst du separat von unserem Zahlungs-Provider. Bei
        Fragen zur Abrechnung antworte direkt auf diese Mail.
      </EmailText>

      {/*
        Bestätigung auf dauerhaftem Datenträger (§ 312f Abs. 2 und 3 BGB):
        Vertragsschluss, ausdrückliches Verlangen des sofortigen Beginns und
        Kenntnisnahme zum Widerrufsrecht — Voraussetzung dafür, dass das
        Widerrufsrecht für die digitalen Inhalte erlischt (§ 356 Abs. 6 BGB).
        Der Wortlaut spiegelt das Pflicht-Häkchen in der Kasse
        (`lib/stripe/kasse-recht.ts`); wer das eine ändert, ändert das andere.
        Nicht beim 1:1-Mentoring: Das wird nicht über die Kasse verkauft, es
        gab dort also auch kein Häkchen, das hier bestätigt werden könnte.
      */}
      {tier !== "ht_1on1" ? (
        <>
          <EmailDivider />
          <EmailSmall>
            <strong>Vertragsbestätigung.</strong> Mit deinem Kauf ist ein Vertrag
            über {tier === "lifetime" ? "deinen" : "deine"} {tierLabel} mit{" "}
            {anbieter.name} ({anbieter.marke},{" "}
            {anbieterAnschriftEinzeilig()}) zustande gekommen. In der Kasse hast du
            ausdrücklich verlangt, dass wir vor Ablauf der Widerrufsfrist mit der
            Leistung beginnen, und bestätigt, dass dir bekannt ist: Für die
            digitalen Inhalte erlischt dein Widerrufsrecht damit mit Beginn der
            Bereitstellung; für die Dienstleistungen erlischt es mit ihrer
            vollständigen Erbringung, und bei einem Widerruf schuldest du für die
            bis dahin erbrachten Dienstleistungen anteiligen Wertersatz. Es gelten
            unsere{" "}
            <EmailLink href={rechtsUrl(rechtsPfade.agb, appUrl)}>AGB</EmailLink> und
            die{" "}
            <EmailLink href={rechtsUrl(rechtsPfade.widerruf, appUrl)}>
              Widerrufsbelehrung
            </EmailLink>{" "}
            (Stand {rechtstexteStand}).
          </EmailSmall>
        </>
      ) : null}
    </BaseEmail>
  );
}

export async function sendWelcomePaid(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "Dein Capital Circle Zugang ist aktiv",
    jsx: (
      <WelcomePaidEmail
        firstName={props.firstName}
        tier={props.tier}
        setPasswordUrl={props.setPasswordUrl}
      />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "paid_welcome",
      step: 0,
    },
  });
}
