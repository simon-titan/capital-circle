import { createServiceClient } from "@/lib/supabase/service";

/**
 * Trading Blueprint (Free-Ansicht nach Emres Mockup, 08.11.2026): ein PDF in R2
 * und optional eine Videoanleitung aus Cloudflare Stream.
 *
 * Gespeichert **ohne Migration** in `app_settings` unter `trading_blueprint`
 * (Upsert, Muster wie `lib/verkauf/schalter.ts`). Die Tabelle ist öffentlich
 * lesbar — deshalb steht hier nur der R2-Schlüssel, nie eine abrufbare Adresse:
 * Heruntergeladen wird über `/api/trading-blueprint/download`, das die Anmeldung
 * prüft und eine kurzlebige signierte Adresse ausstellt.
 *
 * Fehlt die Zeile oder ist sie nicht lesbar, gilt „noch nichts hinterlegt“ —
 * die Oberfläche zeigt dann „Erscheint in Kürze“.
 */

export const BLUEPRINT_SCHLUESSEL = "trading_blueprint";
/** Ordner in R2. Jeder Upload bekommt einen eigenen Schlüssel (kein Cache-Problem beim Austausch). */
export const BLUEPRINT_ORDNER = "trading-blueprint";
export const BLUEPRINT_MAX_BYTES = 50 * 1024 * 1024;

export type TradingBlueprint = {
  r2_key: string | null;
  dateiname: string | null;
  groesse: number | null;
  video_uid: string | null;
  /** Standbild der Videoanleitung in Sekunden; `null` = Cloudflare-Standard. */
  poster_sekunde: number | null;
  titel: string | null;
  beschreibung: string | null;
  aktualisiert_am: string | null;
};

const LEER: TradingBlueprint = {
  r2_key: null,
  dateiname: null,
  groesse: null,
  video_uid: null,
  poster_sekunde: null,
  titel: null,
  beschreibung: null,
  aktualisiert_am: null,
};

/** Obergrenze fürs Standbild (3 h) — nur gegen Tippfehler, die Videolänge kennt der Server hier nicht. */
export const BLUEPRINT_POSTER_MAX = 3 * 60 * 60;

function sekunde(roh: unknown): number | null {
  if (typeof roh !== "number" || !Number.isFinite(roh)) return null;
  const s = Math.round(roh);
  return s >= 0 && s <= BLUEPRINT_POSTER_MAX ? s : null;
}

/** Cloudflare-Stream-UIDs sind 32 Hex-Zeichen. */
export const STREAM_UID_RE = /^[0-9a-f]{32}$/i;

function text(roh: unknown, grenze: number): string | null {
  if (typeof roh !== "string") return null;
  const t = roh.trim().slice(0, grenze);
  return t || null;
}

/** Schlüssel nur aus unserem Ordner — ein fremder Pfad im Bucket wird nie ausgeliefert. */
export function istBlueprintSchluessel(wert: string): boolean {
  return wert.startsWith(`${BLUEPRINT_ORDNER}/`) && !wert.includes("..") && wert.length <= 300;
}

/** Liest den gespeicherten Wert tolerant. */
export function leseBlueprint(roh: unknown): TradingBlueprint {
  const v = (roh && typeof roh === "object" ? roh : {}) as Record<string, unknown>;
  const key = text(v.r2_key, 300);
  const uid = text(v.video_uid, 64);
  const groesse = typeof v.groesse === "number" && Number.isFinite(v.groesse) && v.groesse > 0 ? Math.round(v.groesse) : null;
  return {
    r2_key: key && istBlueprintSchluessel(key) ? key : null,
    dateiname: text(v.dateiname, 200),
    groesse,
    video_uid: uid && STREAM_UID_RE.test(uid) ? uid : null,
    poster_sekunde: uid ? sekunde(v.poster_sekunde) : null,
    titel: text(v.titel, 120),
    beschreibung: text(v.beschreibung, 1000),
    aktualisiert_am: text(v.aktualisiert_am, 40),
  };
}

/**
 * Prüft eine Eingabe aus dem Admin. Anders als `leseBlueprint` lehnt sie
 * ungültige Werte ab, statt sie still zu verwerfen.
 */
export function pruefeBlueprintEingabe(
  roh: unknown,
): { ok: true; wert: Omit<TradingBlueprint, "aktualisiert_am"> } | { ok: false; fehler: string } {
  const v = (roh && typeof roh === "object" ? roh : {}) as Record<string, unknown>;
  const key = text(v.r2_key, 300);
  if (key && !istBlueprintSchluessel(key)) return { ok: false, fehler: "Ungültiger Dateischlüssel." };
  const uid = text(v.video_uid, 64);
  if (uid && !STREAM_UID_RE.test(uid)) {
    return { ok: false, fehler: "Die Video-UID besteht aus 32 Zeichen (0–9, a–f), z. B. aus Cloudflare Stream kopiert." };
  }
  const groesse =
    typeof v.groesse === "number" && Number.isFinite(v.groesse) && v.groesse > 0 ? Math.round(v.groesse) : null;
  if (v.poster_sekunde !== null && v.poster_sekunde !== undefined && sekunde(v.poster_sekunde) === null) {
    return { ok: false, fehler: `Das Standbild muss zwischen 0 und ${BLUEPRINT_POSTER_MAX} Sekunden liegen.` };
  }
  return {
    ok: true,
    wert: {
      r2_key: key,
      dateiname: key ? text(v.dateiname, 200) : null,
      groesse: key ? groesse : null,
      video_uid: uid ? uid.toLowerCase() : null,
      poster_sekunde: uid ? sekunde(v.poster_sekunde) : null,
      titel: text(v.titel, 120),
      beschreibung: text(v.beschreibung, 1000),
    },
  };
}

/** Frisch aus der Datenbank (Service-Client). Wirft nie. */
export async function ladeBlueprint(): Promise<TradingBlueprint> {
  try {
    const { data, error } = await createServiceClient()
      .from("app_settings")
      .select("value")
      .eq("key", BLUEPRINT_SCHLUESSEL)
      .maybeSingle();
    if (error || !data) return LEER;
    return leseBlueprint((data as { value: unknown }).value);
  } catch {
    return LEER;
  }
}

/** Dateiname für den Download: nur sichere Zeichen, immer `.pdf`. */
export function downloadName(b: Pick<TradingBlueprint, "dateiname">): string {
  const basis = (b.dateiname ?? "Trading-Blueprint")
    .replace(/\.pdf$/i, "")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${basis || "Trading-Blueprint"}.pdf`;
}

export function groesseText(bytes: number | null): string | null {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
