import { createServiceClient } from "@/lib/supabase/service";

/**
 * Was ein Nutzer gerade an Abo hat — in einer Form, die Seite und Routen
 * gleichermaßen lesen können.
 *
 * Die `subscriptions`-Zeile ist die Quelle der Wahrheit für Laufzeit und
 * Status; der Webhook hält sie aktuell. `profiles.membership_tier` sagt nur,
 * welche Stufe freigeschaltet ist, und weiß nichts über Perioden.
 */

export interface AboZeile {
  /** Interne UUID — Fremdschlüssel für `cancellations`. */
  id: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  stripePriceId: string;
  createdAt: string;
}

export interface AboKontext {
  userId: string;
  tier: string;
  accessUntil: string | null;
  lifetimePurchasedAt: string | null;
  customerId: string | null;
  abo: AboZeile | null;
}

export async function ladeAboKontext(userId: string): Promise<AboKontext | null> {
  const supabase = createServiceClient();

  const { data: profilRaw, error: profilFehler } = await supabase
    .from("profiles")
    .select("membership_tier,access_until,lifetime_purchased_at,stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (profilFehler || !profilRaw) return null;
  const profil = profilRaw as {
    membership_tier: string | null;
    access_until: string | null;
    lifetime_purchased_at: string | null;
    stripe_customer_id: string | null;
  };

  const { data: aboRaw } = await supabase
    .from("subscriptions")
    .select(
      "id,stripe_subscription_id,status,current_period_start,current_period_end,cancel_at_period_end,canceled_at,stripe_price_id,created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  const zeile = (aboRaw as Record<string, unknown>[] | null)?.[0] ?? null;

  return {
    userId,
    tier: profil.membership_tier ?? "free",
    accessUntil: profil.access_until,
    lifetimePurchasedAt: profil.lifetime_purchased_at,
    customerId: profil.stripe_customer_id,
    abo: zeile
      ? {
          id: zeile.id as string,
          stripeSubscriptionId: zeile.stripe_subscription_id as string,
          status: zeile.status as string,
          currentPeriodStart: zeile.current_period_start as string,
          currentPeriodEnd: zeile.current_period_end as string,
          cancelAtPeriodEnd: Boolean(zeile.cancel_at_period_end),
          canceledAt: (zeile.canceled_at as string | null) ?? null,
          stripePriceId: zeile.stripe_price_id as string,
          createdAt: zeile.created_at as string,
        }
      : null,
  };
}

/**
 * Seit wann läuft die Mitgliedschaft?
 *
 * Bewusst `created_at` des **Abos**, nicht des Profils: Wer erst als
 * Free-Mitglied dabei war und später gekauft hat, ist im Profil Monate älter
 * als sein Abo. Das Upgrade-Angebot würde ihm sonst am ersten Tag erscheinen.
 * Als Rückfall der Beginn der laufenden Periode.
 */
export function aboLaeuftSeit(abo: AboZeile | null): string | null {
  if (!abo) return null;
  return abo.createdAt ?? abo.currentPeriodStart ?? null;
}
