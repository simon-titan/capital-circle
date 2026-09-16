import { NextResponse } from "next/server";
import { CHECKOUT_COOKIE } from "@/lib/checkout/cookie";
import { getAppUrl } from "@/lib/site-url";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rückleitung aus Stripes Kasse, wenn nicht gekauft wurde.
 *
 * Ohne diese Route wäre ein Abbruch erst über `checkout.session.expired`
 * belegbar — bei zwei Stunden Laufzeit also frühestens zwei Stunden später.
 * Bis dahin stünde die Zeile auf `started` und zählte weder als Kauf noch als
 * Abbruch. Wer wissen will, wo die Leute aussteigen, bekäme die Antwort immer
 * zu spät.
 *
 * **Die Seite ist kein Selbstzweck.** Sie schreibt eine Zeile und leitet
 * dorthin weiter, wo der Kauf begann. Der Kunde merkt davon nichts, außer dass
 * er nicht irgendwo landet, sondern auf der Seite, die er verlassen hat.
 *
 * **`/checkout/zurueck` muss in `PUBLIC_PATHS` stehen** (`proxy.ts`). Ohne den
 * Eintrag schickt die Auth-Weiche jeden Abbrecher auf `/login` — das wäre nicht
 * nur eine kaputte Messung, sondern ein verlorener Kunde.
 */
export async function GET(request: Request) {
  const appUrl = getAppUrl();
  const ausQuery = new URL(request.url).searchParams.get("cs")?.trim();

  /**
   * Zwei Wege zur richtigen Zeile, und der zweite ist kein Beiwerk: Stripe
   * dokumentiert die Ersetzung von `{CHECKOUT_SESSION_ID}` nur für
   * `success_url`. Kommt der Platzhalter unersetzt an, ist das Cookie die
   * Quelle, das `/go/<plan>` beim Start gesetzt hat.
   */
  const ausCookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((teil) => teil.trim())
    .find((teil) => teil.startsWith(`${CHECKOUT_COOKIE}=`))
    ?.slice(CHECKOUT_COOKIE.length + 1);

  const sessionId = ausQuery?.startsWith("cs_") ? ausQuery : ausCookie?.startsWith("cs_") ? ausCookie : null;

  let ziel = "/#angebot";

  if (sessionId) {
    try {
      const supabase = createServiceClient();
      const { data: zeile } = await supabase
        .from("checkout_sessions")
        .select("id,von_pfad")
        .eq("id", sessionId)
        .maybeSingle();

      const vonPfad = (zeile as { von_pfad?: string | null } | null)?.von_pfad ?? null;
      if (vonPfad?.startsWith("/")) ziel = vonPfad;

      /**
       * `.eq("status", "started")` ist die eigentliche Absicherung: Der
       * Zurück-Link steht im Browserverlauf des Kunden. Wird er nach einem
       * später doch getätigten Kauf noch einmal aufgerufen, darf er den Kauf
       * nicht nachträglich in einen Abbruch verwandeln.
       */
      const { error: updateFehler } = await supabase
        .from("checkout_sessions")
        .update({ status: "canceled", abgebrochen_am: new Date().toISOString() })
        .eq("id", sessionId)
        .eq("status", "started");

      if (updateFehler) {
        console.warn(`[checkout/zurueck] Abbruch nicht gespeichert: ${updateFehler.message}`);
      }
    } catch (err) {
      // Der Kunde muss weitergeleitet werden, auch wenn die Messung scheitert.
      console.warn("[checkout/zurueck] Abbruch nicht gespeichert:", err);
    }
  }

  const antwort = NextResponse.redirect(new URL(ziel, appUrl), { status: 303 });
  antwort.cookies.delete(CHECKOUT_COOKIE);
  return antwort;
}
