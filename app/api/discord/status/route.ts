import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * GET /api/discord/status — Zustand der Discord-Verknüpfung für die
 * Seitennavigation.
 *
 * Bewusst schmal: nur „darf verbinden“, „ist verbunden“ und der Anzeigename.
 * Tokens und die Discord-User-ID bleiben draußen, die braucht die Navigation
 * nicht und sie hätten im Client nichts verloren.
 *
 * `eligible` spiegelt die Regel aus `/api/discord/connect`: Free-Mitglieder
 * werden dort abgewiesen. Ohne dieses Feld böte die Sidebar ihnen einen Weg an,
 * der sie nur mit `?discord=error&reason=paid_only` zurückwirft.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ ok: false, eligible: false, connected: false, username: null }, { status: 401 });
  }

  const [{ data: profile }, { data: connection }] = await Promise.all([
    supabase.from("profiles").select("is_paid").eq("id", auth.user.id).maybeSingle(),
    supabase.from("discord_connections").select("discord_username").eq("user_id", auth.user.id).maybeSingle(),
  ]);

  const username = (connection as { discord_username: string | null } | null)?.discord_username?.trim() || null;

  return NextResponse.json({
    ok: true,
    eligible: Boolean((profile as { is_paid: boolean | null } | null)?.is_paid),
    connected: Boolean(connection),
    username,
  });
}
