import { after, NextResponse, type NextRequest } from "next/server";
import { hatInhaltsZugang } from "@/lib/membership";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { meldeTvAnfrage } from "@/lib/tradingview/meldung";
import {
  MIGRATION_HINWEIS,
  TV_SPALTEN,
  pruefeTvBenutzername,
  protokolliereTv,
  tabelleFehlt,
  type TvZugang,
} from "@/lib/tradingview/zugang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TradingView-Zugang des eingeloggten Mitglieds (`/tools/tradingview`).
 *
 * GET  → `{ zugang }` (oder `null`, wenn noch nichts angefragt ist)
 * POST → `{ benutzername }`: Anfrage anlegen oder den Namen ändern.
 *
 * Geschrieben wird mit dem Service-Client — die Tabelle hat nur eine
 * Lese-Policy, damit sich niemand selbst auf `aktiv` setzen kann.
 * Fehlt Migration 105, antworten beide Wege mit `fehlt: true` statt 500.
 */

async function mitglied() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const { data: profil } = await createServiceClient()
    .from("profiles")
    .select("is_paid,is_admin,full_name,username")
    .eq("id", user.id)
    .maybeSingle();
  return { user, profil };
}

export async function GET() {
  const m = await mitglied();
  if (!m) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { data, error } = await createServiceClient()
    .from("tradingview_zugaenge")
    .select(TV_SPALTEN)
    .eq("user_id", m.user.id)
    .maybeSingle();

  if (error) {
    if (tabelleFehlt(error)) return NextResponse.json({ ok: true, zugang: null, fehlt: true });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, zugang: (data as TvZugang | null) ?? null, berechtigt: hatInhaltsZugang(m.profil) });
}

export async function POST(request: NextRequest) {
  const m = await mitglied();
  if (!m) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hatInhaltsZugang(m.profil)) {
    return NextResponse.json(
      { ok: false, error: "Der Indikator ist Teil der Mitgliedschaft. Mit aktivem Zugang kannst du ihn hier anfordern." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as { benutzername?: unknown } | null;
  const geprueft = pruefeTvBenutzername(body?.benutzername);
  if (!geprueft.ok) return NextResponse.json({ ok: false, error: geprueft.fehler }, { status: 400 });

  const service = createServiceClient();
  const { data: vorhanden, error: lesefehler } = await service
    .from("tradingview_zugaenge")
    .select(TV_SPALTEN)
    .eq("user_id", m.user.id)
    .maybeSingle();

  if (lesefehler) {
    if (tabelleFehlt(lesefehler)) {
      console.error(`[tradingview] ${MIGRATION_HINWEIS}`);
      return NextResponse.json(
        { ok: false, fehlt: true, error: "Die Anfrage ist gerade nicht möglich. Bitte versuch es später noch einmal." },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: false, error: lesefehler.message }, { status: 500 });
  }

  const alt = vorhanden as TvZugang | null;
  // Nichts zu tun: derselbe Name, schon angefragt oder schon frei.
  if (alt && alt.tv_benutzername === geprueft.name && (alt.status === "angefragt" || alt.status === "aktiv")) {
    return NextResponse.json({ ok: true, zugang: alt });
  }

  const jetzt = new Date().toISOString();
  const { data: neu, error: schreibfehler } = await service
    .from("tradingview_zugaenge")
    .upsert(
      {
        user_id: m.user.id,
        tv_benutzername: geprueft.name,
        status: "angefragt",
        angefragt_am: jetzt,
        freigegeben_am: null,
        entzug_angefordert_am: null,
        entzogen_am: null,
        bearbeitet_von: null,
        updated_at: jetzt,
      },
      { onConflict: "user_id" },
    )
    .select(TV_SPALTEN)
    .single();

  if (schreibfehler) {
    return NextResponse.json({ ok: false, error: schreibfehler.message }, { status: 500 });
  }

  /*
    War unter dem alten Namen schon freigeschaltet, steht der alte Name weiter
    im Script. Er geht in die Meldung mit, damit das Team ihn austrägt.
  */
  const vorher = alt && alt.status === "aktiv" && alt.tv_benutzername !== geprueft.name ? alt.tv_benutzername : null;
  const name = (m.profil?.full_name || m.profil?.username || "").trim() || "Ohne Namen";

  after(async () => {
    await protokolliereTv(service, {
      userId: m.user.id,
      adminId: null,
      aktion: "tradingview_angefragt",
      alt: alt?.tv_benutzername ?? null,
      neu: geprueft.name,
    });
    await meldeTvAnfrage({ name, email: m.user.email ?? null, tvName: geprueft.name, vorher });
  });

  return NextResponse.json({ ok: true, zugang: neu as TvZugang });
}
