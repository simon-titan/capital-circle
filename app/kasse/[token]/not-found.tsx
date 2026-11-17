import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { Link2Off } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Hinweis } from "@/components/kasse/KassenAnsicht";
import { RechtsLinks } from "@/components/legal/RechtsFusszeile";
import { anbieter } from "@/config/legal";

/**
 * Unbekannter Kassenlink. Fast immer ein abgeschnittener Link aus WhatsApp
 * oder einer Mail — kein Grund für eine nackte 404, sondern für den Weg zurück
 * zum Ansprechpartner.
 */
export default function KasseNichtGefunden() {
  return (
    <Box position="relative" minH="100vh" w="full" bg="var(--cc-bg)" color="var(--cc-text)" overflowX="clip">
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />

      <Flex position="relative" zIndex={1} justify="center" px={4} pt={{ base: 10, md: 16 }} pb={10}>
        <Stack spacing={{ base: 7, md: 8 }} w="full" maxW="560px">
          <Flex justify="center" className="cc-rise">
            <Box maxW="170px">
              <Logo variant="onDark" />
            </Box>
          </Flex>

          <Hinweis
            icon={<Link2Off size={24} strokeWidth={1.75} />}
            titel="Dieses Angebot finden wir nicht"
            text="Meist ist der Link beim Kopieren abgeschnitten worden. Öffne ihn bitte noch einmal direkt aus der Nachricht, oder frag deinen Ansprechpartner nach einem neuen."
          >
            <Text fontSize="14px" color="var(--cc-text-2)">
              Oder schreib an{" "}
              <Box
                as="a"
                href={`mailto:${anbieter.email}?subject=${encodeURIComponent("Mein Angebotslink funktioniert nicht")}`}
                color="var(--cc-gold-light)"
                textDecoration="underline"
                textDecorationColor="var(--cc-gold-line)"
                textUnderlineOffset="3px"
              >
                {anbieter.email}
              </Box>
            </Text>
          </Hinweis>

          <Flex justify="center" pt={2}>
            <RechtsLinks />
          </Flex>
        </Stack>
      </Flex>
    </Box>
  );
}
