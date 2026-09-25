/**
 * Kunden-Onboarding: die fünf ICP-Fragen, ihre festen Antwort-Schlüssel und
 * die Messpunkte. Eine Quelle für Fragebogen (`components/onboarding`),
 * API (`app/api/onboarding`) und Admin-Auswertung (`/admin/icp`).
 *
 * Die Schlüssel stehen zusätzlich als CHECK in Migration 107 — wer hier einen
 * ergänzt, ergänzt ihn dort mit (neue Migration), sonst lehnt die Datenbank
 * die Antwort ab. Beschriftungen dürfen sich frei ändern; ausgewertet wird
 * über die Schlüssel.
 */

/**
 * Ab diesem Tag angelegte Konten gelten als Neukäufer: Sie bekommen den
 * vollen Ablauf (Willkommen → Fragen → Startklar) und die Start-Checkliste im
 * Dashboard. Ältere zahlende Konten beantworten nur die Fragen.
 */
export const ONBOARDING_START = "2026-09-26T00:00:00+02:00";

export type FrageFeld = "trading_experience" | "trading_stage" | "main_problem" | "trading_goal" | "discovery_source";

export type Antwort = { wert: string; label: string };

export type Frage = {
  feld: FrageFeld;
  frage: string;
  hinweis?: string;
  antworten: Antwort[];
};

export const FRAGEN: Frage[] = [
  {
    feld: "trading_experience",
    frage: "Wie lange beschäftigst du dich bereits aktiv mit Trading?",
    antworten: [
      { wert: "anfang", label: "Ich fange gerade erst an" },
      { wert: "unter_6m", label: "Unter 6 Monate" },
      { wert: "6_12m", label: "6–12 Monate" },
      { wert: "1_2j", label: "1–2 Jahre" },
      { wert: "2_4j", label: "2–4 Jahre" },
      { wert: "4j_plus", label: "4+ Jahre" },
    ],
  },
  {
    feld: "trading_stage",
    frage: "Wo stehst du aktuell am ehesten?",
    antworten: [
      { wert: "anfang", label: "Ich bin noch ganz am Anfang" },
      { wert: "kein_prozess", label: "Ich kenne bereits viel, habe aber keinen klaren Prozess" },
      { wert: "break_even", label: "Ich bin ungefähr Break-even" },
      { wert: "phasen", label: "Ich habe profitable Phasen, aber keine Konstanz" },
      { wert: "profitabel", label: "Ich bin bereits profitabel und möchte mein Trading professionalisieren" },
    ],
  },
  {
    feld: "main_problem",
    frage: "Was hält dich aktuell am meisten zurück?",
    hinweis: "Nur eine Hauptantwort.",
    antworten: [
      { wert: "prozess", label: "Kein klarer Tradingprozess" },
      { wert: "bias", label: "Unsicherheit bei Richtung / Bias" },
      { wert: "execution", label: "Entries und Execution" },
      { wert: "disziplin", label: "Overtrading / fehlende Disziplin" },
      { wert: "risk", label: "Risk Management" },
      { wert: "psychologie", label: "Psychologie / Emotionen" },
      { wert: "konstanz", label: "Fehlende Konstanz" },
      { wert: "unklar", label: "Ich weiß nicht, woran ich konkret arbeiten muss" },
    ],
  },
  {
    feld: "trading_goal",
    frage: "Was möchtest du mit deinem Trading erreichen?",
    antworten: [
      { wert: "prozess", label: "Einen klaren und wiederholbaren Prozess aufbauen" },
      { wert: "profitabel", label: "Konstant profitabel werden" },
      { wert: "funded", label: "Funded Accounts bestehen und halten" },
      { wert: "nebeneinkommen", label: "Trading als zusätzliche Einkommensquelle aufbauen" },
      { wert: "hauptberuf", label: "Trading langfristig hauptberuflich betreiben" },
      { wert: "professionalisieren", label: "Mein bestehendes Trading professionalisieren" },
    ],
  },
  {
    feld: "discovery_source",
    frage: "Wo bist du ursprünglich auf Emre / Capital Circle aufmerksam geworden?",
    antworten: [
      { wert: "instagram", label: "Instagram" },
      { wert: "tiktok", label: "TikTok" },
      { wert: "youtube", label: "YouTube" },
      { wert: "telegram", label: "Telegram" },
      { wert: "empfehlung", label: "Empfehlung" },
      { wert: "sonstiges", label: "Sonstiges" },
    ],
  },
];

export const FRAGEN_FELDER: FrageFeld[] = FRAGEN.map((f) => f.feld);

/** Maximale Länge des Freitexts bei „Sonstiges" (wie der CHECK in 107). */
export const SONSTIGES_MAX = 200;

export function istGueltigeAntwort(feld: FrageFeld, wert: string): boolean {
  return Boolean(FRAGEN.find((f) => f.feld === feld)?.antworten.some((a) => a.wert === wert));
}

export function antwortLabel(feld: FrageFeld, wert: string | null | undefined): string {
  if (!wert) return "—";
  return FRAGEN.find((f) => f.feld === feld)?.antworten.find((a) => a.wert === wert)?.label ?? wert;
}

/** Messpunkte (wie der CHECK in 107). */
export const ONBOARDING_EREIGNISSE = [
  "onboarding_started",
  "onboarding_question_1_completed",
  "onboarding_question_2_completed",
  "onboarding_question_3_completed",
  "onboarding_question_4_completed",
  "onboarding_question_5_completed",
  "onboarding_questions_completed",
  "onboarding_dashboard_shown",
  "onboarding_discord_connected",
  "onboarding_community_intro_completed",
  "onboarding_course_started",
  "onboarding_completed",
] as const;

export type OnboardingEreignis = (typeof ONBOARDING_EREIGNISSE)[number];

/** Link in den Vorstellungskanal; ohne Kanal-ID auf den Server allgemein. */
export function vorstellungsLink(): string | null {
  const guild = process.env.DISCORD_GUILD_ID?.trim();
  if (!guild) return null;
  const kanal = process.env.DISCORD_VORSTELLUNG_CHANNEL_ID?.trim();
  return kanal ? `https://discord.com/channels/${guild}/${kanal}` : `https://discord.com/channels/${guild}`;
}
