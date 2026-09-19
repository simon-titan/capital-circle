import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailHeading, EmailText } from "../layout/components";
import { abmeldeUrl } from "../abmeldung";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";
import { LIFETIME_PREIS, lifetimeUrl } from "@/config/lifetime";

interface Props {
  firstName: string;
  email: string;
  userId: string;
  /** Lifetime ist für dieses Konto kaufbar (`pruefeLifetimeAngebot`). Sonst ohne den Absatz. */
  mitLifetime?: boolean;
}

/**
 * Die Rückgewinnungs-Mail, 14 Tage nach der Kündigung.
 *
 * ── Kein Gratismonat mehr (19.09.2026) ─────────────────────────────────────
 *
 * Die alte Fassung versprach: „Reaktiviere innerhalb von 7 Tagen und du
 * bekommst deinen ersten Monat kostenlos." Technisch war das nie einlösbar —
 * kein Coupon, keine Kasse, die ihn kannte. Und Simon hat entschieden: keine
 * Rabatte für Halte- oder Rückkehrangebote. Die Mail lädt deshalb ohne
 * Preisnachlass ein und nennt Lifetime als Weg ohne laufende Abbuchung.
 *
 * ── Werbung, also mit Abmeldung ─────────────────────────────────────────────
 *
 * Abmeldelink und Widerspruchshinweis kommen über `unsubscribeUrl` in den
 * Fuss (`lib/email/abmeldung.ts`). Verschickt wird sie nur an Konten ohne
 * `unsubscribed_at` und nur, wenn der Schalter `app_settings.rueckgewinnung_mail`
 * an ist (Standard: aus).
 */
export default function ReactivationOfferEmail({
  firstName,
  mitLifetime,
  abmeldeLink,
}: Pick<Props, "firstName" | "mitLifetime"> & { abmeldeLink?: string }) {
  const appUrl = getAppUrl();
  return (
    <BaseEmail previewText="Dein Platz bei Capital Circle ist noch da" unsubscribeUrl={abmeldeLink}>
      <EmailHeading>Dein Platz ist noch da, {firstName}</EmailHeading>
      <EmailText>
        vor zwei Wochen ist deine Mitgliedschaft ausgelaufen. Dein Konto, dein Journal und dein Fortschritt im Institut
        sind noch gespeichert — wenn du wieder einsteigst, machst du genau dort weiter, wo du aufgehört hast.
      </EmailText>

      <EmailText>
        Nach dem Anmelden findest du unter Einstellungen → Abonnement alle Laufzeiten. Passwort vergessen? Über{" "}
        {`${appUrl}/passwort-vergessen`} setzt du dir in einer Minute ein neues.
      </EmailText>

      {mitLifetime ? (
        <EmailText>
          Wenn dich die laufende Abbuchung gestört hat: Mit Lifetime zahlst du einmalig {LIFETIME_PREIS} und bist
          dauerhaft dabei, ohne Abo und ohne Verlängerung.
        </EmailText>
      ) : null}

      <EmailButton href={mitLifetime ? lifetimeUrl(appUrl) : `${appUrl}/einstellungen/abonnement`}>
        Wieder einsteigen
      </EmailButton>

      <EmailText muted>Kein Druck — wenn du nicht möchtest, hörst du zu diesem Thema nichts mehr von uns.</EmailText>
    </BaseEmail>
  );
}

export async function sendReactivationOffer(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "Dein Platz bei Capital Circle ist noch da",
    jsx: (
      <ReactivationOfferEmail
        firstName={props.firstName}
        mitLifetime={props.mitLifetime}
        abmeldeLink={abmeldeUrl({ userId: props.userId, email: props.email })}
      />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "reactivation",
      step: 0,
    },
  });
}
