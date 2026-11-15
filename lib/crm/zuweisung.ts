/**
 * Wer bekommt einen Termin? — feste Call-Blöcke (Entscheidung Simon,
 * 07.11.2026): 13–14 Uhr Daniel, 15–17 Uhr Kevin, 17–19 Uhr Simon. Die Blöcke
 * stehen je Closer in `crm_team` (block_von/block_bis, Berliner Zeit) und sind
 * unter `/crm/team` änderbar.
 *
 * Reihenfolge: 1. Block, in dem der Termin beginnt. 2. Gastgeber in Calendly
 * (`calendly_email`). 3. niemand — der Kontakt bleibt im Pool.
 * Rein, ohne Abhängigkeiten (Tests: `zuweisung.test.ts`).
 */

export type TeamMitglied = {
  user_id: string;
  name: string;
  kuerzel: string;
  calendly_email: string | null;
  block_von: string | null; // "13:00:00"
  block_bis: string | null;
  aktiv: boolean;
};

const berlinMinuten = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function minuten(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Minuten seit Mitternacht in Berlin. */
export function berlinTagesMinuten(d: Date): number {
  return minuten(berlinMinuten.format(d));
}

export function closerFuerTermin(team: TeamMitglied[], start: Date, beraterEmail: string | null): TeamMitglied | null {
  const aktiv = team.filter((t) => t.aktiv);
  const m = berlinTagesMinuten(start);
  const imBlock = aktiv.find((t) => t.block_von && t.block_bis && m >= minuten(t.block_von) && m < minuten(t.block_bis));
  if (imBlock) return imBlock;
  const mail = beraterEmail?.trim().toLowerCase();
  if (mail) {
    const gastgeber = aktiv.find((t) => t.calendly_email?.trim().toLowerCase() === mail);
    if (gastgeber) return gastgeber;
  }
  return null;
}
