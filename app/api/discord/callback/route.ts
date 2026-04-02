import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (oauthError) {
    return NextResponse.redirect(
      new URL(
        `/dashboard?discord=error&reason=${encodeURIComponent(errorDescription ?? oauthError)}`,
        siteUrl(),
      ),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/dashboard?discord=error&reason=missing_code", siteUrl()));
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const roleId = process.env.DISCORD_ROLE_ID;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL("/dashboard?discord=error&reason=oauth_not_configured", siteUrl()));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?discord=callback_needs_login", siteUrl()));
  }

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokenData.access_token) {
    const msg = tokenData.error_description ?? tokenData.error ?? "token_exchange_failed";
    return NextResponse.redirect(new URL(`/dashboard?discord=error&reason=${encodeURIComponent(msg)}`, siteUrl()));
  }

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const discordUser = (await userRes.json()) as {
    id?: string;
    username?: string;
    global_name?: string | null;
  };

  if (!userRes.ok || !discordUser.id) {
    return NextResponse.redirect(new URL("/dashboard?discord=error&reason=discord_user_failed", siteUrl()));
  }

  const displayName =
    discordUser.global_name?.trim() ||
    discordUser.username ||
    discordUser.id;

  if (guildId && botToken && roleId) {
    const memberRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordUser.id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: tokenData.access_token,
          roles: [roleId],
        }),
      },
    );

    if (!memberRes.ok && memberRes.status !== 204) {
      const errBody = await memberRes.text();
      console.error("[discord/callback] guild member PUT failed:", memberRes.status, errBody);
    }
  } else {
    console.warn("[discord/callback] DISCORD_GUILD_ID / DISCORD_BOT_TOKEN / DISCORD_ROLE_ID nicht gesetzt — Server-Join übersprungen.");
  }

  const { error: upsertErr } = await supabase.from("discord_connections").upsert(
    {
      user_id: user.id,
      discord_user_id: discordUser.id,
      discord_username: displayName,
      discord_access_token: tokenData.access_token,
      discord_refresh_token: tokenData.refresh_token ?? null,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (upsertErr) {
    return NextResponse.redirect(
      new URL(`/dashboard?discord=error&reason=${encodeURIComponent(upsertErr.message)}`, siteUrl()),
    );
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      discord_id: discordUser.id,
      discord_username: displayName,
      discord_access_token: tokenData.access_token,
      discord_refresh_token: tokenData.refresh_token ?? null,
    })
    .eq("id", user.id);

  if (profileErr) {
    console.error("[discord/callback] profiles update:", profileErr);
  }

  return NextResponse.redirect(new URL("/dashboard?discord=connected", siteUrl()));
}
