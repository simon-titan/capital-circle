import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAppUrl } from "@/lib/site-url";
import { getStripe } from "@/lib/stripe/server";
import { kassenRechtsangaben, kassenRechtsMetadata } from "@/lib/stripe/kasse-recht";
import {
  isMembershipPlan,
  lifetimePriceId,
  MEMBERSHIP_PLANS,
  priceIdForPlan,
} from "@/lib/stripe/plan-map";
import { pruefeLifetimeAngebot } from "@/lib/access-control/lifetime-offer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  plan?: string;
  promo?: string;
}

/**
 * Eingebetteter Checkout fuer **eingeloggte** Nutzer (Upgrade aus `/billing`).
 *
 * Der Weg von der Landing laeuft dagegen ueber `/go/<plan>` als Gast-Checkout —
 * dort gibt es noch kein Konto, an das sich ein `customer` haengen liesse.
 * Beide Wege teilen sich `lib/stripe/plan-map.ts`, damit Preis und Plan nicht
 * auseinanderlaufen.
 *
 * `plan: "lifetime"` ist der dritte Fall und laeuft als Einmalzahlung
 * (`mode: "payment"`). Er hat keinen oeffentlichen Preis und wird nur
 * innerhalb der Plattform angeboten — wer ihn kaufen darf, entscheidet
 * `pruefeLifetimeAngebot()`, **serverseitig**. Eine ausgeblendete Karte ist
 * kein Riegel: Ohne diese Pruefung koennte jedes Free-Konto den Endpunkt
 * direkt aufrufen.
 */

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const plan = body.plan;
  const istLifetime = plan === "lifetime";
  if (!plan || (!isMembershipPlan(plan) && !istLifetime)) {
    return NextResponse.json(
      { ok: false, error: "invalid_plan", allowed: [...MEMBERSHIP_PLANS, "lifetime"] },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  let priceId: string;
  if (istLifetime) {
    // Dieselbe Regel wie die Karte in `/einstellungen/abonnement` — nur hier
    // zaehlt sie wirklich.
    const angebot = await pruefeLifetimeAngebot(user.id);
    if (!angebot.erlaubt) {
      return NextResponse.json(
        { ok: false, error: "lifetime_gesperrt", detail: angebot.grund },
        { status: 403 },
      );
    }
    const lifetimePreis = lifetimePriceId();
    if (!lifetimePreis) {
      return NextResponse.json(
        { ok: false, error: "config_missing", detail: "STRIPE_PRICE_LIFETIME ist nicht gesetzt" },
        { status: 500 },
      );
    }
    priceId = lifetimePreis;
  } else if (isMembershipPlan(plan)) {
    try {
      priceId = priceIdForPlan(plan);
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          error: "config_missing",
          detail: err instanceof Error ? err.message : "Preis-Konfiguration fehlt",
        },
        { status: 500 },
      );
    }
  } else {
    return NextResponse.json(
      { ok: false, error: "invalid_plan", allowed: [...MEMBERSHIP_PLANS, "lifetime"] },
      { status: 400 },
    );
  }

  // Service-Client für das Profil-Update (`stripe_customer_id`) — RLS würde
  // den User-Client nur eigene Reads erlauben, aber wir wollen sicher gehen,
  // dass der Insert/Update gegen die Spalte unique-konform durchgeht.
  const service = createServiceClient();

  const { data: profileRaw, error: profileError } = await service
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return NextResponse.json(
      { ok: false, error: "profile_lookup_failed", detail: profileError.message },
      { status: 500 },
    );
  }

  const profile = profileRaw as { stripe_customer_id: string | null } | null;
  let customerId = profile?.stripe_customer_id ?? null;

  const appUrl = getAppUrl();

  /*
    Jeder Stripe-Aufruf ab hier kann aus Gruenden scheitern, die nicht im Code
    stehen (Stripe Tax, deaktivierter Preis, abgelaufener Schluessel). Ohne
    try/catch antwortet Next mit einer leeren 500, und der Browser meldet nur
    einen JSON-Parserfehler („Unexpected end of JSON input", in Safari „The
    string did not match the expected pattern"). So stand es bis 22.09.2026
    bei den Whop-Umzueglern im Toast. Der Grund gehoert ins Serverprotokoll,
    der Nutzer bekommt einen Fehlercode, den der Client uebersetzt.
  */
  try {
    const stripe = getStripe();

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      const { error: updateError } = await service
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);

      if (updateError) {
        // Customer wurde bereits in Stripe angelegt — wir loggen, geben aber
        // weiter zurück, weil Webhook später noch Sync möglich macht.
        console.error(
          `[create-checkout] stripe_customer_id Persist fehlgeschlagen für ${user.id}:`,
          updateError,
        );
      }
    }

    // Optionaler vorausgefüllter Rabattcode (z. B. `?promo=XYZ` aus einer
    // Marketing-E-Mail). `discounts` und `allow_promotion_codes` schließen sich
    // in der Checkout-Session-API gegenseitig aus — bei einem gültigen Code
    // wird der Code direkt angewendet, sonst bleibt das normale Eingabefeld.
    let promotionCodeId: string | null = null;
    const promoCode = body.promo?.trim();
    if (promoCode) {
      const found = await stripe.promotionCodes.list({ code: promoCode, active: true, limit: 1 });
      promotionCodeId = found.data[0]?.id ?? null;
    }

    const session = await stripe.checkout.sessions.create({
      // `embedded_page` ist seit Stripe-API `2026-03-25.dahlia` der neue Name
      // für das vorherige `embedded` (Stripe-Checkout als iframe in der eigenen
      // Seite, gesteuert via `client_secret` + `<EmbeddedCheckout/>`).
      ui_mode: "embedded_page",
      // Die drei Laufzeiten sind Abos — "vierteljaehrlich" und "jaehrlich" sind
      // Abrechnungsintervalle, keine Einmalzahlungen. Lifetime ist die einzige
      // Einmalzahlung.
      mode: istLifetime ? "payment" : "subscription",
      customer: customerId,
      // Pflicht fuer **jede** Kasse mit bestehendem `customer` und
      // `automatic_tax`, egal ob Abo oder Einmalzahlung: Hat der Kunde keine
      // gueltige Adresse, lehnt Stripe die Session sonst ab. Unsere Kunden
      // legt die Route oben nur mit E-Mail an, haben also nie eine. Mit
      // "auto" fragt die Kasse die Adresse ab und schreibt sie an den Kunden.
      // Bis 22.09.2026 stand das nur bei Lifetime — die drei Abos scheiterten
      // fuer jeden eingeloggten Kaeufer, praktisch also fuer die Whop-Umzuegler.
      customer_update: { address: "auto" },
      line_items: [{ price: priceId, quantity: 1 }],
      return_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      automatic_tax: { enabled: true },
      ...(promotionCodeId
        ? { discounts: [{ promotion_code: promotionCodeId }] }
        : { allow_promotion_codes: true }),
      // Pflicht-Häkchen (AGB + sofortiger Leistungsbeginn), Laufzeit am
      // Bezahlknopf, deutsche Kasse — siehe `lib/stripe/kasse-recht.ts`. Nach
      // den Prüfungen oben ist `plan` entweder ein Abo-Plan oder "lifetime".
      ...kassenRechtsangaben(appUrl, isMembershipPlan(plan) ? plan : "lifetime"),
      // `metadata.user_id` ist beim Lifetime-Kauf die einzige Bruecke zum Konto:
      // `checkout-completed.ts` schreibt den Dauerzugang daraufhin.
      metadata: { user_id: user.id, plan, ...kassenRechtsMetadata },
      ...(istLifetime
        ? {}
        : { subscription_data: { metadata: { user_id: user.id, plan, ...kassenRechtsMetadata } } }),
    });

    return NextResponse.json({
      ok: true,
      clientSecret: session.client_secret,
      sessionId: session.id,
    });
  } catch (err) {
    console.error(`[create-checkout] Stripe-Session fuer ${user.id} (${plan}) fehlgeschlagen:`, err);
    return NextResponse.json({ ok: false, error: "stripe_fehler" }, { status: 502 });
  }
}
