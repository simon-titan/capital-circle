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

export type FrageFeld =
  | "trading_experience"
  | "trading_stage"
  | "main_problem"
  | "trading_goal"
  | "job_situation"
  | "time_per_week"
  | "discovery_source"
  | "kauf_grund"
  | "kauf_bedenken"
  | "fokus_3m";

export type Antwort = { wert: string; label: string };

export type Frage = {
  feld: FrageFeld;
  frage: string;
  hinweis?: string;
  /**
   * Mehrere Antworten wählbar (seit 14.11.2026 nur Frage 3). Gespeichert wird
   * die zuerst gewählte als Hauptantwort in der Spalte `feld`, alle zusammen in
   * `MEHRFACH_SPALTE[feld]` (Migration 115). Zwischen Client und API reisen die
   * Werte kommagetrennt (`MEHRFACH_TRENNER`).
   */
  mehrfach?: boolean;
  antworten: Antwort[];
};

/**
 * ICP-Fragen nach Emres „ICP-Fragen fürs Onboarding" (08.11.2026), Reihenfolge
 * = Nummer 1–10. Free: 1–7, Käufer (Ausbildung, Main, Premium): 1–10, Abo- und
 * Lifetime-Mitglieder: die fünf aus Migration 107 (`BASIS_FELDER`). Keine
 * Budgetfrage im Free-Onboarding. Die Quellenantwort (7) steht getrennt von der
 * gemessenen Herkunft (`attribution`).
 */
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
      { wert: "4j_plus", label: "Mehr als 4 Jahre" },
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
    hinweis: "Mehrere Antworten möglich.",
    mehrfach: true,
    antworten: [
      { wert: "prozess", label: "Kein klarer Tradingprozess" },
      { wert: "bias", label: "Unsicherheit bei Marktrichtung / Bias" },
      { wert: "execution", label: "Entries und Tradeausführung" },
      { wert: "disziplin", label: "Overtrading / fehlende Disziplin" },
      { wert: "risk", label: "Risikomanagement" },
      { wert: "psychologie", label: "Tradingpsychologie / Emotionen" },
      { wert: "konstanz", label: "Fehlende Konstanz" },
      { wert: "unklar", label: "Ich weiß nicht, woran ich konkret arbeiten muss" },
    ],
  },
  {
    feld: "trading_goal",
    frage: "Was möchtest du mit deinem Trading langfristig erreichen?",
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
    feld: "job_situation",
    frage: "Welche Aussage beschreibt deine aktuelle berufliche Situation am besten?",
    antworten: [
      { wert: "vollzeit", label: "Ich bin Vollzeit angestellt" },
      { wert: "teilzeit", label: "Ich bin Teilzeit angestellt" },
      { wert: "selbststaendig", label: "Ich bin selbstständig / Unternehmer" },
      { wert: "ausbildung", label: "Ich bin Schüler, Auszubildender oder Student" },
      { wert: "trader", label: "Ich beschäftige mich hauptberuflich mit Trading" },
      { wert: "sonstiges", label: "Sonstiges / aktuell keine dieser Situationen" },
    ],
  },
  {
    feld: "time_per_week",
    frage: "Wie viel Zeit kannst du pro Woche realistisch für Trading und Weiterbildung aufbringen?",
    antworten: [
      { wert: "unter_3h", label: "Weniger als 3 Stunden" },
      { wert: "3_5h", label: "3–5 Stunden" },
      { wert: "6_10h", label: "6–10 Stunden" },
      { wert: "11_20h", label: "11–20 Stunden" },
      { wert: "ueber_20h", label: "Mehr als 20 Stunden" },
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
  {
    feld: "kauf_grund",
    frage: "Was war für dich der wichtigste Grund, dich für Capital Circle zu entscheiden?",
    antworten: [
      { wert: "prozess", label: "Einen klaren Handelsprozess entwickeln" },
      { wert: "ansatz", label: "Meinen bestehenden Handelsansatz verbessern" },
      { wert: "betreuung", label: "Persönliche Betreuung und individuelles Feedback" },
      { wert: "live", label: "Regelmäßiges Live-Trading und praktische Marktanalysen" },
      { wert: "ausbildung", label: "Die strukturierte Trading-Ausbildung" },
      { wert: "vertrauen", label: "Vertrauen in Emre und seine Arbeitsweise" },
    ],
  },
  {
    feld: "kauf_bedenken",
    frage: "Was hat dich vor deiner Kaufentscheidung am meisten beschäftigt?",
    antworten: [
      { wert: "investition", label: "Die Höhe der Investition" },
      { wert: "kenntnisstand", label: "Ob die Ausbildung zu meinem Kenntnisstand passt" },
      { wert: "zeit", label: "Ob ich genügend Zeit dafür habe" },
      { wert: "ziele", label: "Ob ich meine Tradingziele damit erreichen kann" },
      { wert: "richtige_wahl", label: "Ob Capital Circle die richtige Wahl für mich ist" },
      { wert: "nichts", label: "Nichts – ich war von meiner Entscheidung überzeugt" },
    ],
  },
  {
    feld: "fokus_3m",
    frage: "Was möchtest du innerhalb der nächsten drei Monate als Erstes verbessern?",
    antworten: [
      { wert: "prozess", label: "Meinen Handelsprozess entwickeln" },
      { wert: "analyse", label: "Meine Marktanalysen verbessern" },
      { wert: "entries", label: "Meine Entries und Tradeausführung verbessern" },
      { wert: "risiko", label: "Mein Risikomanagement verbessern" },
      { wert: "psychologie", label: "Meine Disziplin und Tradingpsychologie verbessern" },
      { wert: "auswertung", label: "Mein Trading systematisch auswerten" },
      { wert: "optimieren", label: "Meinen bestehenden Handelsansatz optimieren" },
    ],
  },
];

/** Welche Fragen ein Konto beantwortet (`icpArt` in lib/onboarding/weiche.ts). */
export type IcpArt = "free" | "kaeufer" | "mitglied";

/** Die fünf aus Migration 107 — Abo- und Lifetime-Mitglieder bleiben dabei. */
export const BASIS_FELDER: FrageFeld[] = ["trading_experience", "trading_stage", "main_problem", "trading_goal", "discovery_source"];
/** Free-Onboarding: Fragen 1–7. */
export const FREE_FELDER: FrageFeld[] = FRAGEN.slice(0, 7).map((f) => f.feld);
/** Käufer: Fragen 1–10. */
export const KAEUFER_FELDER: FrageFeld[] = FRAGEN.map((f) => f.feld);

export function felderFuer(art: IcpArt): FrageFeld[] {
  return art === "kaeufer" ? KAEUFER_FELDER : art === "free" ? FREE_FELDER : BASIS_FELDER;
}

/** Nummer nach Emres Liste (1–10), für Messpunkte und Anzeige. */
export function frageNummer(feld: FrageFeld): number {
  return FRAGEN.findIndex((f) => f.feld === feld) + 1;
}

export function frageZu(feld: FrageFeld): Frage {
  return FRAGEN.find((f) => f.feld === feld)!;
}

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

/** Spalte mit allen Antworten einer Mehrfachfrage (Migration 115). */
export const MEHRFACH_SPALTE: Partial<Record<FrageFeld, string>> = { main_problem: "main_problem_alle" };
export const MEHRFACH_TRENNER = ",";

/**
 * Alle Antworten eines Felds aus einer Zeile von `onboarding_antworten` —
 * bei Mehrfachfragen aus der Listen-Spalte, sonst (oder ohne Migration 115)
 * die eine Antwort. Erste = Hauptantwort.
 */
export function antwortWerte(feld: FrageFeld, zeile: Record<string, unknown> | null | undefined): string[] {
  if (!zeile) return [];
  const spalte = MEHRFACH_SPALTE[feld];
  const liste = spalte ? zeile[spalte] : null;
  if (Array.isArray(liste) && liste.length) return liste.filter((w): w is string => typeof w === "string" && Boolean(w));
  const w = zeile[feld];
  return typeof w === "string" && w ? [w] : [];
}

/** Beschriftung aller Antworten eines Felds, kommagetrennt; „—" ohne Antwort. */
export function antwortText(feld: FrageFeld, zeile: Record<string, unknown> | null | undefined): string {
  const werte = antwortWerte(feld, zeile);
  return werte.length ? werte.map((w) => antwortLabel(feld, w)).join(", ") : "—";
}

/** Messpunkte (wie der CHECK in 107). */
export const ONBOARDING_EREIGNISSE = [
  "onboarding_started",
  "onboarding_question_1_completed",
  "onboarding_question_2_completed",
  "onboarding_question_3_completed",
  "onboarding_question_4_completed",
  "onboarding_question_5_completed",
  "onboarding_question_6_completed",
  "onboarding_question_7_completed",
  "onboarding_question_8_completed",
  "onboarding_question_9_completed",
  "onboarding_question_10_completed",
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
