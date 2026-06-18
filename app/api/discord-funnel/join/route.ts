import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAppUrl } from "@/lib/email/resend";

export const runtime = "nodejs";

/**
 * GET /api/discord-funnel/join?lid={token}
 *
 * Einstieg in den Discord-Beitritt für einen Funnel-Lead. Leitet zum
 * Discord-OAuth-Consent weiter (`scope=identify guilds.join`). Der Lead-Token
 * reist als `state` mit und wird im Callback zur Zuordnung + Rollenvergabe genutzt.
 *
 * Öffentlich (kein Auth) — der Token identifiziert den Lead.
 */
export async function GET(request: NextRequest) {
  const base = getAppUrl();
  const lid = (new URL(request.url).searchParams.get("lid") ?? "").trim();

  if (!lid) {
    return NextResponse.redirect(new URL("/discord", base));
  }

  // Token muss zu einem echten Lead gehören (verhindert Open-Redirect-Missbrauch).
  const service = createServiceClient();
  const { data: lead } = await service
    .from("discord_leads")
    .select("token")
    .eq("token", lid)
    .maybeSingle();

  if (!lead) {
    return NextResponse.redirect(new URL("/discord", base));
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { ok: false, error: "Discord OAuth ist nicht konfiguriert (DISCORD_CLIENT_ID)." },
      { status: 500 },
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${base}/api/discord-funnel/discord-callback`,
    response_type: "code",
    scope: "identify guilds.join",
    state: lid,
  });

  return NextResponse.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
}
