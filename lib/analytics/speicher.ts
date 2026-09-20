import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ABSCHNITTE,
  AUFBEWAHRUNG_TAGE,
  MAX_SICHTBARE_MS,
  abschnittsRang,
} from "./kaufweg";
import {
  aggregiereAbschnitte,
  aggregiereBauteile,
  aggregiereSitzungen,
  type AbschnittsZeile,
  type BauteilZeile,
  type EreignisZeile,
  type SitzungsZeile,
  type TagesZeile,
} from "./aggregat";

/**
 * Der Weg zwischen Kaufweg-Messung und Datenbank.
 *
 * ── Die Tabellen duerfen fehlen ────────────────────────────────────────────
 *
 * Migration 101 wird von Hand eingespielt (es gibt keine Migrationstabelle,
 * siehe AGENTS.md). Zwischen Deployment und Einspielen liegt also ein Fenster,
 * in dem der Code laeuft und die Tabellen nicht existieren. In diesem Fenster
 * muss alles **still** durchlaufen: Der Endpunkt antwortet mit „ok“ und
 * schreibt nichts, die Admin-Ansicht zeigt einen Hinweis statt eines Fehlers.
 * Eine Messung ist keinen kaputten Kaufweg wert.
 *
 * `fehltTabelle()` erkennt den Fall am PostgREST-Fehler statt an einer
 * Umgebungsvariablen — ein Schalter, den jemand vergisst umzulegen, waere
 * derselbe stille Nuller, nur mit mehr Schritten.
 */

export type AnalyticsSupabase = SupabaseClient;

/** PostgREST-Fehler, die „die Tabelle oder Spalte gibt es (noch) nicht“ heissen. */
export function fehltTabelle(fehler: { code?: string; message?: string } | null): boolean {
  if (!fehler) return false;
  const code = fehler.code ?? "";
  const text = fehler.message ?? "";
  // 42P01 = undefined_table, 42703 = undefined_column, PGRST20x = Schema-Cache.
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    /does not exist|schema cache/i.test(text)
  );
}

/** Steht Migration 101 in der Datenbank? Eine Abfrage, kein Schreibversuch. */
export async function analyticsBereit(supabase: AnalyticsSupabase): Promise<boolean> {
  const { error } = await supabase.from("funnel_sitzungen").select("sitzung").limit(0);
  return !fehltTabelle(error);
}

/* ── Schreiben: das Protokoll ────────────────────────────────────────────── */

export interface NeuesEreignis {
  sitzung: string;
  art: string;
  pfad: string | null;
  bauteil: string | null;
  wert: number | null;
  text_wert: string | null;
}

/**
 * Ereignisse als **ein** Insert. Fehler werden zurueckgegeben, nicht geworfen:
 * Der Endpunkt entscheidet, ob er sie protokolliert — geantwortet wird dem
 * Browser in jedem Fall mit „ok“.
 */
export async function schreibeEreignisse(
  supabase: AnalyticsSupabase,
  ereignisse: readonly NeuesEreignis[],
): Promise<{ gespeichert: boolean; fehler: string | null }> {
  if (ereignisse.length === 0) return { gespeichert: true, fehler: null };
  const { error } = await supabase.from("funnel_ereignisse").insert(ereignisse as NeuesEreignis[]);
  if (error) return { gespeichert: false, fehler: error.message };
  return { gespeichert: true, fehler: null };
}

/* ── Schreiben: der Stand je Sitzung ─────────────────────────────────────── */

export interface SitzungsStand {
  sitzung: string;
  pfad: string;
  verweis_host: string | null;
  utm_quelle: string | null;
  utm_medium: string | null;
  utm_kampagne: string | null;
  src: string | null;
  geraet: string | null;
  sichtbare_ms: number;
  max_scroll: number;
  max_abschnitt: string | null;
  klicks: number;
  modal_geoeffnet: number;
  laufzeit_gewaehlt: string | null;
  kasse_gestartet: boolean;
}

