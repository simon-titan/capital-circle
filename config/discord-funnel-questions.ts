/**
 * Fragen der Mentoring-Bewerbung (Analysegespräch) — gelten für `/call`,
 * `/termin`, den Discord-Funnel und das Analysegespräch im Mitgliederbereich.
 *
 * Seit 07.11.2026 Emres vier Fragen (drei Auswahlen, eine Freitextfrage). Die
 * sechs Fragen davor stehen als `FRUEHERE_FRAGEN` weiter hier: Ältere Leads
 * tragen deren Antworten, Board und Auswertung zeigen sie weiter an.
 * Jeder bekommt nach den Fragen den Kalender — keine automatische
 * Qualifizierung über das Budget (Entscheidung Simon, 07.11.2026).
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
  /** Menschenlesbare deutsche Labels (single-select). Bei Freitext leer. */
  options: string[];
  /** `freitext`: Textfeld statt Auswahl (Mindestlänge `FREITEXT_MIN`). */
  typ?: "auswahl" | "freitext";
  /** Einleitender Absatz über der Frage. */
  intro?: string;
  placeholder?: string;
  /** "Closer sieht:"-Notiz für das Admin-/Closer-Panel. */
  closerNote: string;
}

/**
 * Mindestlänge jeder Freitext-Antwort (seit 14.11.2026: 100, Feedback Simon).
 * Gilt in `/call`, `/termin`, Discord-Funnel und Analysegespräch — Client und
 * Server (`antwortGueltig`) prüfen dieselbe Zahl; der Zähler unter dem Feld
 * (`RadioStep` in `DiscordQuestionsModal.tsx`) zeigt sie an.
 */
export const FREITEXT_MIN = 100;

export const DISCORD_FUNNEL_QUESTIONS: DiscordFunnelQuestion[] = [
  {
    id: "trading_stand",
    question: "Wie sieht dein Trading aktuell aus?",
    options: [
      "Ich stehe am Anfang und lerne die Grundlagen.",
      "Ich lerne und übe bereits, habe aber noch keinen festen Handelsablauf.",
      "Ich handle bereits nach einem eigenen Ansatz und möchte meine Umsetzung verbessern.",
      "Ich habe einen etablierten Ablauf und suche gezielte Weiterentwicklung.",
    ],
    closerNote: "Ausgangslage → Ausbildung, Main oder Premium",
  },
  {
    id: "schwierigkeit",
    question: "Was ist aktuell deine größte Schwierigkeit im Trading?",
    options: [],
    typ: "freitext",
    placeholder: "Beschreib in ein paar Sätzen, wo du gerade festhängst und was du schon versucht hast.",
    closerNote: "Hauptschmerz in eigenen Worten → Gesprächseinstieg",
  },
  {
    id: "ziel",
    question: "Was möchtest du mit Trading langfristig erreichen?",
    options: [
      "Trading zunächst strukturiert und richtig lernen",
      "Ein zusätzliches Einkommen / zweites Standbein aufbauen",
      "Langfristig hauptberuflich traden",
      "Mein bereits bestehendes Trading auf das nächste Level bringen",
    ],
    closerNote: "Ziel → Pitch-Anker",
  },
  {
    id: "investition",
    intro:
      "Capital Circle ist kein Signalservice und keine Ausbildung, die du einfach nur konsumierst. Unser Ziel ist, dir dabei zu helfen, einen eigenständigen Tradingprozess aufzubauen, der zu deinem Alltag passt und mit dem du langfristig auf ein mögliches zweites Standbein oder sogar hauptberufliches Trading hinarbeiten kannst.",
    question: "Wie viel bist du bereit, in diese Entwicklung zu investieren?",
    options: ["Unter 1.500 €", "1.500 € bis unter 3.000 €", "3.000 € bis unter 5.000 €", "5.000 € oder mehr"],
    closerNote: "Budget → Ausbildung (799 €), Main (3.000 €) oder Premium (5.000 €)",
  },
];

/** Ist die Antwort auf diese Frage gültig? (Auswahl aus den Optionen bzw. Freitext mit Mindestlänge) */
export function antwortGueltig(q: DiscordFunnelQuestion, wert: string | null | undefined): boolean {
  const v = (wert ?? "").trim();
  if (q.typ === "freitext") return v.length >= FREITEXT_MIN && v.length <= 2000;
  return q.options.includes(v);
}

/**
 * Die Fragen bis 07.11.2026 — nur noch zum Anzeigen alter Antworten
 * (`answers` älterer Leads) und für die Auswertung. Nicht mehr abfragen.
 */
export const FRUEHERE_FRAGEN: DiscordFunnelQuestion[] = [
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
      "Ich weiß, was ich tun soll, kann es aber nicht umsetzen",
      "Mein Backtest funktioniert, im Live Trading verliere ich",
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
      "Alles davon, nichts hat funktioniert",
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
    closerNote: "Gesprächskontext: welcher Kanal die besten Leads bringt",
  },
];

/** Geordnete Liste der Fragen-ids — backend/admin kann darüber iterieren. */
export const DISCORD_QUESTION_IDS: string[] = DISCORD_FUNNEL_QUESTIONS.map((q) => q.id);

/** Alle Fragen, die in alten und neuen Antworten vorkommen können — für Anzeigen. */
export const ALLE_FRAGEN: DiscordFunnelQuestion[] = [...DISCORD_FUNNEL_QUESTIONS, ...FRUEHERE_FRAGEN];
