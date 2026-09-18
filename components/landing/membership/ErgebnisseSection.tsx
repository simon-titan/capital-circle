"use client";

import {
  Box,
  Flex,
  Grid,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { ArrowRight, X } from "lucide-react";
import { useState } from "react";
import { ergebnisse, type Auszahlung } from "@/config/landing-membership";
import { funnelModalContentProps, funnelOverlayProps } from "@/components/marketing/funnel-ui";
import { Reveal } from "../landing-ui";
import { Sektion, SektionsKopf } from "./membership-ui";

/**
 * Belegte Auszahlungen — der Beweisteil der Seite.
 *
 * Die Beträge stehen in Grün, und das ist hier keine zweite Akzentfarbe,
 * sondern die semantische Ausnahme aus DESIGN.md: Grün trägt Gewinn. Alles
 * andere im Abschnitt bleibt neutral, damit genau diese Zahlen tragen.
 *
 * Die Daten kommen aus `config/landing-membership.ts` und sind echte
 * Nachweise. Hier stehen nur drei Zeilen je Spalte; alle weiteren zeigt
 * `/ergebnisse` hinter dem Fusslink. Ohne hinterlegtes Bild bleibt die
 * Miniatur ein sichtbarer Platzhalter und ist **nicht** anklickbar — eine
 * Lupe, unter der nichts liegt, waere eine leere Geste.
 *
 * ── Warum die Lupe hier oben sitzt ─────────────────────────────────────────
 * Genau **ein** Modal für den ganzen Abschnitt, gespeist aus einem Zustand.
 * Ein eigenes Modal je Zeile hieße sechs Overlays im DOM, von denen fünf
 * nichts tun — und sechs Stellen, an denen der Fokus zurückwandern muss.
 */
export function ErgebnisseSection() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [offen, setOffen] = useState<Auszahlung | null>(null);

  const zeige = (zeile: Auszahlung) => {
    setOffen(zeile);
    onOpen();
  };

  return (
    <Sektion id="ergebnisse" aria-labelledby="ergebnisse-titel">
      <SektionsKopf
        eyebrow={ergebnisse.eyebrow}
        headline={ergebnisse.headline}
        sublines={ergebnisse.sublines}
        id="ergebnisse-titel"
      />

      <Grid mt={{ base: 10, md: 14 }} templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={{ base: 5, md: 6 }}>
        {ergebnisse.spalten.map((spalte, i) => (
          <Reveal key={spalte.titel} delay={i * 80}>
            <Box className="cc-card cc-card--still" h="100%" p={{ base: 5, md: 6 }}>
              <Heading
                as="h3"
                fontSize="13px"
                lineHeight="18px"
                fontWeight={500}
                letterSpacing="0.14em"
                textTransform="uppercase"
                color="var(--cc-text-soft)"
                mb={5}
              >
                {spalte.titel}
              </Heading>

              <Stack as="ul" listStyleType="none" spacing={0}>
                {spalte.zeilen.map((zeile) => (
                  <AuszahlungsZeile key={`${spalte.titel}-${zeile.quelle}`} zeile={zeile} onZeigen={zeige} />
                ))}
              </Stack>
            </Box>
          </Reveal>
        ))}
      </Grid>

      <Reveal delay={160}>
        <Flex justify="center" mt={{ base: 8, md: 10 }}>
          {/*
            Interner Seitenwechsel, kein Anker — hier ist `next/link` unbedenklich.
            Bewusst trotzdem ein schlichtes `<a>`, damit auf dieser Seite genau
            eine Regel für Links gilt: `/go/` darf nie vorgeholt werden, und eine
            Ausnahme davon ist leichter zu übersehen als eine Einheitlichkeit.
          */}
          <HStack
            as="a"
            href={ergebnisse.fussLink.href}
            spacing={2}
            fontSize="16px"
            color="var(--cc-gold-light)"
            transition="gap 180ms var(--cc-ease)"
            _hover={{ textDecoration: "underline", textUnderlineOffset: "5px" }}
            _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "4px", borderRadius: "4px" }}
          >
            <Text as="span">{ergebnisse.fussLink.label}</Text>
            <ArrowRight size={16} strokeWidth={2} aria-hidden />
          </HStack>
        </Flex>
      </Reveal>

      <ZertifikatLightbox zeile={offen} isOpen={isOpen} onClose={onClose} />
    </Sektion>
  );
}

function AuszahlungsZeile({ zeile, onZeigen }: { zeile: Auszahlung; onZeigen: (zeile: Auszahlung) => void }) {
  return (
    <Flex
      as="li"
      align="center"
      gap={{ base: 3, md: 5 }}
      py={4}
      borderBottom="1px solid var(--cc-line)"
      _last={{ borderBottom: "none" }}
    >
      <ZertifikatMiniatur zeile={zeile} onZeigen={onZeigen} />

      <Grid
        flex={1}
        minW={0}
        templateColumns={{ base: "1fr auto", sm: "1fr auto auto" }}
        gap={{ base: 2, md: 4 }}
        alignItems="center"
      >
        <Feld label="Prop-Firma" wert={zeile.quelle} />
        <Feld label="Betrag" wert={zeile.betrag} gewinn />
        <Box display={{ base: "none", sm: "block" }}>
          <Feld label="Datum" wert={zeile.datum} gedimmt />
        </Box>
      </Grid>
    </Flex>
  );
}

