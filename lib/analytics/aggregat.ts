/**
 * Die Rechnung hinter der Kaufweg-Auswertung — als reine Funktionen.
 *
 * ── Warum das hier steht und nicht in SQL ──────────────────────────────────
 *
 * Eine Postgres-Funktion waere schneller, liesse sich aber nur pruefen, indem
 * man sie in die Produktionsdatenbank einspielt. Diese Datei rechnet ueber
 * gewoehnliche Objekte, deshalb kann das Pruefskript
 * (`scripts/pruefe-kaufweg-analytics.mjs`) erfundene Sitzungen hineinschieben
 * und die Zahlen nachrechnen, ohne dass eine Migration eingespielt sein muss.
 *
 * **Keine Importe ausser Typen aus `kaufweg.ts`.** Kein Supabase, kein Next.
 * Das Pruefskript laedt die Datei direkt.
 */

import {
  DAUER_FAECHER,
  abschnittsRang,
  dauerFach,
  herkunftAus,
  quote,
  tagesSchluessel,
  type DauerFach,
} from "./kaufweg";

/* ── Zeilenformen (1:1 zu Migration 101) ─────────────────────────────────── */

export interface SitzungsZeile {
  sitzung: string;
  erste_seite: string | null;
  letzte_seite?: string | null;
  verweis_host: string | null;
  utm_quelle: string | null;
  utm_medium?: string | null;
  utm_kampagne?: string | null;
  src: string | null;
  geraet: string | null;
  begonnen_am: string;
  zuletzt_am?: string;
  sichtbare_ms: number;
  max_scroll: number;
  max_abschnitt: string | null;
  max_abschnitt_rang: number;
  klicks: number;
  modal_geoeffnet: number;
  laufzeit_gewaehlt: string | null;
  kasse_gestartet: boolean;
}

export interface EreignisZeile {
  sitzung: string;
  art: string;
  pfad: string | null;
  bauteil: string | null;
  wert: number | null;
  text_wert: string | null;
  erzeugt_am: string;
}

export interface TagesZeile {
  tag: string;
  pfad: string;
  herkunft: string;
  sitzungen: number;
  sitzungen_mit_klick: number;
  klicks: number;
  modal_geoeffnet: number;
  laufzeit_gewaehlt: number;
  kassen: number;
  scroll_25: number;
  scroll_50: number;
  scroll_75: number;
  scroll_100: number;
  dauer_0_10: number;
  dauer_10_30: number;
  dauer_30_60: number;
  dauer_60_180: number;
  dauer_180_plus: number;
  sichtbare_ms_summe: number;
}

export interface BauteilZeile {
  tag: string;
  pfad: string;
  bauteil: string;
  klicks: number;
  kassen: number;
  modal_geoeffnet: number;
}

export interface AbschnittsZeile {
  tag: string;
  pfad: string;
  abschnitt: string;
  rang: number;
  /** Kumulativ: jede Sitzung, die mindestens bis hierher kam. */
  erreicht: number;
  /** Genau hier war Schluss — die Zahl, die sagt, wo die Seite Leute verliert. */
  gestoppt: number;
}

/* ── Sitzungen → Tagesrechnung ───────────────────────────────────────────── */

function leereTagesZeile(tag: string, pfad: string, herkunft: string): TagesZeile {
  return {
    tag,
    pfad,
    herkunft,
    sitzungen: 0,
    sitzungen_mit_klick: 0,
    klicks: 0,
    modal_geoeffnet: 0,
    laufzeit_gewaehlt: 0,
    kassen: 0,
    scroll_25: 0,
    scroll_50: 0,
    scroll_75: 0,
    scroll_100: 0,
    dauer_0_10: 0,
    dauer_10_30: 0,
    dauer_30_60: 0,
    dauer_60_180: 0,
    dauer_180_plus: 0,
    sichtbare_ms_summe: 0,
  };
}

