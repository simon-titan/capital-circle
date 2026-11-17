/**
 * Geldrechnung in ganzen Cent — rein, ohne Abhängigkeiten (Tests: `geld.test.ts`).
 *
 * Tracking-Playbook 10.2: Beträge in Minor Units, niemals Float. Gerundet wird
 * kaufmännisch (half-up, bei negativen Beträgen spiegelbildlich), und zwar mit
 * Ganzzahlarithmetik — `Math.round(x * 0.15)` kippt bei Werten wie 37815,5
 * je nach Gleitkommadarstellung in die falsche Richtung.
 */

/** a × zaehler / nenner, kaufmännisch auf ganze Cent gerundet. Nenner > 0. */
export function anteilCents(cents: number, zaehler: number, nenner: number): number {
  if (nenner <= 0) throw new Error("anteilCents: Nenner muss positiv sein");
  const vorzeichen = Math.sign(cents) * Math.sign(zaehler) || 1;
  const a = Math.abs(cents) * Math.abs(zaehler);
  return vorzeichen * Math.floor((2 * a + nenner) / (2 * nenner));
}

/**
 * Fallback, wenn Stripe keine Steuer liefert: 19 % **inklusive** herausrechnen
 * (brutto / 1,19). Nur als gekennzeichneter Ersatz (`steuer_quelle =
 * fallback_19_inkl`) — die tatsächliche Steuer der Transaktion hat Vorrang
 * (Playbook 10.3, QA-Karte 22: „kein pauschales Teilen durch 1,19").
 */
export function steuerFallback19Inkl(bruttoCents: number): { nettoCents: number; steuerCents: number } {
  const nettoCents = anteilCents(bruttoCents, 100, 119);
  return { nettoCents, steuerCents: bruttoCents - nettoCents };
}

/** „2.521,01 €" — Anzeige immer mit zwei Nachkommastellen (Playbook 12.4). */
export function euroText(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** „2521.01" — maschinenlesbar mit Dezimalpunkt, ohne Gleitkomma-Umweg (Export 15.3). */
export function euroDezimal(cents: number | null | undefined): string {
  if (cents == null) return "";
  const abs = Math.abs(cents);
  return `${cents < 0 ? "-" : ""}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Quote zur Anzeige mit einer Nachkommastelle; `null` (keine Population) = „No Data". */
export function quoteText(wert: number | null | undefined): string {
  if (wert == null || !Number.isFinite(wert)) return "No Data";
  return `${(wert * 100).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

/** Zähler / Nenner ungerundet; ohne Nenner `null` statt 0 % (Playbook 12.1). */
export function quote(zaehler: number, nenner: number): number | null {
  return nenner > 0 ? zaehler / nenner : null;
}
