import { NextResponse, type NextRequest } from "next/server";
import { istBot } from "@/lib/checkout/vorabruf";
import {
  MAX_EREIGNISSE_PRO_BUENDEL,
  MAX_SICHTBARE_MS,
  istEreignisArt,
  istSitzungsKennung,
  text,
  wirdGemessen,
  zahl,
} from "@/lib/analytics/kaufweg";
import {
  schreibeEreignisse,
  schreibeSitzung,
  type NeuesEreignis,
} from "@/lib/analytics/speicher";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/tracking/funnel — der einzige Endpunkt der Kaufweg-Messung.
 *
 * ── Ein Aufruf, viele Ereignisse ───────────────────────────────────────────
 *
 * Der Browser sammelt und schickt gebuendelt: beim Wegklicken des Tabs, alle
 * paar Sekunden im Hintergrund, spaetestens beim Verlassen per
 * `navigator.sendBeacon`. Ein Aufruf je Ereignis waere auf einer Verkaufsseite
 * mit Scroll-Schwellen und Abschnitts-Meldungen ein zweistelliger Anfragestrom
 * pro Besucher — und die letzten Ereignisse gingen beim Verlassen ohnehin
 * verloren, weil ein `fetch` im `unload` abgebrochen wird.
 *
 * ── Was hier nicht ankommt ─────────────────────────────────────────────────
 *
 * Keine IP (wir lesen keine Kopfzeile aus), kein Cookie, kein Fingerabdruck,
 * keine Nutzerkennung. Der Verweis kommt bereits als blosser Host im Rumpf an,
 * nicht als volle Adresse — die traegt bei Suchmaschinen den Suchbegriff.
 * Deshalb ist die Messung nach § 25 TDDDG einwilligungsfrei, und deshalb gibt
 * es kein Banner. Wer hier ein Feld ergaenzt, prueft das neu und ergaenzt
 * Abschnitt 13 der Datenschutzerklaerung.
 *
 * ── Warum immer „ok“ ───────────────────────────────────────────────────────
 *
 * Der Endpunkt antwortet auch dann mit 200, wenn die Tabellen fehlen
 * (Migration 101 noch nicht eingespielt), wenn der Rumpf Unsinn enthaelt oder
 * wenn die Datenbank hakt. Der Browser soll nicht wiederholen, nichts
 * anzeigen und nichts protokollieren — eine Statistik darf im Browser eines
 * Kaufwilligen nicht als Fehler auftauchen. Was schiefging, steht im
 * Serverprotokoll und in `gespeichert: false`.
 */

interface RumpfEreignis {
  art?: unknown;
  bauteil?: unknown;
  wert?: unknown;
  text?: unknown;
}

interface Rumpf {
  sid?: unknown;
  pfad?: unknown;
  ref?: unknown;
  src?: unknown;
  geraet?: unknown;
  utm?: { quelle?: unknown; medium?: unknown; kampagne?: unknown };
  stand?: {
    sichtbare_ms?: unknown;
    max_scroll?: unknown;
    max_abschnitt?: unknown;
    klicks?: unknown;
    modal_geoeffnet?: unknown;
    laufzeit?: unknown;
    kasse?: unknown;
  };
  ereignisse?: unknown;
}

const GERAETE = new Set(["mobil", "tablet", "desktop"]);

/**
 * Der Verweis-Host, gekuerzt und ohne `www.`.
 *
 * Kommt er trotz der Absprache im Client als volle Adresse an, wird hier der
 * Host herausgezogen statt die Zeile zu verwerfen — die Verabredung darf
 * nicht die einzige Stelle sein, an der die Datensparsamkeit haengt.
 */
function verweisHost(wert: unknown): string | null {
  const roh = text(wert, 200);
  if (!roh) return null;
  let host = roh;
  if (roh.includes("/")) {
    try {
      host = new URL(roh.includes("://") ? roh : `https://${roh}`).hostname;
    } catch {
      return null;
    }
  }
  host = host.toLowerCase().replace(/^www\./, "");
  return /^[a-z0-9.-]{1,120}$/.test(host) ? host : null;
}