/**
 * Den Stand fortschreiben — **nur nach oben**.
 *
 * Warum lesen und dann schreiben statt eines einzigen `upsert`: Die Meldungen
 * eines Besuchers treffen nicht in der Reihenfolge ein, in der sie entstanden
 * sind (`sendBeacon` beim Verlassen ueberholt regelmaessig den letzten
 * regulaeren Aufruf). Ein blindes `upsert` schriebe dann 40 % Scrolltiefe ueber
 * die bereits gemeldeten 100. `Math.max` ist hier kein Schoenheitsfehler,
 * sondern die Bedingung dafuer, dass die Zahl stimmt.
 *
 * Die Herkunftsangaben (Verweis, UTM, src, Geraet) bleiben beim **ersten**
 * Wert: Wer von Google kam und dann auf `/ergebnisse` weiterklickt, ist nicht
 * ploetzlich ein Direktbesucher.
 */
export async function schreibeSitzung(
  supabase: AnalyticsSupabase,
  stand: SitzungsStand,
): Promise<{ gespeichert: boolean; fehler: string | null }> {
  const jetzt = new Date().toISOString();
  const sichtbar = Math.min(Math.max(0, stand.sichtbare_ms), MAX_SICHTBARE_MS);

  const { data, error: leseFehler } = await supabase
    .from("funnel_sitzungen")
    .select(
      "sitzung,erste_seite,sichtbare_ms,max_scroll,max_abschnitt,max_abschnitt_rang,klicks,modal_geoeffnet,laufzeit_gewaehlt,kasse_gestartet",
    )
    .eq("sitzung", stand.sitzung)
    .maybeSingle();

  if (leseFehler && fehltTabelle(leseFehler)) {
    return { gespeichert: false, fehler: leseFehler.message };
  }

  const alt = data as {
    sichtbare_ms?: number;
    max_scroll?: number;
    max_abschnitt?: string | null;
    max_abschnitt_rang?: number;
    klicks?: number;
    modal_geoeffnet?: number;
    laufzeit_gewaehlt?: string | null;
    kasse_gestartet?: boolean;
  } | null;

  const neuerRang = abschnittsRang(stand.max_abschnitt);
  const alterRang = alt?.max_abschnitt_rang ?? 0;
  const rangGewinnt = !alt || neuerRang > alterRang;

  if (!alt) {
    const { error } = await supabase.from("funnel_sitzungen").insert({
      sitzung: stand.sitzung,
      erste_seite: stand.pfad,
      letzte_seite: stand.pfad,
      verweis_host: stand.verweis_host,
      utm_quelle: stand.utm_quelle,
      utm_medium: stand.utm_medium,
      utm_kampagne: stand.utm_kampagne,
      src: stand.src,
      geraet: stand.geraet,
      begonnen_am: jetzt,
      zuletzt_am: jetzt,
      sichtbare_ms: sichtbar,
      max_scroll: stand.max_scroll,
      max_abschnitt: stand.max_abschnitt,
      max_abschnitt_rang: neuerRang,
      klicks: stand.klicks,
      modal_geoeffnet: stand.modal_geoeffnet,
      laufzeit_gewaehlt: stand.laufzeit_gewaehlt,
      kasse_gestartet: stand.kasse_gestartet,
    });
    /*
      Zwei Tabs derselben Sitzung koennen gleichzeitig einfuegen. 23505 ist der
      Doppelschluessel — kein Fehler, sondern das Rennen, das der andere
      gewonnen hat. Der naechste Aufruf schreibt fort.
    */
    if (error && error.code !== "23505") return { gespeichert: false, fehler: error.message };
    return { gespeichert: true, fehler: null };
  }

  const { error } = await supabase
    .from("funnel_sitzungen")
    .update({
      letzte_seite: stand.pfad,
      zuletzt_am: jetzt,
      sichtbare_ms: Math.max(alt.sichtbare_ms ?? 0, sichtbar),
      max_scroll: Math.max(alt.max_scroll ?? 0, stand.max_scroll),
      max_abschnitt: rangGewinnt ? stand.max_abschnitt : (alt.max_abschnitt ?? null),
      max_abschnitt_rang: Math.max(alterRang, neuerRang),
      klicks: Math.max(alt.klicks ?? 0, stand.klicks),
      modal_geoeffnet: Math.max(alt.modal_geoeffnet ?? 0, stand.modal_geoeffnet),
      laufzeit_gewaehlt: stand.laufzeit_gewaehlt ?? alt.laufzeit_gewaehlt ?? null,
      kasse_gestartet: Boolean(alt.kasse_gestartet) || stand.kasse_gestartet,
    })
    .eq("sitzung", stand.sitzung);

  if (error) return { gespeichert: false, fehler: error.message };
  return { gespeichert: true, fehler: null };
}