/**
 * Eine Zeile je (Tag, Pfad, Herkunft).
 *
 * Der Tag ist der **Beginn** der Sitzung, nicht ihr Ende: Wer um 23:58 kommt
 * und um 00:04 klickt, gehoert in einen Trichter, nicht in zwei.
 *
 * Die Scroll-Schwellen sind kumulativ gezaehlt — wer 75 % erreicht hat, steckt
 * auch in `scroll_25` und `scroll_50`. Ein Trichter, dessen Stufen sich nicht
 * enthalten, ist kein Trichter.
 */
export function aggregiereSitzungen(sitzungen: readonly SitzungsZeile[]): TagesZeile[] {
  const nach = new Map<string, TagesZeile>();

  for (const s of sitzungen) {
    const tag = tagesSchluessel(s.begonnen_am);
    const pfad = s.erste_seite ?? "/";
    const herkunft = herkunftAus(s);
    const schluessel = `${tag}|${pfad}|${herkunft}`;

    let zeile = nach.get(schluessel);
    if (!zeile) {
      zeile = leereTagesZeile(tag, pfad, herkunft);
      nach.set(schluessel, zeile);
    }

    zeile.sitzungen += 1;
    zeile.klicks += s.klicks;
    zeile.modal_geoeffnet += s.modal_geoeffnet;
    if (s.klicks > 0) zeile.sitzungen_mit_klick += 1;
    if (s.laufzeit_gewaehlt) zeile.laufzeit_gewaehlt += 1;
    if (s.kasse_gestartet) zeile.kassen += 1;

    if (s.max_scroll >= 25) zeile.scroll_25 += 1;
    if (s.max_scroll >= 50) zeile.scroll_50 += 1;
    if (s.max_scroll >= 75) zeile.scroll_75 += 1;
    if (s.max_scroll >= 100) zeile.scroll_100 += 1;

    const fach: DauerFach = dauerFach(s.sichtbare_ms);
    zeile[fach] += 1;
    zeile.sichtbare_ms_summe += s.sichtbare_ms;
  }

  return [...nach.values()].sort((a, b) => a.tag.localeCompare(b.tag) || a.herkunft.localeCompare(b.herkunft));
}

/**
 * Klicks, Kassen und Dialog-Oeffnungen je Knopf und Tag — aus dem Protokoll,
 * nicht aus den Sitzungen: Welcher Knopf geklickt wurde, steht nur dort.
 */
export function aggregiereBauteile(ereignisse: readonly EreignisZeile[]): BauteilZeile[] {
  const nach = new Map<string, BauteilZeile>();

  for (const e of ereignisse) {
    if (e.art !== "klick" && e.art !== "kasse" && e.art !== "modal_auf") continue;
    const bauteil = e.bauteil;
    if (!bauteil) continue;

    const tag = tagesSchluessel(e.erzeugt_am);
    const pfad = e.pfad ?? "/";
    const schluessel = `${tag}|${pfad}|${bauteil}`;

    let zeile = nach.get(schluessel);
    if (!zeile) {
      zeile = { tag, pfad, bauteil, klicks: 0, kassen: 0, modal_geoeffnet: 0 };
      nach.set(schluessel, zeile);
    }

    if (e.art === "klick") zeile.klicks += 1;
    else if (e.art === "kasse") zeile.kassen += 1;
    else zeile.modal_geoeffnet += 1;
  }

  return [...nach.values()].sort((a, b) => a.tag.localeCompare(b.tag) || a.bauteil.localeCompare(b.bauteil));
}

/**
 * Wie weit gelesen wurde, je Tag und Abschnitt.
 *
 * Aus den Sitzungen, nicht aus dem Protokoll: Dort steht jede Abschnitts-
 * meldung einzeln, hier zaehlt nur die weiteste. Abschnitte, die an einem Tag
 * niemand erreicht hat, bekommen trotzdem eine Zeile mit 0 — sonst faellt in
 * der Auswertung genau die Stufe aus dem Trichter, an der alle abbrechen.
 */
