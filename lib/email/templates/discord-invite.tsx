import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailEyebrow, EmailHeading, EmailHighlight, EmailText } from "../layout/components";
import { EMAIL_TOKENS as T } from "../layout/styles";
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

/* ── Trust-Zeile (wie „100% kostenlos · Kein Risiko · Sofortiger Zugang“ auf /discord) ── */
function DiscordTrust() {
  return (
    <p
      style={{
        margin: "0 0 24px",
        textAlign: "center",
        fontFamily: T.fontBody,
        fontSize: "12px",
        letterSpacing: "0.03em",
        color: T.textMuted,
      }}
    >
      100% kostenlos · Kein Risiko · Sofortiger Zugang
    </p>
  );
}

/** Discord-Einladung im Look der /discord-Landingpage (v3.2: Champagner auf Graphit). */
export default function DiscordInviteEmail({
  firstName,
  inviteUrl,
}: DiscordInviteEmailProps) {
  return (
    <BaseEmail previewText={`Dein Discord-Zugang zu Capital Circle, ${firstName}`}>
      <EmailEyebrow>Kostenloser Discord-Zugang</EmailEyebrow>
      <EmailHeading>Willkommen, {firstName}!</EmailHeading>
      <EmailText>
        schön, dass du dabei bist. Dein Platz in der
        Capital-Circle-Discord-Community ist reserviert — der Ort, an dem du
        lernst, wie du innerhalb weniger Wochen deinen ersten{" "}
        <span style={{ color: T.goldLight, fontWeight: 600 }}>Payout</span>{" "}
        erzielst.
      </EmailText>

      <EmailHighlight>
        Klick auf den Button, um direkt beizutreten. Der Link gehört nur dir —
        bitte nicht weitergeben.
      </EmailHighlight>

      <EmailButton href={inviteUrl}>Discord jetzt joinen</EmailButton>

      <DiscordTrust />

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