/* ── Lesen ───────────────────────────────────────────────────────────────── */

const SEITE = 1000;

/**
 * Alle Sitzungen eines Zeitraums, seitenweise.
 *
 * PostgREST liefert hoechstens 1000 Zeilen je Abfrage; ohne die Schleife
 * endete jede Auswertung bei genau 1000 Besuchen und saehe trotzdem aus wie
 * ein Ergebnis. `grenze` ist die Notbremse fuer den Fall, dass jemand 90 Tage
 * bei hohem Verkehr abfragt.
 */
export async function ladeSitzungen(
  supabase: AnalyticsSupabase,
  vonIso: string,
  bisIso: string,
  grenze = 50_000,
): Promise<{ zeilen: SitzungsZeile[]; fehlt: boolean; abgeschnitten: boolean }> {
  const zeilen: SitzungsZeile[] = [];
  for (let versatz = 0; versatz < grenze; versatz += SEITE) {
    const { data, error } = await supabase
      .from("funnel_sitzungen")
      .select(
        "sitzung,erste_seite,letzte_seite,verweis_host,utm_quelle,utm_medium,utm_kampagne,src,geraet,begonnen_am,zuletzt_am,sichtbare_ms,max_scroll,max_abschnitt,max_abschnitt_rang,klicks,modal_geoeffnet,laufzeit_gewaehlt,kasse_gestartet",
      )
      .gte("begonnen_am", vonIso)
      .lt("begonnen_am", bisIso)
      .order("begonnen_am", { ascending: true })
      .range(versatz, versatz + SEITE - 1);

    if (error) {
      if (fehltTabelle(error)) return { zeilen: [], fehlt: true, abgeschnitten: false };
      throw new Error(`funnel_sitzungen lesen fehlgeschlagen: ${error.message}`);
    }
    const stapel = (data ?? []) as SitzungsZeile[];
    zeilen.push(...stapel);
    if (stapel.length < SEITE) return { zeilen, fehlt: false, abgeschnitten: false };
  }
  return { zeilen, fehlt: false, abgeschnitten: true };
}

/** Ereignisse eines Zeitraums, gefiltert auf die Arten, die gebraucht werden. */
export async function ladeEreignisse(
  supabase: AnalyticsSupabase,
  vonIso: string,
  bisIso: string,
  arten: readonly string[],
  grenze = 100_000,
): Promise<{ zeilen: EreignisZeile[]; fehlt: boolean; abgeschnitten: boolean }> {
  const zeilen: EreignisZeile[] = [];
  for (let versatz = 0; versatz < grenze; versatz += SEITE) {
    const { data, error } = await supabase
      .from("funnel_ereignisse")
      .select("sitzung,art,pfad,bauteil,wert,text_wert,erzeugt_am")
      .in("art", arten as string[])
      .gte("erzeugt_am", vonIso)
      .lt("erzeugt_am", bisIso)
      .order("erzeugt_am", { ascending: true })
      .range(versatz, versatz + SEITE - 1);

    if (error) {
      if (fehltTabelle(error)) return { zeilen: [], fehlt: true, abgeschnitten: false };
      throw new Error(`funnel_ereignisse lesen fehlgeschlagen: ${error.message}`);
    }
    const stapel = (data ?? []) as EreignisZeile[];
    zeilen.push(...stapel);
    if (stapel.length < SEITE) return { zeilen, fehlt: false, abgeschnitten: false };
  }
  return { zeilen, fehlt: false, abgeschnitten: true };
}

