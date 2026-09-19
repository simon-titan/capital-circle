import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  CampaignButton,
  CampaignHeading,
  CampaignHighlight,
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

export default function WhopMigrationMail2({
  firstName = "Simon",
  email = "vorname@example.com",
}: Pick<Props, "firstName" | "email">) {
  const unsubscribeUrl = `${getAppUrl()}/api/unsubscribe/contact?token=${generateContactUnsubscribeToken(email)}`;

  return (
    <BaseEmail
      previewText="Kurz nochmal, falls das von vorhin bei dir nicht angekommen ist."
      hideFooter={false}
      unsubscribeUrl={unsubscribeUrl}
      bodyFontFamily={T.fontBody}
    >
      <CampaignHeading>Falls das hier bei dir untergegangen ist</CampaignHeading>

      <CampaignText>Hey {firstName},</CampaignText>
      <CampaignText>
        kurz nochmal, falls das von vorhin bei dir nicht angekommen ist:
      </CampaignText>

      <CampaignHighlight>
        Capital Circle gibt&apos;s jetzt monatlich für 99&nbsp;€, nicht mehr
        nur als 899&nbsp;€-Lifetime-Zahlung. Jederzeit kündbar, kein Invest
        im Voraus.
      </CampaignHighlight>

      <CampaignText>
        <strong>Was du bekommst:</strong>
        <br />
        Montag 14:30 Uhr: Wochenvorbereitung, alles Wichtige + Bias für die
        Woche
        <br />
        Di–Do 15:30 Uhr: Live Trading NASDAQ. Sieh mir in Echtzeit dabei zu,
        wie ich trade
        <br />
        Sonntag 15:00 Uhr: Fundamentals/Macro-Analyse + Backtesting, plus
        Wochen-Recap
        <br />
        Zugang zur gesamten exklusiven Discord-Community
      </CampaignText>

      <CampaignText>
        Kein größeres Risiko als ein Monatsabo. Du testest einen Monat,
        entscheidest danach neu. Jederzeit kündbar. Keine versteckten
        Fristen.
      </CampaignText>

      <CampaignText>Der Markt läuft so oder so weiter, mit oder ohne dich.</CampaignText>

      <CampaignButton href={WHOP_MIGRATION.joinUrl}>
        Jetzt für 99&nbsp;€/Monat starten
      </CampaignButton>

      <CampaignText muted>Emre</CampaignText>
    </BaseEmail>
  );
}

export async function sendWhopMigrationMail2(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: WHOP_MIGRATION.subjects.mail2,
    jsx: <WhopMigrationMail2 firstName={props.firstName} email={props.email} />,
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: WHOP_MIGRATION.sequence,
      step: 1,
    },
  });
}
