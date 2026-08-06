import { NextRequest, NextResponse } from "next/server";
import { verifyContactUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { getResend } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8" } as const;

/**
 * Unsubscribe-Variante für Kampagnen-Empfänger ohne (garantierte) `profiles`-
 * Zeile (z. B. `whop_migration`, Empfänger aus einem Resend-Segment). Anders
 * als `/api/unsubscribe` (userId-Token) trägt das Token hier die Email-Adresse
 * direkt — die Abmeldung greift auf Resend selbst (unsubscribed=true am
 * Contact, sperrt alle künftigen Segment-/Broadcast-Sends). Bewusst KEIN
 * Abgleich gegen `profiles`: die Tabelle hat keine `email`-Spalte (die liegt
 * in `auth.users`), ein Lookup dafür bräuchte einen vollen `listUsers()`-Scan
 * pro Klick — für ein Best-effort-Flag nicht gerechtfertigt. Resend bleibt
 * hier die alleinige Quelle der Wahrheit.
 */
function htmlPage(opts: { title: string; heading: string; body: string; ok: boolean }): string {
  const accent = opts.ok ? "#FFFFFF" : "#C8102E";
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${opts.title}</title>
</head>
<body style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#0A0A0C;color:#F0F0F2;">
  <div style="max-width:520px;margin:0 auto;padding:80px 24px;text-align:center;">
    <h1 style="font-family:Georgia,serif;color:${accent};font-weight:400;font-size:28px;letter-spacing:0.02em;margin:0 0 16px;">
      ${opts.heading}
    </h1>
    <p style="color:#9A9AA4;font-size:15px;line-height:1.6;margin:0;">
      ${opts.body}
    </p>
    <p style="margin:48px 0 0;font-size:11px;color:#606068;letter-spacing:0.04em;text-transform:uppercase;">
      Capital Circle
    </p>
  </div>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse(
      htmlPage({
        title: "Token fehlt",
        heading: "Link unvollständig",
        body: "Der Abmelde-Link ist nicht vollständig. Bitte öffne den Link aus der Email erneut.",
        ok: false,
      }),
      { status: 400, headers: HTML_HEADERS },
    );
  }

  const email = verifyContactUnsubscribeToken(token);
  if (!email) {
    return new NextResponse(
      htmlPage({
        title: "Ungültiger Token",
        heading: "Link ungültig",
        body: "Dieser Abmelde-Link konnte nicht verifiziert werden. Möglicherweise wurde er manipuliert oder ist veraltet.",
        ok: false,
      }),
      { status: 400, headers: HTML_HEADERS },
    );
  }

  try {
    const resend = getResend();
    const { error } = await resend.contacts.update({ email, unsubscribed: true });
    if (error && error.name !== "not_found") {
      throw new Error(error.message ?? "Resend: unbekannter Fehler");
    }
  } catch (err) {
    console.error("[unsubscribe/contact] fehlgeschlagen:", err);
    return new NextResponse(
      htmlPage({
        title: "Fehler",
        heading: "Etwas ist schiefgelaufen",
        body: "Wir konnten die Abmeldung nicht speichern. Bitte versuche es später erneut oder antworte direkt auf eine unserer Emails.",
        ok: false,
      }),
      { status: 500, headers: HTML_HEADERS },
    );
  }

  return new NextResponse(
    htmlPage({
      title: "Abgemeldet",
      heading: "Erfolgreich abgemeldet",
      body: "Du erhältst keine weiteren Marketing-Emails von Capital Circle. Wichtige System-Mails erhältst du weiterhin, solange dein Konto aktiv ist.",
      ok: true,
    }),
    { status: 200, headers: HTML_HEADERS },
  );
}
