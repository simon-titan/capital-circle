import { NextResponse } from "next/server";
import { requireCrm } from "@/lib/crm/zugang";
import { ladeKontaktListe } from "@/lib/crm/daten";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/crm/kontakte — alle Kontakte (gefiltert wird in der Ansicht) und das Team. */
export async function GET() {
  const { service, error } = await requireCrm();
  if (error) return error;
  try {
    return NextResponse.json({ ok: true, ...(await ladeKontaktListe(service)) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

/** POST /api/crm/kontakte — Kontakt von Hand anlegen `{ email, name?, telefon? }` (z. B. Empfehlung am Telefon). */
export async function POST(request: Request) {
  const { nutzer, service, error } = await requireCrm();
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as { email?: unknown; name?: unknown; telefon?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ ok: false, error: "email_ungueltig" }, { status: 400 });
  const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  const { data, error: dbErr } = await service
    .from("crm_kontakte")
    .insert({
      email,
      name: text(body.name, 120),
      telefon: text(body.telefon, 40),
      quelle: "manuell",
      quellen: ["manuell"],
      closer_id: nutzer.team?.user_id ?? null,
    })
    .select("id")
    .maybeSingle();
  if (dbErr) {
    if (dbErr.code === "23505") {
      const { data: da } = await service.from("crm_kontakte").select("id").eq("email", email).maybeSingle();
      return NextResponse.json({ ok: true, id: (da as { id: string } | null)?.id, schonDa: true });
    }
    return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
}
