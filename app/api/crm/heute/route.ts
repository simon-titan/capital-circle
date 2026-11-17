import { NextResponse } from "next/server";
import { ladeHeute } from "@/lib/crm/daten";
import { requireCrm } from "@/lib/crm/zugang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/crm/heute — die heutigen Termine (Berlin) mit Kontakt und Closer. */
export async function GET() {
  const { service, error } = await requireCrm();
  if (error) return error;
  return NextResponse.json({ ok: true, ...(await ladeHeute(service)) });
}
