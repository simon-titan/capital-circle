import { Box, Flex, Text } from "@chakra-ui/react";
import { Archive } from "lucide-react";
import { ChakraLinkButton } from "@/components/platform/ChakraLinkButton";
import { IconTile } from "@/components/platform/dashboard/primitives";

/**
 * Hinweis im Live-Bereich für Mentoring-Konten ohne Live-Archiv
 * (`archivZugangFehlt` in `lib/mentoring/zugang.ts`): Ausbildung und Live-Abo
 * enthalten seit 08.11.2026 keine Aufzeichnungen, Main/Premium 12 Monate.
 * Kein Kaufknopf — das Archiv gibt es nur mit dem Mentoring, und das wird im
 * Analysegespräch verkauft.
 */
export function ArchivNichtEnthalten({ titel, kompakt = false }: { titel?: string; kompakt?: boolean }) {
  return (
    <Flex
      className="cc-card cc-card--still cc-rise"
      direction="column"
      align="center"
      textAlign="center"
      py={kompakt ? { base: 6, md: 8 } : { base: 10, md: 14 }}
      px={{ base: 5, md: 6 }}
    >
      <IconTile>
        <Box color="var(--cc-gold-light)">
          <Archive size={24} strokeWidth={1.75} />
        </Box>
      </IconTile>
      <Box as={kompakt ? "h2" : "h1"} fontSize={{ base: "20px", md: "24px" }} fontWeight={600} lineHeight={1.25} mt={5} maxW="32rem">
        {titel ?? "Das Live-Archiv ist im Mentoring enthalten"}
      </Box>
      <Text fontSize="14px" lineHeight={1.7} color="var(--cc-text-2)" mt={3} maxW="460px">
        Die Aufzeichnungen der Live-Sessions gehören zum Main und Premium Mentoring. Live Trading, Daily Bias und Trade
        Recaps bleiben dir, solange dein Live-Zugang läuft. Die freie Kategorie steht dir weiter offen.
      </Text>
      <ChakraLinkButton href="/programme" variant="line" size="sm" mt={6}>
        Ausbildung & Mentoring ansehen
      </ChakraLinkButton>
    </Flex>
  );
}
