import { LIFETIME_PREIS } from "@/config/lifetime";
import type { MembershipPlan } from "@/lib/stripe/plan-map";
import { euroAusText, PLAN_MONATE, planPreiseEur } from "@/lib/stripe/plan-preise";

/**
 * Was die längeren Laufzeiten sparen, gerechnet statt behauptet.
 *
 * Auf `/einstellungen/abonnement` steht neben dem Jahrespaket, wie viel es
 * gegenüber dem Monatspaket spart, und neben Lifetime, nach wie vielen Monaten
 * es sich gegenüber einem laufenden Abo trägt. Beides sind Aussagen über
 * Preise, und Preise ändern sich: Stünden die Zahlen als Text in der Karte,
 * wäre nach der ersten Preisanpassung genau eine davon falsch, und zwar die im
 * Fließtext, die niemand sucht.
 *
 * Quelle ist deshalb dieselbe wie überall sonst: die Preiskarten in
 * `config/landing-membership.ts` und `LIFETIME_PREIS` in `config/lifetime.ts`.
 * Gelesen werden sie über `euroAusText()` aus `lib/stripe/plan-preise.ts`,
 * damit Anzeige und Auswertung (MRR) denselben Betrag aus demselben Text
 * herauslesen.
 *
 * Fehlt oder verändert sich ein Preis so, dass er nicht mehr lesbar ist,
 * liefern die Funktionen `null`. Die Karten zeigen dann ihre Vorteile ohne
 * Zahl, statt eine erfundene zu nennen.
 *
 * **Rabatte kommen hier nicht vor** (Entscheidung Simon, 19.09.2026). Die
 * Ersparnis ist der Unterschied zwischen zwei regulären Preisen, keine Aktion.
 */

/** Betrag als Euro-Text: ganze Beträge ohne Nachkommastellen („589 €", „49,92 €"). */
export function euro(betrag: number): string {
  const ganz = Math.abs(betrag % 1) < 0.005;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: ganz ? 0 : 2,
    maximumFractionDigits: ganz ? 0 : 2,
  }).format(betrag);
}

export interface PlanErsparnis {
  /** Preis des Pakets je Abrechnungszeitraum, z. B. 599. */
  preis: number;
  /** Auf den Monat umgerechnet, z. B. 49,92. */
  proMonat: number;
  /** Was derselbe Zeitraum im Monatspaket kostet, z. B. 1188. */
  vergleichspreis: number;
  /** Differenz in Euro, z. B. 589. */
  gespart: number;
  /** Anteil der Differenz am Vergleichspreis, gerundet: 50 (Prozent). */
  prozent: number;
}

/**
 * Ersparnis eines Pakets gegenüber dem Monatspaket über denselben Zeitraum.
 *
 * `null` für „monthly" selbst (es ist der Vergleichsmaßstab) und immer dann,
 * wenn einer der beiden Preise fehlt.
 */
export function planErsparnis(plan: MembershipPlan): PlanErsparnis | null {
  const preise = planPreiseEur();
  const monatspreis = preise.monthly;
  const preis = preise[plan];
  const monate = PLAN_MONATE[plan];
  if (plan === "monthly" || !monatspreis || !preis || !monate) return null;

  const vergleichspreis = monatspreis * monate;
  const gespart = vergleichspreis - preis;
  if (gespart <= 0) return null;

  return {
    preis,
    proMonat: preis / monate,
    vergleichspreis,
    gespart,
    prozent: Math.round((gespart / vergleichspreis) * 100),
  };
}

export interface LifetimeRechnung {
  /** Der Einmalbetrag, z. B. 997. */
  preis: number;
  /** So viele Monate Monatspaket kosten dasselbe, gerundet: 10. */
  monateZumMonatspreis: number | null;
  /** So viele Monate Jahrespaket kosten dasselbe, gerundet: 20. */
  monateZumJahrespreis: number | null;
  /** Ab diesem Jahr im Jahrespaket ist Lifetime billiger, z. B. 2. */
  jahreBisGuenstiger: number | null;
  /** Was das Jahrespaket bis dahin gekostet hat, z. B. 1198. */
  jahrespaketBisDahin: number | null;
}

/**
 * Wann sich Lifetime gegenüber einem laufenden Abo trägt.
 *
 * Bewusst zwei Vergleiche: Wer monatlich zahlt, rechnet in Monatspreisen; wer
 * im Jahrespaket ist, rechnet in Jahren. Ein einziger Satz für beide wäre für
 * eine der beiden Gruppen um den Faktor zwei daneben.
 *
 * Gerundet wird zur nächsten ganzen Zahl, und die Texte sagen „rund" dazu.
 * `jahreBisGuenstiger` rundet dagegen auf: Nach einem angefangenen Jahr hat
 * niemand ein halbes Jahrespaket bezahlt.
 */
export function lifetimeRechnung(): LifetimeRechnung | null {
  const preis = euroAusText(LIFETIME_PREIS);
  if (!preis) return null;

  const preise = planPreiseEur();
  const monatspreis = preise.monthly;
  const jahrespreis = preise.yearly;
  const jahrProMonat = jahrespreis ? jahrespreis / PLAN_MONATE.yearly : null;
  const jahreBisGuenstiger = jahrespreis ? Math.ceil(preis / jahrespreis) : null;

  return {
    preis,
    monateZumMonatspreis: monatspreis ? Math.round(preis / monatspreis) : null,
    monateZumJahrespreis: jahrProMonat ? Math.round(preis / jahrProMonat) : null,
    jahreBisGuenstiger,
    jahrespaketBisDahin: jahrespreis && jahreBisGuenstiger ? jahreBisGuenstiger * jahrespreis : null,
  };
}

const ORDINAL: Record<number, string> = {
  1: "ersten",
  2: "zweiten",
  3: "dritten",
  4: "vierten",
  5: "fünften",
};

/** „ab dem **zweiten** Jahr" — die gerechnete Zahl als Wort, sonst als Ziffer. */
export function ordinalWort(n: number): string {
  return ORDINAL[n] ?? `${n}.`;
}
