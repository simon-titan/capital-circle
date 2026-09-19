import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailHeading, EmailQuote, EmailText } from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";

interface SupportReplyEmailProps {
  firstName: string;
  subject: string;
  excerpt: string;
  ticketUrl: string;
}

interface SendSupportReplyProps {
  email: string;
  firstName: string;
  subject: string;
  ticketId: string;
  excerpt: string;
}

export default function SupportReplyEmail({ firstName, subject, excerpt, ticketUrl }: SupportReplyEmailProps) {
  return (
    <BaseEmail previewText={`Antwort auf dein Support-Ticket „${subject}“`}>
      <EmailHeading>Hallo {firstName},</EmailHeading>
      <EmailText>
        unser Team hat auf dein Support-Ticket geantwortet:
      </EmailText>
      <EmailText muted>
        <strong>Betreff:</strong> {subject}
      </EmailText>
      <EmailQuote>{excerpt}</EmailQuote>
      <EmailButton href={ticketUrl}>Ticket öffnen</EmailButton>
      <EmailText muted>
        Antworte direkt im Ticket, wenn du noch Rückfragen hast — wir melden uns so schnell wie möglich.
      </EmailText>
      <EmailText muted>— Das Capital-Circle-Team</EmailText>
    </BaseEmail>
  );
}

export async function sendSupportReply(props: SendSupportReplyProps): Promise<SendResult> {
  const ticketUrl = `${getAppUrl()}/support/${props.ticketId}`;
  return sendEmail({
    to: props.email,
    subject: `Antwort auf dein Support-Ticket: ${props.subject}`,
    jsx: (
      <SupportReplyEmail
        firstName={props.firstName}
        subject={props.subject}
        excerpt={props.excerpt}
        ticketUrl={ticketUrl}
      />
    ),
  });
}
