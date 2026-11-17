import { NextResponse, type NextRequest } from "next/server";
import { requireCrm } from "@/lib/crm/zugang";
import { berechneDashboard, ladeRohdaten } from "@/lib/finanzen/dashboard";
import { filterAusParams } from "@/lib/finanzen/filter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/crm/provision?zeitraum=30 — Sicht der Closer (Tracking-Playbook 3):
 * teamweiter Vergleich (Calls, Show-up, Close Rate, Verkaufssumme) und die
 * **eigene** Provision. Keine vollen Finanzdetails: kein Zahlungseingang und
 * keine Provision anderer Closer.
 */
export async function GET(request: NextRequest) {
  const { nutzer, service, error } = await requireCrm();
  if (error) return error;
  const filter = { ...filterAusParams(request.nextUrl.searchParams), funnel: "alle" as const, quelle: "alle", produkt: "alle" as const, closer: "all" };
  const d = berechneDashboard(await ladeRohdaten(service), filter);
  const ich = nutzer.team?.user_id ?? null;
  const team = d.vertrieb.closer.map((c) => ({
    closerId: c.closerId,
    name: c.name,
    ich: c.closerId === ich,
    gebucht: c.gebucht,
    held: c.held,
    noShow: c.noShow,
    showUp: c.showUp,
    closeRate: c.closeRate,
    closeZaehler: c.closeZaehler,
    closeNenner: c.closeNenner,
    orders: c.orders,
    verkaufBruttoCents: c.verkaufBruttoCents,
  }));
  const eigene = d.finanzen.provision.eintraege
    .filter((p) => ich && p.closerId === ich)
    .map((p) => ({ id: p.id, art: p.art, produkt: p.produkt, betragCents: p.betragCents, basisNettoCents: p.basisNettoCents, status: p.status, periode: p.periode, entstandenAm: p.entstandenAm, ausgezahltAm: p.ausgezahltAm }));
  const summe = d.finanzen.provision.jeCloser.find((c) => c.closerId === ich) ?? null;
  return NextResponse.json({ ok: true, migration114: d.stand.migration114, zeitraum: d.filter.zeitraum, team, eigene, summe, istCloser: Boolean(ich) });
}
