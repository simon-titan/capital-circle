import { NextResponse } from "next/server";
import { findeUserIdZuEmail } from "@/lib/checkout/user-lookup";
import { ladeTeam, requireCrm } from "@/lib/crm/zugang";

export const runtime = "nodejs";

/** GET /api/crm/team — Team mit Blöcken (alle im CRM). */
export async function GET() {
  const { service, error } = await requireCrm();
  if (error) return error;
  return NextResponse.json({ ok: true, team: await ladeTeam(service, true) });
}

const ZEIT = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * POST /api/crm/team — Mitglied anlegen oder ändern (nur Admins).
 * `{ email, name, kuerzel, calendly_email?, block_von?, block_bis?, aktiv? }`.
 * Das Konto muss existieren (Login-Mail); Closer brauchen keine Adminrechte.
 */
export async function POST(request: Request) {
  const { service, error } = await requireCrm({ nurAdmin: true });
  if (error) return error;
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 60) : "";
  const kuerzel = typeof b.kuerzel === "string" ? b.kuerzel.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30) : "";
  if (!email || !name || !kuerzel) return NextResponse.json({ ok: false, error: "felder" }, { status: 400 });
  const zeit = (v: unknown) => (typeof v === "string" && ZEIT.test(v.trim()) ? v.trim() : null);
  const von = zeit(b.block_von);
  const bis = zeit(b.block_bis);
  if ((von && !bis) || (!von && bis) || (von && bis && von >= bis)) return NextResponse.json({ ok: false, error: "block" }, { status: 400 });

  const userId = await findeUserIdZuEmail(service, email);
  if (!userId) return NextResponse.json({ ok: false, error: "kein_konto" }, { status: 404 });
  const { error: dbErr } = await service.from("crm_team").upsert(
    {
      user_id: userId,
      name,
      kuerzel,
      calendly_email: typeof b.calendly_email === "string" && b.calendly_email.trim() ? b.calendly_email.trim().toLowerCase() : null,
      block_von: von,
      block_bis: bis,
      aktiv: b.aktiv !== false,
    },
    { onConflict: "user_id" },
  );
  if (dbErr) return NextResponse.json({ ok: false, error: dbErr.code === "23505" ? "kuerzel_vergeben" : dbErr.message }, { status: 409 });
  return NextResponse.json({ ok: true, team: await ladeTeam(service, true) });
}
