/**
 * CSV nach RFC 4180 für die Exporte (Tracking-Playbook 14, 15.3) — rein
 * (Tests: `csv.test.ts`).
 *
 * UTF-8, Komma als Trennzeichen, CRLF als Zeilenende, Felder mit Komma,
 * Anführungszeichen oder Zeilenumbruch in Anführungszeichen. Zeitpunkte als
 * ISO-8601 in UTC. Zahlen mit Dezimalpunkt.
 *
 * **Formel-Escaping:** Ein Textfeld, das mit `=`, `+`, `-`, `@`, Tab oder CR
 * beginnt, bekommt ein vorangestelltes `'` — sonst führt Excel/Sheets es beim
 * Öffnen als Formel aus (CSV-Injection). Echte Zahlen (auch negative wie
 * `-12.50`) bleiben unverändert, sonst wären Erstattungen nicht mehr rechenbar.
 */

export type Zelle = string | number | boolean | Date | null | undefined;

const ZAHL = /^-?\d+(\.\d+)?$/;

export function csvZelle(v: Zelle): string {
  if (v == null) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (typeof v === "boolean") return v ? "true" : "false";
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !ZAHL.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function csv(kopf: readonly string[], zeilen: readonly Zelle[][]): string {
  const out = [kopf.map(csvZelle).join(",")];
  for (const z of zeilen) {
    if (z.length !== kopf.length) throw new Error(`CSV: Zeile mit ${z.length} statt ${kopf.length} Feldern`);
    out.push(z.map(csvZelle).join(","));
  }
  return `${out.join("\r\n")}\r\n`;
}

/** Zeitpunkt als ISO-8601 UTC oder leer. */
export function isoUtc(v: string | Date | null | undefined): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}
