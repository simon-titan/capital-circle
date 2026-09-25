/**
 * Regeln für Bilder am Trade — eine Quelle für Browser und Server, damit die
 * Ablage dieselben Grenzen meldet, die die Route am Ende durchsetzt.
 */

export const TRADE_BILD_TYPEN: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Ein Vollbild-Screenshot als PNG liegt bei 1–4 MB; 10 MB lässt Luft für 4K. */
export const TRADE_BILD_MAX_BYTES = 10 * 1024 * 1024;

/** Mehr braucht kein Trade — und es begrenzt, was ein einzelnes Konto in R2 ablegen kann. */
export const TRADE_BILD_MAX_ANZAHL = 12;

/** R2-Präfix eines Trades. Die Registrierung prüft genau dieses Präfix. */
export function tradeBildPraefix(userId: string, tradeId: string): string {
  return `journal/${userId}/${tradeId}/`;
}

export type TradeBild = {
  id: string;
  url: string | null;
  contentType: string;
  bytes: number | null;
  createdAt: string;
};
