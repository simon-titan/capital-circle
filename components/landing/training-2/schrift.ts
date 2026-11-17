import { Bodoni_Moda } from "next/font/google";

/**
 * Bodoni Moda — die Stichtiefdruck-Serife der Zertifikat-Variante von
 * `/training` (`/vorschau/training-2`). Nur dort geladen: Die übrige App bleibt
 * bei Inter (DESIGN.md, „The One-Face Rule"); die Ausnahme hat der Nutzer am
 * 06.11.2026 ausdrücklich für Version 2 freigegeben.
 *
 * Selbst gehostet über `next/font` wie Inter (kein Request an Google). Genutzt
 * über die CSS-Variable `--font-zertifikat`, gesetzt am Seitengrund.
 * Nur für große Größen (Headlines, Beträge, römische Ziffern): Die Haarstriche
 * einer Didone verschwinden unter ~20 px auf dunklem Grund.
 */
export const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-zertifikat",
});
