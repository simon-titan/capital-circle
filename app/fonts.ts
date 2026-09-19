import { Inter } from "next/font/google";

/**
 * Inter — die einzige Schrift der App (DESIGN.md, „The One-Face Rule").
 *
 * Über `next/font/google` statt per `<link>` auf fonts.googleapis.com: Next
 * lädt die Schriftdateien beim Build herunter und liefert sie von unserer
 * eigenen Domain aus. Der Browser des Besuchers spricht nie mit Google — ohne
 * das übertrug jeder Seitenaufruf die IP-Adresse an Google (LG München I,
 * Urteil vom 20.01.2022, 3 O 17493/20).
 *
 * Dieselben Achsen wie der frühere Link (`ital,opsz,wght@0,14..32,100..900;
 * 1,14..32,100..900`): variables Gewicht 100–900 (Standard bei variablen
 * Schriften), optische Größe `opsz` (für `fontOpticalSizing: "auto"` im
 * Chakra-Theme) und Kursive. `subsets` steuert nur das Vorladen — die übrigen
 * Zeichensätze liegen trotzdem selbst gehostet bereit.
 *
 * Genutzt wird die Schrift über die CSS-Variable `--font-inter` (gesetzt am
 * `<html>` in `app/layout.tsx`): `--font-heading/-body/-mono` in
 * `app/globals.css` und `fonts.*` in `theme/index.ts` zeigen darauf. Der
 * Familienname selbst ist ein Hash (`__Inter_…`) — ein wörtliches `"Inter"` im
 * CSS trifft ihn nicht. Wo keine CSS-Variable geht (Canvas in Chart.js), gilt
 * `inter.style.fontFamily`.
 */
export const inter = Inter({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-inter",
});
