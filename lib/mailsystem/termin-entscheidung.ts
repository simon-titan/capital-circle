import { STUNDE_MS } from "./zeit";
import type { VorlageId } from "./vorlagen";

/**
 * Termin- und Buchungsmails des E-Mail-Playbooks 1.0 als reine Funktionen —
 * dieselbe Regel im Cron (`/api/cron/mail-termine`) und in den Tests
 * (`termin-entscheidung.test.ts`, Playbook-Tests 13–24).
 *
 *   entscheideAnfrage  B01–B03: Fragebogen fertig, Kalender offen, kein Termin
 *   entscheideTermin   T02–T04 vor einem gebuchten Termin, N01/N02 nach No-Show
 *
 * T01, R01–R03 hängen an einem Ereignis (Calendly) und gehen direkt im
 * Webhook raus. Verpasste Zeitpunkte werden nie nachgeholt (Kapitel 08).
 */

const MIN = 60_000;
const MAX_VERZUG_MS = 24 * STUNDE_MS;
const MINDESTABSTAND_MS = 24 * STUNDE_MS;
const plus = (d: Date, ms: number) => new Date(d.getTime() + ms);

export type Ergebnis = {
  senden: { vorlage: VorlageId; faelligAm: Date } | null;
  protokoll: { vorlage: VorlageId; status: "uebersprungen" | "gestoppt"; grund: string; faelligAm: Date }[];
  wartet: { vorlage: VorlageId; grund: string }[];
};

type Gemeinsam = {
  jetzt: Date;
  gesperrt: boolean;
  abgemeldet: boolean;
  pause: boolean;
  gekauft: boolean;
  /** Letzte automatische M/K-Sendung an diese Adresse. */
  letzteMarketingAm: Date | null;
};

/* ─── B: Kalender offen, aber kein Termin ──────────────────────────────── */

export type AnfrageZustand = Gemeinsam & {
  /** calendar_available_at — der Kalender steht direkt nach dem Fragebogen offen. */
  kalenderAb: Date;
  /** Irgendein Termin in diesem Vorgang (auch abgesagt): B startet nie von vorn. */
  terminGebucht: boolean;
  /** Lead entschieden (gewonnen/verloren) oder „nicht geeignet". */
  abgeschlossen: boolean;
  protokoll: Partial<Record<VorlageId, { status: string }>>;
};

export function entscheideAnfrage(z: AnfrageZustand): Ergebnis {
  const r: Ergebnis = { senden: null, protokoll: [], wartet: [] };
  const kandidaten: { vorlage: VorlageId; faellig: Date }[] = [
    { vorlage: "B01", faellig: plus(z.kalenderAb, 15 * MIN) },
    { vorlage: "B02", faellig: plus(z.kalenderAb, 24 * STUNDE_MS) },
    { vorlage: "B03", faellig: plus(z.kalenderAb, 72 * STUNDE_MS) },
  ];
  const sendbar: { vorlage: VorlageId; faellig: Date }[] = [];
  for (const k of kandidaten) {
    if (z.protokoll[k.vorlage] || k.faellig > z.jetzt) continue;
    const stopp = (grund: string) => r.protokoll.push({ vorlage: k.vorlage, status: "gestoppt", grund, faelligAm: k.faellig });
    if (z.gesperrt) stopp("zustellsperre");
    else if (z.abgemeldet) stopp("abgemeldet");
    else if (z.gekauft) stopp("kauf");
    else if (z.terminGebucht) stopp("termin");
    else if (z.abgeschlossen) stopp("abgeschlossen");
    else if (z.jetzt.getTime() - k.faellig.getTime() > MAX_VERZUG_MS)
      r.protokoll.push({ vorlage: k.vorlage, status: "uebersprungen", grund: "verpasst", faelligAm: k.faellig });
    else if (z.pause) r.wartet.push({ vorlage: k.vorlage, grund: "pause" });
    else sendbar.push(k);
  }
  if (!sendbar.length) return r;
  if (z.letzteMarketingAm && z.jetzt.getTime() - z.letzteMarketingAm.getTime() < MINDESTABSTAND_MS) {
    sendbar.forEach((k) => r.wartet.push({ vorlage: k.vorlage, grund: "abstand" }));
    return r;
  }
  // Mehrere fällig (lange keine Sendung möglich): nur die früheste, der Rest wartet bzw. verfällt.
  r.senden = { vorlage: sendbar[0]!.vorlage, faelligAm: sendbar[0]!.faellig };
  return r;
}

/* ─── T und N: rund um einen gebuchten Termin ──────────────────────────── */

export type TerminZustand = Gemeinsam & {
  start: Date;
  /** Zeitpunkt der Buchungs- bzw. Umbuchungsbestätigung dieser Terminversion. */
  bestaetigtAm: Date;
  status: "gebucht" | "umgebucht" | "abgesagt_kunde" | "abgesagt_team" | "gefuehrt" | "no_show";
  noShowAm: Date | null;
  /** Wievielter bestätigter No-Show in diesem Vorgang (1 = erster). */
  noShowNummer: number;
  /** Nach diesem Termin wurde im Vorgang neu gebucht. */
  neuGebucht: boolean;
  /** T02 ging in diesem Gesprächsvorgang schon raus (auch zu einer früheren Version). */
  t02Vorgang: boolean;
  /** Video 5 ist abspielbar (sonst kein T02). */
  video5Da: boolean;
  /** Protokoll dieser Terminversion (T03, T04, N01, N02) und des Vorgangs (T02). */
  protokoll: Partial<Record<VorlageId, { status: string }>>;
};

