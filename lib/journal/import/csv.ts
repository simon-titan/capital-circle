/**
 * Minimaler, quote-bewusster CSV-Parser (RFC 4180).
 *
 * Nötig, weil der TradingView-Export Felder wie `"242,046.00"` enthält — ein
 * naives `split(",")` zerlegt die Zeile an der falschen Stelle. Für genau ein
 * bekanntes Format lohnt sich keine zusätzliche Dependency.
 */

/** Zerlegt CSV-Text in eine Matrix. Leere Schlusszeile wird verworfen. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // BOM entfernen — Excel-Roundtrips hängen ihn gern an.
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < src.length; i++) {
    const char = src[i];

    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  // Letzte Zeile ohne abschliessenden Zeilenumbruch.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Erste Zeile als Header, Rest als Objekte. Header-Namen werden getrimmt. */
export function toObjects(matrix: string[][]): Record<string, string>[] {
  if (matrix.length === 0) return [];
  const header = matrix[0].map((h) => h.trim());
  return matrix.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    header.forEach((key, i) => {
      obj[key] = row[i] ?? "";
    });
    return obj;
  });
}

/**
 * Zahl aus einem CSV-Feld. Entfernt Tausendertrennzeichen und Leerraum.
 * Gibt null zurück, wenn das Feld leer oder keine Zahl ist — nie NaN.
 */
export function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.trim().replace(/,/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
