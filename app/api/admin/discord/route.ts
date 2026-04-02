import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY oder NEXT_PUBLIC_SUPABASE_URL fehlt.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

type AdminDiscordRow = {
  userId: string;
  name: string;
  email: string;
  discordUsername: string | null;
  discordUserId: string | null;
  connectedAt: string | null;
  connected: boolean;
};

/** GET — alle Profile mit Discord-Verknüpfung (auth.users + profiles + discord_connections) */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const service = getServiceClient();

  const [usersRes, profilesRes, dcRes] = await Promise.all([
    service.auth.admin.listUsers({ perPage: 500 }),
    service.from("profiles").select("id, full_name, username, created_at"),
    service.from("discord_connections").select("user_id, discord_username, discord_user_id, connected_at"),
  ]);

  if (usersRes.error) {
    return NextResponse.json({ ok: false, error: usersRes.error.message }, { status: 500 });
  }
  if (profilesRes.error) {
    return NextResponse.json({ ok: false, error: profilesRes.error.message }, { status: 500 });
  }
  if (dcRes.error) {
    return NextResponse.json({ ok: false, error: dcRes.error.message }, { status: 500 });
  }

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id as string, p]));
  const dcMap = new Map((dcRes.data ?? []).map((d) => [d.user_id as string, d]));

  const rows: AdminDiscordRow[] = (usersRes.data.users ?? []).map((u) => {
    const p = profileMap.get(u.id);
    const dc = dcMap.get(u.id);
    const full = (p?.full_name as string | null)?.trim();
    const un = (p?.username as string | null)?.trim();
    const name = full || un || "—";
    return {
      userId: u.id,
      name,
      email: u.email ?? "",
      discordUsername: (dc?.discord_username as string | null) ?? null,
      discordUserId: (dc?.discord_user_id as string | null) ?? null,
      connectedAt: (dc?.connected_at as string | null) ?? null,
      connected: Boolean(dc?.discord_user_id),
    };
  });

  rows.sort((a, b) => a.email.localeCompare(b.email, "de"));

  return NextResponse.json({ ok: true, rows });
}
