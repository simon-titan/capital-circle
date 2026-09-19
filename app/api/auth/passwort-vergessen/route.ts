import { after, NextResponse, type NextRequest } from "next/server";
import {
  ipGedrosselt,
  istGueltigeEmail,
  normalisiereEmail,
  verschickeWiederherstellungslink,
} from "@/lib/auth/passwort-reset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Name des Honeypot-Felds — muss mit `PasswortVergessenForm` übereinstimmen. */
const HONIGTOPF = "cc_feld_website";

/** Die eine Antwort für jede gültige Anfrage — mit oder ohne Konto dahinter. */
const BESTAETIGUNG = { ok: true } as const;

function clientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

/**
 * POST /api/auth/passwort-vergessen — Link für ein neues Passwort anfordern.
 *
 * Öffentlich (`/api/*` läuft in `proxy.ts` ohne Auth-Gate).
 *
 * **Keine Kontoauskunft.** Für jede gültige Adresse kommt dieselbe Antwort,
 * und sie kommt sofort: Nachschlagen, Link erzeugen und Versand laufen in
 * `after()`, also erst nachdem die Antwort den Server verlassen hat. Liefe das
 * vorher, wäre die Antwort für bestehende Konten messbar langsamer
 * (`listUsers`, `generateLink`, Resend) — die Dauer verriete, was der Text
 * verschweigt. Einzelheiten und Grenzen: `lib/auth/passwort-reset.ts`.
 *
 * Sichtbare Ablehnungen gibt es nur für Dinge, die nicht am Konto hängen:
 * eine ungültige Adresse (400) und zu viele Anfragen von einer IP (429).
 */
export async function POST(request: NextRequest) {
  let rumpf: Record<string, unknown>;
  try {
    rumpf = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }

  // Honeypot: für Menschen unsichtbar, ohne Autofill. Wer es füllt, ist ein
  // Bot — und bekommt dieselbe Bestätigung wie alle, nur ohne Mail. Eine
  // Fehlermeldung würde ihm verraten, woran er erkannt wurde.
  const honig = rumpf[HONIGTOPF];
  if (typeof honig === "string" && honig.trim()) {
    return NextResponse.json(BESTAETIGUNG);
  }

  if (ipGedrosselt(clientIp(request))) {
    return NextResponse.json(
      {
        ok: false,
        error: "Zu viele Anfragen in kurzer Zeit. Bitte versuch es in einer Stunde noch einmal.",
      },
      { status: 429 },
    );
  }

  const email = normalisiereEmail(typeof rumpf.email === "string" ? rumpf.email : "");
  if (!istGueltigeEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "Bitte gib eine gültige E-Mail-Adresse ein." },
      { status: 400 },
    );
  }

  after(async () => {
    const ergebnis = await verschickeWiederherstellungslink(email);
    // Ohne Adresse im Log: Wer Adressen durchprobiert, soll sie nicht auch
    // noch in unseren Logs hinterlassen. Fehler protokolliert die Funktion
    // selbst, mit Ursache.
    console.info(`[passwort-vergessen] Anfrage verarbeitet: ${ergebnis}`);
  });

  return NextResponse.json(BESTAETIGUNG);
}
