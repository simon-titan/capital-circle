import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { setRequireSignedUrls } from "@/lib/cloudflare-stream";
import { deleteObject, getObjectSize, getPresignedPutUrl, getStorageMisconfiguration } from "@/lib/storage";
import { funnelSperrHinweis } from "@/lib/funnel-videos";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  BLUEPRINT_MAX_BYTES,
  BLUEPRINT_ORDNER,
  BLUEPRINT_SCHLUESSEL,
  ladeBlueprint,
  pruefeBlueprintEingabe,
} from "@/lib/trading-blueprint";

export const runtime = "nodejs";

/**
 * Trading Blueprint im Admin (`/admin/training/blueprint`, `lib/trading-blueprint.ts`).
 *
 * GET  → gespeicherter Stand
 * POST { dateiname, groesse } → Presigned PUT für ein neues PDF in R2
 *      (der Browser lädt direkt hoch, kein Vercel-Body-Limit)
 * PUT  { r2_key, dateiname, groesse, video_uid, titel, beschreibung } → speichern
 *      (Upsert in `app_settings`, keine Migration). Ein ersetztes PDF wird danach
 *      aus R2 gelöscht; eine neue Video-UID auf signierte Wiedergabe gestellt.
 */

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  return NextResponse.json({ ok: true, blueprint: await ladeBlueprint() });
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const cfgErr = getStorageMisconfiguration();
  if (cfgErr) return NextResponse.json({ ok: false, error: cfgErr }, { status: 503 });

  let body: { dateiname?: unknown; groesse?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const dateiname = typeof body.dateiname === "string" ? body.dateiname.trim() : "";
  const groesse = typeof body.groesse === "number" ? body.groesse : 0;
  if (!/\.pdf$/i.test(dateiname)) {
    return NextResponse.json({ ok: false, error: "Bitte eine PDF-Datei hochladen." }, { status: 400 });
  }
  if (groesse <= 0 || groesse > BLUEPRINT_MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: `Die Datei darf höchstens ${BLUEPRINT_MAX_BYTES / (1024 * 1024)} MB groß sein.` },
      { status: 400 },
    );
  }

  const sicher = dateiname.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  const storageKey = `${BLUEPRINT_ORDNER}/${randomUUID()}/${sicher}`;
  try {
    const presignedUrl = await getPresignedPutUrl(storageKey, "application/pdf");
    return NextResponse.json({ ok: true, presignedUrl, storageKey });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "presign_failed";
    console.error("[admin/training/blueprint] presign:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const eingabe = pruefeBlueprintEingabe(body);
  if (!eingabe.ok) return NextResponse.json({ ok: false, error: eingabe.fehler }, { status: 400 });
  const wert = { ...eingabe.wert };

  // Das PDF muss wirklich in R2 liegen — sonst stünde ein Knopf auf eine fehlende Datei da.
  if (wert.r2_key) {
    const groesse = await getObjectSize(wert.r2_key);
    if (groesse === null) {
      return NextResponse.json(
        { ok: false, error: "Die Datei ist in R2 nicht angekommen. Bitte noch einmal hochladen." },
        { status: 400 },
      );
    }
    wert.groesse = groesse || wert.groesse;
  }

  const vorher = await ladeBlueprint();
  const hinweise: string[] = [];

  // Direkt im Cloudflare-Dashboard hochgeladene Videos sind unsigniert abrufbar —
  // wie bei den Trainingsvideos auf signierte Wiedergabe stellen.
  if (wert.video_uid && wert.video_uid !== vorher.video_uid) {
    const sperre = await funnelSperrHinweis(wert.video_uid);
    if (sperre) return NextResponse.json({ ok: false, error: sperre }, { status: 409 });
    try {
      await setRequireSignedUrls(wert.video_uid, true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unbekannter Fehler";
      return NextResponse.json(
        { ok: false, error: `Video nicht gefunden oder nicht umstellbar (${msg}). UID prüfen.` },
        { status: 400 },
      );
    }
  }

  const gespeichert = { ...wert, aktualisiert_am: new Date().toISOString() };
  const { error: dbErr } = await createServiceClient()
    .from("app_settings")
    .upsert({ key: BLUEPRINT_SCHLUESSEL, value: gespeichert, updated_by: user?.id ?? null }, { onConflict: "key" });
  if (dbErr) return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 });

  // Altes PDF erst nach erfolgreichem Speichern löschen.
  if (vorher.r2_key && vorher.r2_key !== wert.r2_key) {
    try {
      await deleteObject(vorher.r2_key);
    } catch (e) {
      console.warn("[admin/training/blueprint] altes PDF nicht gelöscht:", e);
      hinweise.push("Das vorherige PDF konnte nicht aus R2 gelöscht werden.");
    }
  }

  return NextResponse.json({ ok: true, blueprint: await ladeBlueprint(), hinweise });
}
