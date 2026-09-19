import { createServiceClient } from "@/lib/supabase/service";
import type { AboZeile } from "@/lib/stripe/abo-kontext";
import { getStripe } from "@/lib/stripe/server";

/**
 * Kündigung eines Abos **zum Periodenende** — die eine Stelle, an der das
 * passiert.
 *
 * Zwei Wege führen hierher: der Komfortweg in `/einstellungen/abonnement`
 * (`/api/stripe/subscription/cancel`, mit Grund und Halte-Angebot davor) und
 * der gesetzliche Kündigungsbutton `/kuendigen` (`/api/kuendigung`, ohne
 * Umwege). Beide setzen dasselbe Feld bei Stripe, schreiben dieselbe
 * Statistikzeile und ziehen dasselbe lokale Flag nach — zwei Kopien davon
 * liefen früher oder später auseinander, und dann hieße „gekündigt" je nach
 * Weg etwas anderes.
 *
 * Zum Periodenende, nicht sofort: Der Zugang ist bezahlt und läuft bis
 * `current_period_end` weiter — eine sofortige Sperre wäre eine
 * Teilenteignung und würde jede Rückkehr verbauen.
 *
 * Reihenfolge mit Absicht: erst Stripe, dann die eigenen Zeilen. Scheitert
 * Stripe, steht bei uns keine Kündigung, die es dort nicht gibt. Scheitert
 * danach ein Insert, fehlt nur die Statistikzeile — protokolliert, aber kein
 * Grund, dem Nutzer einen Fehler zu zeigen, dessen Kündigung längst steht.
 */

/**
 * Die vier Gründe aus `cancellations.structured_reason` (044). Der
 * Check-Constraint dort kennt genau diese — ein fünfter Wert liesse den
 * Insert scheitern, nachdem das Abo bei Stripe bereits gekündigt wäre.
 */
export const KUENDIGUNGS_GRUENDE = ["too_expensive", "not_enough_value", "tech_issues", "other"] as const;
export type KuendigungsGrund = (typeof KUENDIGUNGS_GRUENDE)[number];

/**
 * Stripes eigene Rückmeldungs-Kategorien. Sie landen in
 * `cancellation_details.feedback` und tauchen in den Stripe-Auswertungen auf —
 * unsere vier Gründe lassen sich nicht 1:1 abbilden, deshalb die Zuordnung.
 */
const STRIPE_FEEDBACK: Record<KuendigungsGrund, "too_expensive" | "missing_features" | "unused" | "other"> = {
  too_expensive: "too_expensive",
  not_enough_value: "missing_features",
  tech_issues: "other",
  other: "other",
};

export type KuendigungsAusfuehrung =
  | { ok: true; accessUntil: string }
  | { ok: false; fehler: "stripe_fehler"; detail: string };

export async function kuendigeAboZumPeriodenende({
  userId,
  abo,
  grund,
  freitext,
  statistikGrund,
}: {
  userId: string;
  abo: AboZeile;
  grund: KuendigungsGrund;
  /** Freitext des Nutzers; landet als Kommentar bei Stripe und als `feedback` in `cancellations`. */
  freitext: string | null;
  /**
   * Inhalt von `cancellations.reason`. Der Komfortweg schreibt dort seinen
   * Grund hinein, der Kündigungsbutton seine Herkunft — so lässt sich in der
   * Auswertung trennen, welcher Weg gewählt wurde.
   */
  statistikGrund?: string;
}): Promise<KuendigungsAusfuehrung> {
  let endeISO = abo.currentPeriodEnd;

  try {
    const aktualisiert = await getStripe().subscriptions.update(abo.stripeSubscriptionId, {
      cancel_at_period_end: true,
      cancellation_details: {
        feedback: STRIPE_FEEDBACK[grund],
        comment: freitext ?? undefined,
      },
    });
    const ende = aktualisiert.items?.data?.[0] as { current_period_end?: number } | undefined;
    if (typeof ende?.current_period_end === "number") {
      endeISO = new Date(ende.current_period_end * 1000).toISOString();
    }
  } catch (err) {
    console.error("[stripe/kuendigung] Stripe-Update fehlgeschlagen:", err);
    return {
      ok: false,
      fehler: "stripe_fehler",
      detail: err instanceof Error ? err.message : "Unbekannter Fehler",
    };
  }

  const service = createServiceClient();

  const { error: insertFehler } = await service.from("cancellations").insert({
    user_id: userId,
    subscription_id: abo.id,
    structured_reason: grund,
    reason: statistikGrund ?? grund,
    feedback: freitext,
  });
  if (insertFehler) {
    console.error("[stripe/kuendigung] cancellations-Insert fehlgeschlagen:", insertFehler.message);
  }

  // Die `subscriptions`-Zeile pflegt sonst der Webhook. Wir setzen das Flag
  // trotzdem sofort, damit die Seite nach dem Neuladen nicht noch „aktiv"
  // zeigt, falls der Webhook ein paar Sekunden braucht.
  const { error: syncFehler } = await service
    .from("subscriptions")
    .update({ cancel_at_period_end: true })
    .eq("id", abo.id);
  if (syncFehler) {
    console.error("[stripe/kuendigung] lokales Flag nicht gesetzt:", syncFehler.message);
  }

  return { ok: true, accessUntil: endeISO };
}
