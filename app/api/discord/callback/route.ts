import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { addGuildMember, discordBotConfigured } from "@/lib/discord/api";
import { hatZugangLautProfil, mitgliedsRolleId, setzeMitgliedsrolle } from "@/lib/discord/mitgliedschaft";
import { protokolliere, stempleSchritt } from "@/lib/onboarding/server";

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
  const roleId = mitgliedsRolleId();

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL("/dashboard?discord=error&reason=oauth_not_configured", siteUrl()));
  }

  let service;
  try {
    service = createServiceClient();
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard?discord=error&reason=service_role_not_configured", siteUrl()),
    );
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

  /*
    Beitritt und Rolle über `lib/discord/api.ts`, also mit der Wartelogik bei
    429 — ein Beitritt, der genau in eine Drosselung läuft, wird sonst nirgends
    wiederholt.

    Die Rolle wird danach immer einzeln gesetzt: Bei 204 („war schon drin")
    ignoriert Discord das `roles`-Feld im Rumpf, und auf 201 statt 204 ist bei
    aktiver Mitgliedschaftsprüfung kein Verlass. `setzeMitgliedsrolle` nimmt
    dabei eine eventuelle Warteraumrolle mit ab.

    Die Rolle gibt es nur mit Zugang laut Profil (`hatZugang`: `is_paid` oder
    Admin, dieselbe Regel wie bei den Inhalten). Der
    Einstieg `/api/discord/connect` prüft das zwar schon, aber zwischen dem
    Klick und diesem Rücksprung kann ein Zahlungsfall gesperrt haben — dann
    tritt die Person bei, bekommt aber keine Mitgliederrolle.
  */
  if (discordBotConfigured() && roleId) {
    try {
      let zugang = false;
      try {
        zugang = await hatZugangLautProfil(service, user.id);
      } catch (err) {
        console.error("[discord/callback] Zugang nicht prüfbar, Beitritt ohne Rolle:", err);
      }
      const beitritt = await addGuildMember(discordUser.id, tokenData.access_token, zugang ? [roleId] : []);
      if (beitritt.art === "fehler") {
        console.error("[discord/callback] guild member PUT failed:", beitritt.status, beitritt.text);
      } else if (zugang) {
        await setzeMitgliedsrolle(discordUser.id, true);
      }
    } catch (err) {
      console.error("[discord/callback] Beitritt/Rolle fehlgeschlagen:", err);
    }
  } else {
    console.warn(
      "[discord/callback] DISCORD_GUILD_ID / DISCORD_BOT_TOKEN / DISCORD_ROLE_ID nicht gesetzt. Server-Join übersprungen.",
    );
  }

  const { data: upserted, error: upsertErr } = await service
    .from("discord_connections")
    .upsert(
      {
        user_id: user.id,
        discord_user_id: discordUser.id,
        discord_username: displayName,
        // Keine OAuth-Tokens speichern: Sie werden nur oben für den Server-
        // Beitritt gebraucht, danach liest sie niemand mehr. Migration 077
        // leert die bisher gespeicherten.
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("user_id")
    .maybeSingle();

  if (upsertErr) {
    return NextResponse.redirect(
      new URL(`/dashboard?discord=error&reason=${encodeURIComponent(upsertErr.message)}`, siteUrl()),
    );
  }

  if (!upserted?.user_id) {
    console.error("[discord/callback] discord_connections upsert returned no row");
    return NextResponse.redirect(
      new URL("/dashboard?discord=error&reason=discord_connection_not_saved", siteUrl()),
    );
  }

  const { data: profileRows, error: profileErr } = await service
    .from("profiles")
    .update({
      discord_id: discordUser.id,
      discord_username: displayName,
    })
    .eq("id", user.id)
    .select("id");

  if (profileErr) {
    console.error("[discord/callback] profiles update:", profileErr);
    return NextResponse.redirect(
      new URL(
        `/dashboard?discord=error&reason=${encodeURIComponent(profileErr.message)}`,
        siteUrl(),
      ),
    );
  }

  if (!profileRows?.length) {
    console.error("[discord/callback] profiles update affected 0 rows for user", user.id);
    return NextResponse.redirect(
      new URL("/dashboard?discord=error&reason=profile_not_updated", siteUrl()),
    );
  }

  // Start-Checkliste: Schritt 1 abhaken und messen. Wirft nie (Migration 107 evtl. noch nicht da).
  if (await stempleSchritt(service, user.id, "discord_verbunden_am")) {
    await protokolliere(service, user.id, "onboarding_discord_connected");
  }

  return NextResponse.redirect(new URL("/dashboard?discord=connected", siteUrl()));
}
