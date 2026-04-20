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
  const accent = opts.ok ? "#D4AF37" : "#E5484D";
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${opts.title}</title>
</head>
<body style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#07080A;color:#F0F0F2;">
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
