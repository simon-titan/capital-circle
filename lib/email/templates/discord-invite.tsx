import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailHeading, EmailSmall, EmailText } from "../layout/components";
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

/** Discord-Einladung. */
export default function DiscordInviteEmail({
  firstName,
  inviteUrl,
}: DiscordInviteEmailProps) {
  return (
    <BaseEmail previewText={`Dein Discord-Zugang zu Capital Circle, ${firstName}`}>
      <EmailHeading>Willkommen, {firstName}!</EmailHeading>
      <EmailText>
        schön, dass du dabei bist. Dein Platz in der
        Capital-Circle-Discord-Community ist reserviert — der Ort, an dem du
        lernst, wie du innerhalb weniger Wochen deinen ersten Payout erzielst.
      </EmailText>

      <EmailText>
        Klick auf den Button, um direkt beizutreten. Der Link gehört nur dir —
        bitte nicht weitergeben.
      </EmailText>

      <EmailButton href={inviteUrl}>Discord jetzt joinen</EmailButton>

      <EmailSmall>100% kostenlos · Kein Risiko · Sofortiger Zugang</EmailSmall>

      <EmailText>
        Im nächsten Schritt: Schau dir das kurze Video an und buche dein
        kostenloses Gespräch mit uns — dort klären wir, wie wir dich am besten
        zu deinem ersten Payout bringen.
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
    subject: "Dein kostenloser Discord-Zugang zu Capital Circle",
    jsx: (
      <DiscordInviteEmail
        firstName={props.firstName}
        inviteUrl={props.inviteUrl}
      />
    ),
  });
}
