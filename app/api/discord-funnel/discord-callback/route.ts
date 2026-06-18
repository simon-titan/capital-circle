import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAppUrl } from "@/lib/email/resend";

export const runtime = "nodejs";

/**
 * Bei bereits beigetretenen Mitgliedern ignoriert Discord `roles` im
 * Add-Member-Body (204) — Rolle separat per PUT setzen.
 * (Spiegelt `app/api/discord/callback/route.ts`.)
 */
async function assignMemberRole(
  guildId: string,
  botToken: string,
  discordUserId: string,
  roleId: string,
): Promise<void> {
  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
    { method: "PUT", headers: { Authorization: `Bot ${botToken}` } },
  );
  if (!res.ok && res.status !== 204) {
    console.error("[discord-funnel/callback] assign role failed:", res.status, await res.text());
  }
}

/**
 * GET /api/discord-funnel/discord-callback?code=…&state={leadToken}
 *
 * OAuth-Callback für den Funnel-Beitritt. Fügt den Lead via Bot zum Server
 * hinzu UND weist die feste Funnel-Rolle (DISCORD_FUNNEL_ROLE_ID) zu, schreibt
 * Discord-Identität + `discord_joined_at` auf den Lead und leitet zurück in den Funnel.
 */
export async function GET(request: Request) {
  const base = getAppUrl();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token = (searchParams.get("state") ?? "").trim();
  const oauthError = searchParams.get("error");

  // Nach dem Connect landet der Nutzer auf der /discord-Erfolgsseite
  // (die Termin-Buchung wird intern in Discord beworben, nicht hier).
  const backToFunnel = (params: string) =>
    NextResponse.redirect(new URL(`/discord?${params}`, base));

  if (!token) {
    return NextResponse.redirect(new URL("/discord", base));
  }
  if (oauthError) {
    return backToFunnel("discord=error");
  }
  if (!code) {
    return backToFunnel("discord=error");
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const roleId = process.env.DISCORD_FUNNEL_ROLE_ID;

  if (!clientId || !clientSecret) {
    return backToFunnel("discord=not_configured");
  }

  const service = createServiceClient();

  // Token muss zu einem echten Lead gehören.
  const { data: lead } = await service
    .from("discord_leads")
    .select("token")
    .eq("token", token)
    .maybeSingle();
  if (!lead) {
    return NextResponse.redirect(new URL("/discord", base));
  }

  // 1) Code gegen Access-Token tauschen.
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${base}/api/discord-funnel/discord-callback`,
    }),
  });
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenRes.ok || !tokenData.access_token) {
    return backToFunnel("discord=error");
  }

  // 2) Discord-User abrufen.
  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const discordUser = (await userRes.json()) as {
    id?: string;
    username?: string;
    global_name?: string | null;
  };
  if (!userRes.ok || !discordUser.id) {
    return backToFunnel("discord=error");
  }

  const displayName =
    discordUser.global_name?.trim() || discordUser.username || discordUser.id;

  // 3) Zum Server hinzufügen + feste Funnel-Rolle zuweisen.
  if (guildId && botToken && roleId) {
    const memberRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordUser.id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ access_token: tokenData.access_token, roles: [roleId] }),
      },
    );

    if (memberRes.status === 204) {
      // Bereits Mitglied: `roles` im Body wird ignoriert → Rolle explizit setzen.
      await assignMemberRole(guildId, botToken, discordUser.id, roleId);
    } else if (!memberRes.ok) {
      console.error(
        "[discord-funnel/callback] guild member PUT failed:",
        memberRes.status,
        await memberRes.text(),
      );
    }
  } else {
    console.warn(
      "[discord-funnel/callback] DISCORD_GUILD_ID / DISCORD_BOT_TOKEN / DISCORD_FUNNEL_ROLE_ID nicht gesetzt — Join/Rolle übersprungen.",
    );
  }

  // 4) Join auf dem Lead festhalten.
  const { error: updateErr } = await service
    .from("discord_leads")
    .update({
      discord_user_id: discordUser.id,
      discord_username: displayName,
      discord_joined_at: new Date().toISOString(),
    })
    .eq("token", token);
  if (updateErr) {
    console.error("[discord-funnel/callback] lead update failed:", updateErr);
  }

  return backToFunnel("discord=joined");
}
