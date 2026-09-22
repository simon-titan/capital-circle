import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { SITZUNGS_PARAMETER, istSitzungsKennung } from "@/lib/analytics/kaufweg";
import { CHECKOUT_COOKIE, CHECKOUT_COOKIE_MAX_AGE } from "@/lib/checkout/cookie";
import { istBot, vorabrufGrund } from "@/lib/checkout/vorabruf";
import { getAppUrl } from "@/lib/site-url";
import { getStripe } from "@/lib/stripe/server";
import { kassenRechtsangaben, kassenRechtsMetadata } from "@/lib/stripe/kasse-recht";
import { isMembershipPlan, priceIdForPlan } from "@/lib/stripe/plan-map";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Einzige Quelle der Wahrheit für Checkout-Links der Landing.
 *
 * Bewusster Gast-Checkout: kein Login nötig — Stripe sammelt die E-Mail in der
 * Kasse, das Konto entsteht danach im Webhook
 * (`lib/stripe/webhooks/subscription-updated.ts`). Wer bereits eingeloggt ist,
 * bekommt seine Adresse vorbelegt und seinen bestehenden Stripe-Customer
 * wiederverwendet; sonst entstünde bei einem Upgrade ein zweites Konto.
 *
 * `?src=` erlaubt einfache Attribution (z. B. `?src=hero`), ohne an der
 * Stripe-Konfiguration etwas zu ändern.
 *
 * ── Ein Vorabruf ist kein Kaufwille ────────────────────────────────────────
 *
 * Diese Route legt bei jedem GET eine echte Stripe-Session an. Wird sie über
 * `next/link` verlinkt, holt der Router sie vorsorglich ab, sobald die Karte
 * ins Bild kommt — und aus vier Preiskarten werden vier Kassen, ohne dass
 * jemand geklickt hat. Der Schutz ist dreifach: bare `<a href>` in der UI,
 * Kopfzeilenprüfung hier, und `/go/` in `app/robots.ts` gesperrt.
 *
 * Geantwortet wird mit **204**, nicht mit einem Fehlercode: Ein Vorabruf ist
 * kein Fehler. 204 sagt „nichts zu holen", der Browser verwirft die Antwort
 * still und navigiert beim echten Klick regulär. Ein 4xx stünde dagegen in der
 * Fehlerquote, obwohl nichts kaputt ist.
 */
function vorabrufAbweisen(request: Request, plan: string): NextResponse | null {
  const grund = vorabrufGrund(request.headers);
  if (!grund) return null;

  console.info(`[go/${plan}] Vorabruf abgewiesen (${grund}), keine Stripe-Session angelegt.`);
  return new NextResponse(null, { status: 204 });
}

/**
 * HEAD ausdrücklich beantworten.
 *
 * Next.js leitet HEAD sonst durch die GET-Funktion und wirft nur den Rumpf weg.
 * Für eine Route, die als Nebenwirkung eine Kasse anlegt, ist das der teuerste
 * denkbare Weg: Ein Linkprüfer, der nur wissen will, ob die Adresse existiert,
 * kostet uns eine Stripe-Session.
 */
export function HEAD() {
  return new NextResponse(null, { status: 204 });
}

