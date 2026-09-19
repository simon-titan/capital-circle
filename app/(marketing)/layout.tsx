import type { ReactNode } from "react";
import { Box } from "@chakra-ui/react";
import { RechtsFusszeile } from "@/components/legal/RechtsFusszeile";

/**
 * Marketing-Layout — bewusst minimal: kein Auth-Gate, keine Plattform-Chrome.
 * Wird genutzt für öffentliche Seiten wie /free, /apply und /survey. Die
 * Verkaufsseite liegt seit dem Umbau auf `/` und bringt ihren Himmel selbst mit.
 *
 * Hintergrund wie im Mitgliederbereich (DESIGN.md v3.2): Graphitgrund mit
 * Sternenfeld (`.cc-stars`) und Champagner-Licht (`.cc-goldlight`), beide
 * `fixed` hinter dem Inhalt. `overflow-x: clip` statt `hidden`, damit kein
 * Scroll-Container entsteht.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <Box position="relative" minH="100vh" w="full" bg="var(--cc-bg)" color="var(--cc-text)" overflowX="clip">
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />
      <Box position="relative" zIndex={1}>
        {children}
      </Box>
      {/* Rechtliche Links für alle Seiten dieser Gruppe (/free, /apply, /survey).
          Ohne eigene Haarlinie: Die Seiten schließen selbst mit einem
          Hinweisblock ab, die Linkzeile setzt direkt darunter an. */}
      <RechtsFusszeile ohneLinie />
    </Box>
  );
}
