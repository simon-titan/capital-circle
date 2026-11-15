import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TradingBlueprintAnsicht } from "@/components/platform/blueprint/TradingBlueprintAnsicht";
import { BLUEPRINT_PFAD, blueprintTexte } from "@/config/free-bereich";
import { buildManifestUrl, buildThumbnailUrl } from "@/lib/cloudflare-stream";
import { createClient } from "@/lib/supabase/server";
import { ladeBlueprintFreigabe } from "@/lib/training/blueprint-freigabe";
import { groesseText, ladeBlueprint } from "@/lib/trading-blueprint";

export const metadata: Metadata = { title: blueprintTexte.meta };
export const dynamic = "force-dynamic";
// jsonwebtoken (RS256) für die signierte Wiedergabe braucht Node-crypto.
export const runtime = "nodejs";

/**
 * Trading Blueprint (Free-Ansicht nach Emres Mockup, 08.11.2026) — für alle
 * angemeldeten Konten, Free wie Zahlende. Das PDF und die optionale
 * Videoanleitung pflegt der Admin unter `/admin/training/blueprint`.
 *
 * Das Video ist signiert wie die Kursvideos (`requireSignedURLs`); die Seite
 * holt bei jedem Aufruf eine frische, vier Stunden gültige Adresse — dasselbe
 * Muster wie `/termin/vorbereitung`.
 */
export default async function TradingBlueprintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent(BLUEPRINT_PFAD)}`);

  const [params, blueprint, freigabe] = await Promise.all([searchParams, ladeBlueprint(), ladeBlueprintFreigabe(supabase, data.user.id)]);
  // Free ohne abgeschlossenen Kurs: keine signierten Adressen erzeugen, die Ansicht zeigt die Sperre.
  const sperre = freigabe.frei ? null : { gesehen: freigabe.gesehen, gesamt: freigabe.gesamt };

  let video: { src: string | null; poster: string | null } | null = null;
  if (blueprint.video_uid && !sperre) {
    try {
      video = {
        src: buildManifestUrl(blueprint.video_uid, { signed: true, ttlSeconds: 4 * 60 * 60 }),
        poster: buildThumbnailUrl(blueprint.video_uid, { signed: true, ttlSeconds: 4 * 60 * 60, width: 1280 }),
      };
    } catch (err) {
      console.error("[trading-blueprint] Signatur fehlgeschlagen:", err);
      video = { src: null, poster: null };
    }
  }

  return (
    <TradingBlueprintAnsicht
      untertitel={blueprint.titel ?? blueprintTexte.untertitel}
      beschreibung={blueprint.beschreibung ?? blueprintTexte.beschreibung}
      pdf={blueprint.r2_key ? { groesse: groesseText(blueprint.groesse) } : null}
      video={video}
      dateiFehler={params.fehler === "datei"}
      sperre={sperre}
    />
  );
}
