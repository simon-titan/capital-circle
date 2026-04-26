import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailHeading,
  EmailText,
  EmailHighlight,
  EmailButton,
} from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";

interface Step2InviteEmailProps {
  firstName: string;
  calendlyUrl: string | null;
}

interface SendStep2InviteProps {
  email: string;
  userId: string;
  firstName: string;
  calendlyUrl: string | null;
}

function buildCalendlyUrl(userId: string, email: string, firstName: string): string | null {
  const base = process.env.NEXT_PUBLIC_CALENDLY_URL?.trim();
  if (!base) return null;
  const url = new URL(base);
  if (firstName) url.searchParams.set("first_name", firstName);
  if (email) url.searchParams.set("email", email);
  url.searchParams.set("utm_source", "capital-circle");
  url.searchParams.set("utm_medium", "step2");
  url.searchParams.set("utm_content", userId);
  return url.toString();
}

export default function Step2InviteEmail({
  firstName,
  calendlyUrl,
}: Step2InviteEmailProps) {
  const appUrl = getAppUrl();
  const bookingUrl = calendlyUrl ?? `${appUrl}/bewerbung/danke`;

  return (
    <BaseEmail previewText={`Dein nächster Schritt bei Capital Circle, ${firstName}`}>
      <EmailHeading>Hallo {firstName},</EmailHeading>
      <EmailText>
        deine erweiterte Bewerbung bei Capital Circle ist eingegangen. Vielen
        Dank für dein Engagement und die ausführlichen Antworten.
      </EmailText>
      <EmailHighlight>
        Der nächste Schritt: Buche jetzt dein persönliches Gespräch mit uns.
        Das ist deine erste Chance — bitte halte den Termin unbedingt ein.
      </EmailHighlight>
      <EmailButton href={bookingUrl}>Termin jetzt buchen</EmailButton>
      <EmailText>
        Wir freuen uns darauf, dich kennenzulernen und gemeinsam zu besprechen,
        ob und wie wir zusammenarbeiten.
      </EmailText>
      <EmailText muted>
        Bei Fragen antworte einfach auf diese Mail — wir lesen mit.
      </EmailText>
      <EmailText muted>— Das Capital-Circle-Team</EmailText>
    </BaseEmail>
  );
}

export async function sendStep2Invite(props: SendStep2InviteProps): Promise<SendResult> {
  const calendlyUrl =
    props.calendlyUrl ?? buildCalendlyUrl(props.userId, props.email, props.firstName);

  return sendEmail({
    to: props.email,
    subject: "Dein nächster Schritt — Termin buchen bei Capital Circle",
    jsx: <Step2InviteEmail firstName={props.firstName} calendlyUrl={calendlyUrl} />,
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      sequence: "step2_invite",
      step: 0,
    },
  });
}
