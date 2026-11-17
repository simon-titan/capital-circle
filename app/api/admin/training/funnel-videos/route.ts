import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { buildThumbnailUrl, getCloudflareStreamMisconfiguration, getVideoStatus, setRequireSignedUrls } from "@/lib/cloudflare-stream";
import {
  FUNNEL_PLAETZE,
  FUNNEL_PLATZ_INFO,
  FUNNEL_VIDEOS_SCHLUESSEL,
  FUNNEL_VORGABE,
  ladeFunnelVideos,
  pruefeFunnelEingabe,
  type FunnelPlatz,
} from "@/lib/funnel-videos";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { ladeBlueprint } from "@/lib/trading-blueprint";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Funnel-Videos im Admin (`lib/funnel-videos.ts`, Karte in `/admin/training/videos`).
 *
 * GET → je Platz das aktuelle Video mit Name, Dauer und Standbild
 * PUT { platz, uid, posterSekunde } → zuordnen; `uid: null` = zurück auf die Vorgabe.
 *     Das Video wird auf **unsignierte** Wiedergabe gestellt (statische Seite) und
 *     die Seite neu erzeugt. Kurs-, Live- und Blueprint-Videos werden abgelehnt:
 *     Die liefen sonst ohne Anmeldung frei abrufbar.
 */

async function beschreibe(platz: FunnelPlatz, uid: string, posterSekunde: number, ausAdmin: boolean) {
  let name: string | null = null;
  let dauer: number | null = null;
  let status: string | null = null;
  try {
    const s = await getVideoStatus(uid);
    name = s.name;
    dauer = s.durationSeconds;
    status = s.state;
  } catch {
    status = "nicht_gefunden";
  }
  let vorschau: string | null = null;
  try {
    vorschau = buildThumbnailUrl(uid, { signed: false, timeSeconds: posterSekunde, width: 480 });
  } catch {
    // Ohne Stream-Subdomain keine Vorschau.
  }
  return {
    platz,
    ...FUNNEL_PLATZ_INFO[platz],
    uid,
    posterSekunde,
    ausAdmin,
    istVorgabe: uid === FUNNEL_VORGABE[platz].uid,
    name,
    dauer,
    status,
    vorschau,
  };
}

async function antwort() {
  const { videos, ausAdmin } = await ladeFunnelVideos();
  const plaetze = await Promise.all(
    FUNNEL_PLAETZE.map((p) => beschreibe(p, videos[p].uid, videos[p].posterSekunde, ausAdmin[p])),
  );
  return { ok: true as const, plaetze };
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  return NextResponse.json(await antwort());
}

/** Wo hängt das Video sonst? Leere Liste = frei für die Landingpage. */
async function anderweitigVerwendet(uid: string): Promise<string[]> {
  const service = createServiceClient();
  const [{ data: kurs }, { data: live }, blueprint] = await Promise.all([
    service.from("videos").select("id").eq("cloudflare_uid", uid).limit(1),
    service.from("live_session_videos").select("id").eq("cloudflare_uid", uid).limit(1),
    ladeBlueprint(),
  ]);
  const wo: string[] = [];
  if (kurs?.length) wo.push("einem Kurs bzw. dem kostenlosen Training");
  if (live?.length) wo.push("einer Live-Session");
  if (blueprint.video_uid === uid) wo.push("dem Trading Blueprint");
  return wo;
}

export async function PUT(request: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const cfgErr = getCloudflareStreamMisconfiguration();
  if (cfgErr) return NextResponse.json({ ok: false, error: cfgErr }, { status: 503 });

  const eingabe = pruefeFunnelEingabe(await request.json().catch(() => null));
  if (!eingabe.ok) return NextResponse.json({ ok: false, error: eingabe.fehler }, { status: 400 });
  const { platz, wert } = eingabe;
  const ziel = wert ?? FUNNEL_VORGABE[platz];

  const wo = await anderweitigVerwendet(ziel.uid);
  if (wo.length) {
    return NextResponse.json(
      {
        ok: false,
        error: `Dieses Video hängt schon in ${wo.join(" und ")} und ist dort geschützt. Auf der Landingpage wäre es frei abrufbar — bitte ein eigenes Video hochladen.`,
      },
      { status: 409 },
    );
  }

  try {
    const s = await getVideoStatus(ziel.uid);
    if (s.state !== "ready") {
      return NextResponse.json(
        { ok: false, error: `Das Video ist in Cloudflare noch nicht fertig (Status: ${s.state}).` },
        { status: 409 },
      );
    }
    await setRequireSignedUrls(ziel.uid, false);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unbekannter Fehler";
    return NextResponse.json({ ok: false, error: `Video nicht gefunden oder nicht umstellbar (${msg}).` }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: alt } = await service.from("app_settings").select("value").eq("key", FUNNEL_VIDEOS_SCHLUESSEL).maybeSingle();
  const vorher = ((alt as { value?: unknown } | null)?.value ?? {}) as Record<string, unknown>;
  const neu: Record<string, unknown> = { ...vorher, aktualisiert_am: new Date().toISOString() };
  if (wert) neu[platz] = wert;
  else delete neu[platz];

  const { error: dbErr } = await service
    .from("app_settings")
    .upsert({ key: FUNNEL_VIDEOS_SCHLUESSEL, value: neu, updated_by: user?.id ?? null }, { onConflict: "key" });
  if (dbErr) return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });

  // Statische Seiten: beim nächsten Aufruf neu erzeugen.
  revalidatePath(FUNNEL_PLATZ_INFO[platz].pfad);
  if (platz === "call") revalidatePath("/vorschau/mentoring/call");

  return NextResponse.json(await antwort());
}
