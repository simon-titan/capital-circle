import { NextResponse } from "next/server";
import { synchronisiereCrm } from "@/lib/crm/sync";
import { requireCrm } from "@/lib/crm/zugang";

export const runtime = "nodejs";
export const maxDuration = 120;

/** POST /api/crm/sync — Knopf „Aktualisieren": Quellen jetzt abgleichen (sonst alle 5 Minuten per Cron). */
export async function POST() {
  const { service, error } = await requireCrm();
  if (error) return error;
  try {
    return NextResponse.json({ ok: true, ...(await synchronisiereCrm(service)) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
