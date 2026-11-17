import type { Kanal } from "@/config/training";

/**
 * Herkunft einer Registrierung über `/training` (Board, Spalte 1: YouTube,
 * Instagram, TikTok, Podcast). Links in Bios und Videobeschreibungen sollten
 * `?utm_source=youtube` usw. tragen; ohne UTM entscheidet der Referrer.
 *
 * Im Browser: `merkeHerkunft()` beim Laden der Landing, `leseHerkunft()` bei
 * der Registrierung. Gespeichert in `localStorage` (30 Tage) — wer über
 * Instagram kommt und am nächsten Tag direkt wiederkommt, bleibt Instagram.
 * Ein neuer Besuch **mit** UTM ersetzt den alten (letzter bezahlter/gezielter
 * Kontakt zählt).
 */

export type Herkunft = {
  kanal: Kanal;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  erfasst_am: string;
};

const SCHLUESSEL = "cc_training_herkunft";
const GUELTIG_MS = 30 * 86_400_000;

/** Kanal aus UTM-Quelle und Referrer. Rein, läuft auf Server und Client. */
export function ermittleKanal(utmSource: string | null | undefined, referrer: string | null | undefined): Kanal {
  const q = `${utmSource ?? ""}`.toLowerCase();
  let host = "";
  try {
    host = referrer ? new URL(referrer).hostname.toLowerCase() : "";
  } catch {
    host = "";
  }
  const passt = (muster: RegExp) => muster.test(q) || muster.test(host);
  if (passt(/youtube|youtu\.be|^yt$/)) return "youtube";
  if (passt(/instagram|^ig$/)) return "instagram";
  if (passt(/tiktok|^tt$/)) return "tiktok";
  if (passt(/podcast|spotify|podcasts\.apple|anchor\.fm|^apple$/)) return "podcast";
  if (passt(/google/)) return "google";
  if (!q && !host) return "direkt";
  return "sonstige";
}

/** Prüft und kürzt eine Herkunft aus dem Request-Body (Server). */
export function saeubereHerkunft(roh: unknown): Herkunft | null {
  if (!roh || typeof roh !== "object") return null;
  const v = roh as Record<string, unknown>;
  const t = (x: unknown, max = 200) => (typeof x === "string" && x.trim() ? x.trim().slice(0, max) : null);
  const herkunft = {
    utm_source: t(v.utm_source, 100),
    utm_medium: t(v.utm_medium, 100),
    utm_campaign: t(v.utm_campaign, 150),
    utm_content: t(v.utm_content, 150),
    utm_term: t(v.utm_term, 150),
    referrer: t(v.referrer, 500),
  };
  return {
    ...herkunft,
    kanal: ermittleKanal(herkunft.utm_source, herkunft.referrer),
    erfasst_am: t(v.erfasst_am, 40) ?? new Date().toISOString(),
  };
}

/** Browser: beim Laden der Landing aufrufen. */
export function merkeHerkunft(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const p = (k: string) => params.get(k)?.trim() || null;
    let referrer: string | null = document.referrer || null;
    // Eigene Seiten sind kein Kanal.
    if (referrer && new URL(referrer).hostname === window.location.hostname) referrer = null;

    const neu = {
      utm_source: p("utm_source"),
      utm_medium: p("utm_medium"),
      utm_campaign: p("utm_campaign"),
      utm_content: p("utm_content"),
      utm_term: p("utm_term"),
      referrer,
      erfasst_am: new Date().toISOString(),
    };
    const alt = leseHerkunft();
    // Ohne UTM und ohne fremden Referrer nichts überschreiben.
    if (!neu.utm_source && !neu.referrer && alt) return;
    if (!neu.utm_source && alt?.utm_source) return;
    localStorage.setItem(SCHLUESSEL, JSON.stringify({ ...neu, kanal: ermittleKanal(neu.utm_source, neu.referrer) }));
  } catch {
    // Kein Storage (Privatmodus o. ä.) — dann eben ohne Herkunft.
  }
}

/** Browser: gespeicherte Herkunft, solange sie nicht älter als 30 Tage ist. */
export function leseHerkunft(): Herkunft | null {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (!roh) return null;
    const h = JSON.parse(roh) as Herkunft;
    if (Date.now() - new Date(h.erfasst_am).getTime() > GUELTIG_MS) return null;
    return h;
  } catch {
    return null;
  }
}
