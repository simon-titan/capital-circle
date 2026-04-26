/**
 * Step-2-Bewerbung — 11 Fragen für approved Free-Nutzer.
 *
 * Single-Source-of-Truth: Form, API und Admin-Panel lesen dieselbe Definition.
 * `id` darf NICHT geändert werden, sobald Bewerbungen existieren.
 */
export interface Step2Question {
  id: string;
  question: string;
  placeholder: string;
  type: "textarea" | "text" | "select";
  options?: string[];
  required: boolean;
  minLength?: number;
  helper?: string;
}

export const STEP2_QUESTIONS: Step2Question[] = [
  {
    id: "name_age",
    question: "Wie lautet dein Vorname und wie alt bist du?",
    placeholder: "z. B. Max, 28 Jahre",
    type: "text",
    required: true,
  },
  {
    id: "email",
    question: "Wie lautet deine E-Mail-Adresse?",
    placeholder: "du@example.com",
    type: "text",
    required: true,
  },
  {
    id: "phone_whatsapp",
    question: "Wie lautet deine Telefonnummer für die weitere Kontaktaufnahme? (WhatsApp)",
    placeholder: "+49 170 1234567",
    type: "text",
    required: true,
    helper: "Internationales Format mit Ländervorwahl. Wir melden uns ausschließlich darüber.",
  },
  {
    id: "trading_experience",
    question: "Wie lange beschäftigst du dich bereits mit Trading und wie läuft es aktuell für dich?",
    placeholder: "z. B. Ich trade seit 2 Jahren hauptsächlich Forex…",
    type: "textarea",
    required: true,
    minLength: 50,
  },
  {
    id: "markets_approach",
    question: "Welche Märkte tradest du aktuell — und mit welchem Ansatz arbeitest du momentan?",
    placeholder: "z. B. Forex, Futures, Price Action…",
    type: "textarea",
    required: true,
    minLength: 50,
  },
  {
    id: "biggest_problem",
    question: "Was ist aktuell dein größtes Problem im Trading, das dich davon abhält, auf das nächste Level zu kommen?",
    placeholder: "z. B. Ich verliere Disziplin bei großen Bewegungen…",
    type: "textarea",
    required: true,
    minLength: 50,
  },
  {
    id: "goals_12_months",
    question: "Was möchtest du in den nächsten 12 Monaten durch Trading konkret erreichen?",
    placeholder: "z. B. Konsistent 5–10 % monatlich erzielen…",
    type: "textarea",
    required: true,
    minLength: 50,
  },
  {
    id: "job_situation",
    question: "Wie sieht deine aktuelle berufliche Situation aus?",
    placeholder: "z. B. Vollzeit angestellt, nebenbei Trading…",
    type: "textarea",
    required: true,
    minLength: 30,
  },
  {
    id: "why_now",
    question: "Wie lange verfolgst du mich bereits — und warum möchtest du gerade jetzt den nächsten Schritt mit mir gehen?",
    placeholder: "z. B. Ich verfolge dich seit 6 Monaten auf Instagram…",
    type: "textarea",
    required: true,
    minLength: 50,
  },
  {
    id: "commitment",
    question: "Wie wichtig ist es dir, in den nächsten 12 Monaten im Trading wirklich voranzukommen — und was bist du bereit, dafür zu verändern?",
    placeholder: "z. B. Ich bin bereit, meine Routine komplett umzustellen…",
    type: "textarea",
    required: true,
    minLength: 50,
  },
  {
    id: "investment_budget",
    question: "Wenn wir gemeinsam feststellen, dass du zu Capital Circle oder zu einer engeren Zusammenarbeit passt: In welchem Rahmen wärst du aktuell bereit, in deine Trading-Ausbildung zu investieren?",
    placeholder: "",
    type: "select",
    options: ["under_500", "500_1000", "1000_3000", "flexible"],
    required: true,
  },
];

export const INVESTMENT_LABELS: Record<string, string> = {
  under_500: "Unter 500 €",
  "500_1000": "500–1.000 €",
  "1000_3000": "1.000–3.000 €",
  flexible: "Ich bin bereit, in die passende Lösung zu investieren, wenn ich vom Mehrwert überzeugt bin",
};
