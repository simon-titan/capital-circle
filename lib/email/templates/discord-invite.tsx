import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailHeading, EmailText } from "../layout/components";
import { EMAIL_TOKENS as T } from "../layout/styles";
import { sendEmail, type SendResult } from "../send";

/* ── Funnel-Akzente (identisch zur /discord-Landingpage) ─────────────────── */
const ACCENT = "#47F7DC"; // Aqua
const ACCENT_DEEP = "#1FB9A6"; // Aqua dunkel
const DISCORD_PURPLE = "#5865F2"; // Discord-Lila
// Trennlinie unter dem Logo: Lila → Aqua, wie der Akzent über dem Formular.
const ACCENT_LINE = `linear-gradient(90deg, transparent 4%, ${DISCORD_PURPLE} 28%, ${ACCENT} 72%, transparent 96%)`;

interface DiscordInviteEmailProps {
  firstName: string;
  inviteUrl: string;
}

interface SendDiscordInviteProps {
  email: string;
  firstName: string;
  inviteUrl: string;
}

/* ── Discord-Lila Eyebrow-Label (wie das Formular-Label „KOSTENLOSER DISCORD ZUGANG“) ── */
function DiscordEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: "0 0 10px",
        fontFamily: T.fontBody,
        fontSize: "12px",
        fontWeight: 700,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: DISCORD_PURPLE,
      }}
    >
      {children}
    </p>
  );
}

/* ── Aqua-Highlight-Box (Aqua-Border statt Gold) ─────────────────────────── */
function DiscordHighlight({ children }: { children: React.ReactNode }) {
  return (
    <table
      role="presentation"
      width="100%"
      cellSpacing={0}
      cellPadding={0}
      style={{
        backgroundColor: "rgba(71,247,220,0.05)",
        border: "1px solid rgba(71,247,220,0.35)",
        borderRadius: "10px",
        margin: "20px 0",
      }}
    >
      <tbody>
        <tr>
          <td
            style={{
              padding: "16px 18px",
              fontFamily: T.fontBody,
              fontSize: "14px",
              lineHeight: 1.6,
              color: T.text,
            }}
          >
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/* ── Aqua-CTA-Button (Aqua-Verlauf, schwarze Schrift — wie „DISCORD JETZT JOINEN“) ── */
function DiscordButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <table
      role="presentation"
      cellSpacing={0}
      cellPadding={0}
      style={{ margin: "28px auto" }}
    >
      <tbody>
        <tr>
          <td
            align="center"
            style={{
              borderRadius: "12px",
              background: "linear-gradient(135deg, #16cc9b 0%, #5FE6C6 100%)",
              boxShadow: "0 4px 18px rgba(22,204,155,0.40)",
            }}
          >
            <a
              href={href}
              style={{
                display: "inline-block",
                padding: "15px 36px",
                fontFamily: T.fontBody,
                fontSize: "15px",
                fontWeight: 700,
                color: "#000000",
                textDecoration: "none",
                letterSpacing: "0.02em",
              }}
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/* ── Trust-Zeile (wie „100% kostenlos · Kein Risiko · Sofortiger Zugang“) ── */
function DiscordTrust() {
  return (
    <p
      style={{
        margin: 0,
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

export default function DiscordInviteEmail({
  firstName,
  inviteUrl,
}: DiscordInviteEmailProps) {
  return (
    <BaseEmail
      previewText={`Dein Discord-Zugang zu Capital Circle, ${firstName}`}
      accentGradient={ACCENT_LINE}
    >
      <DiscordEyebrow>Kostenloser Discord-Zugang</DiscordEyebrow>
      <EmailHeading>Willkommen, {firstName}!</EmailHeading>
      <EmailText>
        schön, dass du dabei bist. Dein Platz in der
        Capital-Circle-Discord-Community ist reserviert — der Ort, an dem du
        lernst, wie du innerhalb weniger Wochen deinen ersten{" "}
        <span style={{ color: ACCENT_DEEP, fontWeight: 600 }}>Payout</span>{" "}
        erzielst.
      </EmailText>

      <DiscordHighlight>
        Klick auf den Button, um direkt beizutreten. Der Link gehört nur dir —
        bitte nicht weitergeben.
      </DiscordHighlight>

      <DiscordButton href={inviteUrl}>Discord jetzt joinen</DiscordButton>

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
