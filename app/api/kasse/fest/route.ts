import { NextResponse, type NextRequest } from "next/server";
import { gueltigerCloser, istFestesProdukt, oeffneFestenLink } from "@/lib/mentoring/fester-link";
import { getAppUrl } from "@/lib/site-url";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Fester Kassenlink (`/kasse/main`, `/kasse/premium`): legt aus Name, E-Mail und
 * Raten einen persönlichen Kassenlink an und antwortet mit dessen Pfad.
 * Regeln in `lib/mentoring/fester-link.ts`.
 *
 * Body: `{ produkt, raten, email, name, closer?, vertrag: true, website? }`
 * (`website` ist ein verstecktes Feld; ausgefüllt = Bot, still verworfen).
 */

const FENSTER_MS = 10 * 60 * 1000;
const MAX_JE_FENSTER = 8;
const versuche = new Map<string, number[]>();

function gedrosselt(ip: string | null): boolean {
  if (!ip) return false;
  const jetzt = Date.now();
  const liste = (versuche.get(ip) ?? []).filter((t) => jetzt - t < FENSTER_MS);
  liste.push(jetzt);
  versuche.set(ip, liste);
  return liste.length > MAX_JE_FENSTER;
}

function clientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "ungueltig" }, { status: 400 });
  }

  if (!istFestesProdukt(body.produkt)) return NextResponse.json({ ok: false, error: "produkt_ungueltig" }, { status: 400 });
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: false, error: "ungueltig" }, { status: 400 });
  }
  if (body.vertrag !== true) return NextResponse.json({ ok: false, error: "vertrag_fehlt" }, { status: 400 });
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2) return NextResponse.json({ ok: false, error: "name_ungueltig" }, { status: 400 });

  if (gedrosselt(clientIp(request))) return NextResponse.json({ ok: false, error: "zu_oft" }, { status: 429 });

  const r = await oeffneFestenLink(
    createServiceClient(),
    { produkt: body.produkt, raten: body.raten, email: body.email, name, closer: gueltigerCloser(body.closer) },
    getAppUrl(),
  );
  if (!r.ok) return NextResponse.json({ ok: false, error: r.fehler }, { status: r.status });
  return NextResponse.json({ ok: true, pfad: `/kasse/${r.token}` });
}