/** Tagesrechnung eines Zeitraums. */
export async function ladeTage(
  supabase: AnalyticsSupabase,
  vonTag: string,
  bisTag: string,
): Promise<{
  tage: TagesZeile[];
  bauteile: BauteilZeile[];
  abschnitte: AbschnittsZeile[];
  fehlt: boolean;
}> {
  const [tageRes, bauteileRes, abschnitteRes] = await Promise.all([
    supabase.from("funnel_tage").select("*").gte("tag", vonTag).lte("tag", bisTag),
    supabase.from("funnel_tage_bauteile").select("*").gte("tag", vonTag).lte("tag", bisTag),
    supabase.from("funnel_tage_abschnitte").select("*").gte("tag", vonTag).lte("tag", bisTag),
  ]);

  if (fehltTabelle(tageRes.error) || fehltTabelle(bauteileRes.error) || fehltTabelle(abschnitteRes.error)) {
    return { tage: [], bauteile: [], abschnitte: [], fehlt: true };
  }
  if (tageRes.error) throw new Error(`funnel_tage lesen fehlgeschlagen: ${tageRes.error.message}`);
  if (bauteileRes.error) {
    throw new Error(`funnel_tage_bauteile lesen fehlgeschlagen: ${bauteileRes.error.message}`);
  }
  if (abschnitteRes.error) {
    throw new Error(`funnel_tage_abschnitte lesen fehlgeschlagen: ${abschnitteRes.error.message}`);
  }

  return {
    tage: (tageRes.data ?? []) as TagesZeile[],
    bauteile: (bauteileRes.data ?? []) as BauteilZeile[],
    abschnitte: (abschnitteRes.data ?? []) as AbschnittsZeile[],
    fehlt: false,
  };
}

/* ── Aggregation ─────────────────────────────────────────────────────────── */

export interface AggregatErgebnis {
  gelaufen: boolean;
  vonTag: string;
  bisTag: string;
  sitzungen: number;
  tageszeilen: number;
  bauteilzeilen: number;
  abschnittszeilen: number;
  grund?: string;
}

/** Die drei Tagesrechnungen tragen dieselben Schluesselspalten — eine Schleife genuegt. */
const AGGREGAT_TABELLEN = ["funnel_tage", "funnel_tage_bauteile", "funnel_tage_abschnitte"] as const;

/**
 * Die Tagesrechnung fuer einen Zeitraum neu aufstellen.
 *
 * Immer **vollstaendig neu**, nie fortgeschrieben: Eine Sitzung, die um 23:58
 * beginnt und um 00:20 endet, aendert ihren Tagesbeitrag noch nach Mitternacht.
 * Wer dann addiert statt neu zu rechnen, zaehlt sie zweimal. Ein Neuaufbau
 * ueber wenige Tage kostet nichts und kann nicht driften.
 */
