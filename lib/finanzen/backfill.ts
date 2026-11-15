import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";
import {
  bucheDispute,
  bucheErstattung,
  bucheMentoringCheckout,
  bucheMentoringRechnung,
  pflegeLiveAbo,
  stelleCreditSicher,
  verknuepfeQuarantaene,
} from "./ledger";

/**
 * Nachtrag für Bestandsdaten (Admin → Auswertung → Finanzen → „Nachtrag").
 *
 * Trägt aus `mentoring_kauf` / `mentoring_rate` und Stripe nach, was vor
 * Migration 114 entstand: Credit einfrieren, Zahlungen (Kasse bzw. Rechnungen),
 * Live-Abo-Stand, Erstattungen und Chargebacks je Charge. **Vorsichtig und
 * idempotent:** Es läuft dieselbe Buchungslogik wie im Webhook, eindeutig über
 * die Stripe-Objekt-ID — ein zweiter Lauf ändert nichts. Nur lesende
 * Stripe-Aufrufe. Ein Fehler bei einem Kauf stoppt den Lauf nicht, er steht im
 * Ergebnis.
 *
 * Achtung: Läuft die App mit einem Testschlüssel gegen die Produktionsdatenbank,
 * findet Stripe die Live-Objekte nicht — dann stehen die Käufe unter `fehler`.
 */

type DB = SupabaseClient;

export type NachtragErgebnis = {
  kaeufe: number;
  credit: number;
  zahlungenGeprueft: number;
  liveAbos: number;
  erstattungenGeprueft: number;
  disputesGeprueft: number;
  quarantaeneVerknuepft: number;
  fehler: { kauf: string; meldung: string }[];
};

export async function nachtrag(db: DB, opts: { limit?: number } = {}): Promise<NachtragErgebnis> {
  const stripe = getStripe();
  const r: NachtragErgebnis = { kaeufe: 0, credit: 0, zahlungenGeprueft: 0, liveAbos: 0, erstattungenGeprueft: 0, disputesGeprueft: 0, quarantaeneVerknuepft: 0, fehler: [] };
  const { data, error } = await db
    .from("mentoring_kauf")
    .select("*")
    .order("gekauft_am", { ascending: true })
    .limit(opts.limit ?? 1000);
  if (error) throw new Error(`mentoring_kauf: ${error.message}`);

  for (const kauf of (data ?? []) as Record<string, unknown>[]) {
    const kaufId = String(kauf.id);
    r.kaeufe++;
    try {
      if (kauf.produkt !== "live" && !kauf.credit_regel) {
        await stelleCreditSicher(db, kauf as never);
        r.credit++;
      }
      const subId = (kauf.stripe_subscription_id as string | null) ?? null;
      if (kauf.zahlweise === "einmal") {
        // Kasse erneut lesen und wie im Webhook buchen (Zahlung, Gebühr, Steuer aus total_details).
        const session = await stripe.checkout.sessions.retrieve(kaufId);
        await bucheMentoringCheckout(db, session, null);
        r.zahlungenGeprueft++;
      } else if (subId) {
        // Alle bezahlten Rechnungen des Abos — Raten und Live-Abo.
        for await (const inv of stripe.invoices.list({ subscription: subId, status: "paid", limit: 100 })) {
          if (kauf.zahlweise === "raten") {
            const { data: rate } = await db.from("mentoring_rate").select("id").eq("id", inv.id).maybeSingle();
            if (!rate) continue; // Rate noch nicht im Bestand → Webhook wiederholt, nicht hier erfinden.
          }
          await bucheMentoringRechnung(db, inv as Stripe.Invoice, null);
          r.zahlungenGeprueft++;
        }
        r.quarantaeneVerknuepft += await verknuepfeQuarantaene(db, subId);
        if (kauf.zahlweise === "abo") {
          await pflegeLiveAbo(db, await stripe.subscriptions.retrieve(subId));
          r.liveAbos++;
        }
      }

      // Erstattungen und Chargebacks je gebuchter Zahlung.
      const { data: zahlungen } = await db.from("finanz_buchung").select("stripe_charge_id, stripe_payment_intent_id").eq("kauf_id", kaufId).eq("art", "zahlung");
      for (const z of (zahlungen ?? []) as { stripe_charge_id: string | null; stripe_payment_intent_id: string | null }[]) {
        if (!z.stripe_charge_id && !z.stripe_payment_intent_id) continue;
        const refunds = await stripe.refunds.list(z.stripe_charge_id ? { charge: z.stripe_charge_id, limit: 100 } : { payment_intent: z.stripe_payment_intent_id!, limit: 100 });
        for (const ref of refunds.data) {
          await bucheErstattung(db, ref, null);
          r.erstattungenGeprueft++;
        }
        const disputes = await stripe.disputes.list(z.stripe_charge_id ? { charge: z.stripe_charge_id, limit: 20 } : { payment_intent: z.stripe_payment_intent_id!, limit: 20 });
        for (const d of disputes.data) {
          await bucheDispute(db, d, null);
          r.disputesGeprueft++;
        }
      }
    } catch (err) {
      r.fehler.push({ kauf: kaufId, meldung: err instanceof Error ? err.message : String(err) });
    }
  }
  return r;
}
