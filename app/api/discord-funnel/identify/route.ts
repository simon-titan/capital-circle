import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/email/resend";

export const runtime = "nodejs";

/**
 * GET /api/discord-funnel/identify
 *
 * Einstieg für die intern in Discord beworbene Termin-Seite (Link ohne Lead-Token).
 * Identifiziert den Discord-User per OAuth (`scope=identify`), damit der Buchende
 * im Callback dem ursprünglichen Lead zugeordnet werden kann.
 *
 * Öffentlich (kein Auth).
 */
export async function GET() {
  const base = getAppUrl();

  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { ok: false, error: "Discord OAuth ist nicht konfiguriert (DISCORD_CLIENT_ID)." },
      { status: 500 },
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${base}/api/discord-funnel/identify-callback`,
    response_type: "code",
    scope: "identify",
    state: "termin",
  });

  return NextResponse.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
}
