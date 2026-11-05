import { NextResponse, type NextRequest } from "next/server";
import { FUNNEL_QUELLE_TRAINING, TRAINING_VIDEOS_PFAD } from "@/config/training";
import { findeUserIdZuEmail } from "@/lib/checkout/user-lookup";
import { sendTrainingBestaetigen } from "@/lib/email/templates/training";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { getAppUrl } from "@/lib/site-url";
import { createServiceClient } from "@/lib/supabase/service";
import { ermittleKanal, saeubereHerkunft } from "@/lib/training/herkunft";

export const runtime = "nodejs";

/**
 * POST /api/training/registrieren — kostenlose Registrierung über `/training`.
 *
 * Body: `{ name, email, password, turnstileToken? }`
 *
 * Ablauf:
 *   1. Prüfen (Felder, Turnstile, einfache Drossel je IP).
 *   2. `generateLink({ type: "signup" })` legt das Konto **unbestätigt** an
 *      und liefert den `hashed_token`. Supabase verschickt dabei selbst nichts.
 *   3. Profil: Herkunft `training`, Zeitpunkt, Name (Service-Client — die
 *      Spalten setzt nie der Browser).
 *   4. Bestätigungsmail über Resend. Der Link geht über `/auth/confirm`
 *      (`verifyOtp`, Sitzung in den Cookies) direkt zu den Videos.
 *
 * Gibt es die Adresse schon:
 *   - unbestätigt → neuer Link (Magic Link) und dieselbe Mail. Wer die erste
 *     Mail verloren hat, registriert sich einfach noch einmal.
 *   - bestätigt → `schon_registriert`; die Seite verweist auf den Login.
 *
 * `application_status` bleibt **null**: Mit `pending` schickte der Proxy das
 * Konto auf `/pending-review` (alter Bewerbungsweg).
 */

const FENSTER_MS = 10 * 60 * 1000;
const MAX_JE_FENSTER = 6;
const versuche = new Map<string, number[]>();

function gedrosselt(ip: string | null): boolean {
  if (!ip) return false;
  const jetzt = Date.now();
  const liste = (versuche.get(ip) ?? []).filter((t) => jetzt - t < FENSTER_MS);
  liste.push(jetzt);
  versuche.set(ip, liste);
  return liste.length > MAX_JE_FENSTER;
}

function clientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

function bestaetigungsLink(tokenHash: string, typ: "signup" | "magiclink"): string {
  const url = new URL("/auth/confirm", getAppUrl());
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", typ);
  url.searchParams.set("next", TRAINING_VIDEOS_PFAD);
  return url.toString();
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "ungueltig" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : null;
  // Woher (YouTube, Instagram, …) — fehlt sie, zählt die Registrierung als „direkt".
  const herkunft = saeubereHerkunft(body.herkunft) ?? {
    kanal: ermittleKanal(null, null),
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    referrer: null,
    erfasst_am: new Date().toISOString(),
  };

  const feldFehler: Record<string, true> = {};
  if (name.length < 2) feldFehler.name = true;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) feldFehler.email = true;
  if (password.length < 8 || password.length > 72) feldFehler.passwort = true;
  if (Object.keys(feldFehler).length > 0) {
    return NextResponse.json({ ok: false, error: "felder", felder: feldFehler }, { status: 400 });
  }

  const ip = clientIp(request);
  if (gedrosselt(ip)) return NextResponse.json({ ok: false, error: "zu_oft" }, { status: 429 });

  const turnstile = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstile.ok) return NextResponse.json({ ok: false, error: "turnstile" }, { status: 403 });

  const service = createServiceClient();
  const vorname = name.split(/\s+/)[0] || name;
  const redirectTo = `${getAppUrl()}/auth/confirm`;

  let userId: string | null = null;
  let link: string;

  const { data: signup, error: signupFehler } = await service.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { data: { full_name: name }, redirectTo },
  });

  if (!signupFehler && signup?.properties?.hashed_token && signup.user) {
    userId = signup.user.id;
    link = bestaetigungsLink(signup.properties.hashed_token, "signup");
  } else {
    // Adresse vergeben? Dann bestätigt oder nicht?
    let vorhandenId: string | null = null;
    try {
      vorhandenId = await findeUserIdZuEmail(service, email);
    } catch (err) {
      console.error("[training/registrieren] Konto-Suche fehlgeschlagen:", err);
    }
    if (!vorhandenId) {
      console.error("[training/registrieren] generateLink(signup) fehlgeschlagen:", signupFehler?.message);
      return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
    }
    const { data: vorhanden } = await service.auth.admin.getUserById(vorhandenId);
    if (vorhanden?.user?.email_confirmed_at) {
      return NextResponse.json({ ok: false, error: "schon_registriert" }, { status: 409 });
    }
    // Unbestätigt: Passwort auf das neue setzen (sonst gälte das der ersten
    // Registrierung, das der Nutzer vielleicht nicht mehr weiß) und neu verlinken.
    await service.auth.admin.updateUserById(vorhandenId, { password, user_metadata: { full_name: name } });
    const { data: magic, error: magicFehler } = await service.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    if (magicFehler || !magic?.properties?.hashed_token) {
      console.error("[training/registrieren] generateLink(magiclink) fehlgeschlagen:", magicFehler?.message);
      return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
    }
    userId = vorhandenId;
    link = bestaetigungsLink(magic.properties.hashed_token, "magiclink");
  }

  /*
    Profil nachziehen. Die Zeile legt der Trigger aus Migration 003 an; ohne
    Migration 109 fehlen die beiden Spalten — dann wenigstens den Namen
    setzen, die Registrierung soll daran nicht scheitern.
  */
  const jetzt = new Date().toISOString();
  const { error: profilFehler } = await service
    .from("profiles")
    .update({
      full_name: name,
      funnel_quelle: FUNNEL_QUELLE_TRAINING,
      training_registriert_am: jetzt,
      funnel_herkunft: herkunft,
    })
    .eq("id", userId)
    .is("training_registriert_am", null);
  if (profilFehler) {
    console.error("[training/registrieren] Profil nicht gesetzt (Migration 109 eingespielt?):", profilFehler.message);
    await service.from("profiles").update({ full_name: name }).eq("id", userId);
  }

  try {
    await sendTrainingBestaetigen({ an: email, vorname, link });
  } catch (err) {
    console.error("[training/registrieren] Bestätigungsmail fehlgeschlagen:", err);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
