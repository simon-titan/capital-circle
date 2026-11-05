import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import { EmailButton, EmailDivider, EmailHeading, EmailSmall, EmailText } from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { MAIL_SEQUENZ } from "@/config/training";

/**
 * Mails des Free-Training-Funnels (`config/training.ts`).
 *
 * - `TrainingBestaetigen` ist transaktional (Link zur Bestätigung der Adresse),
 *   also ohne Abmeldelink und ohne Log-Eintrag — sie darf bei einer erneuten
 *   Registrierung noch einmal rausgehen.
 * - Die vier Erinnerungen sind Werbung (§ 7 Abs. 3 UWG): Abmeldelink über
 *   `unsubscribeUrl`, Versand genau einmal je Stufe über `email_sequence_log`
 *   (sequence `training`). Gesendet vom Cron `app/api/cron/training-sequence`.
 */

/* ─── Bestätigung ───────────────────────────────────────────────────────── */

function TrainingBestaetigenEmail({ vorname, link }: { vorname: string; link: string }) {
  return (
    <BaseEmail previewText="Ein Klick, und dein kostenloses Training startet">
      <EmailHeading>Bestätige deine E-Mail-Adresse</EmailHeading>
      <EmailText>Hi {vorname},</EmailText>
      <EmailText>
        schön, dass du dabei bist. Ein Klick auf den Knopf bestätigt deine Adresse, danach bist du direkt eingeloggt
        und kannst mit Video 1 starten.
      </EmailText>
      <EmailButton href={link}>E-Mail bestätigen und starten</EmailButton>
      <EmailText muted>Der Link funktioniert genau einmal und nur für begrenzte Zeit.</EmailText>
      <EmailDivider />
      <EmailSmall>Der Knopf funktioniert nicht? Kopiere diese Adresse in deinen Browser:</EmailSmall>
      <EmailSmall>{link}</EmailSmall>
      <EmailSmall>Du hast dich nicht registriert? Dann ignoriere diese Mail einfach, es passiert nichts.</EmailSmall>
    </BaseEmail>
  );
}

export async function sendTrainingBestaetigen({
  an,
  vorname,
  link,
}: {
  an: string;
  vorname: string;
  link: string;
}): Promise<SendResult> {
  return sendEmail({
    to: an,
    subject: "Bestätige deine E-Mail für dein kostenloses Training",
    jsx: <TrainingBestaetigenEmail vorname={vorname} link={link} />,
  });
}

/* ─── Erinnerungen ──────────────────────────────────────────────────────── */

export type TrainingMailArt = "start" | "weiter" | "naechsterSchritt" | "letzte";

type ErinnerungProps = {
  vorname: string;
  /** Nächstes offenes Video (1–3); bei `naechsterSchritt` ohne Bedeutung. */
  naechstesVideo: number;
  trainingUrl: string;
  programmeUrl: string;
  unsubscribeUrl: string;
};

const BETREFF: Record<TrainingMailArt, (p: ErinnerungProps) => string> = {
  start: () => "Dein kostenloses Training wartet auf dich",
  weiter: (p) => `Weiter geht's mit Video ${p.naechstesVideo}`,
  naechsterSchritt: () => "Du hast alle 4 Videos gesehen. Und jetzt?",
  letzte: (p) => `Noch ${4 - p.naechstesVideo === 1 ? "ein Video" : `${4 - p.naechstesVideo} Videos`} bis zu deinem System`,
};

function TrainingErinnerungEmail({ art, ...p }: ErinnerungProps & { art: TrainingMailArt }) {
  if (art === "naechsterSchritt") {
    return (
      <BaseEmail previewText="Dein nächster Schritt nach dem Training" unsubscribeUrl={p.unsubscribeUrl}>
        <EmailHeading>Stark, {p.vorname}. Du hast das komplette Training gesehen.</EmailHeading>
        <EmailText>
          Du kennst jetzt das System. Die Frage ist, wie du es für dich umsetzt. Dafür gibt es zwei Wege:
        </EmailText>
        <EmailText>
          <strong>Persönlich begleitet:</strong> Im kostenlosen Analysegespräch schauen wir uns deine Ziele und deine
          aktuelle Situation an und sagen dir ehrlich, welches Programm passt.
        </EmailText>
        <EmailText>
          <strong>Selbstständig:</strong> Mit der Ausbildung arbeitest du alles in deinem Tempo durch, inklusive
          Journal, Live-Trainings und Community.
        </EmailText>
        <EmailButton href={p.programmeUrl}>Meinen nächsten Schritt wählen</EmailButton>
      </BaseEmail>
    );
  }

  const text: Record<Exclude<TrainingMailArt, "naechsterSchritt">, { kopf: string; absatz: string; knopf: string }> = {
    start: {
      kopf: `Hi ${p.vorname}, dein Training ist bereit.`,
      absatz:
        "Du hast dich für das kostenlose Training registriert, Video 1 wartet auf dich. Darin zeigen wir dir die komplette Case Study, Schritt für Schritt.",
      knopf: "Video 1 ansehen",
    },
    weiter: {
      kopf: `Hi ${p.vorname}, mach weiter mit Video ${p.naechstesVideo}.`,
      absatz:
        "Die Videos bauen aufeinander auf. Erst mit allen dreien siehst du das komplette System. Nimm dir heute die nächsten Minuten dafür.",
      knopf: `Video ${p.naechstesVideo} ansehen`,
    },
    letzte: {
      kopf: `${p.vorname}, du bist schon so weit gekommen.`,
      absatz:
        "Dein Training ist noch offen. Die restlichen Videos warten im Mitgliederbereich auf dich, genau dort, wo du aufgehört hast.",
      knopf: "Training fortsetzen",
    },
  };
  const t = text[art];
  return (
    <BaseEmail previewText={t.kopf} unsubscribeUrl={p.unsubscribeUrl}>
      <EmailHeading>{t.kopf}</EmailHeading>
      <EmailText>{t.absatz}</EmailText>
      <EmailButton href={p.trainingUrl}>{t.knopf}</EmailButton>
    </BaseEmail>
  );
}

export async function sendTrainingErinnerung(opts: {
  an: string;
  userId: string;
  art: TrainingMailArt;
  schritt: number;
  props: ErinnerungProps;
}): Promise<SendResult> {
  return sendEmail({
    to: opts.an,
    subject: BETREFF[opts.art](opts.props),
    jsx: <TrainingErinnerungEmail art={opts.art} {...opts.props} />,
    log: { userId: opts.userId, recipientEmail: opts.an, sequence: MAIL_SEQUENZ, step: opts.schritt },
  });
}
