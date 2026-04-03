import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Entfernt den Nutzer per Bot-Token vom Discord-Server.
 * Schlägt fehl → nur loggen, DB-Cleanup trotzdem durchführen.
 */
async function removeFromGuild(discordUserId: string): Promise<void> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId || !botToken) {
    console.warn("[discord/disconnect] DISCORD_GUILD_ID / DISCORD_BOT_TOKEN nicht gesetzt — Server-Kick übersprungen.");
    return;
  }

  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    },
  );

  // 204 = erfolgreich entfernt, 404 = war kein Mitglied (beides ok)
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const body = await res.text();
    console.error("[discord/disconnect] guild member DELETE failed:", res.status, body);
  }
}

/**
 * POST — Discord-Verknüpfung löschen + Nutzer vom Server entfernen.
 * Erfolg: JSON { ok: true }. Fehler: JSON { ok: false, error: string } mit passendem Status.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  // Discord-User-ID **vor** dem Löschen lesen
  const { data: dcRow } = await supabase
    .from("discord_connections")
    .select("discord_user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const discordUserId = (dcRow?.discord_user_id as string | null) ?? null;

  const { error: delErr } = await supabase.from("discord_connections").delete().eq("user_id", user.id);
  if (delErr) {
    return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      discord_id: null,
      discord_username: null,
      discord_access_token: null,
      discord_refresh_token: null,
    })
    .eq("id", user.id);

  if (profileErr) {
    return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 });
  }

  // Nutzer vom Discord-Server entfernen (best-effort, blockiert Antwort nicht bei Fehler)
  if (discordUserId) {
    await removeFromGuild(discordUserId);
  }

  const next = new URL(request.url).searchParams.get("next");
  const target = next?.startsWith("/") ? next : "/dashboard";
  return NextResponse.json({
    ok: true as const,
    redirect: `${target}?discord=disconnected`,
  });
}
