import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stripe/invoices
 *
 * Rechnungen des angemeldeten Nutzers, direkt aus Stripe.
 *
 * Lokal liegt in `payments` nur die `stripe_invoice_id` — eine Zeichenkette,
 * mit der niemand etwas anfangen kann. Die eigentliche Rechnung (PDF, Nummer,
 * Steuerausweis) lebt bei Stripe und wird dort auch nachtraeglich korrigiert;
 * eine Kopie in unserer Datenbank waere ab dem ersten Storno falsch. Deshalb
 * fragen wir sie bei jedem Aufruf frisch ab, statt sie zu spiegeln.
 *
 * Wer keinen Stripe-Kunden hat (Free-Mitglied, Handeintrag im Admin), bekommt
 * eine leere Liste und kein Fehlerbild — er hat schlicht nie gezahlt.
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
    return NextResponse.json(
      { ok: false, error: "profile_lookup_failed" },
      { status: 500 },
    );
  }

  const customerId = (profileRaw as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json({ ok: true, invoices: [], hasCustomer: false });
  }

  try {
    const list = await getStripe().invoices.list({ customer: customerId, limit: 24 });

    const invoices = list.data.map((rechnung) => ({
      id: rechnung.id,
      /** Menschenlesbare Rechnungsnummer; Entwuerfe haben noch keine. */
      number: rechnung.number,
      /** Faellig gestellt, nicht erstellt — das ist das Datum auf dem Beleg. */
      date: new Date((rechnung.status_transitions?.paid_at ?? rechnung.created) * 1000).toISOString(),
      amountCents: rechnung.total,
      currency: rechnung.currency,
      status: rechnung.status,
      pdfUrl: rechnung.invoice_pdf,
      hostedUrl: rechnung.hosted_invoice_url,
    }));

    return NextResponse.json({ ok: true, invoices, hasCustomer: true });
  } catch (err) {
    console.error("[stripe/invoices] Abruf fehlgeschlagen:", err);
    return NextResponse.json(
      { ok: false, error: "stripe_unavailable" },
      { status: 502 },
    );
  }
}
