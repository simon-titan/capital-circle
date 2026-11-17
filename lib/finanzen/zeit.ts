/**
 * Zeiträume und Europe/Berlin — rein (Tests: `zeit.test.ts`).
 *
 * Playbook 12.1: UTC speichern, Europe/Berlin anzeigen, Datumsgrenzen und
 * Sommerzeit korrekt. Ein „Tag" im Filter ist ein Berliner Kalendertag; seine
 * Grenzen werden hier in UTC umgerechnet.
 */

export type Zeitraum = { von: Date; bis: Date } | null; // null = Gesamt

const TAG_MS = 86_400_000;

const teile = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Versatz Berlin gegenüber UTC zu einem Zeitpunkt, in Minuten (60 oder 120). */
export function berlinVersatzMinuten(d: Date): number {
  const p = Object.fromEntries(teile.formatToParts(d).map((x) => [x.type, x.value]));
  const alsUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return Math.round((alsUtc - Math.floor(d.getTime() / 1000) * 1000) / 60_000);
}

/** Mitternacht eines Berliner Kalendertags (`YYYY-MM-DD`) als UTC-Zeitpunkt. */
export function berlinMitternacht(tag: string): Date {
  const [y, m, d] = tag.split("-").map(Number);
  const naiv = Date.UTC(y!, (m ?? 1) - 1, d ?? 1);
  // Zweimal schätzen: Der Versatz um Mitternacht kann am Umstellungstag ein anderer sein als um 0 Uhr UTC.
  let t = naiv - berlinVersatzMinuten(new Date(naiv)) * 60_000;
  t = naiv - berlinVersatzMinuten(new Date(t)) * 60_000;
  return new Date(t);
}

/** Berliner Kalendertag `YYYY-MM-DD` eines Zeitpunkts. */
export function berlinTag(d: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(typeof d === "string" ? new Date(d) : d);
}

/** Abrechnungsperiode `YYYY-MM` (Berlin). */
export function berlinPeriode(d: Date | string): string {
  return berlinTag(d).slice(0, 7);
}

export type ZeitraumWahl = "7" | "30" | "90" | "gesamt" | "frei";

/**
 * Zeitraum aus der Auswahl: 7/30/90 = die letzten N Berliner Kalendertage
 * inklusive heute; „frei" = von/bis als Berliner Tage (bis inklusive).
 */
export function zeitraumAus(wahl: ZeitraumWahl, jetzt: Date, von?: string | null, bis?: string | null): Zeitraum {
  if (wahl === "gesamt") return null;
  if (wahl === "frei") {
    if (!von || !bis || !/^\d{4}-\d{2}-\d{2}$/.test(von) || !/^\d{4}-\d{2}-\d{2}$/.test(bis)) return null;
    const ende = berlinMitternacht(naechsterTag(bis));
    return { von: berlinMitternacht(von), bis: ende };
  }
  const n = Number(wahl);
  const heute = berlinTag(jetzt);
  return { von: berlinMitternacht(tagPlus(heute, -(n - 1))), bis: berlinMitternacht(naechsterTag(heute)) };
}

export function naechsterTag(tag: string): string {
  return tagPlus(tag, 1);
}

export function tagPlus(tag: string, tage: number): string {
  const [y, m, d] = tag.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, (d ?? 1) + tage)).toISOString().slice(0, 10);
}

export function imZeitraum(iso: string | Date | null | undefined, z: Zeitraum): boolean {
  if (!iso) return false;
  const t = (typeof iso === "string" ? new Date(iso) : iso).getTime();
  if (Number.isNaN(t)) return false;
  return !z || (t >= z.von.getTime() && t < z.bis.getTime());
}

export function plusTage(d: Date | string, tage: number): Date {
  return new Date((typeof d === "string" ? new Date(d) : d).getTime() + tage * TAG_MS);
}
