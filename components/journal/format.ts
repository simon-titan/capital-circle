/** Einheitliche Zahl-, Geld- und Datumsformate für das Journal (de-DE). */

const currency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Ohne die Normalisierung formatiert Intl die negative Null als "-0,00 $". */
const normalizeZero = (value: number) => (value === 0 ? 0 : value);

/** Immer mit Vorzeichen — im Journal ist die Richtung wichtiger als die Zahl. */
export function formatMoney(value: number): string {
  const n = normalizeZero(value);
  return `${n > 0 ? "+" : ""}${currency.format(n)}`;
}

const plainAmount = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Betrag und Währungszeichen getrennt.
 *
 * Grosse Zahlen setzen das `$` kleiner und in Sekundärfarbe, damit die Ziffern
 * die Karte tragen. `formatMoney` klebt beides mit einem geschützten Leerzeichen
 * zusammen — das ist für Fließtext richtig, für eine Hero-Zahl aber zu breit.
 */
export function formatMoneyParts(value: number): { amount: string; currency: string } {
  const n = normalizeZero(value);
  return { amount: `${n > 0 ? "+" : ""}${plainAmount.format(n)}`, currency: "$" };
}

/**
 * Für sehr enge Zellen (Kalender auf Mobil): `+337`, `-340`, `+1,1k`.
 *
 * Intls `notation: "compact"` liefert auf de-DE `"1,1 Tsd. $"` — das passt in
 * keine 48-px-Zelle und würde abgeschnitten. Das Währungssymbol trägt hier die
 * Monatssumme darüber, nicht jeder einzelne Tag.
 */
export function formatMoneyTight(value: number): string {
  const n = normalizeZero(value);
  const abs = Math.abs(n);
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1).replace(".", ",")}k`;
  return `${sign}${Math.round(abs)}`;
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)} %`;
}

/** Profit Factor: null bedeutet "keine Verluste", nicht "keine Daten". */
export function formatRatio(value: number | null, digits = 2): string {
  if (value === null) return "∞";
  return value.toFixed(digits);
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

export function formatDateLong(isoDate: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

export function formatTime(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(isoTimestamp));
}

/** Farbe nach Vorzeichen — die zentrale visuelle Sprache des Journals. */
export function pnlColor(value: number): string {
  if (value > 0) return "var(--color-profit)";
  if (value < 0) return "var(--color-loss)";
  return "var(--cc-text-2)";
}

/** Haltedauer eines Trades: „45 s“, „14 Min. 32 s“, „2 Std. 5 Min.“. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d} ${d === 1 ? "Tag" : "Tage"} ${h % 24} Std.`;
  }
  if (h > 0) return `${h} Std. ${m} Min.`;
  if (m > 0) return `${m} Min. ${s} s`;
  return `${s} s`;
}

/** Uhrzeit mit Sekunden — in der Detailansicht zählt bei Scalps jede Sekunde. */
export function formatTimeSeconds(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(isoTimestamp));
}
