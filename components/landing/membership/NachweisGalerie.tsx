"use client";

import {
  Box,
  Flex,
  Grid,
  HStack,
  Heading,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { X } from "lucide-react";
import { useState } from "react";
import { funnelModalContentProps, funnelOverlayProps } from "@/components/marketing/funnel-ui";
import { type Auszahlung, type ChallengeNachweis } from "@/config/landing-membership";

/**
 * Alle Nachweise als Galerie (`/ergebnisse`).
 *
 * Die Verkaufsseite zeigt drei Zeilen je Spalte, hier liegt der vollständige
 * Bestand. Aufbau bewusst anders als dort: Auf der Landing trägt die Zahl und
 * das Bild ist Beiwerk, hier trägt das Bild — wer diesen Weg geht, will die
 * Belege sehen, nicht die Liste noch einmal lesen.
 *
 * Ein einziges Modal für die ganze Seite, gespeist aus einem Zustand: 30
 * Overlays im DOM, von denen 29 nichts tun, wären 30 Stellen, an denen der
 * Fokus zurückwandern muss.
 *
 * Die Galerie trägt zwei Arten von Nachweis, und das ist ihr eigentlicher
 * Zweck: Auszahlungen (Geld ist geflossen) und bestandene Challenges (das
 * Konto steht, über Geld sagt das Zertifikat nichts). Beide bekommen dieselbe
 * Kachel, aber nie dieselbe Zeile darunter — siehe `alsZeilen`.
 */
export type GalerieBlock =
  | { titel: string; hinweis: string; art?: "auszahlung"; zeilen: readonly Auszahlung[] }
  | { titel: string; hinweis: string; art: "challenge"; zeilen: readonly ChallengeNachweis[] };

/**
 * Gemeinsame Form beider Nachweisarten.
 *
 * `gewinn` hängt am Block, nicht an den Daten, und das ist der ganze Grund für
 * diese Zwischenform. Grün trägt laut DESIGN.md ausschließlich Gewinn; eine
 * Kontogröße ist keiner. Stünde die Farbe in der Konfiguration, könnte jemand
 * sie dort für ein Zertifikat setzen — so kann er es nicht.
 */
type Zeile = {
  quelle: string;
  /** Betrag oder Kontogröße; was davon, steht in `beschriftung`. */
  wert: string;
  beschriftung: string;
  datum: string;
  bild?: string;
  gewinn: boolean;
};

function alsZeilen(block: GalerieBlock): Zeile[] {
  if (block.art === "challenge") {
    return block.zeilen.map((z) => ({
      quelle: z.quelle,
      wert: z.kontogroesse,
      beschriftung: "Kontogröße",
      datum: z.datum,
      bild: z.bild,
      gewinn: false,
    }));
  }

  return block.zeilen.map((z) => ({
    quelle: z.quelle,
    wert: z.betrag,
    beschriftung: "Auszahlung",
    datum: z.datum,
    bild: z.bild,
    gewinn: true,
  }));
}

export function NachweisGalerie({ bloecke }: { bloecke: GalerieBlock[] }) {
  const [offen, setOffen] = useState<Zeile | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const zeige = (zeile: Zeile) => {
    setOffen(zeile);
    onOpen();
  };

  return (
    <>
      <Stack gap={{ base: 12, md: 16 }}>
        {bloecke.map((block) => (
          <Stack key={block.titel} gap={5}>
            <Stack gap={1}>
              <Heading as="h2" fontSize={{ base: "22px", md: "26px" }} fontWeight={600} color="var(--cc-text)">
                {block.titel}
              </Heading>
              <Text fontSize="14px" color="var(--cc-text-2)">
                {block.hinweis}
              </Text>
            </Stack>

            <Grid
              templateColumns={{ base: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }}
              gap={5}
            >
              {alsZeilen(block).map((zeile) => (
                <NachweisKarte key={zeile.bild ?? `${zeile.quelle}-${zeile.datum}`} zeile={zeile} onZeigen={zeige} />
              ))}
            </Grid>
          </Stack>
        ))}
      </Stack>

      <NachweisLightbox zeile={offen} isOpen={isOpen} onClose={onClose} />
    </>
  );
}

/** Was der Beleg zeigt — muss allein stehen können, ohne die Überschrift darüber. */
function beschreibung(zeile: Zeile) {
  return zeile.gewinn
    ? `${zeile.wert} von ${zeile.quelle} am ${zeile.datum}`
    : `Challenge bei ${zeile.quelle} bestanden, Kontogröße ${zeile.wert}, ${zeile.datum}`;
}

function NachweisKarte({ zeile, onZeigen }: { zeile: Zeile; onZeigen: (zeile: Zeile) => void }) {
  return (
    <Box
      className="cc-card"
      as="button"
      type="button"
      onClick={() => onZeigen(zeile)}
      aria-label={`Nachweis vergrößern: ${beschreibung(zeile)}`}
      cursor="zoom-in"
      textAlign="left"
      overflow="hidden"
      p={0}
      _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "3px" }}
    >
      {/* Feste Bildhöhe, `contain` statt `cover`: Die Nachweise sind mal quer,
          mal hoch, mal ein schmaler Benachrichtigungsstreifen. `cover` würde
          bei den schmalen genau die Zeile abschneiden, auf die es ankommt. */}
      <Flex h="200px" align="center" justify="center" bg="rgba(0, 0, 0, 0.35)" borderBottom="1px solid var(--cc-line)">
        <Box as="img" src={zeile.bild} alt="" maxW="100%" maxH="100%" objectFit="contain" loading="lazy" />
      </Flex>

      <Flex px={5} py={4} align="baseline" justify="space-between" gap={3}>
        <Stack gap={0.5} minW={0}>
          <Text fontSize="15px" fontWeight={500} color="var(--cc-text)" noOfLines={1}>
            {zeile.quelle}
          </Text>
          <Text fontSize="13px" color="var(--cc-text-3)">
            {zeile.datum}
          </Text>
        </Stack>

        {/* Nur die Kontogröße bekommt ihr Wort dazu. Ein grüner Betrag neben
            einer Prop-Firma ist eindeutig — Grün heißt Geld. Eine neutrale Zahl
            ist es nicht, und die Kachel muss auch dann noch stimmen, wenn
            jemand sie ohne die Überschrift darüber sieht. */}
        <Stack gap={0.5} flexShrink={0} textAlign="right">
          {!zeile.gewinn && (
            <Text fontSize="10px" letterSpacing="0.14em" textTransform="uppercase" color="var(--cc-text-3)">
              {zeile.beschriftung}
            </Text>
          )}
          <Text
            className="cc-num"
            fontSize="18px"
            fontWeight={600}
            color={zeile.gewinn ? "var(--cc-success)" : "var(--cc-text)"}
          >
            {zeile.wert}
          </Text>
        </Stack>
      </Flex>
    </Box>
  );
}