export function aggregiereAbschnitte(
  sitzungen: readonly SitzungsZeile[],
  abschnitte: readonly string[],
): AbschnittsZeile[] {
  const nach = new Map<string, AbschnittsZeile[]>();

  for (const s of sitzungen) {
    const tag = tagesSchluessel(s.begonnen_am);
    const pfad = s.erste_seite ?? "/";
    const schluessel = `${tag}|${pfad}`;

    let zeilen = nach.get(schluessel);
    if (!zeilen) {
      zeilen = abschnitte.map((abschnitt, rang) => ({
        tag,
        pfad,
        abschnitt,
        rang,
        erreicht: 0,
        gestoppt: 0,
      }));
      nach.set(schluessel, zeilen);
    }

    const rang = Math.min(
      abschnitte.length - 1,
      Math.max(0, s.max_abschnitt_rang || abschnittsRang(s.max_abschnitt)),
    );
    zeilen[rang].gestoppt += 1;
    for (let i = 0; i <= rang; i += 1) zeilen[i].erreicht += 1;
  }

  return [...nach.values()]
    .flat()
    .sort((a, b) => a.tag.localeCompare(b.tag) || a.rang - b.rang);
}

/* ── Tagesrechnung → Auswertung ──────────────────────────────────────────── */

export interface Summe {
  sitzungen: number;
  sitzungen_mit_klick: number;
  klicks: number;
  modal_geoeffnet: number;
  laufzeit_gewaehlt: number;
  kassen: number;
  scroll_25: number;
  scroll_50: number;
  scroll_75: number;
  scroll_100: number;
  dauer_0_10: number;
  dauer_10_30: number;
  dauer_30_60: number;
  dauer_60_180: number;
  dauer_180_plus: number;
  sichtbare_ms_summe: number;
}

const SUMMEN_FELDER: readonly (keyof Summe)[] = [
  "sitzungen",
  "sitzungen_mit_klick",
  "klicks",
  "modal_geoeffnet",
  "laufzeit_gewaehlt",
  "kassen",
  "scroll_25",
  "scroll_50",
  "scroll_75",
  "scroll_100",
  "dauer_0_10",
  "dauer_10_30",
  "dauer_30_60",
  "dauer_60_180",
  "dauer_180_plus",
  "sichtbare_ms_summe",
];

export function leereSumme(): Summe {
  const s = {} as Summe;
  for (const feld of SUMMEN_FELDER) s[feld] = 0;
  return s;
}

export function summiere(zeilen: readonly TagesZeile[]): Summe {
  const summe = leereSumme();
  for (const z of zeilen) {
    for (const feld of SUMMEN_FELDER) summe[feld] += z[feld];
  }
  return summe;
}

/** Summen je Herkunft, absteigend nach Besuchen. */
export function nachHerkunft(zeilen: readonly TagesZeile[]): Array<{ herkunft: string } & Summe> {
  const nach = new Map<string, { herkunft: string } & Summe>();
  for (const z of zeilen) {
    let eintrag = nach.get(z.herkunft);
    if (!eintrag) {
      eintrag = { herkunft: z.herkunft, ...leereSumme() };
      nach.set(z.herkunft, eintrag);
    }
    for (const feld of SUMMEN_FELDER) eintrag[feld] += z[feld];
  }
  return [...nach.values()].sort((a, b) => b.sitzungen - a.sitzungen);
}

/** Summen je Tag, aufsteigend — die Grundlage jedes Zeitverlaufs. */
export function nachTag(zeilen: readonly TagesZeile[]): Array<{ tag: string } & Summe> {
  const nach = new Map<string, { tag: string } & Summe>();
  for (const z of zeilen) {
    let eintrag = nach.get(z.tag);
    if (!eintrag) {
      eintrag = { tag: z.tag, ...leereSumme() };
      nach.set(z.tag, eintrag);
    }
    for (const feld of SUMMEN_FELDER) eintrag[feld] += z[feld];
  }
  return [...nach.values()].sort((a, b) => a.tag.localeCompare(b.tag));
}

