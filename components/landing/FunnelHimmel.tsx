import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

/*
 * Seitengrund von `/training` und `/call`, aus der Server-Komponente der Seite
 * gerendert (`app/training/page.tsx`, `app/call/page.tsx`). Die Hydration-Fehler,
 * die anfangs hier vermutet wurden, kamen von Emotion ohne SSR-Registry und sind
 * seit `components/emotion-registry.tsx` (06.11.2026) app-weit behoben.
 */

/** Seitengrund wie auf `/`: Graphit, Sternenfeld und Champagner-Licht. */
export function FunnelHimmel({ children }: { children: ReactNode }) {
  return (
    <Box position="relative" minH="100vh" w="full" bg="var(--cc-bg)" color="var(--cc-text)" overflowX="clip">
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />
      <Box position="relative" zIndex={1}>
        {/* Sprungziel der Wortmarke in der Kopfleiste. */}
        <Box id="seitenanfang" aria-hidden />
        {children}
      </Box>
    </Box>
  );
}