export async function GET(request: Request, { params }: { params: Promise<{ plan: string }> }) {
  const { plan } = await params;
  const appUrl = getAppUrl();

  const abgewiesen = vorabrufAbweisen(request, plan);
  if (abgewiesen) return abgewiesen;

  if (istBot(request.headers.get("user-agent") ?? "")) {
    return new NextResponse(null, { status: 204 });
  }

  if (!isMembershipPlan(plan)) {
    return NextResponse.redirect(new URL("/?fehler=plan_unbekannt", appUrl));
  }

  let priceId: string;
  try {
    priceId = priceIdForPlan(plan);
  } catch (err) {
    console.error(`[go/${plan}] Preis-Konfiguration fehlt:`, err);
    return NextResponse.redirect(new URL("/?fehler=konfiguration", appUrl));
  }

  const anfrage = new URL(request.url);
  const src = anfrage.searchParams.get("src")?.trim().slice(0, 60) || undefined;

  /**
   * Die Sitzungskennung der Kaufweg-Messung (`?sid=`).
   *
   * Sie ist das Bindeglied zwischen „jemand war auf der Seite" und „jemand hat
   * gekauft". Ohne sie endet die Auswertung beim Klick: Man weiß, wie oft
   * geklickt wurde, aber nicht, welche Besuche zu einer Zahlung führten — und
   * damit auch nicht, welche Herkunft sich lohnt.
   *
   * `istSitzungsKennung` prüft streng auf UUID-Form. Der Wert kommt aus einem
   * Query-Parameter und landet in unserer Datenbank **und** in den
   * Stripe-Metadaten; was dort steht, soll keine fremde Zeichenkette sein.
   * Fehlt oder taugt sie nicht, wird trotzdem gekauft — die Kette reißt, der
   * Kauf nicht.
   */
  const sidRoh = anfrage.searchParams.get(SITZUNGS_PARAMETER)?.trim();
  const funnelSitzung = istSitzungsKennung(sidRoh) ? sidRoh : undefined;

  /**
   * Eingeloggte Käufer erkennen. Der Weg über `/go/` ist für Gäste gebaut, aber
   * derselbe Knopf steht im Mitgliederbereich (`/billing`, Upgrade). Ohne diese
   * Abfrage müsste ein bestehendes Mitglied seine Adresse erneut eintippen —
   * und ein Tippfehler darin wäre ein zweites Konto.
   */
  let customerId: string | null = null;
  let customerEmail: string | undefined;
  let userId: string | undefined;
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (user) {
      userId = user.id;
      customerEmail = user.email ?? undefined;
      const { data: profil } = await createServiceClient()
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .maybeSingle();
      customerId = (profil as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? null;
    }
  } catch (err) {
    // Ein kaputter Auth-Cookie darf den Kauf nicht aufhalten — dann eben als Gast.
    console.warn(`[go/${plan}] Auth-Kontext nicht lesbar, weiter als Gast:`, err);
  }

  /**
   * Ein Objekt für beide Metadata-Felder. `subscription_data.metadata` ist der
   * Grund, warum das trägt: Die Angaben hängen danach am Abo und kommen bei
   * JEDEM Subscription-Ereignis wieder mit, nicht nur beim Kauf.
   */
  const metadata: Record<string, string> = {
    plan,
    ...(src ? { src } : {}),
    ...(userId ? { user_id: userId } : {}),
    /*
      Die Sitzungskennung geht bis zu Stripe mit. Doppelter Zweck: Sie hängt
      danach am Abo und kommt bei jedem Subscription-Ereignis zurück, und sie
      ist der Rettungsanker, falls unsere eigene Trichterzeile einmal nicht
      geschrieben werden konnte.
    */
    ...(funnelSitzung ? { funnel_sitzung: funnelSitzung } : {}),
  };

  /**
   * Woher der Kauf startete. Doppelter Zweck: Auswertung („welche Seite
   * verkauft") und Ziel der Rückleitung beim Abbruch — wer aus dem
   * Mitgliederbereich kam, gehört dorthin zurück und nicht auf die Landing.
   */
  let vonPfad: string | null = null;
  try {
    const referer = request.headers.get("referer");
    if (referer) {
      const url = new URL(referer);
      if (url.host === anfrage.host) vonPfad = url.pathname.slice(0, 300);
    }
  } catch {
    // Kaputter Referer ist kein Grund, den Kauf aufzuhalten.
  }

  /**
   * Der Stripe-Aufruf ist der einzige Schritt, an dem wirklich Geld hängt —
   * und der einzige, der aus Gründen scheitern kann, die nicht im Code stehen:
   * fehlende Herkunftsadresse für Stripe Tax, abgelaufener Schlüssel,
   * deaktivierter Preis. Der Kaufwillige bekommt dann eine Weiterleitung mit
   * Kennzeichnung, keine nackte 500. Der Grund steht vollständig im
   * Serverprotokoll, denn dort und nur dort gehört er hin.
   */
  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      /*
        Mit bestehendem `customer` verlangt Stripe Tax entweder eine Adresse am
        Kunden oder `customer_update.address = "auto"` — unsere Kunden haben
        keine (angelegt nur mit E-Mail), ohne die Zeile landete jeder
        eingeloggte Kaeufer mit Stripe-Kunde auf `/?fehler=checkout`
        (Whop-Umzuegler, 22.09.2026). Bei `customer_email` ist
        `customer_update` von Stripe nicht erlaubt, daher nur in diesem Zweig.
      */
      ...(customerId
        ? { customer: customerId, customer_update: { address: "auto" as const } }
        : customerEmail
          ? { customer_email: customerEmail }
          : {}),
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      /**
       * Eigene Rückleitung statt zurück auf die Landing, damit ein Abbruch
       * belegt ist. Ohne sie ist ein Rückklick aus Stripes Kasse nicht von
       * „nie da gewesen" zu unterscheiden, und `checkout.session.expired`
       * kommt erst nach Ablauf der Session.
       *
       * Achtung: Stripe sichert die Ersetzung von `{CHECKOUT_SESSION_ID}`
       * ausdrücklich nur für `success_url` zu. `/checkout/zurueck` verlässt
       * sich deshalb nicht darauf und findet die Sitzung notfalls über das
       * Cookie, das wir unten setzen.
       */
      cancel_url: `${appUrl}/checkout/zurueck?cs={CHECKOUT_SESSION_ID}`,
      /**
       * Zwei Stunden statt der voreingestellten 24. Wirkung auf die Auswertung:
       * `checkout.session.expired` trifft am selben Tag ein, der Tagestrichter
       * ist abends vollständig statt am übernächsten Morgen. Zwei Stunden sind
       * lang genug für jeden realistischen Kauf.
       */
      expires_at: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      // Pflicht-Häkchen (AGB + sofortiger Leistungsbeginn), Laufzeit am
      // Bezahlknopf, deutsche Kasse — siehe `lib/stripe/kasse-recht.ts`.
      ...kassenRechtsangaben(appUrl, plan),
      metadata: { ...metadata, ...kassenRechtsMetadata },
      subscription_data: { metadata: { ...metadata, ...kassenRechtsMetadata } },
    });
  } catch (err) {
    console.error(`[go/${plan}] Stripe-Session konnte nicht erstellt werden:`, err);
    return NextResponse.redirect(new URL("/?fehler=checkout", appUrl));
  }

  if (!session.url) {
    console.error(`[go/${plan}] Stripe-Session ${session.id} ohne URL zurückgekommen.`);
    return NextResponse.redirect(new URL("/?fehler=checkout", appUrl));
  }

  /**
   * Trichter-Erfassung. Ohne diese Zeile ließe sich ein Kaufabbruch nicht
   * beziffern: Stripe kennt zwar jede Session, aber weder unser Plan-Kürzel
   * noch die Herkunft (`?src=`), und alle Sessions über die API abzufragen
   * wäre bei jeder Auswertung ein voller Durchlauf.
   *
   * `error` wird ausgewertet und nicht nur `try/catch` gesetzt: supabase-js
   * LIEFERT Fehler ZURÜCK, statt sie zu werfen. Ein stiller `PGRST204` (Spalte
   * gibt es nicht) sieht sonst aus wie ein Erfolg, und der Trichter steht
   * wochenlang unbemerkt auf null.
   *
   * Ein gescheitertes Protokoll hält den Kauf trotzdem nicht auf — eine
   * Statistik ist keinen verlorenen Kauf wert.
   */
  const trichterBasis = {
    id: session.id,
    plan,
    src: src ?? null,
    status: "started",
    user_id: userId ?? null,
    von_pfad: vonPfad,
  };

  const dienst = createServiceClient();
  let { error: trichterFehler } = await dienst
    .from("checkout_sessions")
    .insert({ ...trichterBasis, funnel_sitzung: funnelSitzung ?? null });

  /*
    `funnel_sitzung` kommt aus Migration 101, und die wird von Hand eingespielt
    (es gibt keine Migrationstabelle, siehe AGENTS.md). Zwischen Deployment und
    Einspielen liegt ein Fenster, in dem die Spalte fehlt. Dann wird die Zeile
    ohne sie wiederholt — dieselbe Behandlung wie beim Zustimmungsnachweis aus
    Migration 091 (`lib/stripe/webhooks/checkout-completed.ts`). Der Trichter
    darf an einer nicht eingespielten Migration nicht hängen bleiben.
  */
  if (trichterFehler && /funnel_sitzung|PGRST204/i.test(`${trichterFehler.code} ${trichterFehler.message}`)) {
    console.warn(`[go/${plan}] Sitzungskennung nicht gespeichert (Migration 101 fehlt?): ${trichterFehler.message}`);
    ({ error: trichterFehler } = await dienst.from("checkout_sessions").insert(trichterBasis));
  }

  if (trichterFehler) {
    console.warn(
      `[go/${plan}] Trichter-Eintrag fehlgeschlagen (${trichterFehler.code}): ${trichterFehler.message}`,
    );
  }

  const antwort = NextResponse.redirect(session.url, { status: 303 });
  antwort.cookies.set(CHECKOUT_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: appUrl.startsWith("https://"),
    path: "/",
    maxAge: CHECKOUT_COOKIE_MAX_AGE,
  });
  return antwort;
}
