/**
 * Gemeinsame Beschriftungen und Formate der Konto-Seiten.
 *
 * Sie stehen hier statt in jeder Seite, weil Abo-Karte, Rechnungsliste und
 * Kündigungs-Flow denselben Tarifnamen und dasselbe Datum zeigen müssen —
 * „Vierteljährlich" auf der einen und „quarterly" auf der anderen Seite wäre
 * für den Nutzer schlicht ein anderes Produkt.
 */

/** Jede Stufe, die ein Profil tragen kann — auch die nicht mehr frei verkäufliche. */
export type Tier = "free" | "monthly" | "quarterly" | "yearly" | "lifetime" | "ht_1on1";

/** Die drei wiederkehrend abgerechneten Laufzeiten. */
export const ABO_TIERS: readonly Tier[] = ["monthly", "quarterly", "yearly"];

export function istAbo(tier: Tier): boolean {
  return (ABO_TIERS as readonly string[]).includes(tier);
}

export const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  monthly: "Monatlich",
  quarterly: "Vierteljährlich",
  yearly: "Jährlich",
  lifetime: "Lifetime",
  ht_1on1: "1:1-Mentoring",
};

/** Endpreis inkl. MwSt. und Abrechnungsrhythmus — dieselben Zahlen wie auf der Verkaufsseite. */
export const TIER_PREIS: Partial<Record<Tier, { betrag: string; periode: string; proMonat?: string }>> = {
  monthly: { betrag: "99 €", periode: "pro Monat" },
  quarterly: { betrag: "267 €", periode: "alle 3 Monate", proMonat: "89 €/Monat" },
  yearly: { betrag: "990 €", periode: "pro Jahr", proMonat: "82,50 €/Monat" },
};

/** Stripe-Abostatus auf Deutsch; Unbekanntes bleibt im Original sichtbar. */
const SUBSCRIPTION_STATUS: Record<string, { label: string; danger?: boolean }> = {
  active: { label: "Aktiv" },
  trialing: { label: "Testphase" },
  past_due: { label: "Zahlung überfällig", danger: true },
  unpaid: { label: "Unbezahlt", danger: true },
  incomplete: { label: "Unvollständig", danger: true },
  incomplete_expired: { label: "Abgelaufen" },
  canceled: { label: "Gekündigt" },
  paused: { label: "Pausiert" },
};

export function subscriptionStatus(status: string): { label: string; danger?: boolean } {
  return SUBSCRIPTION_STATUS[status.toLowerCase()] ?? { label: status };
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatAmount(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: currency.toUpperCase() || "EUR",
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export function paymentStatusLabel(status: string): { label: string; color: string } {
  const s = status.toLowerCase();
  if (s === "succeeded" || s === "paid") {
    return { label: "Bezahlt", color: "var(--cc-success)" };
  }
  if (s === "failed" || s === "payment_failed" || s === "uncollectible") {
    return { label: "Fehlgeschlagen", color: "var(--cc-danger)" };
  }
  if (s === "refunded") {
    return { label: "Erstattet", color: "var(--cc-text-2)" };
  }
  if (s === "pending" || s === "processing" || s === "requires_action" || s === "open" || s === "draft") {
    return { label: s === "open" || s === "draft" ? "Offen" : "Ausstehend", color: "var(--cc-gold-light)" };
  }
  if (s === "void") {
    return { label: "Storniert", color: "var(--cc-text-2)" };
  }
  return { label: status, color: "var(--cc-text-2)" };
}

