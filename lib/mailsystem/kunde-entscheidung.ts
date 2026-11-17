import { STUNDE_MS, TAG_MS } from "./zeit";
import { VORLAGEN, type VorlageId } from "./vorlagen";
import type { Ergebnis } from "./termin-entscheidung";

/**
 * Kundenmails des E-Mail-Playbooks 1.0 als reine Funktion (Tests:
 * `kunde-entscheidung.test.ts`, Playbook-Tests 32–36):
 *
 *   U01/U02  nur Käufer der Ausbildung (799 €), Tag 14 und 30 ab Freischaltung
 *   V01/V02  enthaltener regulärer Live-Zugang endet in 3 Tagen / ist beendet
 *
 * W01, Q01 (Kauf) und Q02 (Kündigung) hängen an Ereignissen und gehen direkt raus.
 */

const MAX_VERZUG_MS = 24 * STUNDE_MS;
const MINDESTABSTAND_MS = 24 * STUNDE_MS;
const plus = (d: Date, ms: number) => new Date(d.getTime() + ms);

export type KundeZustand = {
  jetzt: Date;
  gesperrt: boolean;
  abgemeldet: boolean;
  pause: boolean;
  letzteMarketingAm: Date | null;
  /** Gekaufte Ausbildung (799 €) — nur dann gibt es U01/U02. */
  ausbildung: {
    freigeschaltetAm: Date;
    /** Main/Premium gekauft (Upgrade) oder Ausbildung erstattet. */
    beendet: "upgrade" | "erstattet" | null;
    /** Nach dem Kauf eine Gesprächsanfrage oder ein Termin (betreute Upgradephase). */
    upgradeAnfrage: boolean;
    protokoll: Partial<Record<VorlageId, { status: string }>>;
  } | null;
  /** Enthaltener regulärer Live-Zugang eines Programms. */
  live: {
    endeAm: Date;
    /** Live-Abo gebucht (auch mit späterem Start) — stoppt V01/V02. */
    aboGebucht: boolean;
    erstattet: boolean;
    protokoll: Partial<Record<VorlageId, { status: string }>>;
  } | null;
};

type Kandidat = { vorlage: VorlageId; faellig: Date; bis?: Date; stopp: string | null; schonErledigt: boolean };

export function entscheideKunde(z: KundeZustand): Ergebnis & { bezugVon: Partial<Record<VorlageId, "ausbildung" | "live">> } {
  const r: Ergebnis & { bezugVon: Partial<Record<VorlageId, "ausbildung" | "live">> } = {
    senden: null,
    protokoll: [],
    wartet: [],
    bezugVon: {},
  };
  const kandidaten: Kandidat[] = [];

  if (z.ausbildung) {
    const a = z.ausbildung;
    const stopp = a.beendet ?? (a.upgradeAnfrage ? "upgrade_anfrage" : null);
    kandidaten.push(
      { vorlage: "U01", faellig: plus(a.freigeschaltetAm, 14 * TAG_MS), stopp, schonErledigt: Boolean(a.protokoll.U01) },
      { vorlage: "U02", faellig: plus(a.freigeschaltetAm, 30 * TAG_MS), stopp, schonErledigt: Boolean(a.protokoll.U02) },
    );
    r.bezugVon.U01 = r.bezugVon.U02 = "ausbildung";
  }
  if (z.live) {
    const l = z.live;
    const stopp = l.aboGebucht ? "live_abo" : l.erstattet ? "erstattet" : null;
    kandidaten.push(
      { vorlage: "V01", faellig: plus(l.endeAm, -3 * TAG_MS), bis: l.endeAm, stopp, schonErledigt: Boolean(l.protokoll.V01) },
      { vorlage: "V02", faellig: l.endeAm, stopp, schonErledigt: Boolean(l.protokoll.V02) },
    );
    r.bezugVon.V01 = r.bezugVon.V02 = "live";
  }

  const sendbar: Kandidat[] = [];
  for (const k of kandidaten) {
    if (k.schonErledigt || k.faellig > z.jetzt) continue;
    const end = (status: "uebersprungen" | "gestoppt", grund: string) =>
      r.protokoll.push({ vorlage: k.vorlage, status, grund, faelligAm: k.faellig });
    if (z.gesperrt) end("gestoppt", "zustellsperre");
    else if (z.abgemeldet) end("gestoppt", "abgemeldet");
    else if (k.stopp) end("gestoppt", k.stopp);
    else if (k.bis && z.jetzt >= k.bis) end("uebersprungen", "verpasst");
    else if (z.jetzt.getTime() - k.faellig.getTime() > MAX_VERZUG_MS) end("uebersprungen", "verpasst");
    else if (z.pause) r.wartet.push({ vorlage: k.vorlage, grund: "pause" });
    else sendbar.push(k);
  }
  if (!sendbar.length) return r;
  sendbar.sort((a, b) => VORLAGEN[a.vorlage].prioritaet - VORLAGEN[b.vorlage].prioritaet || a.faellig.getTime() - b.faellig.getTime());
  if (z.letzteMarketingAm && z.jetzt.getTime() - z.letzteMarketingAm.getTime() < MINDESTABSTAND_MS) {
    sendbar.forEach((k) => r.wartet.push({ vorlage: k.vorlage, grund: "abstand" }));
    return r;
  }
  r.senden = { vorlage: sendbar[0]!.vorlage, faelligAm: sendbar[0]!.faellig };
  return r;
}
