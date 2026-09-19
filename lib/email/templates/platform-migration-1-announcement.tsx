import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailHeading, EmailSmall, EmailText } from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { generateContactUnsubscribeToken } from "../unsubscribe-token";
import { getAppUrl } from "../resend";
import { PLATFORM_MIGRATION } from "@/config/platform-migration-campaign";

interface Props {
  firstName: string;
  email: string;
  userId: string | null;
}

export default function PlatformMigrationMail1({
  firstName = "Simon",
  email = "vorname@example.com",
}: Pick<Props, "firstName" | "email">) {
  const unsubscribeUrl = `${getAppUrl()}/api/unsubscribe/contact?token=${generateContactUnsubscribeToken(email)}`;

  return (
    <BaseEmail
      previewText="Capital Circle läuft wieder auf der eigenen Plattform — dein Zugang wartet."
      unsubscribeUrl={unsubscribeUrl}
    >
      <EmailSmall>Capital Circle ist zurück auf der eigenen Plattform</EmailSmall>
      <EmailHeading>Dein Zugang wartet auf dich</EmailHeading>

      <EmailText>Hey {firstName},</EmailText>
      <EmailText>
        kurze Info: Capital Circle läuft ab sofort wieder auf unserer eigenen
        Plattform statt über Whop. Für dich ändert sich inhaltlich nichts —
        nur der Ort, an dem du eingeloggt bist.
      </EmailText>

      <EmailText>
        Einheitlicher Preis: 99&nbsp;€/Monat, jederzeit kündbar. Der Wechsel
        dauert etwa zwei Minuten.
      </EmailText>

      <EmailText>
        <strong>Was dich auf der eigenen Plattform erwartet:</strong>
        <br />
        Live Trading Sessions, Wochenvorbereitung &amp; Community Call wie
        gewohnt
        <br />
        Dein Trading Journal direkt eingebaut, nicht mehr über Drittanbieter
        <br />
        Schnellerer Support direkt im Mitgliederbereich
        <br />
        Zugang zur exklusiven Discord-Community bleibt bestehen
      </EmailText>

      <EmailText>
        Dein Whop-Zugang bleibt so lange aktiv, wie du ihn nicht selbst
        kündigst — mehr dazu in einer der nächsten Mails, falls du noch
        Fragen zum Ablauf hast.
      </EmailText>

      <EmailButton href={PLATFORM_MIGRATION.joinUrl}>
        Jetzt wechseln — 99&nbsp;€/Monat
      </EmailButton>

      <EmailText muted>Emre</EmailText>
    </BaseEmail>
  );
}

export async function sendPlatformMigrationMail1(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: PLATFORM_MIGRATION.subjects.mail1,
    jsx: <PlatformMigrationMail1 firstName={props.firstName} email={props.email} />,
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: PLATFORM_MIGRATION.sequence,
      step: 0,
    },
  });
}
