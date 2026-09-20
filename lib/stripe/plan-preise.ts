import { preiskarten } from "@/config/landing-membership";
import { MEMBERSHIP_PLANS, type MembershipPlan } from "@/lib/stripe/plan-map";

/**
 * Preise der drei Abo-Laufzeiten als Zahl — für Auswertungen (MRR, Zuordnung
 * von Zahlungen), nicht für die Kasse.
 *
 * Quelle sind die Preiskarten der Verkaufsseite (`config/landing-membership.ts`).
 * Dort steht, was Kunden sehen und zahlen: Die Stripe-Preise sind mit
 * `tax_behavior: "inclusive"` angelegt, der Kartenpreis ist also der Betrag,
 * der abgebucht wird (siehe `lib/stripe/plan-map.ts`). Bis 19.09.2026 stand im
 * Admin-Dashboard stattdessen eine eigene Konstante `99` — und alles außer
 * dem Monatsabo fehlte im MRR.
 *
 * Ändert sich ein Preis, ändert man ihn in Stripe und auf der Preiskarte —
 * die Auswertung zieht von selbst nach.
 *
 * Lifetime und 1:1-Mentoring stehen hier nicht: Beide haben keinen
 * öffentlichen Preis und sind kein wiederkehrender Umsatz.
 */

/** Monate je Abrechnungsintervall — Grundlage der MRR-Umrechnung. */
export const PLAN_MONATE: Record<MembershipPlan, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/**
 * „1.990,50 €" → 1990.5; ohne erkennbare Zahl → `null`.
 *
 * Exportiert, weil die Abo-Seite dieselben Anzeigepreise nachrechnet
 * (`components/billing/ersparnis.ts`). Ein zweiter Parser dort hätte bei einem
 * anders geschriebenen Preis eine andere Zahl gelesen als die Auswertung hier.
 */
export function euroAusText(text: string): number | null {
  const ziffern = text.replace(/[^\d,]/g, "").replace(",", ".");
  if (!ziffern) return null;
  const wert = Number(ziffern);
  return Number.isFinite(wert) && wert > 0 ? wert : null;
}

/**
 * Bruttopreis je Laufzeit in Euro. `null`, wenn die Preiskarte fehlt oder
 * keinen lesbaren Preis trägt — die Auswertung zeigt dann eine Lücke statt
 * einer erfundenen Zahl.
 */
export function planPreiseEur(): Record<MembershipPlan, number | null> {
  const preise = {} as Record<MembershipPlan, number | null>;
  for (const plan of MEMBERSHIP_PLANS) {
    const karte = preiskarten.find((k) => k.plan === plan);
    preise[plan] = karte ? euroAusText(karte.preis) : null;
  }
  return preise;
}
