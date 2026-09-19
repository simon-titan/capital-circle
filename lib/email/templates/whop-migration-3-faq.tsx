import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailHeading, EmailSubheading, EmailText } from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { generateContactUnsubscribeToken } from "../unsubscribe-token";
import { getAppUrl } from "../resend";
import { WHOP_MIGRATION } from "@/config/whop-migration-campaign";

interface Props {
  firstName: string;
  email: string;
  userId: string | null;
}

export default function WhopMigrationMail3({
  firstName = "Simon",
  email = "vorname@example.com",
}: Pick<Props, "firstName" | "email">) {
  const unsubscribeUrl = `${getAppUrl()}/api/unsubscribe/contact?token=${generateContactUnsubscribeToken(email)}`;

  return (
    <BaseEmail
      previewText="Die 3 Fragen, die mir zu Capital Circle am häufigsten gestellt werden."
      unsubscribeUrl={unsubscribeUrl}
    >
      <EmailHeading>Die 3 Fragen, die mir am häufigsten gestellt werden</EmailHeading>

      <EmailText>Hey {firstName},</EmailText>
      <EmailText>die 3 Fragen, die ich zu Capital Circle am häufigsten bekomme:</EmailText>

      <EmailSubheading>1. Wie viel Zeit brauche ich?</EmailSubheading>
      <EmailText muted>
        Drei Live-Sessions Di–Do um 15:30 Uhr, NY AM Session. Dazu Montag
        kurze Wochenvorbereitung und Sonntag 15:00 Macro-Call + Recap. Klar
        planbar, kein Vollzeitjob nötig, ein Trade am Tag, Scalping-Ansatz.
      </EmailText>

      <EmailSubheading>2. Bringt mir das wirklich was?</EmailSubheading>
      <EmailText muted>
        Du bekommst die komplette Bias-Herleitung von mir live: Makro-/
        Fundamentaldaten zuerst, dann ICT/Smart-Money-Technik auf dem Chart:
        das CAP Model. Kein Signal-Abo, du lernst den Prozess. Du lernst
        nachhaltiges Trading.
      </EmailText>

      <EmailSubheading>3. Was, wenn&apos;s nichts für mich ist?</EmailSubheading>
      <EmailText muted>
        99&nbsp;€/Monat, jederzeit kündbar. Kein Risiko über einen Monat
        hinaus.
      </EmailText>

      <EmailButton href={WHOP_MIGRATION.joinUrl}>
        Jetzt für 99&nbsp;€/Monat starten
      </EmailButton>

      <EmailText muted>Emre</EmailText>
    </BaseEmail>
  );
}

export async function sendWhopMigrationMail3(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: WHOP_MIGRATION.subjects.mail3,
    jsx: <WhopMigrationMail3 firstName={props.firstName} email={props.email} />,
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: WHOP_MIGRATION.sequence,
      step: 2,
    },
  });
}
