import { anteilCents } from "./geld";

/**
 * Closer-Provision (Tracking-Playbook 10.3/10.4) — rein (Tests: `provision.test.ts`).
 *
 *   Provision = 15 % des tatsächlich eingegangenen Nettobetrags ohne USt,
 *   je Zahlung, auf Cent gerundet.
 *
 * - Bei planmäßiger Vollzahlung entspricht die Summe der Ratenprovisionen exakt
 *   der Provision auf den gesamten tatsächlichen Nettobetrag; die Differenz
 *   gleicht die letzte erfolgreiche Rate aus.
 * - Erstattung und verlorener Chargeback: negativer Eintrag aus dem erstatteten
 *   Nettoanteil. Die Historie wird nie überschrieben.
 * - Fehlgeschlagene Rate: keine Zahlung, keine Provision (es entsteht gar keine
 *   Ledger-Zeile).
 *
 * Die Formel steht im Playbook; ob die Vertragstexte der Closer sie so tragen,
 * ist Prüfpunkt T-06 (offen).
 */

export const PROVISION_SATZ_BP = 1500;

/** Provision auf einen Nettobetrag (negativ bei Korrekturen), kaufmännisch gerundet. */
export function provisionCents(nettoCents: number, satzBp = PROVISION_SATZ_BP): number {
  return anteilCents(nettoCents, satzBp, 10_000);
}

export type ProvisionsBerechnung = { betragCents: number; rundungsausgleichCents: number };

/**
 * Provision einer Zahlung. `ausgleich` nur bei der letzten planmäßigen Rate
 * (alle Raten bezahlt, keine Korrektur am Kauf): Dann wird auf die Provision
 * des gesamten Netto aufgefüllt bzw. gekürzt.
 */
export function provisionFuerZahlung(p: {
  nettoCents: number;
  satzBp?: number;
  ausgleich?: { nettoSummeAlleZahlungen: number; provisionBisher: number } | null;
}): ProvisionsBerechnung {
  const satz = p.satzBp ?? PROVISION_SATZ_BP;
  const einfach = provisionCents(p.nettoCents, satz);
  if (!p.ausgleich) return { betragCents: einfach, rundungsausgleichCents: 0 };
  const ziel = provisionCents(p.ausgleich.nettoSummeAlleZahlungen, satz);
  const betrag = ziel - p.ausgleich.provisionBisher;
  return { betragCents: betrag, rundungsausgleichCents: betrag - einfach };
}

/** Negative Provision auf einen erstatteten Nettoanteil (`nettoCents` negativ oder positiv übergeben). */
export function provisionsKorrektur(erstattetNettoCents: number, satzBp = PROVISION_SATZ_BP): number {
  return -Math.abs(provisionCents(Math.abs(erstattetNettoCents), satzBp));
}