/** Klicks je Knopf ueber den ganzen Zeitraum, in der Reihenfolge der Seite. */
export function nachBauteil(
  zeilen: readonly BauteilZeile[],
  reihenfolge: readonly string[],
): Array<{ bauteil: string; klicks: number; kassen: number; modal_geoeffnet: number }> {
  const nach = new Map<string, { bauteil: string; klicks: number; kassen: number; modal_geoeffnet: number }>();
  for (const z of zeilen) {
    let eintrag = nach.get(z.bauteil);
    if (!eintrag) {
      eintrag = { bauteil: z.bauteil, klicks: 0, kassen: 0, modal_geoeffnet: 0 };
      nach.set(z.bauteil, eintrag);
    }
    eintrag.klicks += z.klicks;
    eintrag.kassen += z.kassen;
    eintrag.modal_geoeffnet += z.modal_geoeffnet;
  }
  const rang = (name: string) => {
    const i = reihenfolge.indexOf(name);
    return i < 0 ? reihenfolge.length : i;
  };
  return [...nach.values()].sort((a, b) => rang(a.bauteil) - rang(b.bauteil));
}

/* ── Verteilungen ────────────────────────────────────────────────────────── */

export interface Fach {
  titel: string;
  anzahl: number;
  anteil: number;
}

/** Die Verweildauer als Faecher — jeder Besuch steckt in genau einem. */
export function dauerVerteilung(summe: Summe): Fach[] {
  const gesamt = DAUER_FAECHER.reduce((n, f) => n + summe[f.schluessel], 0);
  return DAUER_FAECHER.map((f) => ({
    titel: f.titel,
    anzahl: summe[f.schluessel],
    anteil: quote(summe[f.schluessel], gesamt),
  }));
}

/**
 * Die Scrolltiefe als Faecher — hier **nicht** kumulativ, sondern als
 * „so weit und nicht weiter". Kumulativ stuende neben „100 %" noch einmal
 * dieselbe Person unter „25 %", und die Saeulen summierten sich auf ein
 * Vielfaches der Besucher.
 */
export function scrollVerteilung(summe: Summe): Fach[] {
  const unter25 = summe.sitzungen - summe.scroll_25;
  const faecher = [
    { titel: "unter 25 %", anzahl: Math.max(0, unter25) },
    { titel: "25–49 %", anzahl: Math.max(0, summe.scroll_25 - summe.scroll_50) },
    { titel: "50–74 %", anzahl: Math.max(0, summe.scroll_50 - summe.scroll_75) },
    { titel: "75–99 %", anzahl: Math.max(0, summe.scroll_75 - summe.scroll_100) },
    { titel: "100 %", anzahl: summe.scroll_100 },
  ];
  return faecher.map((f) => ({ ...f, anteil: quote(f.anzahl, summe.sitzungen) }));
}

/**
 * Wie weit die Besucher gekommen sind — je Abschnitt die Zahl derer, deren
 * weitester Abschnitt genau dieser war. Braucht die Sitzungen selbst, weil der
 * Rang nicht in der Tagesrechnung steht.
 */
export function abschnittsVerteilung(
  sitzungen: readonly SitzungsZeile[],
  abschnitte: readonly string[],
): Array<{ abschnitt: string; erreicht: number; gestoppt: number }> {
  const erreicht = new Array(abschnitte.length).fill(0) as number[];
  const gestoppt = new Array(abschnitte.length).fill(0) as number[];

  for (const s of sitzungen) {
    const rang = Math.min(
      abschnitte.length - 1,
      Math.max(0, s.max_abschnitt_rang || abschnittsRang(s.max_abschnitt)),
    );
    gestoppt[rang] += 1;
    for (let i = 0; i <= rang; i += 1) erreicht[i] += 1;
  }

  return abschnitte.map((abschnitt, i) => ({ abschnitt, erreicht: erreicht[i], gestoppt: gestoppt[i] }));
}

