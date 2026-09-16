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
      hideFooter={false}
      unsubscribeUrl={unsubscribeUrl}
      bodyFontFamily={T.fontBody}
      headFontLinkHref={T.fontLinkHref}
    >
      <CampaignHeading>Die 3 Fragen, die uns zum Wechsel am häufigsten gestellt werden</CampaignHeading>

      <CampaignText>Hey {firstName},</CampaignText>
      <CampaignText>die 3 Fragen, die wir zum Plattform-Wechsel am häufigsten bekommen:</CampaignText>

      <CampaignQuestion number={1} question="Verliere ich beim Wechsel etwas?">
        Nein. Warst du früher schon bei uns registriert, sind dein Profil und
        dein Verlauf noch da. Bist du über Whop dazugekommen, legst du beim
        Wechsel einmalig ein Konto auf der eigenen Plattform an — der Zugang
        zu allen Inhalten ist ab dann sofort da.
      </CampaignQuestion>

      <CampaignQuestion number={2} question="Was mache ich mit meinem Whop-Abo?">
        Kündige es einmal selbst in deinem Whop-Account (Mitgliedschaften →
        Kündigen), sobald dein Zugang auf der eigenen Plattform aktiv ist —
        sonst läuft dein Abo dort parallel weiter und du zahlst doppelt.
        Dein Zugang bei uns ist davon unabhängig und bleibt bestehen.
      </CampaignQuestion>

      <CampaignQuestion number={3} question="Kostet der Wechsel extra?">
        Nein. Einheitlich 99&nbsp;€/Monat, jederzeit kündbar, keine
        Wechselgebühr, keine versteckten Kosten.
      </CampaignQuestion>

      <CampaignButton href={PLATFORM_MIGRATION.joinUrl}>
        Jetzt wechseln — 99&nbsp;€/Monat
      </CampaignButton>

      <CampaignText muted>Emre</CampaignText>
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
