import { callVideo } from "@/config/call-funnel";
import { landingVideo } from "@/config/training";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Die Videos der öffentlichen Funnel-Seiten, im Admin austauschbar
 * (`/admin/training/videos`, Karte „Funnel-Videos“; Wunsch Simon 14.11.2026).
 *
 * Gespeichert **ohne Migration** in `app_settings` unter `funnel_videos`
 * (Upsert, Muster wie `lib/trading-blueprint.ts`). Fehlt die Zeile oder ein
 * Platz, gilt die Vorgabe aus der Config (`landingVideo`, `callVideo`).
 *
 * Diese Videos sind **unsigniert**: Die Seiten sind statisch, ein Token liefe ab.
 * Deshalb darf ein Funnel-Video nie zugleich Kurs-, Live- oder Blueprint-Video
 * sein — die stellen ihre Videos auf signierte Wiedergabe, und die Landingpage
 * wäre schwarz (bzw. umgekehrt läge ein Kursvideo offen). `istFunnelVideo` und
 * `pruefeFunnelKandidat` sichern beide Richtungen ab.
 */

export const FUNNEL_VIDEOS_SCHLUESSEL = "funnel_videos";

export const FUNNEL_PLAETZE = ["training", "call"] as const;
export type FunnelPlatz = (typeof FUNNEL_PLAETZE)[number];

export const FUNNEL_PLATZ_INFO: Record<FunnelPlatz, { titel: string; pfad: string; beschreibung: string }> = {
  training: {
    titel: "Landingpage /training",
    pfad: "/training",
    beschreibung: "Video im Hero der Free-Kurs-Bewerbung.",
  },
  call: {
    titel: "VSL /call",
    pfad: "/call",
    beschreibung: "Video im Hero des Call-Funnels (mit Ton, wird getrackt).",
  },
};

export type FunnelVideo = { uid: string; posterSekunde: number };
export type FunnelVideos = Record<FunnelPlatz, FunnelVideo>;

export const FUNNEL_VORGABE: FunnelVideos = {
  training: { uid: landingVideo.uid, posterSekunde: landingVideo.posterSekunde },
  call: { uid: callVideo.uid, posterSekunde: callVideo.posterSekunde },
};

const UID_RE = /^[0-9a-f]{32}$/i;
export const POSTER_MAX_SEKUNDE = 3600;

function lesePlatz(roh: unknown): FunnelVideo | null {
  if (!roh || typeof roh !== "object") return null;
  const v = roh as Record<string, unknown>;
  const uid = typeof v.uid === "string" ? v.uid.trim().toLowerCase() : "";
  if (!UID_RE.test(uid)) return null;
  const s = typeof v.posterSekunde === "number" && Number.isFinite(v.posterSekunde) ? Math.round(v.posterSekunde) : 0;
  return { uid, posterSekunde: Math.min(Math.max(s, 0), POSTER_MAX_SEKUNDE) };
}

/** Gespeicherter Wert → je Platz Admin-Auswahl, sonst Vorgabe. */
export function leseFunnelVideos(roh: unknown): { videos: FunnelVideos; ausAdmin: Record<FunnelPlatz, boolean> } {
  const v = (roh && typeof roh === "object" ? roh : {}) as Record<string, unknown>;
  const videos = { ...FUNNEL_VORGABE };
  const ausAdmin = { training: false, call: false };
  for (const platz of FUNNEL_PLAETZE) {
    const p = lesePlatz(v[platz]);
    if (p) {
      videos[platz] = p;
      ausAdmin[platz] = true;
    }
  }
  return { videos, ausAdmin };
}

/** Prüft eine Admin-Eingabe für einen Platz. `uid: null` = zurück auf die Vorgabe. */
export function pruefeFunnelEingabe(
  roh: unknown,
): { ok: true; platz: FunnelPlatz; wert: FunnelVideo | null } | { ok: false; fehler: string } {
  const v = (roh && typeof roh === "object" ? roh : {}) as Record<string, unknown>;
  const platz = v.platz;
  if (typeof platz !== "string" || !(FUNNEL_PLAETZE as readonly string[]).includes(platz)) {
    return { ok: false, fehler: "Unbekannter Platz." };
  }
  if (v.uid === null) return { ok: true, platz: platz as FunnelPlatz, wert: null };
  const wert = lesePlatz(v);
  if (!wert) return { ok: false, fehler: "Die Video-UID besteht aus 32 Zeichen (0–9, a–f)." };
  if (typeof v.posterSekunde === "number" && (v.posterSekunde < 0 || v.posterSekunde > POSTER_MAX_SEKUNDE)) {
    return { ok: false, fehler: `Das Standbild muss zwischen 0 und ${POSTER_MAX_SEKUNDE} Sekunden liegen.` };
  }
  return { ok: true, platz: platz as FunnelPlatz, wert };
}

/** Roh aus der Datenbank (Service-Client). Wirft nie. */
async function ladeRoh(): Promise<unknown> {
  try {
    const { data, error } = await createServiceClient()
      .from("app_settings")
      .select("value")
      .eq("key", FUNNEL_VIDEOS_SCHLUESSEL)
      .maybeSingle();
    if (error || !data) return null;
    return (data as { value: unknown }).value;
  } catch {
    return null;
  }
}

/** Für die Seiten und den Admin. Wirft nie; ohne Datenbank gilt die Vorgabe. */
export async function ladeFunnelVideos() {
  return leseFunnelVideos(await ladeRoh());
}

/** Ist diese UID gerade einem Funnel-Platz zugeordnet (Admin oder Vorgabe)? */
export async function istFunnelVideo(uid: string): Promise<FunnelPlatz | null> {
  const { videos } = await ladeFunnelVideos();
  const u = uid.trim().toLowerCase();
  return FUNNEL_PLAETZE.find((p) => videos[p].uid === u) ?? null;
}

/** Hinweis für Admin-Routen, die ein Video signieren wollen. `null` = in Ordnung. */
export async function funnelSperrHinweis(uid: string): Promise<string | null> {
  const platz = await istFunnelVideo(uid);
  if (!platz) return null;
  return `Dieses Video läuft öffentlich auf ${FUNNEL_PLATZ_INFO[platz].pfad}. Signiert wäre es dort schwarz — erst unter Funnel- & Kursvideos → Funnel-Videos ein anderes zuordnen.`;
}
