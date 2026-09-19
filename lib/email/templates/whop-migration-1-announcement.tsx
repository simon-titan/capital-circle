import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  CampaignBadge,
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

export default function WhopMigrationMail1({
  firstName = "Simon",
  email = "vorname@example.com",
}: Pick<Props, "firstName" | "email">) {
  const unsubscribeUrl = `${getAppUrl()}/api/unsubscribe/contact?token=${generateContactUnsubscribeToken(email)}`;

  return (
    <BaseEmail
      previewText="Ab heute ist der Grund vom Tisch, warum du bisher nicht dabei warst."
      hideFooter={false}
      unsubscribeUrl={unsubscribeUrl}
      bodyFontFamily={T.fontBody}
    >
      <CampaignBadge>Capital Circle Monatlich ist live</CampaignBadge>
      <CampaignHeading>Der Grund, warum du nicht dabei bist</CampaignHeading>

      <CampaignText>Hey {firstName},</CampaignText>
      <CampaignText>
        wenn du bei Capital Circle bisher nicht eingestiegen bist, war der
        Grund in den meisten Fällen der gleiche: der Preis.
      </CampaignText>
      <CampaignText>
        <strong>Ab heute ist das vom Tisch.</strong>
      </CampaignText>

      <CampaignHighlight>
        Capital Circle gibt&apos;s jetzt monatlich für 99&nbsp;€, statt
        899&nbsp;€ auf einmal. Jederzeit kündbar, kein Invest im Voraus.
      </CampaignHighlight>

      <CampaignText>
        <strong>Was du bekommst:</strong>
        <br />
        Live Trading Sessions Di–Do, 15:30 Uhr (NY AM Session)
        <br />
        Montags Q&amp;A
        <br />
        Sonntags Community Call: Fundamentals &amp; Macro Outlook für die
        Woche
        <br />
        Tägliche Bias-Posts im Discord
        <br />
        Zugang zur exklusiven Discord-Community
      </CampaignText>

      <CampaignText>
        Kein größeres Risiko als ein Monatsabo. Du testest einen Monat,
        entscheidest danach neu. Jederzeit kündbar. Keine versteckten
        Fristen.
      </CampaignText>

      <CampaignText>
        Der Markt läuft so oder so weiter, jeden Tag, mit oder ohne dich. Die
        einzige Frage ist, ob du irgendwann anfängst, das systematisch zu
        nutzen, oder in einem Jahr an der gleichen Stelle stehst wie heute.
      </CampaignText>

      <CampaignButton href={WHOP_MIGRATION.joinUrl}>
        Jetzt für 99&nbsp;€/Monat starten
      </CampaignButton>

      <CampaignText muted>Emre</CampaignText>
    </BaseEmail>
  );
}

export async function sendWhopMigrationMail1(props: Props): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: WHOP_MIGRATION.subjects.mail1,
    jsx: <WhopMigrationMail1 firstName={props.firstName} email={props.email} />,
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: WHOP_MIGRATION.sequence,
      step: 0,
    },
  });
}
