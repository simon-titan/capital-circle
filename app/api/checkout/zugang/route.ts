import { NextResponse } from "next/server";
import { ladeKaufStatus } from "@/lib/checkout/kauf-status";
import { stempleProfil } from "@/lib/onboarding/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dieselbe Grenze wie im Formular — eine Regel, zwei Stellen. */
const MIN_LAENGE = 8;

/**
 * Zugang direkt nach dem Kauf aktivieren: Passwort setzen und einloggen.
 *
 * ── Der Ausweis und seine Grenzen ───────────────────────────────────────────
 * Die Stripe-Checkout-Session weist den Käufer aus. Ein Passwort zu setzen
 * wiegt allerdings schwer, deshalb drei Bedingungen, die **alle gleichzeitig**
 * gelten müssen (geprüft in `ladeKaufStatus`):
 *
 *   1. Die Session ist bezahlt.
 *   2. Sie ist höchstens 24 Stunden alt.
 *   3. Es gab an diesem Konto noch nie eine Anmeldung.
 *
 * Die dritte ist die eigentliche Sperre: Sobald hier eingeloggt wurde, steht
 * `last_sign_in_at`, und die Checkout-URL ist als Ausweis wertlos. Ohne diese
 * Bedingung könnte jemand, der die URL in die Hände bekommt, das Passwort
 * eines fremden, bezahlten Kontos überschreiben.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    sessionId?: string;
    passwort?: string;
  };

  const passwort = body.passwort ?? "";
  if (passwort.length < MIN_LAENGE) {
    return NextResponse.json({ ok: false, fehler: `Mindestens ${MIN_LAENGE} Zeichen.` }, { status: 400 });
  }

  const status = await ladeKaufStatus(body.sessionId);

  if (!status.ok) {
    // `account_pending` ist ein Wettlauf mit dem Webhook, kein Fehler des
    // Nutzers — eigener Status, damit die Seite „gleich nochmal" sagen kann
    // statt „das hat nicht geklappt".
    const httpStatus = status.grund === "account_pending" ? 409 : 400;
    return NextResponse.json({ ok: false, grund: status.grund }, { status: httpStatus });
  }

  if (status.zugangAktiv) {
    return NextResponse.json({ ok: false, grund: "bereits_aktiv" }, { status: 409 });
  }

  // Passwort über die Admin-API setzen — es gibt an dieser Stelle noch keine
  // Sitzung, mit der `updateUser` funktionieren würde.
  const service = createServiceClient();
  const { error: setzFehler } = await service.auth.admin.updateUserById(status.userId, {
    password: passwort,
  });

  if (setzFehler) {
    console.error("[checkout/zugang] Passwort setzen fehlgeschlagen:", setzFehler.message);
    return NextResponse.json({ ok: false, fehler: setzFehler.message }, { status: 500 });
  }

  // Merker für die Start-Checkliste im Dashboard („Zugang absichern" entfällt). Wirft nie.
  await stempleProfil(service, status.userId, "passwort_gesetzt_am");

  /**
   * Direkt anmelden — mit dem Passwort, das wir gerade selbst gesetzt haben.
   *
   * Bewusst so und nicht über `generateLink` + `verifyOtp` wie beim Mail-Weg:
   * Dort ist der Umweg nötig, weil das Passwort unbekannt ist. Hier kennen wir
   * es, und `signInWithPassword` schreibt die Sitzung über den SSR-Client
   * direkt in die Cookies. Ein Token weniger, der ablaufen kann.
   */
  const supabase = await createClient();
  const { error: loginFehler } = await supabase.auth.signInWithPassword({
    email: status.email,
    password: passwort,
  });

  if (loginFehler) {
    // Das Passwort steht bereits — der Kunde kommt also über die Login-Seite
    // hinein. Deshalb kein 500, sondern ein ehrlicher Teilerfolg.
    console.error("[checkout/zugang] Anmeldung nach Passwortvergabe fehlgeschlagen:", loginFehler.message);
    return NextResponse.json({ ok: true, eingeloggt: false });
  }

  return NextResponse.json({ ok: true, eingeloggt: true });
}
