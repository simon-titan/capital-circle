import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailHeading, EmailSubheading, EmailText } from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { generateContactUnsubscribeToken } from "../unsubscribe-token";
import { getAppUrl } from "../resend";
import { PLATFORM_MIGRATION } from "@/config/platform-migration-campaign";

interface Props {
  firstName: string;
  email: string;
  userId: string | null;
}

export default function PlatformMigrationMail3({
  firstName = "Simon",
  email = "vorname@example.com",
}: Pick<Props, "firstName" | "email">) {
  const unsubscribeUrl = `${getAppUrl()}/api/unsubscribe/contact?token=${generateContactUnsubscribeToken(email)}`;

  return (
    <BaseEmail
      previewText="Die 3 Fragen, die uns zum Wechsel am häufigsten gestellt werden."
      unsubscribeUrl={unsubscribeUrl}
    >
      <EmailHeading>Die 3 Fragen, die uns zum Wechsel am häufigsten gestellt werden</EmailHeading>

      <EmailText>Hey {firstName},</EmailText>
      <EmailText>die 3 Fragen, die wir zum Plattform-Wechsel am häufigsten bekommen:</EmailText>

      <EmailSubheading>1. Verliere ich beim Wechsel etwas?</EmailSubheading>
      <EmailText muted>
        Nein. Warst du früher schon bei uns registriert, sind dein Profil und
        dein Verlauf noch da. Bist du über Whop dazugekommen, legst du beim
        Wechsel einmalig ein Konto auf der eigenen Plattform an. Der Zugang
        zu allen Inhalten ist ab dann sofort da.
      </EmailText>

      <EmailSubheading>2. Was mache ich mit meinem Whop-Abo?</EmailSubheading>
      <EmailText muted>
        Kündige es einmal selbst in deinem Whop-Account (Mitgliedschaften →
        Kündigen), sobald dein Zugang auf der eigenen Plattform aktiv ist.
        Sonst läuft dein Abo dort parallel weiter und du zahlst doppelt.
        Dein Zugang bei uns ist davon unabhängig und bleibt bestehen.
      </EmailText>

      <EmailSubheading>3. Kostet der Wechsel extra?</EmailSubheading>
      <EmailText muted>
        Nein. Einheitlich 99&nbsp;€/Monat, jederzeit kündbar, keine
        Wechselgebühr, keine versteckten Kosten.
      </EmailText>

      <EmailButton href={PLATFORM_MIGRATION.joinUrl}>
        Jetzt wechseln für 99&nbsp;€/Monat
      </EmailButton>

      <EmailText muted>Emre</EmailText>
    </BaseEmail>
  );
}

export async function sendPlatformMigrationMail3(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: PLATFORM_MIGRATION.subjects.mail3,
    jsx: <PlatformMigrationMail3 firstName={props.firstName} email={props.email} />,
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: PLATFORM_MIGRATION.sequence,
      step: 2,
    },
  });
}
