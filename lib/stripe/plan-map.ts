/**
 * Die drei verkäuflichen Mitgliedschaften und ihre Stripe-Preise.
 *
 * Alle drei laufen als Abo (`mode: "subscription"`) — auch „Vierteljährlich"
 * und „Jährlich": Das sind Abrechnungsintervalle, keine Einmalzahlungen.
 *
 * Lifetime ist **kein** vierter Plan in dieser Liste. Es ist eine
 * Einmalzahlung (`mode: "payment"`), es hat keinen öffentlichen Preis, und es
 * wird ausschließlich innerhalb der Plattform an bestehende, zahlende
 * Mitglieder angeboten (siehe `lib/access-control/lifetime-offer.ts`). Stünde
 * es hier, wäre es über jeden Weg kaufbar, der `isMembershipPlan()` fragt —
 * auch über den Gast-Checkout `/go/<plan>`.
 *
 * Die Preise sind in Stripe mit `tax_behavior: "inclusive"` angelegt: Die
 * angezeigten 99 / 267 / 599 € sind Endpreise inkl. MwSt. (B2C Deutschland).
 */
export type MembershipPlan = "monthly" | "quarterly" | "yearly";

export const MEMBERSHIP_PLANS: readonly MembershipPlan[] = ["monthly", "quarterly", "yearly"];

const PLAN_PRICE_ENV: Record<MembershipPlan, string> = {
  monthly: "STRIPE_PRICE_MONTHLY",
  quarterly: "STRIPE_PRICE_QUARTERLY",
  yearly: "STRIPE_PRICE_YEARLY",
};

export function isMembershipPlan(value: string): value is MembershipPlan {
  return (MEMBERSHIP_PLANS as readonly string[]).includes(value);
}

/**
 * Plan → Stripe-Preis-ID. Wirft, wenn die Umgebungsvariable fehlt.
 *
 * **Diese Funktion kennt bewusst keine Preis-Historie.** Sie ist die Richtung
 * „in die Kasse", und ein alter Preis darf nie wieder verkäuflich werden —
 * sonst ließe sich über eine ausgemusterte Preis-ID ein Zugang zu einem
 * Betrag kaufen, den es heute nicht mehr gibt. Verkauft wird ausschließlich,
 * was in den Umgebungsvariablen steht.
 */
export function priceIdForPlan(plan: MembershipPlan): string {
  const envVar = PLAN_PRICE_ENV[plan];
  const priceId = process.env[envVar]?.trim();
  if (!priceId) {
    throw new Error(`${envVar} ist nicht gesetzt`);
  }
  return priceId;
}

/**
 * Stripe-Preis-ID → Plan. Liefert `null` statt zu werfen.
 *
 * Der Unterschied zur Verkaufsrichtung ist Absicht: Webhook-Handler bekommen
 * auch Ereignisse zu Abos, die über einen inzwischen ausgetauschten oder im
 * Stripe-Dashboard von Hand angelegten Preis laufen. Ein `throw` würde den
 * gesamten Event verwerfen und Stripe drei Tage lang wiederholen lassen,
 * obwohl an dem Abo nichts kaputt ist. Der Aufrufer entscheidet, was ein
 * unbekannter Preis für ihn bedeutet.
 */
export function resolvePlanFromPriceId(priceId: string): MembershipPlan | null {
  for (const plan of MEMBERSHIP_PLANS) {
    if (process.env[PLAN_PRICE_ENV[plan]]?.trim() === priceId) return plan;
  }
  return null;
}

/**
 * Stripe-Preis der Lifetime-Einmalzahlung.
 *
 * Getrennt von `priceIdForPlan()`, weil Lifetime kein Abo ist und nicht in
 * denselben Kaufweg gehört. Liefert `null` statt zu werfen: Fehlt die
 * Variable, gibt es das Angebot schlicht nicht — das ist ein gültiger
 * Zustand, kein Fehler.
 */
export function lifetimePriceId(): string | null {
  return process.env.STRIPE_PRICE_LIFETIME?.trim() || null;
}
