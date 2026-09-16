import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  CampaignButton,
  CampaignHeading,
  CampaignQuestion,
  CampaignText,
} from "../campaigns/whop-migration/components";
import { CAMPAIGN_TOKENS as T } from "../campaigns/whop-migration/styles";
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
      hideFooter={false}
      unsubscribeUrl={unsubscribeUrl}
      bodyFontFamily={T.fontBody}
      headFontLinkHref={T.fontLinkHref}
    >
      <CampaignHeading>Die 3 Fragen, die mir am häufigsten gestellt werden</CampaignHeading>

      <CampaignText>Hey {firstName},</CampaignText>
      <CampaignText>die 3 Fragen, die ich zu Capital Circle am häufigsten bekomme:</CampaignText>

      <CampaignQuestion number={1} question="Wie viel Zeit brauche ich?">
        Drei Live-Sessions Di–Do um 15:30 Uhr, NY AM Session. Dazu Montag
        kurze Wochenvorbereitung und Sonntag 15:00 Macro-Call + Recap. Klar
        planbar, kein Vollzeitjob nötig, ein Trade am Tag, Scalping-Ansatz.
      </CampaignQuestion>

      <CampaignQuestion number={2} question="Bringt mir das wirklich was?">
        Du bekommst die komplette Bias-Herleitung von mir live: Makro-/
        Fundamentaldaten zuerst, dann ICT/Smart-Money-Technik auf dem Chart:
        das CAP Model. Kein Signal-Abo, du lernst den Prozess. Du lernst
        nachhaltiges Trading.
      </CampaignQuestion>

      <CampaignQuestion number={3} question="Was, wenn's nichts für mich ist?">
        99&nbsp;€/Monat, jederzeit kündbar. Kein Risiko über einen Monat
        hinaus.
      </CampaignQuestion>

      <CampaignButton href={WHOP_MIGRATION.joinUrl}>
        Jetzt für 99&nbsp;€/Monat starten
      </CampaignButton>

      <CampaignText muted>Emre</CampaignText>
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
