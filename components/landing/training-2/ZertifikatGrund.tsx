import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

/*
 * Seitengrund der Zertifikat-Variante (`/vorschau/training-2`).
 *
 * Server-Komponente, aus `app/vorschau/training-2/page.tsx` gerendert.
 *
 * Statt Sternenfeld: Graphit wie Papier, darauf ein kaum sichtbares
 * Linienraster (Sicherheitsdruck) und ein Smaragd-Schein von oben. Die
 * Bewegungen der Seite stehen gesammelt in `zertifikat.css` (alle Klassen mit
 * `cz-`), jede mit Abschaltung bei `prefers-reduced-motion`. Schrift und CSS
 * lädt `TrainingZertifikat`.
 */


export function ZertifikatGrund({ children }: { children: ReactNode }) {
  return (
    <Box
      position="relative"
      minH="100vh"
      w="full"
      bg="#0f1317"
      color="var(--cc-text)"
      overflowX="clip"
    >
      {/* Sicherheitsdruck: feines Diagonalraster, kaum sichtbar. */}
      <Box
        aria-hidden
        position="fixed"
        inset={0}
        pointerEvents="none"
        opacity={0.5}
        bgImage="repeating-linear-gradient(45deg, rgba(95, 199, 154, 0.018) 0 1px, transparent 1px 7px), repeating-linear-gradient(-45deg, rgba(232, 192, 148, 0.014) 0 1px, transparent 1px 7px)"
      />
      {/* Smaragd-Schein von oben, Champagner-Hauch unten rechts. */}
      <Box
        aria-hidden
        position="fixed"
        inset={0}
        pointerEvents="none"
        bg="radial-gradient(ellipse 70% 45% at 50% -8%, rgba(31, 122, 90, 0.22), transparent 70%), radial-gradient(ellipse 50% 40% at 100% 110%, rgba(212, 176, 128, 0.07), transparent 70%)"
      />
      <Box position="relative" zIndex={1}>
        <Box id="seitenanfang" aria-hidden />
        {children}
      </Box>
    </Box>
  );
}
