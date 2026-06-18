/**
 * Discord Funnel — 6 Single-Select-Fragen (öffentlicher Cold-Traffic-Funnel).
 *
 * Single-Source-of-Truth: Form (Seite 2 /discord/termin), API-Route und
 * Admin-Panel lesen dieselbe Definition.
 * `id` darf NICHT geändert werden, sobald Leads existieren — die ids sind der
 * Schlüssel-Kontrakt des `answers`-JSONB in `discord_leads`.
 */
export interface DiscordFunnelQuestion {
  /** Stabile id — niemals ändern. Schlüssel im answers-JSONB. */
  id: string;
  question: string;
  /** Menschenlesbare deutsche Labels (single-select). */
  options: string[];
  /** "Closer sieht:"-Notiz für das Admin-/Closer-Panel. */
  closerNote: string;
}

export const DISCORD_FUNNEL_QUESTIONS: DiscordFunnelQuestion[] = [
  {
    id: "trading_duration",
    question: "Wie lange tradest du bereits?",
    options: ["Unter 6 Monate", "6 Monate – 1 Jahr", "1 – 2 Jahre", "Über 2 Jahre"],
    closerNote: "Erfahrungslevel → welches Produkt passt",
  },
  {
    id: "biggest_blocker",
    question: "Was hat dich bisher davon abgehalten profitabel zu traden?",
    options: [
      "Ich breche ständig meine eigenen Regeln",
      "Ich springe von Strategie zu Strategie",
      "Ich weiß was ich tun soll — kann es aber nicht umsetzen",
      "Mein Backtest funktioniert — im Live Trading verliere ich",
      "Emotionen zerstören meine Trades",
      "Ich habe kein klares Framework",
    ],
    closerNote: "Hauptschmerz → Gesprächseinstieg",
  },
  {
    id: "tried_before",
    question: "Was hast du bisher versucht um profitabel zu werden?",
    options: [
      "ICT / Smart Money Concepts",
      "Supply & Demand",
      "Technische Analyse / Indikatoren",
      "Andere kostenpflichtige Kurse oder Discords",
      "YouTube / kostenlosen Content",
      "Alles davon — nichts hat funktioniert",
      "Bin komplett neu im Trading",
    ],
    closerNote: "Welche Einwände kommen könnten",
  },
  {
    id: "goal_90d",
    question: "Was ist dein konkretes Ziel in den nächsten 90 Tagen?",
    options: [
      "Ersten Prop Payout erzielen",
      "Konstant profitabel werden",
      "Trading als Haupteinkommensquelle",
      "Aus meinem Job aussteigen durch Trading",
    ],
    closerNote: "Pitch-Anker → spricht direkt das Ziel an",
  },
  {
    id: "budget",
    question: "Wie viel bist du bereit heute in deine Trading-Ausbildung zu investieren?",
    options: ["Unter 500€", "500€ – 1.000€", "1.000€ – 3.000€", "Über 3.000€"],
    closerNote: "Welches Produkt er pitcht",
  },
  {
    id: "channel",
    question: "Wie bist du auf Capital Circle aufmerksam geworden?",
    options: ["Instagram", "TikTok", "YouTube", "Empfehlung", "Anderes"],
    closerNote: "Gesprächskontext — welcher Kanal die besten Leads bringt",
  },
];

/** Geordnete Liste der Fragen-ids — backend/admin kann darüber iterieren. */
export const DISCORD_QUESTION_IDS: string[] = DISCORD_FUNNEL_QUESTIONS.map((q) => q.id);
