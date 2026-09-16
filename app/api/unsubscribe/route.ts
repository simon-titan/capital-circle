import { NextRequest, NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8" } as const;

function htmlPage(opts: {
  title: string;
  heading: string;
  body: string;
  ok: boolean;
}): string {
  // Werte aus DESIGN.md v3.2 „Champagner auf Graphit“ als Literale: diese Seite lädt globals.css nicht.
  // Kein Webfont-Request (DSGVO) — Inter, falls lokal vorhanden, sonst Systemschrift.
  const headingColor = opts.ok ? "#e8c094" : "#f87171";
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>${opts.title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 16px;
      font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: #f2f3f5;
      background:
        radial-gradient(ellipse 55% 42% at 80% -6%, rgba(212, 176, 128, 0.17), transparent 70%),
        radial-gradient(ellipse 38% 34% at 8% 108%, rgba(212, 176, 128, 0.07), transparent 70%),
        #12171c;
    }
    .card {
      position: relative;
      width: 100%;
      max-width: 480px;
      padding: 40px 28px;
      text-align: center;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.07);
      background: linear-gradient(180deg, rgba(27, 32, 38, 0.94) 0%, rgba(24, 29, 34, 0.94) 100%);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }
    .card::before {
      content: "";
      position: absolute;
      top: -1px;
      left: 16%;
      right: 16%;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(232, 192, 148, 0.7), transparent);
    }
    .wordmark {
      margin: 0 0 24px;
      font-size: 13px;
      line-height: 1;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: #a3a9b0;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 26px;
      font-weight: 600;
      line-height: 1.2;
      letter-spacing: -0.01em;
    }
    .body {
      margin: 0;
      font-size: 15px;
      line-height: 1.6;
      color: #a3a9b0;
    }
  </style>
</head>
<body>
  <main class="card">
    <p class="wordmark">Capital Circle</p>
    <h1 style="color:${headingColor};">${opts.heading}</h1>
    <p class="body">${opts.body}</p>
  </main>
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

  const userId = verifyUnsubscribeToken(token);
  if (!userId) {
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

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("profiles")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    console.error("[unsubscribe] DB-Update fehlgeschlagen:", error);
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
      body: "Du erhältst keine weiteren Marketing-Emails von Capital Circle. Wichtige System-Mails (z. B. Zahlungs-Bestätigungen) erhältst du weiterhin, solange dein Konto aktiv ist.",
      ok: true,
    }),
    { status: 200, headers: HTML_HEADERS },
  );
}