export function entscheideTermin(z: TerminZustand): Ergebnis {
  const r: Ergebnis = { senden: null, protokoll: [], wartet: [] };
  const vorlauf = (vor: Date) => vor.getTime() - z.bestaetigtAm.getTime();
  const end = (vorlage: VorlageId, status: "uebersprungen" | "gestoppt", grund: string, faellig: Date) =>
    r.protokoll.push({ vorlage, status, grund, faelligAm: faellig });

  if (z.status === "gebucht") {
    /* T02 — Video 5, 48 h vorher, Klasse M, einmal je Gesprächsvorgang */
    const t02 = plus(z.start, -48 * STUNDE_MS);
    if (!z.protokoll.T02 && !z.t02Vorgang && t02 <= z.jetzt) {
      if (vorlauf(t02) < 12 * STUNDE_MS) end("T02", "uebersprungen", "zu_kurzfristig", t02);
      else if (z.gesperrt) end("T02", "gestoppt", "zustellsperre", t02);
      else if (z.abgemeldet) end("T02", "gestoppt", "abgemeldet", t02);
      else if (!z.video5Da) end("T02", "uebersprungen", "kein_video", t02);
      else if (z.jetzt.getTime() >= plus(t02, 12 * STUNDE_MS).getTime()) end("T02", "uebersprungen", "verpasst", t02);
      else if (z.pause) r.wartet.push({ vorlage: "T02", grund: "pause" });
      else if (z.letzteMarketingAm && z.jetzt.getTime() - z.letzteMarketingAm.getTime() < MINDESTABSTAND_MS)
        r.wartet.push({ vorlage: "T02", grund: "abstand" });
      else r.senden = { vorlage: "T02", faelligAm: t02 };
    }
    if (r.senden) return r;

    /* T03 — Vortag, Klasse S, nur mit mindestens 12 h Abstand zur Bestätigung */
    const t03 = plus(z.start, -24 * STUNDE_MS);
    if (!z.protokoll.T03 && t03 <= z.jetzt) {
      if (vorlauf(t03) < 12 * STUNDE_MS) end("T03", "uebersprungen", "zu_kurzfristig", t03);
      else if (z.gesperrt) end("T03", "gestoppt", "zustellsperre", t03);
      else if (z.jetzt.getTime() >= plus(z.start, -2 * STUNDE_MS).getTime()) end("T03", "uebersprungen", "verpasst", t03);
      else {
        r.senden = { vorlage: "T03", faelligAm: t03 };
        return r;
      }
    }

    /* T04 — 30 Minuten vorher, nur wenn mindestens 2 h vor Beginn gebucht */
    const t04 = plus(z.start, -30 * MIN);
    if (!z.protokoll.T04 && t04 <= z.jetzt) {
      if (z.start.getTime() - z.bestaetigtAm.getTime() < 2 * STUNDE_MS) end("T04", "uebersprungen", "zu_kurzfristig", t04);
      else if (z.gesperrt) end("T04", "gestoppt", "zustellsperre", t04);
      else if (z.jetzt >= z.start) end("T04", "uebersprungen", "verpasst", t04);
      else r.senden = { vorlage: "T04", faelligAm: t04 };
    }
    return r;
  }

  if (z.status === "no_show" && z.noShowAm) {
    /* N01 +24 h, N02 +72 h ab ursprünglichem Beginn (nicht ab N01) */
    const kandidaten: { vorlage: VorlageId; faellig: Date }[] = [
      { vorlage: "N01", faellig: plus(z.start, 24 * STUNDE_MS) },
      { vorlage: "N02", faellig: plus(z.start, 72 * STUNDE_MS) },
    ];
    for (const k of kandidaten) {
      if (z.protokoll[k.vorlage] || k.faellig > z.jetzt) continue;
      if (z.gesperrt) end(k.vorlage, "gestoppt", "zustellsperre", k.faellig);
      else if (z.abgemeldet) end(k.vorlage, "gestoppt", "abgemeldet", k.faellig);
      else if (z.gekauft) end(k.vorlage, "gestoppt", "kauf", k.faellig);
      else if (z.neuGebucht) end(k.vorlage, "gestoppt", "neu_gebucht", k.faellig);
      // Zweiter bestätigter No-Show: manuell klären statt automatischem Kalenderlink.
      else if (z.noShowNummer > 1) end(k.vorlage, "gestoppt", "zweiter_no_show", k.faellig);
      else if (z.jetzt.getTime() - k.faellig.getTime() > MAX_VERZUG_MS) end(k.vorlage, "uebersprungen", "verpasst", k.faellig);
      else if (z.pause) r.wartet.push({ vorlage: k.vorlage, grund: "pause" });
      else if (z.letzteMarketingAm && z.jetzt.getTime() - z.letzteMarketingAm.getTime() < MINDESTABSTAND_MS)
        r.wartet.push({ vorlage: k.vorlage, grund: "abstand" });
      else {
        r.senden = { vorlage: k.vorlage, faelligAm: k.faellig };
        break;
      }
    }
  }
  return r;
}
