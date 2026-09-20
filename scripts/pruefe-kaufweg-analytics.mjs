/**
 * Prüft die Kaufweg-Auswertung gegen von Hand nachgerechnete Zahlen.
 *
 *   npm run pruefe:kaufweg
 *
 * ── Was hier passiert ───────────────────────────────────────────────────────
 *
 * 1. Zehn erfundene Sitzungen und ein paar Ereignisse, klein genug, dass die
 *    erwarteten Summen unten von Hand nachrechenbar sind (sie stehen als
 *    Konstanten da, nicht als zweite Rechnung — eine Rechnung gegen sich
 *    selbst prüft nichts).
 * 2. Die Aggregation aus `lib/analytics/aggregat.ts` läuft darüber, und jede
 *    Zahl wird gegen die Erwartung gestellt: Tagesrechnung, Summen, Trichter,
 *    Verweildauer-Fächer, Scroll-Fächer, Abschnitte, Klicks je Knopf.
 * 3. Steht Migration 101 in der Datenbank, geht derselbe Datensatz zusätzlich
 *    den echten Weg: einfügen → `aggregiereZeitraum` → `funnel_tage` lesen →
 *    mit derselben Erwartung vergleichen. Danach wird **alles** wieder
 *    gelöscht und das Löschen belegt (nachgezählt, nicht behauptet).
 *
 * ── Warum das Jahr 2000 ─────────────────────────────────────────────────────
 *
 * Die Testsitzungen liegen am 01./02.01.2000. Dort kann keine echte Zeile
 * stehen, also kann der Neuaufbau der Tagesrechnung (er löscht den Zeitraum und
 * schreibt ihn neu) keine echten Zahlen überschreiben. Die Sitzungskennungen
 * tragen zusätzlich ein erkennbares Muster (`00000000-0000-4000-8000-…`), an
 * dem das Aufräumen sie wiederfindet.
 *
 * Ohne Datenbankzugang (oder ohne Migration 101) läuft nur Schritt 1 und 2 —
 * das ist kein Fehlschlag, sondern der Normalfall, solange die Migration von
 * Hand eingespielt werden muss.
 */

import { existsSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import dotenv from "dotenv";

register("./ts-loader.mjs", import.meta.url);

for (const f of [".env.local", ".env"]) {
  const p = path.resolve(process.cwd(), f);
  if (existsSync(p)) dotenv.config({ path: p, override: false, quiet: true });
}

const {
  aggregiereSitzungen,
  aggregiereBauteile,
  aggregiereAbschnitte,
  summiere,
  nachBauteil,
  baueTrichter,
  dauerVerteilung,
  scrollVerteilung,
  fasseAbschnitte,
} = await import("@/lib/analytics/aggregat");
const { ABSCHNITTE, BAUTEILE } = await import("@/lib/analytics/kaufweg");

/* ── Der Datensatz ──────────────────────────────────────────────────────── */

const MARKE = "00000000-0000-4000-8000-";
const TAG1 = "2000-01-01";
const TAG2 = "2000-01-02";

const sid = (n) => `${MARKE}${String(n).padStart(12, "0")}`;

/**
 * Zehn Sitzungen. Die Spalten stehen in derselben Reihenfolge wie in
 * `funnel_sitzungen` (Migration 101).
 *
 * `rang` ist der Index in `ABSCHNITTE` — 0 = Hero, 9 = Abschluss.
 */
const FALL = [
  // n  tag   herkunft                        ms       scroll rang klicks modal laufzeit     kasse
  [0, TAG1, { src: "hero" }, 5_000, 10, 0, 0, 0, null, false],
  [1, TAG1, { src: "hero" }, 15_000, 30, 1, 0, 0, null, false],
  [2, TAG1, { src: "hero" }, 45_000, 55, 3, 1, 1, "monthly", false],
  [3, TAG1, { utm_quelle: "instagram" }, 90_000, 80, 7, 2, 1, "quarterly", true],
  [4, TAG1, { utm_quelle: "instagram" }, 240_000, 100, 9, 3, 2, "yearly", true],
  [5, TAG1, { verweis_host: "google.com" }, 8_000, 26, 1, 0, 0, null, false],
  [6, TAG1, {}, 35_000, 75, 7, 1, 0, "quarterly", true],
  [7, TAG2, { src: "hero" }, 200_000, 100, 9, 1, 1, "monthly", true],
  [8, TAG2, {}, 12_000, 50, 5, 0, 0, null, false],
  [9, TAG2, {}, 61_000, 95, 8, 2, 1, "monthly", false],
];

const sitzungen = FALL.map(([n, tag, herkunft, ms, scroll, rang, klicks, modal, laufzeit, kasse]) => ({
  sitzung: sid(n),
  erste_seite: "/",
  letzte_seite: "/",
  verweis_host: herkunft.verweis_host ?? null,
  utm_quelle: herkunft.utm_quelle ?? null,
  utm_medium: null,
  utm_kampagne: null,
  src: herkunft.src ?? null,
  geraet: n % 2 === 0 ? "desktop" : "mobil",
  begonnen_am: `${tag}T10:0${n}:00.000Z`,
  zuletzt_am: `${tag}T10:3${n}:00.000Z`,
  sichtbare_ms: ms,
  max_scroll: scroll,
  max_abschnitt: ABSCHNITTE[rang],
  max_abschnitt_rang: rang,
  klicks,
  modal_geoeffnet: modal,
  laufzeit_gewaehlt: laufzeit,
  kasse_gestartet: kasse,
}));

/** Ereignisse für „Klicks je Knopf". Bewusst wenige und von Hand zählbar. */
const EREIGNISSE = [
  ...[0, 1, 2].map(() => ["klick", "hero", TAG1]),
  ...[0, 1].map(() => ["modal_auf", "hero", TAG1]),
  ...[0, 1].map(() => ["klick", "angebot", TAG1]),
  ["kasse", "angebot", TAG1],
  ["klick", "mobil", TAG2],
  ["kasse", "modal", TAG2],
].map(([art, bauteil, tag], i) => ({
  sitzung: sid(i % 10),
  art,
  pfad: "/",
  bauteil,
  wert: null,
  text_wert: null,
  erzeugt_am: `${tag}T11:${String(i).padStart(2, "0")}:00.000Z`,
}));

/* ── Die Erwartung, von Hand gerechnet ──────────────────────────────────── */

const ERWARTET_TAGE = [
  // tag, herkunft, sitzungen, mit_klick, klicks, modal, laufzeit, kassen,
  // scroll 25/50/75/100, dauer 0-10/10-30/30-60/60-180/180+, ms-summe
  [TAG1, "hero", 3, 1, 1, 1, 1, 0, 2, 1, 0, 0, 1, 1, 1, 0, 0, 65_000],
  [TAG1, "instagram", 2, 2, 5, 3, 2, 2, 2, 2, 2, 1, 0, 0, 0, 1, 1, 330_000],
  [TAG1, "google.com", 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 8_000],
  [TAG1, "direkt", 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 35_000],
  [TAG2, "hero", 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 200_000],
  [TAG2, "direkt", 2, 1, 2, 1, 1, 0, 2, 2, 1, 0, 0, 1, 0, 1, 0, 73_000],
];

const ERWARTETE_SUMME = {
  sitzungen: 10,
  sitzungen_mit_klick: 6,
  klicks: 10,
  modal_geoeffnet: 6,
  laufzeit_gewaehlt: 6,
  kassen: 4,
  scroll_25: 9,
  scroll_50: 7,
  scroll_75: 5,
  scroll_100: 2,
  dauer_0_10: 2,
  dauer_10_30: 2,
  dauer_30_60: 2,
  dauer_60_180: 2,
  dauer_180_plus: 2,
  sichtbare_ms_summe: 711_000,
};

/** „so weit und nicht weiter" — die fünf Fächer summieren sich auf die Besuche. */
const ERWARTETE_SCROLL_FAECHER = [1, 2, 2, 3, 2];
const ERWARTETE_DAUER_FAECHER = [2, 2, 2, 2, 2];

/** erreicht[rang] = Sitzungen, die mindestens bis dahin kamen. */
const ERWARTET_ERREICHT = [10, 9, 7, 7, 6, 6, 5, 5, 3, 2];
const ERWARTET_GESTOPPT = [1, 2, 0, 1, 0, 1, 0, 2, 1, 2];

/** In der Reihenfolge der Seite: hero, angebot, mobil, modal. */
const ERWARTET_BAUTEILE = [
  ["hero", 3, 0, 2],
  ["angebot", 2, 1, 0],
  ["mobil", 1, 0, 0],
  ["modal", 0, 1, 0],
];

/** Trichter mit vier gestarteten und zwei bezahlten Kassen. */
const KASSEN_GESTARTET = 4;
const KASSEN_BEZAHLT = 2;
const ERWARTETER_TRICHTER = [
  ["besuche", 10, 100],
  ["gelesen", 7, 70],
  ["klick", 6, 85.7],
  ["kasse", 4, 66.7],
  ["bezahlt", 2, 50],
];

/* ── Prüfwerk ───────────────────────────────────────────────────────────── */

let fehler = 0;
let geprueft = 0;

function pruefe(name, ist, soll) {
  geprueft += 1;
  const a = JSON.stringify(ist);
  const b = JSON.stringify(soll);
  if (a === b) return true;
  fehler += 1;
  console.error(`  FEHLER  ${name}\n          ist:  ${a}\n          soll: ${b}`);
  return false;
}

function abschnitt(titel) {
  console.log(`\n── ${titel} ${"─".repeat(Math.max(0, 62 - titel.length))}`);
}

/* ── 1. Die Rechnung ────────────────────────────────────────────────────── */

abschnitt("Lokale Nachbildung: Aggregation");

const tage = aggregiereSitzungen(sitzungen);
pruefe("Zahl der Tageszeilen", tage.length, ERWARTET_TAGE.length);

for (const soll of ERWARTET_TAGE) {
  const [tag, herkunft, ...werte] = soll;
  const zeile = tage.find((z) => z.tag === tag && z.herkunft === herkunft);
  if (!zeile) {
    fehler += 1;
    geprueft += 1;
    console.error(`  FEHLER  Tageszeile ${tag}/${herkunft} fehlt.`);
    continue;
  }
  pruefe(
    `Tageszeile ${tag}/${herkunft}`,
    [
      zeile.sitzungen,
      zeile.sitzungen_mit_klick,
      zeile.klicks,
      zeile.modal_geoeffnet,
      zeile.laufzeit_gewaehlt,
      zeile.kassen,
      zeile.scroll_25,
      zeile.scroll_50,
      zeile.scroll_75,
      zeile.scroll_100,
      zeile.dauer_0_10,
      zeile.dauer_10_30,
      zeile.dauer_30_60,
      zeile.dauer_60_180,
      zeile.dauer_180_plus,
      zeile.sichtbare_ms_summe,
    ],
    werte,
  );
}

const summe = summiere(tage);
for (const [feld, soll] of Object.entries(ERWARTETE_SUMME)) {
  pruefe(`Summe ${feld}`, summe[feld], soll);
}

abschnitt("Verteilungen");

pruefe(
  "Verweildauer-Fächer",
  dauerVerteilung(summe).map((f) => f.anzahl),
  ERWARTETE_DAUER_FAECHER,
);
pruefe(
  "Scroll-Fächer",
  scrollVerteilung(summe).map((f) => f.anzahl),
  ERWARTETE_SCROLL_FAECHER,
);
pruefe(
  "Scroll-Fächer summieren sich auf die Besuche",
  scrollVerteilung(summe).reduce((n, f) => n + f.anzahl, 0),
  ERWARTETE_SUMME.sitzungen,
);

const abschnitteZeilen = aggregiereAbschnitte(sitzungen, ABSCHNITTE);
const abschnitteSumme = fasseAbschnitte(abschnitteZeilen, ABSCHNITTE);
pruefe(
  "Abschnitte erreicht",
  abschnitteSumme.map((a) => a.erreicht),
  ERWARTET_ERREICHT,
);
pruefe(
  "Abschnitte gestoppt",
  abschnitteSumme.map((a) => a.gestoppt),
  ERWARTET_GESTOPPT,
);
pruefe(
  "Gestoppt summiert sich auf die Besuche",
  abschnitteSumme.reduce((n, a) => n + a.gestoppt, 0),
  ERWARTETE_SUMME.sitzungen,
);

abschnitt("Klicks je Knopf");

const bauteile = nachBauteil(aggregiereBauteile(EREIGNISSE), BAUTEILE);
pruefe(
  "Bauteile",
  bauteile.map((b) => [b.bauteil, b.klicks, b.kassen, b.modal_geoeffnet]),
  ERWARTET_BAUTEILE,
);

abschnitt("Trichter");

const trichter = baueTrichter({
  summe,
  kassenGestartet: KASSEN_GESTARTET,
  kassenBezahlt: KASSEN_BEZAHLT,
});
pruefe(
  "Stufen",
  trichter.map((s) => [s.schluessel, s.anzahl, s.uebergang]),
  ERWARTETER_TRICHTER,
);
pruefe(
  "Jede Stufe trägt ihre Quelle",
  trichter.every((s) => typeof s.quelle === "string" && s.quelle.length > 20),
  true,
);

/* ── 2. Der echte Weg, wenn die Migration steht ─────────────────────────── */

abschnitt("Datenbank");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.log("  übersprungen — NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen.");
} else {
  const { createClient } = await import("@supabase/supabase-js");
  const { aggregiereZeitraum, ladeTage, analyticsBereit } = await import("@/lib/analytics/speicher");

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const bereit = await analyticsBereit(supabase);
  if (!bereit) {
    console.log("  übersprungen — Migration 101 ist nicht eingespielt (funnel_sitzungen fehlt).");
    console.log("  Die Rechnung oben lief gegen die lokale Nachbildung und ist davon unberührt.");
  } else {
    let aufgeraeumt = false;
    const raeumeAuf = async () => {
      if (aufgeraeumt) return;
      aufgeraeumt = true;
      await supabase.from("funnel_ereignisse").delete().like("sitzung", `${MARKE}%`);
      await supabase.from("funnel_sitzungen").delete().like("sitzung", `${MARKE}%`);
      for (const t of ["funnel_tage", "funnel_tage_bauteile", "funnel_tage_abschnitte"]) {
        await supabase.from(t).delete().gte("tag", TAG1).lte("tag", TAG2);
      }
    };

    try {
      // Reste eines abgebrochenen Laufs zuerst wegräumen.
      await raeumeAuf();
      aufgeraeumt = false;

      const einSitzungen = await supabase.from("funnel_sitzungen").insert(sitzungen);
      if (einSitzungen.error) throw new Error(`Sitzungen einfügen: ${einSitzungen.error.message}`);
      const einEreignisse = await supabase
        .from("funnel_ereignisse")
        .insert(EREIGNISSE.map(({ erzeugt_am, ...rest }) => ({ ...rest, erzeugt_am })));
      if (einEreignisse.error) throw new Error(`Ereignisse einfügen: ${einEreignisse.error.message}`);

      const lauf = await aggregiereZeitraum(supabase, TAG1, TAG2);
      pruefe("Aggregation gelaufen", lauf.gelaufen, true);
      pruefe("Gelesene Sitzungen", lauf.sitzungen, sitzungen.length);
      pruefe("Geschriebene Tageszeilen", lauf.tageszeilen, ERWARTET_TAGE.length);

      const gelesen = await ladeTage(supabase, TAG1, TAG2);
      pruefe("Tageszeilen aus der Datenbank", gelesen.tage.length, ERWARTET_TAGE.length);

      for (const soll of ERWARTET_TAGE) {
        const [tag, herkunft, ...werte] = soll;
        const zeile = gelesen.tage.find((z) => z.tag === tag && z.herkunft === herkunft);
        if (!zeile) {
          fehler += 1;
          geprueft += 1;
          console.error(`  FEHLER  Tageszeile ${tag}/${herkunft} fehlt in der Datenbank.`);
          continue;
        }
        pruefe(
          `DB-Tageszeile ${tag}/${herkunft}`,
          [
            zeile.sitzungen,
            zeile.sitzungen_mit_klick,
            zeile.klicks,
            zeile.modal_geoeffnet,
            zeile.laufzeit_gewaehlt,
            zeile.kassen,
            zeile.scroll_25,
            zeile.scroll_50,
            zeile.scroll_75,
            zeile.scroll_100,
            zeile.dauer_0_10,
            zeile.dauer_10_30,
            zeile.dauer_30_60,
            zeile.dauer_60_180,
            zeile.dauer_180_plus,
            Number(zeile.sichtbare_ms_summe),
          ],
          werte,
        );
      }

      const dbBauteile = nachBauteil(gelesen.bauteile, BAUTEILE);
      pruefe(
        "DB-Bauteile",
        dbBauteile.map((b) => [b.bauteil, b.klicks, b.kassen, b.modal_geoeffnet]),
        ERWARTET_BAUTEILE,
      );

      const dbAbschnitte = fasseAbschnitte(gelesen.abschnitte, ABSCHNITTE);
      pruefe(
        "DB-Abschnitte erreicht",
        dbAbschnitte.map((a) => a.erreicht),
        ERWARTET_ERREICHT,
      );

      // Zweiter Lauf: Die Aggregation muss idempotent sein, sonst verdoppelt
      // jeder Nachtlauf die Zahlen des Vortags.
      await aggregiereZeitraum(supabase, TAG1, TAG2);
      const nochmal = await ladeTage(supabase, TAG1, TAG2);
      pruefe("Zweiter Lauf ändert nichts (Zeilenzahl)", nochmal.tage.length, ERWARTET_TAGE.length);
      pruefe(
        "Zweiter Lauf ändert nichts (Besuche gesamt)",
        nochmal.tage.reduce((n, z) => n + z.sitzungen, 0),
        ERWARTETE_SUMME.sitzungen,
      );
    } finally {
      await raeumeAuf();
    }

    /* ── Der Beleg fürs Aufräumen ──────────────────────────────────────── */
    abschnitt("Aufräumen");
    const zaehle = async (tabelle, aufbau) => {
      const { count, error } = await aufbau(
        supabase.from(tabelle).select("*", { count: "exact", head: true }),
      );
      if (error) throw new Error(`${tabelle} zählen: ${error.message}`);
      return count ?? 0;
    };

    const resteEreignisse = await zaehle("funnel_ereignisse", (q) => q.like("sitzung", `${MARKE}%`));
    const resteSitzungen = await zaehle("funnel_sitzungen", (q) => q.like("sitzung", `${MARKE}%`));
    const resteTage = await zaehle("funnel_tage", (q) => q.gte("tag", TAG1).lte("tag", TAG2));
    const resteBauteile = await zaehle("funnel_tage_bauteile", (q) => q.gte("tag", TAG1).lte("tag", TAG2));
    const resteAbschnitte = await zaehle("funnel_tage_abschnitte", (q) => q.gte("tag", TAG1).lte("tag", TAG2));

    pruefe("Rest in funnel_ereignisse", resteEreignisse, 0);
    pruefe("Rest in funnel_sitzungen", resteSitzungen, 0);
    pruefe("Rest in funnel_tage", resteTage, 0);
    pruefe("Rest in funnel_tage_bauteile", resteBauteile, 0);
    pruefe("Rest in funnel_tage_abschnitte", resteAbschnitte, 0);
    console.log(
      `  Testdaten (${MARKE}…, ${TAG1} bis ${TAG2}) vollständig entfernt: ` +
        `${resteEreignisse + resteSitzungen + resteTage + resteBauteile + resteAbschnitte} Zeilen übrig.`,
    );
  }
}

/* ── Ergebnis ───────────────────────────────────────────────────────────── */

console.log(`\n${fehler === 0 ? "OK" : "FEHLGESCHLAGEN"} — ${geprueft} Prüfungen, ${fehler} Abweichungen.\n`);
process.exit(fehler === 0 ? 0 : 1);
