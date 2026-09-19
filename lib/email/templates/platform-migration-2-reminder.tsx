import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailHeading, EmailText } from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { generateContactUnsubscribeToken } from "../unsubscribe-token";
import { getAppUrl } from "../resend";
import { PLATFORM_MIGRATION } from "@/config/platform-migration-campaign";

interface Props {
  firstName: string;
  email: string;
  userId: string | null;
}

export default function PlatformMigrationMail2({
  firstName = "Simon",
  email = "vorname@example.com",
}: Pick<Props, "firstName" | "email">) {
  const unsubscribeUrl = `${getAppUrl()}/api/unsubscribe/contact?token=${generateContactUnsubscribeToken(email)}`;

  return (
    <BaseEmail
      previewText="Kurz nochmal, falls das von vorhin bei dir nicht angekommen ist."
      unsubscribeUrl={unsubscribeUrl}
    >
      <EmailHeading>Falls das hier bei dir untergegangen ist</EmailHeading>

      <EmailText>Hey {firstName},</EmailText>
      <EmailText>
        kurz nochmal, falls das von vorhin in der Inbox untergegangen ist:
        Capital Circle läuft wieder auf der eigenen Plattform.
      </EmailText>

      <EmailText>
        Dein Zugang läuft nahtlos weiter, du musst nur einmal wechseln.
        Einheitlich 99&nbsp;€/Monat, jederzeit kündbar.
      </EmailText>

      <EmailText>
        <strong>Kurz zusammengefasst:</strong>
        <br />
        Alles, was du von Whop kennst, gibt es auch auf der eigenen
        Plattform
        <br />
        Trading Journal, Live Sessions und Discord-Zugang unverändert
        <br />
        Der Wechsel selbst dauert etwa zwei Minuten
      </EmailText>

      <EmailText>
        Kein zusätzlicher Aufwand, keine neuen Kosten — nur ein anderer Ort,
        an dem du eingeloggt bist.
      </EmailText>

      <EmailButton href={PLATFORM_MIGRATION.joinUrl}>
        Jetzt wechseln — 99&nbsp;€/Monat
      </EmailButton>

      <EmailText muted>Emre</EmailText>
    </BaseEmail>
  );
}

export async function sendPlatformMigrationMail2(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: PLATFORM_MIGRATION.subjects.mail2,
    jsx: <PlatformMigrationMail2 firstName={props.firstName} email={props.email} />,
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: PLATFORM_MIGRATION.sequence,
      step: 1,
    },
  });
}
