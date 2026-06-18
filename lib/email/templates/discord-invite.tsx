import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailHeading,
  EmailText,
  EmailHighlight,
  EmailButton,
} from "../layout/components";
import { sendEmail, type SendResult } from "../send";

interface DiscordInviteEmailProps {
  firstName: string;
  inviteUrl: string;
}

interface SendDiscordInviteProps {
  email: string;
  firstName: string;
  inviteUrl: string;
}

export default function DiscordInviteEmail({
  firstName,
  inviteUrl,
}: DiscordInviteEmailProps) {
  return (
    <BaseEmail previewText={`Dein Discord-Zugang zu Capital Circle, ${firstName}`}>
      <EmailHeading>Willkommen, {firstName}!</EmailHeading>
      <EmailText>
        schön, dass du dabei bist. Du bist eingeladen, dem kostenlosen Capital-Circle-Discord
        beizutreten — unserer Community rund ums Trading.
      </EmailText>
      <EmailHighlight>
        Klick auf den Button, um direkt beizutreten. Der Link gehört nur dir.
      </EmailHighlight>
      <EmailButton href={inviteUrl}>Discord beitreten</EmailButton>
      <EmailText>
        Im nächsten Schritt: Schau dir das kurze Video an und buche dein
        kostenloses Gespräch mit uns — dort klären wir, wie wir dich am besten
        weiterbringen.
      </EmailText>
      <EmailText muted>
        Bei Fragen antworte einfach auf diese Mail — wir lesen mit.
      </EmailText>
      <EmailText muted>— Das Capital-Circle-Team</EmailText>
    </BaseEmail>
  );
}

export async function sendDiscordInvite(
  props: SendDiscordInviteProps,
): Promise<SendResult> {
  return sendEmail({
    to: props.email,
    subject: "Dein Discord-Zugang zu Capital Circle",
    jsx: (
      <DiscordInviteEmail
        firstName={props.firstName}
        inviteUrl={props.inviteUrl}
      />
    ),
  });
}
