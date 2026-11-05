import { NextResponse, type NextRequest } from "next/server";
import {
  CLOSER_AUSWAHL,
  KASSENLINK_GUELTIG_TAGE,
  PRODUKTE,
  erlaubteRaten,
  istKassenProdukt,
} from "@/config/mentoring";
import { kassenlinkZeile, ladeKassenUebersicht, tabelleFehlt } from "@/lib/mentoring/admin";
import { KASSENLINK_SPALTEN, erzeugeKassenToken, ladeKunde, type Kassenlink } from "@/lib/mentoring/kasse";
import { getAppUrl } from "@/lib/site-url";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * GET /api/admin/kassenlinks
 * Alle Kassenlinks (neueste zuerst) und die Mentoring-Käufe mit Ratenstand.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const uebersicht = await ladeKassenUebersicht(createServiceClient(), getAppUrl());
    return NextResponse.json({ ok: true, ...uebersicht });
  } catch (err) {
    console.error("[admin/kassenlinks] Übersicht nicht ladbar:", err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

interface AnlageBody {
  produkt?: unknown;
  raten?: unknown;
  email?: unknown;
  name?: unknown;
  closer?: unknown;
  lead_id?: unknown;
  gueltig_tage?: unknown;
  notiz?: unknown;
}

const EMAIL_MUSTER = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_MUSTER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_GUELTIG_TAGE = 60;

function text(wert: unknown, max: number): string | null {
  if (typeof wert !== "string") return null;
  const t = wert.trim();
  return t ? t.slice(0, max) : null;
}

function fehler(code: string, status = 400) {
  return NextResponse.json({ ok: false, error: code }, { status });
}

/**
 * POST /api/admin/kassenlinks
 * Legt einen Kassenlink an. Der Preis kommt fest aus `config/mentoring.ts`
 * (`PRODUKTE[p].preisCents`) und wird in die Zeile geschrieben — es gibt
 * absichtlich kein Betragsfeld. Ein Rabatt wäre eine Entscheidung, die
 * jemand treffen und dokumentieren muss, kein Tippfeld im Closing-Call.
 */
export async function POST(request: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as AnlageBody | null;
  if (!body) return fehler("invalid_json");

  if (!istKassenProdukt(body.produkt)) return fehler("produkt_ungueltig");
  const produkt = body.produkt;

  // Live-Abo: immer monatlich, keine Wahl. Sonst nur, was das Produkt erlaubt.
  const raten = produkt === "live" ? 1 : Number(body.raten ?? 1);
  if (!Number.isInteger(raten) || !erlaubteRaten(produkt).includes(raten)) return fehler("raten_ungueltig");

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_MUSTER.test(email)) return fehler("email_ungueltig");

  const name = text(body.name, 120);
  const notiz = text(body.notiz, 1000);

  const closerRoh = text(body.closer, 40);
  if (closerRoh && !CLOSER_AUSWAHL.some((c) => c.id === closerRoh)) return fehler("closer_ungueltig");

  const leadId = text(body.lead_id, 64);
  if (leadId && !UUID_MUSTER.test(leadId)) return fehler("lead_ungueltig");

  const tage = body.gueltig_tage == null || body.gueltig_tage === "" ? KASSENLINK_GUELTIG_TAGE : Number(body.gueltig_tage);
  if (!Number.isInteger(tage) || tage < 1 || tage > MAX_GUELTIG_TAGE) return fehler("gueltigkeit_ungueltig");

  const service = createServiceClient();

  /*
    Das Live-Abo verlängert den Live-Bereich eines Programms; die Kasse lehnt
    es ohne Mentoring-Konto ab (`starteKasse` → `kein_mentoring_konto`). Das
    hier schon zu sagen, erspart dem Kunden einen Link, der beim Klick scheitert.
  */
  if (produkt === "live") {
    const kunde = await ladeKunde(service, email);
    if (kunde.tier !== "mentoring") return fehler("kein_mentoring_konto");
  }

  const gueltigBis = new Date(Date.now() + tage * 24 * 60 * 60 * 1000).toISOString();

  // Zwei Versuche: Eine Token-Kollision bei 144 Bit ist theoretisch, aber der
  // Unique-Index würde sie als Fehler melden, und dafür soll niemand neu tippen.
  for (let versuch = 0; versuch < 2; versuch++) {
    const { data, error: dbErr } = await service
      .from("kassenlink")
      .insert({
        token: erzeugeKassenToken(),
        produkt,
        raten,
        betrag_cents: PRODUKTE[produkt].preisCents,
        email,
        name,
        closer: closerRoh,
        lead_id: leadId,
        notiz,
        erstellt_von: user?.id ?? null,
        gueltig_bis: gueltigBis,
      })
      .select(KASSENLINK_SPALTEN)
      .single();

    if (!dbErr && data) {
      return NextResponse.json({ ok: true, item: kassenlinkZeile(data as unknown as Kassenlink, getAppUrl()) });
    }
    if (dbErr?.code === "23505" && versuch === 0) continue;
    if (tabelleFehlt(dbErr)) return fehler("migration_fehlt", 500);
    if (dbErr?.code === "23503") return fehler("lead_unbekannt");
    console.error(`[admin/kassenlinks] Anlage fehlgeschlagen: ${dbErr?.code ?? ""} ${dbErr?.message ?? "ohne Zeile"}`);
    return NextResponse.json({ ok: false, error: dbErr?.message ?? "anlage_fehlgeschlagen" }, { status: 500 });
  }

  return fehler("anlage_fehlgeschlagen", 500);
}
