import type Stripe from "stripe";
import { rechtsPfade, rechtstexteVersion, rechtsUrl } from "@/config/legal";
import type { MembershipPlan } from "@/lib/stripe/plan-map";

/**
 * Rechtliche Angaben für jede Stripe-Kasse — Gast-Checkout (`/go/<plan>`)
 * und eingebettete Kasse für eingeloggte Mitglieder
 * (`/api/stripe/create-checkout-session`) teilen sich diese eine Stelle.
 *
 * Was hier passiert und warum:
 *
 * - `consent_collection.terms_of_service = "required"` — Stripe zeigt ein
 *   Pflicht-Häkchen vor dem Bezahlknopf. Ohne Haken kein Kauf. Voraussetzung:
 *   Im Stripe-Dashboard ist unter Einstellungen → Öffentliche Angaben eine
 *   Nutzungsbedingungen-URL hinterlegt, sonst wirft Stripe beim Anlegen.
 * - Der Text neben dem Häkchen ersetzt Stripes Standardsatz. Er trägt drei
 *   Dinge: die Annahme der AGB, das ausdrückliche Verlangen, dass wir vor
 *   Ablauf der Widerrufsfrist beginnen (§ 356 Abs. 5 und 6, § 357a Abs. 2
 *   BGB), und die Kenntnisnahme, was das für das Widerrufsrecht bedeutet.
 *   Stripe erlaubt Markdown-Links und höchstens 1200 Zeichen.
 * - Der Text am Bezahlknopf nennt Laufzeit und Kündigung, weil § 312j Abs. 2
 *   BGB genau diese Angaben unmittelbar vor der Bestellung verlangt — Stripe
 *   selbst zeigt nur Preis und Abrechnungsintervall.
 * - `locale: "de"`, damit Knopf, Häkchen und Fehlermeldungen deutsch sind
 *   und nicht der Browsersprache folgen.
 *
 * Die Bestätigung nach § 312f BGB (dauerhafter Datenträger) steht in der
 * Willkommensmail (`lib/email/templates/welcome-paid.tsx`).
 */

export type KassenPlan = MembershipPlan | "lifetime";

/** Stripe-Grenze für `custom_text.*.message`. */
const STRIPE_TEXT_MAX = 1200;

/** Text neben dem Pflicht-Häkchen. */
export function kassenZustimmungstext(appUrl: string): string {
  const agb = rechtsUrl(rechtsPfade.agb, appUrl);
  const widerruf = rechtsUrl(rechtsPfade.widerruf, appUrl);
  return (
    `Ich akzeptiere die [AGB](${agb}) und habe die [Widerrufsbelehrung](${widerruf}) zur Kenntnis genommen. ` +
    "Ich verlange ausdrücklich, dass Capital Circle vor Ablauf der Widerrufsfrist mit der Leistung beginnt und " +
    "mir sofort Zugang gewährt. Mir ist bekannt, dass ich dadurch mein Widerrufsrecht für die digitalen Inhalte " +
    "mit Beginn der Bereitstellung verliere, dass es für die Dienstleistungen mit deren vollständiger Erbringung " +
    "erlischt und dass ich bei einem Widerruf für die bis dahin erbrachten Dienstleistungen anteiligen Wertersatz schulde."
  );
}

const ERSTLAUFZEIT: Record<MembershipPlan, string> = {
  monthly: "1 Monat",
  quarterly: "3 Monate",
  yearly: "12 Monate",
};

/**
 * Text am Bezahlknopf. Muss zu § 5 der AGB (`app/agb/page.tsx`) passen —
 * wer die Laufzeitregel dort ändert, ändert sie hier mit.
 */
export function kassenLaufzeittext(plan: KassenPlan): string {
  if (plan === "lifetime") {
    return "Einmalzahlung für einen Zugang ohne Enddatum: keine Verlängerung, keine weitere Abbuchung.";
  }
  return (
    `Kostenpflichtige Mitgliedschaft, Erstlaufzeit ${ERSTLAUFZEIT[plan]}. Danach läuft sie auf unbestimmte Zeit ` +
    "weiter und ist jederzeit mit einer Frist von höchstens einem Monat kündbar."
  );
}

/**
 * Text am Bezahlknopf für die Mentoring-Programme und das Live-Abo
 * (`config/mentoring.ts`, Kasse über `/kasse/<token>`). Muss zum
 * Mentoring-Paragrafen der AGB passen — wer die Regel dort ändert, ändert sie
 * hier mit.
 *
 * Bei Raten steht ausdrücklich „ohne Aufschlag" und „endet von selbst": Das
 * sind die beiden Angaben, nach denen jemand vor einer Ratenzahlung fragt, und
 * § 312j BGB verlangt die wesentlichen Vertragsbedingungen genau hier.
 */
export function mentoringLaufzeittext(daten: {
  produkt: "ausbildung" | "main" | "premium" | "live";
  liveMonate: number | null;
  raten: number;
  rateText?: string;
}): string {
  if (daten.produkt === "live") {
    return (
      "Monatsabo für Live Trading, Daily Bias und Trade Recaps. Es verlängert sich monatlich und ist jederzeit " +
      "zum Ende des laufenden Monats kündbar."
    );
  }
  const umfang =
    `Plattform, Kursinhalte und Journal dauerhaft, Live-Zugang ${daten.liveMonate ?? 0} Monate ab Kauf.`;
  if (daten.raten > 1) {
    return (
      `${umfang} Zahlung in ${daten.raten} Monatsraten${daten.rateText ? ` à ${daten.rateText}` : ""} ohne Aufschlag. ` +
      "Die Ratenzahlung endet nach der letzten Rate von selbst, eine Kündigung ist nicht nötig."
    );
  }
  return `${umfang} Einmalzahlung, keine Verlängerung und keine weitere Abbuchung.`;
}

/** Zum Einspreizen in `stripe.checkout.sessions.create({ ... })`. */
export function kassenRechtsangaben(
  appUrl: string,
  plan: KassenPlan,
): Pick<Stripe.Checkout.SessionCreateParams, "locale" | "consent_collection" | "custom_text"> {
  return kassenRechtsangabenMitText(appUrl, kassenLaufzeittext(plan));
}

/** Wie `kassenRechtsangaben`, mit eigenem Text am Bezahlknopf (Mentoring-Kasse). */
export function kassenRechtsangabenMitText(
  appUrl: string,
  laufzeit: string,
): Pick<Stripe.Checkout.SessionCreateParams, "locale" | "consent_collection" | "custom_text"> {
  const zustimmung = kassenZustimmungstext(appUrl);
  if (zustimmung.length > STRIPE_TEXT_MAX || laufzeit.length > STRIPE_TEXT_MAX) {
    // Lieber hier laut als in der Kasse still: Stripe lehnt die ganze Session ab.
    throw new Error("Kassentext überschreitet die Stripe-Grenze von 1200 Zeichen");
  }
  return {
    locale: "de",
    consent_collection: { terms_of_service: "required" },
    custom_text: {
      terms_of_service_acceptance: { message: zustimmung },
      submit: { message: laufzeit },
    },
  };
}

/** Metadaten-Eintrag, der belegt, welcher Stand der Rechtstexte beim Kauf galt. */
export const kassenRechtsMetadata = { rechtstexte_version: rechtstexteVersion } as const;
