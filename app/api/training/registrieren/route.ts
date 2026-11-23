import { NextResponse, type NextRequest } from "next/server";
import { FUNNEL_QUELLE_TRAINING, TRAINING_STATUS_PFAD } from "@/config/training";
import { findeUserIdZuEmail } from "@/lib/checkout/user-lookup";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { bewerbungAnlegen, bewerbungEingegangen } from "@/lib/training/bewerbung";
import { pruefeBewerbung } from "@/lib/training/bewerbung-pruefen";
import { ermittleKanal, saeubereHerkunft } from "@/lib/training/herkunft";

export const runtime = "nodejs";

/**
 * POST /api/training/registrieren — Bewerbung für das kostenlose Training
 * über `/training` (seit 07.11.2026, E-Mail-Playbook 1.0: erst bewerben, Emre
 * entscheidet). Legt das Konto an **und** die Bewerbung.
 *
 * Body: `{ name, email, password, turnstileToken?, herkunft?, antworten,
 *          kontaktGewuenscht, telefon? }`
 *
 * Kein Lernzugang durch bloßes Absenden: Das Konto bekommt erst mit Emres
 * Annahme einen `training_zugang`.
 *
 * **Keine E-Mail-Bestätigung** (Entscheidung Simon, 20.11.2026): Das Konto
 * wird direkt bestätigt angelegt (`email_confirm: true`), die Bewerbung geht
 * sofort an Emre (`bewerbungEingegangen`: A01, Team-Mail, Kontakt-Lead), und
 * der Bewerber ist danach angemeldet (Sitzung in den Cookies).
 *
 * Gibt es die Adresse schon:
 *   - unbestätigt (Altbestand aus der Zeit mit Bestätigungslink) → Passwort
 *     und Name neu setzen, Adresse bestätigen, weiter wie oben.
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

  const pruefung = pruefeBewerbung(body);
  const feldFehler: Record<string, true> = pruefung.ok ? {} : { ...pruefung.felder };
  if (name.length < 2) feldFehler.name = true;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) feldFehler.email = true;
  if (password.length < 8 || password.length > 72) feldFehler.passwort = true;
  if (Object.keys(feldFehler).length > 0 || !pruefung.ok) {
    return NextResponse.json({ ok: false, error: "felder", felder: feldFehler }, { status: 400 });
  }

  const ip = clientIp(request);
  if (gedrosselt(ip)) return NextResponse.json({ ok: false, error: "zu_oft" }, { status: 429 });

  const turnstile = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstile.ok) return NextResponse.json({ ok: false, error: "turnstile" }, { status: 403 });

  const service = createServiceClient();

  let userId: string | null = null;

  const { data: neu, error: neuFehler } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });

  if (!neuFehler && neu?.user) {
    userId = neu.user.id;
  } else {
    // Adresse vergeben? Dann bestätigt oder nicht?
    let vorhandenId: string | null = null;
    try {
      vorhandenId = await findeUserIdZuEmail(service, email);
    } catch (err) {
      console.error("[training/registrieren] Konto-Suche fehlgeschlagen:", err);
    }
    if (!vorhandenId) {
      console.error("[training/registrieren] createUser fehlgeschlagen:", neuFehler?.message);
      return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
    }
    const { data: vorhanden } = await service.auth.admin.getUserById(vorhandenId);
    if (vorhanden?.user?.email_confirmed_at) {
      return NextResponse.json({ ok: false, error: "schon_registriert" }, { status: 409 });
    }
    // Unbestätigt (Altbestand): Passwort auf das neue setzen (sonst gälte das der
    // ersten Registrierung, das der Nutzer vielleicht nicht mehr weiß) und bestätigen.
    const { error: updFehler } = await service.auth.admin.updateUserById(vorhandenId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (updFehler) {
      console.error("[training/registrieren] Altkonto nicht bestätigt:", updFehler.message);
      return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
    }
    userId = vorhandenId;
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

  // Bewerbung — gibt es schon eine (Altkonto mit unbestätigter Adresse), bleibt die erste stehen.
  const angelegt = await bewerbungAnlegen(service, {
    userId: userId!,
    name,
    email,
    antworten: pruefung.antworten,
    kontaktGewuenscht: pruefung.kontaktGewuenscht,
    telefon: pruefung.telefon,
    kanal: herkunft.kanal,
  });
  if (!angelegt.ok && angelegt.fehler === "server") {
    // „tabelle_fehlt" (Migration 110 fehlt) geht durch: Konto wie bisher.
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }

  // Bewerbung kommt sofort bei Emre an (A01, Team-Mail, Kontakt-Lead). Wirft nicht.
  if (angelegt.ok || angelegt.fehler === "schon_beworben") {
    try {
      await bewerbungEingegangen(service, userId!);
    } catch (err) {
      console.error("[training/registrieren] Eingang der Bewerbung fehlgeschlagen:", err);
    }
  }

  // Direkt anmelden: Die Sitzung landet in den Cookies, die Seite leitet auf die Statusseite.
  let angemeldet = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    angemeldet = !error;
    if (error) console.error("[training/registrieren] Anmeldung fehlgeschlagen:", error.message);
  } catch (err) {
    console.error("[training/registrieren] Anmeldung fehlgeschlagen:", err);
  }

  return NextResponse.json({ ok: true, angemeldet, weiter: TRAINING_STATUS_PFAD });
}
