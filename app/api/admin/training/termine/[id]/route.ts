import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { setzeTerminStatus, type TerminAktion } from "@/lib/mailsystem/termine";

export const runtime = "nodejs";

const AKTIONEN: TerminAktion[] = ["no_show", "gefuehrt", "gebucht", "abgesagt_kunde", "kein_interesse", "abgesagt_team"];

/**
 * POST /api/admin/training/termine/[id] — der Closer hält fest, was mit dem
 * Gespräch passiert ist (Playbook Kapitel 12):
 *   `no_show`        bestätigter No-Show (erst nach dem Beginn) → N01 +24 h, N02 +72 h
 *   `gefuehrt`       Gespräch geführt → alle Vorverkaufs-/No-Show-Mails zu
 *   `gebucht`        No-Show zurücknehmen (verspätet erschienen, technischer Fehler)
 *   `abgesagt_kunde` Absage am Telefon → R02
 *   `kein_interesse` Absage ohne Interesse → R02 ohne Neubuchung
 *   `abgesagt_team`  wir sagen ab → R03
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin();
  if (error || !user) return error;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { aktion?: string };
  if (!AKTIONEN.includes(body.aktion as TerminAktion)) return NextResponse.json({ ok: false, error: "aktion" }, { status: 400 });
  const r = await setzeTerminStatus(createServiceClient(), id, body.aktion as TerminAktion, user.id);
  return NextResponse.json(r.ok ? { ok: true } : { ok: false, error: r.fehler }, { status: r.ok ? 200 : 409 });
}