/**
 * Der Nachweis in groß.
 *
 * Eigene Lightbox statt der aus `ErgebnisseSection`: Die färbt ihre Zahl fest
 * in Grün, weil sie nur Auszahlungen kennt. Hier hängt die Farbe am Block, und
 * eine Kontogröße in Grün wäre genau die Verwechslung, für die dieser zweite
 * Block überhaupt existiert.
 */
function NachweisLightbox({
  zeile,
  isOpen,
  onClose,
}: {
  zeile: Zeile | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!zeile?.bild) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
      <ModalOverlay {...funnelOverlayProps} />
      <ModalContent {...funnelModalContentProps} maxW="min(920px, 92vw)">
        <ModalBody p={{ base: 4, md: 6 }}>
          <Flex justify="flex-end" mb={3}>
            <Flex
              as="button"
              type="button"
              onClick={onClose}
              aria-label="Nachweis schließen"
              w="32px"
              h="32px"
              align="center"
              justify="center"
              borderRadius="8px"
              border="1px solid var(--cc-line-strong)"
              bg="rgba(255, 255, 255, 0.02)"
              color="var(--cc-text-2)"
              transition="color 180ms var(--cc-ease), border-color 180ms var(--cc-ease)"
              _hover={{ color: "var(--cc-text)", borderColor: "var(--cc-gold-line)" }}
              _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
            >
              <X size={16} strokeWidth={1.75} />
            </Flex>
          </Flex>

          <Box
            as="img"
            src={zeile.bild}
            alt={beschreibung(zeile)}
            w="100%"
            maxH="72vh"
            objectFit="contain"
            borderRadius="10px"
            bg="rgba(0, 0, 0, 0.35)"
          />

          <HStack mt={4} spacing={3} justify="center" fontSize="14px" color="var(--cc-text-2)">
            <Text as="span" color="var(--cc-text)">
              {zeile.quelle}
            </Text>
            <Box as="span" aria-hidden color="var(--cc-text-3)">
              ·
            </Box>
            {/* Auch vergrößert bleibt die Kontogröße beschriftet und neutral —
                das Modal zeigt nur ein Bild, die Überschrift des Blocks ist
                dabei nicht mehr zu sehen. */}
            <Text as="span">
              {!zeile.gewinn && (
                <Box as="span" color="var(--cc-text-3)">
                  {zeile.beschriftung}{" "}
                </Box>
              )}
              <Box
                as="span"
                className="cc-num"
                fontWeight={600}
                color={zeile.gewinn ? "var(--cc-success)" : "var(--cc-text)"}
              >
                {zeile.wert}
              </Box>
            </Text>
            <Box as="span" aria-hidden color="var(--cc-text-3)">
              ·
            </Box>
            <Text as="span" className="cc-num">
              {zeile.datum}
            </Text>
          </HStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