export async function POST(request: NextRequest) {
  /*
    Bots zaehlen nicht als Besuch. Der Client filtert bereits `navigator.webdriver`
    und Vorabrufe; hier steht die zweite Haelfte, weil ein Crawler den Client
    gar nicht erst ausfuehrt — aber ein Skript den Endpunkt direkt aufrufen
    koennte. `istBot` ist dieselbe Liste, die `/go/<plan>` vor leeren Kassen
    schuetzt (`lib/checkout/vorabruf.ts`).
  */
  if (istBot(request.headers.get("user-agent") ?? "")) {
    return NextResponse.json({ ok: true, gespeichert: false, grund: "bot" });
  }

  let rumpf: Rumpf;
  try {
    rumpf = (await request.json()) as Rumpf;
  } catch {
    return NextResponse.json({ ok: true, gespeichert: false, grund: "rumpf" });
  }

  const sid = rumpf.sid;
  if (!istSitzungsKennung(sid)) {
    return NextResponse.json({ ok: true, gespeichert: false, grund: "sitzung" });
  }

  const pfad = text(rumpf.pfad, 120) ?? "/";
  if (!wirdGemessen(pfad)) {
    return NextResponse.json({ ok: true, gespeichert: false, grund: "pfad" });
  }

  const roheEreignisse = Array.isArray(rumpf.ereignisse) ? rumpf.ereignisse.slice(0, MAX_EREIGNISSE_PRO_BUENDEL) : [];
  const ereignisse: NeuesEreignis[] = [];
  for (const e of roheEreignisse as RumpfEreignis[]) {
    if (!e || typeof e !== "object" || !istEreignisArt(e.art)) continue;
    ereignisse.push({
      sitzung: sid,
      art: e.art,
      pfad,
      bauteil: text(e.bauteil, 40),
      wert: zahl(e.wert, 0, MAX_SICHTBARE_MS),
      text_wert: text(e.text, 40),
    });
  }

  const stand = rumpf.stand ?? {};
  const geraetRoh = text(rumpf.geraet, 10);

  const supabase = createServiceClient();

  const sitzung = await schreibeSitzung(supabase, {
    sitzung: sid,
    pfad,
    verweis_host: verweisHost(rumpf.ref),
    utm_quelle: text(rumpf.utm?.quelle, 60),
    utm_medium: text(rumpf.utm?.medium, 60),
    utm_kampagne: text(rumpf.utm?.kampagne, 60),
    src: text(rumpf.src, 60),
    geraet: geraetRoh && GERAETE.has(geraetRoh) ? geraetRoh : null,
    sichtbare_ms: zahl(stand.sichtbare_ms, 0, MAX_SICHTBARE_MS) ?? 0,
    max_scroll: zahl(stand.max_scroll, 0, 100) ?? 0,
    max_abschnitt: text(stand.max_abschnitt, 40),
    klicks: zahl(stand.klicks, 0, 500) ?? 0,
    modal_geoeffnet: zahl(stand.modal_geoeffnet, 0, 500) ?? 0,
    laufzeit_gewaehlt: text(stand.laufzeit, 20),
    kasse_gestartet: stand.kasse === true,
  });

  /*
    Das Protokoll nur schreiben, wenn der Sitzungsstand durchging. Andernfalls
    fehlt die Tabelle (oder die Datenbank hakt), und ein zweiter Versuch
    erzeugte nur einen zweiten Eintrag im Serverprotokoll.
  */
  const protokoll = sitzung.gespeichert
    ? await schreibeEreignisse(supabase, ereignisse)
    : { gespeichert: false, fehler: null };

  if (!sitzung.gespeichert && sitzung.fehler) {
    console.warn(`[tracking/funnel] Sitzung nicht gespeichert: ${sitzung.fehler}`);
  }
  if (sitzung.gespeichert && !protokoll.gespeichert && protokoll.fehler) {
    console.warn(`[tracking/funnel] Ereignisse nicht gespeichert: ${protokoll.fehler}`);
  }

  return NextResponse.json({
    ok: true,
    gespeichert: sitzung.gespeichert,
    ereignisse: protokoll.gespeichert ? ereignisse.length : 0,
  });
}
