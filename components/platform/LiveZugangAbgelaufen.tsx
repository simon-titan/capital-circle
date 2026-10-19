import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { Radio } from "lucide-react";
import { IconTile } from "@/components/platform/dashboard/primitives";
import { PRODUKTE, euro } from "@/config/mentoring";

/**
 * Anschlussangebot im Live-Bereich, wenn der Live-Zeitraum eines
 * Mentoring-Programms abgelaufen ist (`liveZugangAbgelaufen` in
 * `lib/mentoring/zugang.ts`).
 *
 * Ehrlich benannt statt verwischt (DESIGN.md → Gesperrt): was fehlt, warum,
 * und der eine Weg zurück. Der Knopf ist ein POST-Formular auf
 * `/api/live-abo`, das die Stripe-Kasse öffnet — kein Link, damit ein
 * Vorabruf des Browsers keine Kasse anlegt.
 *
 * `fehler` kommt als `?live_fehler=` zurück, wenn die Kasse nicht aufging.
 */
export function LiveZugangAbgelaufen({ titel, fehler }: { titel?: string; fehler?: string | null }) {
  const abo = PRODUKTE.live;
  return (
    <Flex
      className="cc-card cc-card--still cc-rise"
      direction="column"
      align="center"
      textAlign="center"
      py={{ base: 10, md: 14 }}
      px={{ base: 5, md: 6 }}
    >
      <IconTile>
        <Box color="var(--cc-gold-light)">
          <Radio size={24} strokeWidth={1.75} />
        </Box>
      </IconTile>
      <Box
        as="h1"
        fontSize={{ base: "22px", md: "26px" }}
        fontWeight={600}
        lineHeight={1.25}
        letterSpacing="-0.01em"
        color="var(--cc-text)"
        mt={5}
        maxW="32rem"
      >
        {titel ?? "Dein Live-Zugang ist abgelaufen"}
      </Box>
      <Text fontSize="14px" lineHeight={1.7} color="var(--cc-text-2)" mt={3} maxW="440px">
        Der Live-Zeitraum deines Programms ist vorbei. Kurse, Journal und Plattform bleiben dir dauerhaft. Live
        Trading, Daily Bias und Trade Recaps schaltest du mit dem Live-Trading-Abo wieder frei.
      </Text>
      <Text className="cc-num" fontSize="16px" fontWeight={600} color="var(--cc-text)" mt={4}>
        {euro(abo.preisCents)} pro Monat · monatlich kündbar
      </Text>
      <form action="/api/live-abo" method="post">
        <Button type="submit" variant="gold" mt={6} px={8}>
          Live-Zugang verlängern
        </Button>
      </form>
      {fehler ? (
        <Text fontSize="13px" color="var(--cc-danger)" mt={3} maxW="420px" role="alert">
          {fehler === "live_laeuft"
            ? "Für dein Konto läuft bereits ein Live-Trading-Abo. Der Zugang öffnet sich, sobald die Zahlung verbucht ist. Bleibt er zu, schreib uns über das Kontaktformular."
            : "Die Kasse konnte gerade nicht geöffnet werden. Versuch es bitte gleich noch einmal oder schreib uns über das Kontaktformular."}
        </Text>
      ) : null}
    </Flex>
  );
}
