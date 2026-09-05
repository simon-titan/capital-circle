import { NextResponse } from "next/server";

/**
 * RFC-4180-konformes Escaping eines einzelnen CSV-Feldes.
 * Quoting bei Komma, doppeltem Anführungszeichen oder Zeilenumbruch — analog zum
 * bestehenden Muster in app/api/admin/discord-funnel/export/route.ts.
 */
export function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Baut eine einzelne CSV-Zeile aus rohen Werten (jedes Feld wird einzeln escaped). */
export function toCsvRow(values: unknown[]): string {
  return values.map(csvField).join(",");
}

/**
 * Baut eine downloadbare CSV-Response mit UTF-8-BOM (für Excel) aus fertigen Zeilen
 * (Header + Datenzeilen, jeweils bereits via toCsvRow gebaut).
 */
export function buildCsvResponse(rows: string[], filename: string): NextResponse {
  const csv = "﻿" + rows.join("\r\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
