import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAppUrl } from "@/lib/email/resend";

export const runtime = "nodejs";

/**
 * GET /api/discord-funnel/identify-callback?code=…&state=termin
 *
 * OAuth-Callback (`scope=identify`) für die intern beworbene Termin-Seite.
 * Löst den Discord-User auf, ordnet ihn dem bestehenden Lead zu (per
 * discord_user_id) oder legt einen minimalen Lead an, und leitet auf
 * `/discord/termin?lid={token}` weiter — wodurch die Calendly-Buchung exakt
 * diesem Lead zugeordnet wird (utm_content = token).
 */
export async function GET(request: Request) {
  const base = getAppUrl();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  // Ohne Identifikation kein Token → trotzdem Termin-Seite (Attribution dann nur per Calendly-E-Mail).
  if (oauthError || !code) {
    return NextResponse.redirect(new URL("/discord/termin?discord=identify_failed", base));
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/discord/termin?discord=not_configured", base));
  }

  // 1) Code → Access-Token
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${base}/api/discord-funnel/identify-callback`,
    }),
  });
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenRes.ok || !tokenData.access_token) {
    return NextResponse.redirect(new URL("/discord/termin?discord=identify_failed", base));
  }

  // 2) Discord-User abrufen
  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const discordUser = (await userRes.json()) as {
    id?: string;
    username?: string;
    global_name?: string | null;
  };
  if (!userRes.ok || !discordUser.id) {
    return NextResponse.redirect(new URL("/discord/termin?discord=identify_failed", base));
  }

  const displayName =
    discordUser.global_name?.trim() || discordUser.username || discordUser.id;

  const service = createServiceClient();

  // 3) Lead per discord_user_id auflösen.
  const { data: existing } = await service
    .from("discord_leads")
    .select("token")
    .eq("discord_user_id", discordUser.id)
    .maybeSingle();

  let token = typeof existing?.token === "string" ? existing.token : null;

  // 4) Kein Lead vorhanden (Member kam nicht über /discord) → minimalen Lead anlegen.
  if (!token) {
    token = crypto.randomUUID();
    const { error: insertErr } = await service.from("discord_leads").insert({
      token,
      name: displayName,
      email: "",
      phone: "",
      discord_user_id: discordUser.id,
      discord_username: displayName,
      discord_joined_at: new Date().toISOString(),
      utm_source: "discord-intern",
      source_origin: "discord_funnel",
    });
    if (insertErr) {
      console.error("[discord-funnel/identify-callback] lead insert failed:", insertErr);
      return NextResponse.redirect(new URL("/discord/termin?discord=identify_failed", base));
    }
  }

  return NextResponse.redirect(
    new URL(`/discord/termin?lid=${encodeURIComponent(token)}`, base),
  );
}
