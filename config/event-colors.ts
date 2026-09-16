/**
 * Event-Farben im Kalender — nur Töne aus der Markenpalette v3.2
 * „Champagner auf Graphit“ (DESIGN.md). Admin wählt im Event-Formular,
 * der Mitglieder-Kalender färbt die Chips über `ev-tone-<key>`
 * (`components/platform/eventsCalendar.theme.css`).
 *
 * Alt-Farben aus der Datenbank (Blau, Grün, Lila …) werden auf den nächstliegenden
 * Markenton abgebildet, damit nichts außerhalb der Palette erscheint.
 */
export const EVENT_COLORS = [
  { key: "champagner", value: "#d4b080", label: "Champagner" },
  { key: "champagner-hell", value: "#e8c094", label: "Champagner hell" },
  { key: "bronze", value: "#b8935f", label: "Bronze" },
  { key: "silber", value: "#d1d0d4", label: "Silber" },
  { key: "graphit", value: "#80868d", label: "Graphit" },
] as const;

export type EventColor = (typeof EVENT_COLORS)[number];

export const DEFAULT_EVENT_COLOR: EventColor = EVENT_COLORS[0];

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const n = Number.parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Gespeicherte Farbe → Markenton (exakt oder nächstliegend); ungültig/leer → Champagner. */
export function resolveEventColor(color?: string | null): EventColor {
  if (!color) return DEFAULT_EVENT_COLOR;
  const exact = EVENT_COLORS.find((c) => c.value.toLowerCase() === color.trim().toLowerCase());
  if (exact) return exact;
  const rgb = hexToRgb(color);
  if (!rgb) return DEFAULT_EVENT_COLOR;
  let best: EventColor = DEFAULT_EVENT_COLOR;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const c of EVENT_COLORS) {
    const [r, g, b] = hexToRgb(c.value)!;
    const d = (r - rgb[0]) ** 2 + (g - rgb[1]) ** 2 + (b - rgb[2]) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}
