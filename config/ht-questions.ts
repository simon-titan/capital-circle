/**
 * High-Ticket-Bewerbung — Konfigurierbare Fragen.
 *
 * Diese Datei ist die Single-Source-of-Truth für die 8 Fragen, die auf
 * `/apply` als Multi-Step-Form gestellt werden. Texte können hier ohne
 * Code-Änderung angepasst werden — Form, API und Admin-Panel lesen alle
 * dieselbe Definition.
 *
 * Wichtig: `id` darf NICHT geändert werden, sobald Bewerbungen existieren —
 * sonst werden alte `answers`-JSONB-Felder nicht mehr korrekt zugeordnet.
 */
export interface HTQuestion {
  id: string;
  question: string;
  placeholder: string;
  type: "textarea" | "text" | "select";
  /** Nur für `type='select'` — interner Wert je Option. */
  options?: string[];
  required: boolean;
  /** Mindestlänge in Zeichen (nach trim) — nur für textarea/text. */
  minLength?: number;
  /** Optionaler Helper-Text unter dem Eingabefeld. */
  helper?: string;
}

export const HT_QUESTIONS: HTQuestion[] = [
  {
    id: "current_situation",
    question:
      "Beschreibe deine aktuelle Trading-Situation. Wie lange tradest du bereits?",
    placeholder: "z. B. Ich trade seit 2 Jahren hauptsächlich Forex…",
    type: "textarea",
    required: true,
    minLength: 50,
  },
  {
    id: "biggest_challenge",
    question:
      "Was ist dein größtes Problem oder deine größte Herausforderung im Trading?",
    placeholder: "z. B. Ich verliere Disziplin bei großen Bewegungen…",
    type: "textarea",
    required: true,
    minLength: 50,
  },
  {
    id: "goals",
    question:
      "Was möchtest du in den nächsten 6–12 Monaten im Trading erreichen?",
    placeholder: "z. B. Konsistent 5–10 % monatlich erzielen…",
    type: "textarea",
    required: true,
    minLength: 50,
  },
  {
    id: "previous_mentoring",
    question:
      "Hast du bereits an Trading-Coachings oder Mentoring-Programmen teilgenommen?",
    placeholder: "Falls ja, beschreibe kurz die Erfahrung…",
    type: "textarea",
    required: false,
  },
  {
    id: "motivation",
    question:
      "Warum möchtest du jetzt mit uns zusammenarbeiten? Was hat dich auf uns aufmerksam gemacht?",
    placeholder: "z. B. Ich habe Emres Videos auf YouTube gesehen…",
    type: "textarea",
    required: true,
    minLength: 30,
  },
  {
    id: "time_commitment",
    question:
      "Wie viele Stunden pro Woche kannst du realistisch in dein Trading und das Mentoring investieren?",
    placeholder: "z. B. 15–20 Stunden pro Woche",
    type: "text",
    required: true,
  },
  {
    id: "whatsapp_number",
    question:
      "Deine WhatsApp-Nummer (für die Kontaktaufnahme innerhalb 2 h nach Bewerbung)",
    placeholder: "+49 170 1234567",
    type: "text",
    required: true,
    helper:
      "Internationales Format mit Ländervorwahl. Wir melden uns ausschließlich darüber.",
  },
  {
    id: "budget",
    question:
      "Wie viel kannst du aktuell in deine Trading-Ausbildung investieren?",
    placeholder: "",
    type: "select",
    options: ["under_2000", "over_2000"],
    required: true,
  },
];

/** Display-Labels für die Budget-Optionen (Form + Admin-Panel). */
export const BUDGET_LABELS: Record<string, string> = {
  under_2000: "Bis 2.000 € (Mitgliedschaft)",
  over_2000: "Über 2.000 € (1:1 Mentoring)",
};

export type BudgetTier = "under_2000" | "over_2000";

export function isBudgetTier(value: unknown): value is BudgetTier {
  return value === "under_2000" || value === "over_2000";
}
