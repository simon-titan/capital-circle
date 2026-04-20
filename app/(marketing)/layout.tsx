import type { ReactNode } from "react";
import { Box } from "@chakra-ui/react";

/**
 * Marketing-Layout — bewusst minimal: kein Auth-Gate, keine Plattform-Chrome.
 * Wird genutzt für öffentliche Seiten wie /free, /pricing, /apply.
 *
 * Hintergrund: Plattformfarben aus DESIGN.json (Gold-Akzente werden auf
 * Komponentenebene gesetzt). Nutzt ein dezentes radiales Highlight oben
 * rechts — gleicher Stil wie HERO-UI-SPEZIFIKATION.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <Box
      minH="100vh"
      w="full"
      bg="var(--color-bg)"
      color="var(--color-text-primary)"
      position="relative"
      overflow="hidden"
      _before={{
        content: '""',
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(ellipse 80% 60% at 80% -10%, rgba(212,175,55,0.18), transparent 60%), radial-gradient(ellipse 60% 50% at 10% 100%, rgba(232,197,71,0.10), transparent 65%)",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <Box position="relative" zIndex={1}>
        {children}
      </Box>
    </Box>
  );
}
