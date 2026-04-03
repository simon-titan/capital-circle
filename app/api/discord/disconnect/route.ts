import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST — Discord-Verknüpfung löschen (kein GET: vermeidet Prefetch/Crawler).
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

  const next = new URL(request.url).searchParams.get("next");
  const target = next?.startsWith("/") ? next : "/dashboard";
  return NextResponse.json({
    ok: true as const,
    redirect: `${target}?discord=disconnected`,
  });
}
