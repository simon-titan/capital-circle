import { NextResponse } from "next/server";
import { hatInhaltsZugang } from "@/lib/membership";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { MIGRATION_HINWEIS, TV_SPALTEN, tabelleFehlt, type TvZugang } from "@/lib/tradingview/zugang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/tradingview — alle TradingView-Anfragen und -Zugänge.
 *
 * Neueste Änderung zuerst. Name aus `profiles`, E-Mail aus `auth.users`
 * (eine `listUsers`-Seite — dieselbe Obergrenze wie die Mitgliederliste).
 * `zahlend` zeigt dem Team, ob jemand mit offener Anfrage inzwischen gar
 * keinen Zugang mehr hat; der Nachtlauf räumt das ohnehin auf.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const service = createServiceClient();
  const { data, error: dbFehler } = await service
    .from("tradingview_zugaenge")
    .select(TV_SPALTEN)
    .order("updated_at", { ascending: false })
    .limit(1000);

  if (dbFehler) {
    return NextResponse.json(
      { ok: false, error: tabelleFehlt(dbFehler) ? MIGRATION_HINWEIS : dbFehler.message },
      { status: 500 },
    );
  }

  const zeilen = (data ?? []) as TvZugang[];
  const ids = zeilen.map((z) => z.user_id);

  const [profileRes, usersRes] = await Promise.all([
    ids.length
      ? service.from("profiles").select("id,full_name,username,is_paid,is_admin").in("id", ids)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; username: string | null; is_paid: boolean | null; is_admin: boolean | null }[] }),
    service.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const profile = new Map(
    ((profileRes.data ?? []) as { id: string; full_name: string | null; username: string | null; is_paid: boolean | null; is_admin: boolean | null }[]).map(
      (p) => [p.id, p],
    ),
  );
  const emails = new Map((usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? null]));

  const items = zeilen.map((z) => {
    const p = profile.get(z.user_id);
    return {
      ...z,
      name: (p?.full_name || p?.username || "").trim() || "Ohne Namen",
      email: emails.get(z.user_id) ?? null,
      zahlend: hatInhaltsZugang(p),
    };
  });

  return NextResponse.json({ ok: true, items });
}
