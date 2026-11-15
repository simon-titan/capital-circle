"use client";

import { Box, Button, Flex, Heading, HStack, Modal, ModalBody, ModalContent, ModalOverlay, Stack, Text } from "@chakra-ui/react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Maximize2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { funnelModalContentProps, funnelOverlayProps } from "@/components/marketing/funnel-ui";
import { auszahlungenCommunity, auszahlungenEmre, challenges } from "@/config/landing-membership";
import { landing } from "@/config/training";
import { NachweisGalerie, type GalerieBlock } from "../membership/NachweisGalerie";
import { akzentGold } from "../call/call-ui";
import { Reveal } from "../landing-ui";
import { Sektion, SektionsKopf } from "../membership/membership-ui";

/**
 * „Ergebnisse aus der Capital Circle Community" auf `/training` — **alle**
 * Nachweise untereinander, ohne Filter (Feedback 14.11.2026):
 *
 * 1. Discord-Beiträge von Mitgliedern als Masonry (CSS-Spalten), groß per
 *    Klick. Bilder unverändert unter `public/community/` (Kopien aus
 *    `public/Discord Funnel/`). Der Ordner steht im Matcher von `proxy.ts`.
 * 2. Belegte Auszahlungen (Mitglieder, dann Emre).
 * 3. Bestandene Challenges: Kontogrößen, **nicht** grün und unter eigener
 *    Überschrift — dieselbe Regel wie auf `/ergebnisse` (`NachweisGalerie`).
 *    Die Überschriften bleiben deshalb stehen, auch ohne Filter.
 *
 * Das Ganze klappt ab `EINGEKLAPPT` Höhe ein (Verlauf + „Alle n anzeigen",
 * Knopf in Smaragd).
 */
const EINGEKLAPPT = { base: 900, md: 980 };

const NACHWEIS_BLOECKE: GalerieBlock[] = [
  { titel: landing.community.gruppen.mitglieder.titel, hinweis: landing.community.gruppen.mitglieder.hinweis, zeilen: auszahlungenCommunity },
  { titel: landing.community.gruppen.emre.titel, hinweis: landing.community.gruppen.emre.hinweis, zeilen: auszahlungenEmre },
  {
    titel: landing.community.gruppen.challenges.titel,
    hinweis: landing.community.gruppen.challenges.hinweis,
    art: "challenge",
    zeilen: challenges,
  },
];

const ANZAHL = landing.community.bilder.length + auszahlungenCommunity.length + auszahlungenEmre.length + challenges.length;

export function CommunityEinblicke() {
  const c = landing.community;

  return (
    <Sektion id="community" aria-labelledby="community-titel">
      <SektionsKopf id="community-titel" eyebrow={c.eyebrow} headline={akzentGold(c.headline)} sublines={c.sublines} />

      <Box id="ergebnis-tafel" mt={{ base: 10, md: 14 }}>
        <Ausklappbar anzahl={ANZAHL}>
          <Stack spacing={{ base: 12, md: 16 }}>
            <Stack spacing={5}>
              <Stack spacing={1}>
                <Heading as="h3" fontSize={{ base: "22px", md: "26px" }} fontWeight={600} color="var(--cc-text)">
                  {c.gruppen.discord.titel}
                </Heading>
                <Text fontSize="14px" color="var(--cc-text-2)">
                  {c.gruppen.discord.hinweis}
                </Text>
              </Stack>
              <DiscordWand />
            </Stack>
            <NachweisGalerie bloecke={NACHWEIS_BLOECKE} />
          </Stack>
        </Ausklappbar>
      </Box>

      <Text fontSize="12px" lineHeight={1.7} color="var(--cc-text-3)" textAlign="center" mt={{ base: 6, md: 8 }}>
        {c.hinweis}
      </Text>
    </Sektion>
  );
}

/**
 * Klappt den Inhalt ab `EINGEKLAPPT` ein. Der Knopf erscheint nur, wenn der
 * Inhalt wirklich höher ist (gemessen, nicht geschätzt — die Bilder laden nach).
 */