function Feld({
  label,
  wert,
  gewinn = false,
  gedimmt = false,
}: {
  label: string;
  wert: string;
  gewinn?: boolean;
  gedimmt?: boolean;
}) {
  return (
    <Stack spacing={1} minW={0}>
      <Text fontSize="10px" letterSpacing="0.14em" textTransform="uppercase" color="var(--cc-text-3)">
        {label}
      </Text>
      <Text
        className="cc-num"
        fontSize={gewinn ? { base: "19px", md: "22px" } : "15px"}
        fontWeight={gewinn ? 600 : 400}
        lineHeight={1.2}
        letterSpacing={gewinn ? "-0.01em" : undefined}
        color={gewinn ? "var(--cc-success)" : gedimmt ? "var(--cc-text-2)" : "var(--cc-text)"}
        textShadow={gewinn ? "0 0 18px rgba(74, 222, 128, 0.35)" : undefined}
        noOfLines={1}
      >
        {wert}
      </Text>
    </Stack>
  );
}

/**
 * Vorschau des Auszahlungszertifikats.
 *
 * Ohne hinterlegtes Bild zeichnet die Komponente eine neutrale Urkunde als
 * Inline-SVG. Inline und nicht als Datei unter `public/`, weil `proxy.ts` für
 * unbekannte Pfade die Anmeldeseite ausliefert — ein neuer Bildordner käme beim
 * Besucher als Login-HTML an, bis jemand den Matcher nachzieht.
 *
 * **Nur ein echtes Zertifikat ist anklickbar.** Der Platzhalter bleibt ein
 * stummes `div`: Etwas zu vergrößern, hinter dem kein Beleg liegt, wäre eine
 * leere Geste — und ausgerechnet in dem Abschnitt, der Belege verspricht.
 */
function ZertifikatMiniatur({ zeile, onZeigen }: { zeile: Auszahlung; onZeigen: (zeile: Auszahlung) => void }) {
  const rahmen = {
    w: { base: "78px", md: "112px" },
    h: { base: "56px", md: "78px" },
    flexShrink: 0,
    borderRadius: "6px",
    overflow: "hidden",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.45)",
  } as const;

  if (zeile.bild) {
    return (
      <Box
        {...rahmen}
        as="button"
        type="button"
        onClick={() => onZeigen(zeile)}
        aria-label={`Zertifikat vergrößern: ${zeile.betrag} von ${zeile.quelle}, ${zeile.datum}`}
        cursor="zoom-in"
        display="block"
        position="relative"
        transition="border-color 180ms var(--cc-ease), box-shadow 180ms var(--cc-ease)"
        _hover={{
          borderColor: "rgba(212, 176, 128, 0.55)",
          boxShadow: "0 6px 18px rgba(0, 0, 0, 0.45), 0 0 18px rgba(212, 176, 128, 0.22)",
        }}
        _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "3px" }}
      >
        <Box as="img" src={zeile.bild} alt="" w="100%" h="100%" objectFit="cover" />
      </Box>
    );
  }

  return (
    <Flex {...rahmen} align="center" justify="center" bg="linear-gradient(160deg, #efe9dd, #d9d1c1)">
      <Box as="svg" viewBox="0 0 112 78" w="100%" h="100%" aria-hidden>
        <rect x="5" y="5" width="102" height="68" fill="none" stroke="#b9ae97" strokeWidth="1" />
        <rect x="8" y="8" width="96" height="62" fill="none" stroke="#cfc6b3" strokeWidth="0.5" />
        <rect x="30" y="18" width="52" height="4" rx="2" fill="#8d8371" />
        <rect x="22" y="30" width="68" height="2.5" rx="1.25" fill="#b3a993" />
        <rect x="22" y="36" width="68" height="2.5" rx="1.25" fill="#b3a993" />
        <rect x="22" y="42" width="44" height="2.5" rx="1.25" fill="#b3a993" />
        <circle cx="86" cy="56" r="8" fill="none" stroke="#9c8f74" strokeWidth="1.5" />
        <circle cx="86" cy="56" r="4" fill="#b8935f" />
        <rect x="20" y="58" width="30" height="2" rx="1" fill="#9c9382" />
      </Box>
    </Flex>
  );
}

/**
 * Das vergrößerte Zertifikat.
 *
 * Nutzt die Modal-Vorlagen aus dem Funnel (`funnelOverlayProps`,
 * `funnelModalContentProps`), damit die Seite nicht zwei Sorten Overlay kennt.
 * Breiter als dort, weil ein Zertifikat quer liegt und lesbar sein soll — und
 * ohne Kopfzeile: Das Bild trägt sich selbst, die Angaben stehen darunter.
 *
 * Bewusst ein bares `<img>` statt `next/image`: Die echten Zertifikate werden
 * aus R2 kommen, und der Optimierer verweigert jede Adresse, die nicht als
 * `remotePattern` in `next.config.ts` steht. Ein Bild, das erst nach einem
 * Konfigurationseintrag erscheint, wäre ein Fehler, der niemandem auffällt,
 * bis ein Besucher davorsteht.
 */
export function ZertifikatLightbox({
  zeile,
  isOpen,
  onClose,
}: {
  zeile: Auszahlung | null;
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
              aria-label="Zertifikat schließen"
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
            alt={`Auszahlungszertifikat: ${zeile.betrag} von ${zeile.quelle} am ${zeile.datum}`}
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
            <Text as="span" className="cc-num" color="var(--cc-success)" fontWeight={600}>
              {zeile.betrag}
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
