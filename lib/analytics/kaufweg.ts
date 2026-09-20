/**
 * Die gemeinsamen Begriffe der Kaufweg-Messung.
 *
 * Diese Datei ist die einzige Stelle, an der Ereignisarten, Bauteilnamen,
 * Faecher und Grenzen stehen. Sie wird vom Browser (Tracker), vom Server
 * (Endpunkt, Aggregation, Admin) und vom Pruefskript importiert — deshalb
 * **ohne jeden Import**: kein React, kein Supabase, kein Next. Sobald hier
 * etwas Serverseitiges landet, faellt der Tracker im Browser um.
 *
 * Wer eine Ereignisart ergaenzt, ergaenzt sie auch im CHECK der Migration 101.
 */

/* ── Ereignisarten ───────────────────────────────────────────────────────── */

export const EREIGNIS_ARTEN = [
  "seite",
  "scroll",
  "abschnitt",
  "modal_auf",
  "laufzeit",
  "klick",
  "kasse",
  "ende",
] as const;

export type EreignisArt = (typeof EREIGNIS_ARTEN)[number];

export function istEreignisArt(wert: unknown): wert is EreignisArt {
  return typeof wert === "string" && (EREIGNIS_ARTEN as readonly string[]).includes(wert);
}

/* ── Bauteile (Herkunft innerhalb der Seite) ─────────────────────────────── */

/**
 * Die Stellen, an denen ein Kauf- oder Beitrittsknopf steht. Die Reihenfolge
 * ist die der Seite von oben nach unten — die Admin-Ansicht zeigt sie so.
 *
 * `angebot` ist der einzige Knopf, der ohne Dialog direkt in die Kasse fuehrt;
 * die uebrigen sechs oeffnen erst den Beitritts-Dialog, und der Kaufklick faellt
 * dann unter `modal`.
 */
export const BAUTEILE = [
  "nav",
  "nav_menue",
  "hero",
  "prozess",
  "fuer_wen",
  "angebot",
  "abschluss",
  "mobil",
  "modal",
] as const;

export type Bauteil = (typeof BAUTEILE)[number];

export const BAUTEIL_TITEL: Record<Bauteil, string> = {
  nav: "Kopfleiste",
  nav_menue: "Mobilmenü",
  hero: "Hero",
  prozess: "Ablauf",
  fuer_wen: "Für wen",
  angebot: "Angebot (Preiskarten)",
  abschluss: "Abschluss",
  mobil: "Mobiler Balken",
  modal: "Beitritts-Dialog",
};

/* ── Abschnitte der Verkaufsseite ────────────────────────────────────────── */

/**
 * Die Abschnitte in der Reihenfolge, in der sie auf `/` stehen. Der Index ist
 * der Rang: „am weitesten gekommen" ist eine Zahl, nicht ein Name — sonst
 * muesste jede Auswertung die Seitenreihenfolge kennen.
 *
 * Die Namen haengen als `data-abschnitt` an den Abschnitten
 * (`components/landing/membership/MembershipLanding.tsx`). Wer dort etwas
 * umstellt, stellt es hier mit um.
 */
export const ABSCHNITTE = [
  "hero",
  "ergebnisse",
  "bewertungen",
  "ablauf",
  "vergleich",
  "fuer_wen",
  "brief",
  "angebot",
  "faq",
  "abschluss",
] as const;

export type Abschnitt = (typeof ABSCHNITTE)[number];

export const ABSCHNITT_TITEL: Record<Abschnitt, string> = {
  hero: "Hero",
  ergebnisse: "Belegte Auszahlungen",
  bewertungen: "Bewertungen",
  ablauf: "Ablauf",
  vergleich: "Vergleich",
  fuer_wen: "Für wen",
  brief: "Brief des Gründers",
  angebot: "Angebot",
  faq: "FAQ",
  abschluss: "Abschluss",
};

export function abschnittsRang(name: string | null | undefined): number {
  if (!name) return 0;
  const i = (ABSCHNITTE as readonly string[]).indexOf(name);
  return i < 0 ? 0 : i;
}

/* ── Gemessene Seiten ────────────────────────────────────────────────────── */

/**
 * Nur diese Pfade werden gemessen. Eine Liste statt „alles ausser /admin":
 * Datensparsamkeit heisst, die Messung dort einzuschalten, wo sie gebraucht
 * wird — nicht, sie ueberall auszuschalten, wo sie stoert.
 */
export const GEMESSENE_PFADE = ["/", "/vorschau", "/ergebnisse"] as const;

export function wirdGemessen(pfad: string): boolean {
  return (GEMESSENE_PFADE as readonly string[]).includes(pfad);
}

/* ── Scroll-Schwellen ────────────────────────────────────────────────────── */

export const SCROLL_SCHWELLEN = [25, 50, 75, 100] as const;
export type ScrollSchwelle = (typeof SCROLL_SCHWELLEN)[number];

/* ── Faecher der Verweildauer ────────────────────────────────────────────── */

/**
 * Untergrenzen in Sekunden. Ein Mittelwert aus „ueberflogen" und „gelesen"
 * beschreibt keinen einzigen Besucher, deshalb ein Faecher.
 */