/** Dasselbe aus der Tagesrechnung — der Weg, den die Admin-Ansicht nimmt. */
export function fasseAbschnitte(
  zeilen: readonly AbschnittsZeile[],
  abschnitte: readonly string[],
): Array<{ abschnitt: string; erreicht: number; gestoppt: number }> {
  const nach = new Map<string, { abschnitt: string; erreicht: number; gestoppt: number }>();
  for (const abschnitt of abschnitte) nach.set(abschnitt, { abschnitt, erreicht: 0, gestoppt: 0 });
  for (const z of zeilen) {
    const eintrag = nach.get(z.abschnitt);
    if (!eintrag) continue;
    eintrag.erreicht += z.erreicht;
    eintrag.gestoppt += z.gestoppt;
  }
  return abschnitte.map((a) => nach.get(a)!);
}

/* ── Der Trichter ────────────────────────────────────────────────────────── */

export interface TrichterStufe {
  schluessel: string;
  titel: string;
  anzahl: number;
  /** Anteil an der Stufe darueber. */
  uebergang: number;
  /** Anteil an der ersten Stufe. */
  vomStart: number;
  /** Woher die Zahl kommt — steht so in der Admin-Ansicht. */
  quelle: string;
}

/**
 * Besuch → halb gelesen → Klick → Kasse → bezahlt.
 *
 * Die ersten drei Stufen kommen aus der eigenen Messung der Verkaufsseite, die
 * letzten beiden aus `checkout_sessions`. Das ist **Absicht und muss dastehen**:
 * In der Kasse landen auch Kaeufer, die nie auf der Verkaufsseite waren
 * (Upgrade aus `/billing`, Link aus einer E-Mail). Wer die Stufen ohne diesen
 * Hinweis liest, haelt eine Uebergangsquote von 120 % fuer einen Rechenfehler.
 */
export function baueTrichter(input: {
  summe: Summe;
  kassenGestartet: number;
  kassenBezahlt: number;
}): TrichterStufe[] {
  const { summe, kassenGestartet, kassenBezahlt } = input;

  const roh = [
    {
      schluessel: "besuche",
      titel: "Besuche",
      anzahl: summe.sitzungen,
      quelle: "Sitzungen auf den gemessenen Seiten (funnel_sitzungen → funnel_tage). Ein Tab = ein Besuch.",
    },
    {
      schluessel: "gelesen",
      titel: "Halbe Seite gelesen",
      anzahl: summe.scroll_50,
      quelle: "Besuche, die mindestens 50 % Scrolltiefe erreicht haben.",
    },
    {
      schluessel: "klick",
      titel: "Auf einen Kauf-Knopf geklickt",
      anzahl: summe.sitzungen_mit_klick,
      quelle: "Besuche mit mindestens einem Klick auf „Capital Circle beitreten“ oder den Kauf-Knopf.",
    },
    {
      schluessel: "kasse",
      titel: "Kasse geöffnet",
      anzahl: kassenGestartet,
      quelle:
        "Zeilen in checkout_sessions im Zeitraum. Enthält auch Käufe, die nicht über die Verkaufsseite begannen.",
    },
    {
      schluessel: "bezahlt",
      titel: "Bezahlt",
      anzahl: kassenBezahlt,
      quelle: "checkout_sessions mit status = completed (Stripe-Webhook checkout.session.completed).",
    },
  ];

  const start = roh[0].anzahl;
  return roh.map((stufe, i) => ({
    ...stufe,
    uebergang: i === 0 ? 100 : quote(stufe.anzahl, roh[i - 1].anzahl),
    vomStart: quote(stufe.anzahl, start),
  }));
}
