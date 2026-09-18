import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stripe/payment-method
 *
 * Die hinterlegte Zahlungsmethode des angemeldeten Nutzers.
 *
 * Wir speichern davon bewusst nichts: Kartendaten sind das eine, aber selbst
 * die vier letzten Ziffern und das Ablaufdatum ändern sich, sobald die Bank
 * eine Karte ersetzt — eine lokale Kopie wäre spätestens dann falsch und
 * würde dem Nutzer eine Karte zeigen, die es nicht mehr gibt.
 *
 * Gelesen wird die Standard-Zahlungsmethode des Kunden. Findet sich dort
 * keine, fragen wir die Liste ab: Bei Kunden aus dem Gast-Checkout hängt die
 * Karte anfangs nur am Abo, nicht an `invoice_settings`.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data: profileRaw, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return NextResponse.json({ ok: false, error: "profile_lookup_failed" }, { status: 500 });
  }

  const customerId = (profileRaw as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ ok: true, hasCustomer: false, method: null });
  }

  try {
    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ["invoice_settings.default_payment_method"],
    });

    let pm: Stripe.PaymentMethod | null = null;
    if (!customer.deleted) {
      const standard = customer.invoice_settings?.default_payment_method;
      if (standard && typeof standard !== "string") pm = standard;
    }

    if (!pm) {
      const liste = await stripe.paymentMethods.list({ customer: customerId, limit: 1 });
      pm = liste.data[0] ?? null;
    }

    if (!pm) {
      return NextResponse.json({ ok: true, hasCustomer: true, method: null });
    }

    return NextResponse.json({
      ok: true,
      hasCustomer: true,
      method: {
        id: pm.id,
        type: pm.type,
        brand: pm.card?.brand ?? null,
        last4: pm.card?.last4 ?? null,
        expMonth: pm.card?.exp_month ?? null,
        expYear: pm.card?.exp_year ?? null,
        /** SEPA-Lastschrift zeigt statt einer Marke die letzten vier Stellen der IBAN. */
        sepaLast4: pm.sepa_debit?.last4 ?? null,
      },
    });
  } catch (err) {
    console.error("[stripe/payment-method] Abruf fehlgeschlagen:", err);
    return NextResponse.json({ ok: false, error: "stripe_unavailable" }, { status: 502 });
  }
}
