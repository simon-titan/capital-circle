import { NextResponse } from "next/server";
import { ladeAuswertung } from "@/lib/crm/daten";
import { requireCrm } from "@/lib/crm/zugang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/crm/auswertung?von=YYYY-MM-DD&bis=YYYY-MM-DD — je Closer: Termine, Show-Rate, Abschlüsse, Umsatz. */
export async function GET(request: Request) {
  const { service, error } = await requireCrm();
  if (error) return error;
  const url = new URL(request.url);
  const heute = new Date();
  const von = url.searchParams.get("von") ? new Date(`${url.searchParams.get("von")}T00:00:00Z`) : new Date(Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth(), 1));
  const bis = url.searchParams.get("bis") ? new Date(new Date(`${url.searchParams.get("bis")}T00:00:00Z`).getTime() + 86_400_000) : new Date(heute.getTime() + 86_400_000);
  if (Number.isNaN(von.getTime()) || Number.isNaN(bis.getTime())) return NextResponse.json({ ok: false, error: "datum" }, { status: 400 });
  return NextResponse.json({ ok: true, ...(await ladeAuswertung(service, von, bis)) });
}
