import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { reconcileDiscordRoles } from "@/lib/discord/reconcile";

/** POST — Discord-Rollen-Bestandsabgleich. Body `{ apply: boolean }` (Default `false` = Dry-Run). */
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let apply = false;
  try {
    const body = (await request.json()) as { apply?: boolean };
    apply = Boolean(body.apply);
  } catch {
    // Kein/leerer Body → Dry-Run
  }

  try {
    const result = await reconcileDiscordRoles({ apply, triggeredBy: "admin" });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler beim Bestandsabgleich.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