function Ausklappbar({ anzahl, children }: { anzahl: number; children: ReactNode }) {
  const c = landing.community;
  const innen = useRef<HTMLDivElement>(null);
  const [auf, setAuf] = useState(false);
  const [zuHoch, setZuHoch] = useState(false);

  useEffect(() => {
    const el = innen.current;
    if (!el) return;
    const pruefe = () => {
      const grenze = window.matchMedia("(min-width: 48em)").matches ? EINGEKLAPPT.md : EINGEKLAPPT.base;
      setZuHoch(el.scrollHeight > grenze + 80);
    };
    pruefe();
    const ro = new ResizeObserver(pruefe);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const zu = zuHoch && !auf;

  return (
    <Box>
      <Box
        position="relative"
        maxH={zu ? { base: `${EINGEKLAPPT.base}px`, md: `${EINGEKLAPPT.md}px` } : undefined}
        overflow={zu ? "hidden" : undefined}
      >
        <Box ref={innen}>{children}</Box>
        {zu ? (
          <Box
            aria-hidden
            position="absolute"
            left={0}
            right={0}
            bottom={0}
            h="220px"
            pointerEvents="none"
            bg="linear-gradient(180deg, rgba(15, 19, 23, 0) 0%, rgba(15, 19, 23, 0.85) 60%, var(--cc-bg) 100%)"
          />
        ) : null}
      </Box>

      {zuHoch ? (
        <Flex justify="center" mt={zu ? -6 : 8} position="relative" zIndex={1}>
          <Button
            variant="line"
            minH="46px"
            px={6}
            fontSize="15px"
            borderColor="var(--cc-smaragd-line)"
            color="var(--cc-text)"
            _hover={{ bg: "var(--cc-smaragd-wash)", borderColor: "var(--cc-smaragd-hell)", boxShadow: "0 0 18px rgba(28, 122, 90, 0.3)" }}
            rightIcon={auf ? <ChevronUp size={18} strokeWidth={1.75} /> : <ChevronDown size={18} strokeWidth={1.75} />}
            aria-expanded={auf}
            aria-controls="ergebnis-tafel"
            onClick={() => {
              if (auf) document.getElementById("community")?.scrollIntoView({ behavior: "smooth", block: "start" });
              setAuf(!auf);
            }}
          >
            {auf ? c.weniger : c.mehr.replace("{anzahl}", String(anzahl))}
          </Button>
        </Flex>
      ) : null}
    </Box>
  );
}

/**
 * Die Discord-Beiträge als Masonry. Schlichte img-Tags mit Breite/Höhe statt
 * `next/image`: wie `NachweisGalerie`, und die festen Maße halten die Spalten
 * beim Nachladen ruhig. Mobil zwei Spalten; lesen lässt sich jeder Beitrag in
 * der Lupe.
 */
function DiscordWand() {
  const c = landing.community;
  const [offen, setOffen] = useState<number | null>(null);

  return (
    <>
      <Box
        sx={{
          columnCount: { base: 2, md: 3, lg: 4 },
          columnGap: { base: "12px", md: "18px" },
        }}
      >
        {c.bilder.map((bild, i) => (
          <Reveal key={bild.src} delay={(i % 4) * 60} mb={{ base: "12px", md: "18px" }} sx={{ breakInside: "avoid" }}>
            <Box
              as="button"
              type="button"
              onClick={() => setOffen(i)}
              aria-label={`${bild.alt} – groß ansehen`}
              display="block"
              w="full"
              position="relative"
              className="cc-card"
              p={0}
              overflow="hidden"
              cursor="zoom-in"
              role="group"
              _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "3px" }}
            >
              <Box
                as="img"
                src={bild.src}
                alt=""
                width={bild.breite}
                height={bild.hoehe}
                loading="lazy"
                decoding="async"
                display="block"
                w="100%"
                h="auto"
                bg="#000"
              />
              <Flex
                aria-hidden
                position="absolute"
                top={2}
                right={2}
                w="28px"
                h="28px"
                align="center"
                justify="center"
                borderRadius="8px"
                bg="rgba(15, 19, 23, 0.72)"
                border="1px solid var(--cc-line-strong)"
                color="var(--cc-text-soft)"
                opacity={{ base: 1, md: 0 }}
                transition="opacity 180ms var(--cc-ease)"
                _groupHover={{ opacity: 1 }}
                _groupFocusVisible={{ opacity: 1 }}
              >
                <Maximize2 size={13} strokeWidth={1.75} />
              </Flex>
            </Box>
          </Reveal>
        ))}
      </Box>

      <EinblickLightbox index={offen} onIndex={setOffen} />
    </>
  );
}

/** Ein Beitrag groß, mit Vor/Zurück (Knöpfe und Pfeiltasten). */
function EinblickLightbox({ index, onIndex }: { index: number | null; onIndex: (i: number | null) => void }) {
  const bilder = landing.community.bilder;
  const anzahl = bilder.length;

  const blaettern = useCallback(
    (schritt: number) => {
      if (index === null) return;
      onIndex((index + schritt + anzahl) % anzahl);
    },
    [index, anzahl, onIndex],
  );

  useEffect(() => {
    if (index === null) return;
    const taste = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") blaettern(1);
      if (e.key === "ArrowLeft") blaettern(-1);
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [index, blaettern]);

  const bild = index === null ? null : bilder[index];

  return (
    <Modal isOpen={bild !== null} onClose={() => onIndex(null)} size="xl" isCentered>
      <ModalOverlay {...funnelOverlayProps} />
      <ModalContent {...funnelModalContentProps} maxW="min(760px, 94vw)">
        {bild ? (
          <ModalBody p={{ base: 3, md: 5 }}>
            <Flex justify="space-between" align="center" mb={3}>
              <Text className="cc-num" fontSize="13px" color="var(--cc-text-3)">
                {(index ?? 0) + 1} / {anzahl}
              </Text>
              <LightboxKnopf label="Schließen" onClick={() => onIndex(null)}>
                <X size={16} strokeWidth={1.75} />
              </LightboxKnopf>
            </Flex>

            <Box
              as="img"
              src={bild.src}
              alt={bild.alt}
              width={bild.breite}
              height={bild.hoehe}
              display="block"
              mx="auto"
              w="auto"
              h="auto"
              maxW="100%"
              maxH="74vh"
              objectFit="contain"
              borderRadius="10px"
              bg="#000"
            />

            <HStack justify="center" spacing={3} mt={4}>
              <LightboxKnopf label="Vorheriger Beitrag" onClick={() => blaettern(-1)}>
                <ChevronLeft size={18} strokeWidth={1.75} />
              </LightboxKnopf>
              <LightboxKnopf label="Nächster Beitrag" onClick={() => blaettern(1)}>
                <ChevronRight size={18} strokeWidth={1.75} />
              </LightboxKnopf>
            </HStack>
          </ModalBody>
        ) : null}
      </ModalContent>
    </Modal>
  );
}

function LightboxKnopf({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Flex
      as="button"
      type="button"
      onClick={onClick}
      aria-label={label}
      w="40px"
      h="40px"
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
      {children}
    </Flex>
  );
}