export const DAUER_FAECHER = [
  { schluessel: "dauer_0_10", titel: "unter 10 s", abSek: 0 },
  { schluessel: "dauer_10_30", titel: "10–30 s", abSek: 10 },
  { schluessel: "dauer_30_60", titel: "30–60 s", abSek: 30 },
  { schluessel: "dauer_60_180", titel: "1–3 min", abSek: 60 },
  { schluessel: "dauer_180_plus", titel: "über 3 min", abSek: 180 },
] as const;

export type DauerFach = (typeof DAUER_FAECHER)[number]["schluessel"];

export function dauerFach(sichtbareMs: number): DauerFach {
  const sek = sichtbareMs / 1000;
  let treffer: DauerFach = "dauer_0_10";
  for (const fach of DAUER_FAECHER) {
    if (sek >= fach.abSek) treffer = fach.schluessel;
  }
  return treffer;
}

/* ── Herkunft ────────────────────────────────────────────────────────────── */

/**
 * Ein einziger Herkunftsbegriff aus drei moeglichen Quellen, in dieser
 * Rangfolge: eigener `?src=`-Parameter, dann `utm_source`, dann der Host des
 * Verweises, sonst „direkt".
 *
 * Warum nicht drei Spalten nebeneinander: Drei Trichter, die sich nicht
 * addieren, sind schlimmer als einer mit einer Rangfolge. Die Rangfolge ist
 * begruendet — `src` setzen wir selbst und wissen, was er bedeutet; `utm_*`
 * setzt die Werbeplattform; der Verweis-Host ist das, was uebrig bleibt.
 */
export function herkunftAus(zeile: {
  src?: string | null;
  utm_quelle?: string | null;
  verweis_host?: string | null;
}): string {
  return zeile.src?.trim() || zeile.utm_quelle?.trim() || zeile.verweis_host?.trim() || "direkt";
}

/* ── Grenzen des Endpunkts ───────────────────────────────────────────────── */

/** Mehr Ereignisse in einem Bündel nimmt der Endpunkt nicht an. */
export const MAX_EREIGNISSE_PRO_BUENDEL = 40;
/** Laenge, auf die jeder Textwert gekuerzt wird, bevor er die Datenbank sieht. */
export const MAX_TEXT_LAENGE = 120;
/** Obergrenze der sichtbaren Zeit je Sitzung: vier Stunden. Alles darueber ist ein vergessener Tab. */
export const MAX_SICHTBARE_MS = 4 * 60 * 60 * 1000;

/** Aufbewahrung der Rohdaten (Protokoll und Sitzungen) in Tagen. */
export const AUFBEWAHRUNG_TAGE = 90;

/* ── Sitzungskennung ─────────────────────────────────────────────────────── */

/** Schluessel im `sessionStorage`. Steht so in der Datenschutzerklaerung. */
export const SITZUNGS_SCHLUESSEL = "cc_funnel_sid";

/** Die Kennung, die `/go/<plan>` als `?sid=` entgegennimmt. */
export const SITZUNGS_PARAMETER = "sid";

/**
 * Eine Kennung, die wir selbst erzeugt haben koennten.
 *
 * Absichtlich streng: Der Wert kommt aus einem Query-Parameter bzw. aus dem
 * Rumpf eines oeffentlichen Endpunkts. Ohne Pruefung liesse sich jede
 * Zeichenkette in die Tabelle schreiben — und in die Stripe-Metadaten.
 */
export function istSitzungsKennung(wert: unknown): wert is string {
  return typeof wert === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(wert);
}

/* ── Zeitraeume der Auswertung ───────────────────────────────────────────── */

export const ZEITRAEUME = [7, 30, 90] as const;
export type Zeitraum = (typeof ZEITRAEUME)[number];

export function istZeitraum(wert: unknown): wert is Zeitraum {
  return typeof wert === "number" && (ZEITRAEUME as readonly number[]).includes(wert);
}

/* ── Kleine Helfer ───────────────────────────────────────────────────────── */

/** Kuerzt und trimmt; leere Zeichenketten werden zu `null`. */
export function text(wert: unknown, laenge = MAX_TEXT_LAENGE): string | null {
  if (typeof wert !== "string") return null;
  const t = wert.trim().slice(0, laenge);
  return t.length > 0 ? t : null;
}

/** Ganze Zahl im erlaubten Bereich, sonst `null`. */
export function zahl(wert: unknown, min: number, max: number): number | null {
  if (typeof wert !== "number" || !Number.isFinite(wert)) return null;
  const n = Math.round(wert);
  if (n < min || n > max) return null;
  return n;
}

/** Tagesschluessel in UTC (`2026-09-20`) — dieselbe Zeitzone wie `date` in Postgres. */
export function tagesSchluessel(zeit: Date | string): string {
  const d = typeof zeit === "string" ? new Date(zeit) : zeit;
  return d.toISOString().slice(0, 10);
}

/** Prozentsatz mit einer Nachkommastelle; 0 statt NaN, wenn der Nenner 0 ist. */
export function quote(zaehler: number, nenner: number): number {
  if (!nenner) return 0;
  return Math.round((zaehler / nenner) * 1000) / 10;
}