export async function aggregiereZeitraum(
  supabase: AnalyticsSupabase,
  vonTag: string,
  bisTag: string,
): Promise<AggregatErgebnis> {
  const vonIso = `${vonTag}T00:00:00.000Z`;
  const bisIso = `${naechsterTag(bisTag)}T00:00:00.000Z`;

  const { zeilen: sitzungen, fehlt } = await ladeSitzungen(supabase, vonIso, bisIso);
  if (fehlt) {
    return {
      gelaufen: false,
      vonTag,
      bisTag,
      sitzungen: 0,
      tageszeilen: 0,
      bauteilzeilen: 0,
      abschnittszeilen: 0,
      grund: "Migration 101 ist nicht eingespielt.",
    };
  }

  const { zeilen: ereignisse } = await ladeEreignisse(supabase, vonIso, bisIso, ["klick", "kasse", "modal_auf"]);

  const tage = aggregiereSitzungen(sitzungen);
  const bauteile = aggregiereBauteile(ereignisse);
  const abschnitte = aggregiereAbschnitte(sitzungen, ABSCHNITTE);

  /*
    Erst raeumen, dann schreiben: Faellt eine Herkunft aus dem Zeitraum (weil
    die Rohdaten aufgeraeumt wurden oder eine Sitzung umgezogen ist), bliebe
    ihre alte Zeile sonst als Geist stehen und zaehlte weiter mit.
  */
  for (const tabelle of AGGREGAT_TABELLEN) {
    const { error } = await supabase.from(tabelle).delete().gte("tag", vonTag).lte("tag", bisTag);
    if (error && !fehltTabelle(error)) {
      throw new Error(`${tabelle} aufraeumen fehlgeschlagen: ${error.message}`);
    }
  }

  const jetzt = new Date().toISOString();
  const stapel: Array<[(typeof AGGREGAT_TABELLEN)[number], Array<Record<string, unknown>>]> = [
    ["funnel_tage", tage.map((z) => ({ ...z, berechnet_am: jetzt }))],
    ["funnel_tage_bauteile", bauteile.map((z) => ({ ...z, berechnet_am: jetzt }))],
    ["funnel_tage_abschnitte", abschnitte.map((z) => ({ ...z, berechnet_am: jetzt }))],
  ];

  for (const [tabelle, zeilen] of stapel) {
    if (zeilen.length === 0) continue;
    const { error } = await supabase.from(tabelle).insert(zeilen);
    if (error) throw new Error(`${tabelle} schreiben fehlgeschlagen: ${error.message}`);
  }

  return {
    gelaufen: true,
    vonTag,
    bisTag,
    sitzungen: sitzungen.length,
    tageszeilen: tage.length,
    bauteilzeilen: bauteile.length,
    abschnittszeilen: abschnitte.length,
  };
}

/* ── Aufraeumen ──────────────────────────────────────────────────────────── */

export interface AufraeumErgebnis {
  gelaufen: boolean;
  grenze: string;
  ereignisse: number | null;
  sitzungen: number | null;
  grund?: string;
}

/**
 * Rohdaten aelter als `AUFBEWAHRUNG_TAGE` loeschen.
 *
 * Die Tagesrechnung bleibt — sie ist das Gedaechtnis. Geloescht werden das
 * Protokoll und die Sitzungen, also genau die Zeilen, die einzelne Besuche
 * beschreiben. Nach 90 Tagen weiss die Datenbank, wie viele Leute im Juli
 * gekauft haben, aber nicht mehr, welcher Tab wie lange offen war.
 */
export async function raeumeRohdatenAuf(supabase: AnalyticsSupabase): Promise<AufraeumErgebnis> {
  const grenze = new Date(Date.now() - AUFBEWAHRUNG_TAGE * 24 * 60 * 60 * 1000).toISOString();

  const ereignisse = await supabase
    .from("funnel_ereignisse")
    .delete({ count: "exact" })
    .lt("erzeugt_am", grenze);

  if (ereignisse.error && fehltTabelle(ereignisse.error)) {
    return {
      gelaufen: false,
      grenze,
      ereignisse: null,
      sitzungen: null,
      grund: "Migration 101 ist nicht eingespielt.",
    };
  }
  if (ereignisse.error) {
    return { gelaufen: false, grenze, ereignisse: null, sitzungen: null, grund: ereignisse.error.message };
  }

  const sitzungen = await supabase
    .from("funnel_sitzungen")
    .delete({ count: "exact" })
    .lt("begonnen_am", grenze);

  if (sitzungen.error) {
    return {
      gelaufen: false,
      grenze,
      ereignisse: ereignisse.count ?? 0,
      sitzungen: null,
      grund: sitzungen.error.message,
    };
  }

  return { gelaufen: true, grenze, ereignisse: ereignisse.count ?? 0, sitzungen: sitzungen.count ?? 0 };
}

/* ── Datum ───────────────────────────────────────────────────────────────── */

export function naechsterTag(tag: string): string {
  const d = new Date(`${tag}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function tagVor(tage: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - tage);
  return d.toISOString().slice(0, 10);
}
