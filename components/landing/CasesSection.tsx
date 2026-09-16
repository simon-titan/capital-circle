"use client";

import { Box, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import Image from "next/image";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { Accent, DisplayHeading, Eyebrow, Reveal } from "./landing-ui";

interface CaseData {
  name: string;
  image: string;
  description: ReactNode;
}

/** Betrag / Zeitraum im Fall: Gold hell, tabellarische Ziffern. */
function Figure({ children }: { children: ReactNode }) {
  return (
    <Box as="span" className="cc-num" color="var(--cc-gold-light)" fontWeight={600}>
      {children}
    </Box>
  );
}

const CASES: CaseData[] = [
  {
    name: "Driton",
    image: "/cases/driton.png",
    description: (
      <>
        Besteht erste Challenge innerhalb <Figure>3 Tagen</Figure>
      </>
    ),
  },
  {
    name: "Halil",
    image: "/cases/halil.png",
    description: (
      <>
        Zahlt sich <Figure>15.000$</Figure> aus mithilfe unserer Trading Methodik
      </>
    ),
  },
  {
    name: "Yücel",
    image: "/cases/yuecel.png",
    description: (
      <>
        Zahlt sich innerhalb 7 Tagen <Figure>7.000$</Figure> aus
      </>
    ),
  },
  {
    name: "Dominik",
    image: "/cases/dominik.png",
    description: (
      <>
        Zahlt sich <Figure>1.250$</Figure> aus
      </>
    ),
  },
];

/* ── Vollbild-Ansicht ── */

function Lightbox({ c, onClose }: { c: CaseData; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );
  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <Flex
      role="dialog"
      aria-modal="true"
      aria-label={`Ergebnis von ${c.name}`}
      position="fixed"
      inset={0}
      zIndex={10000}
      align="center"
      justify="center"
      onClick={onClose}
      sx={{
        background: "rgba(8, 10, 12, 0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        animation: "lbFadeIn 200ms ease forwards",
        "@keyframes lbFadeIn": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
      }}
    >
      <Flex
        as="button"
        ref={closeRef}
        type="button"
        aria-label="Schließen"
        position="absolute"
        top={{ base: "16px", md: "28px" }}
        right={{ base: "16px", md: "28px" }}
        w="44px"
        h="44px"
        borderRadius="full"
        align="center"
        justify="center"
        cursor="pointer"
        zIndex={1}
        onClick={onClose}
        bg="rgba(255, 255, 255, 0.04)"
        border="1px solid var(--cc-line-strong)"
        color="var(--cc-text-soft)"
        transition="background-color 180ms var(--cc-ease), border-color 180ms var(--cc-ease), color 180ms var(--cc-ease)"
        _hover={{ bg: "rgba(212, 176, 128, 0.1)", borderColor: "var(--cc-gold-line)", color: "var(--cc-text)" }}
        _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
      >
        <X size={20} aria-hidden />
      </Flex>

      <Flex
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        maxW="92vw"
        maxH="90vh"
        direction="column"
        align="center"
        gap={4}
        sx={{
          animation: "lbScaleIn 250ms cubic-bezier(0.16,1,0.3,1) forwards",
          "@keyframes lbScaleIn": {
            "0%": { opacity: 0, transform: "scale(0.92)" },
            "100%": { opacity: 1, transform: "scale(1)" },
          },
        }}
      >
        <Box
          position="relative"
          borderRadius="12px"
          overflow="hidden"
          border="1px solid rgba(212, 176, 128, 0.3)"
          boxShadow="0 16px 56px rgba(0, 0, 0, 0.55), 0 0 46px rgba(212, 176, 128, 0.16)"
        >
          <Image
            src={c.image}
            alt={c.name}
            width={1440}
            height={1440}
            sizes="92vw"
            style={{
              maxWidth: "92vw",
              maxHeight: "78vh",
              width: "auto",
              height: "auto",
              display: "block",
            }}
          />
        </Box>

        <Text fontSize={{ base: "16px", md: "18px" }} fontWeight={600} color="var(--cc-gold-light)" textAlign="center">
          {c.name}
        </Text>
      </Flex>
    </Flex>
  );
}

/* ── Fall-Karte ── */

function CaseCard({ c, onOpen }: { c: CaseData; onOpen: () => void }) {
  return (
    <Box
      className="cc-card"
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      cursor="zoom-in"
      onClick={onOpen}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
      sx={{ "&:hover .cc-case-shot": { transform: "scale(1.03)" } }}
    >
      {/* Screenshot: oben gerundet, eigene Maske, damit die Gold-Kante der Karte sichtbar bleibt */}
      <Box position="relative" w="full" h={{ base: "220px", md: "280px" }} borderTopRadius="11px" overflow="hidden" bg="rgba(0, 0, 0, 0.25)">
        <Box className="cc-case-shot" position="absolute" inset={0} transition="transform 500ms var(--cc-ease)">
          <Image
            src={c.image}
            alt=""
            fill
            sizes="(max-width: 48em) 100vw, 560px"
            style={{ objectFit: "cover", objectPosition: "top center" }}
          />
        </Box>
        <Box
          aria-hidden
          position="absolute"
          inset={0}
          bg="linear-gradient(180deg, transparent 58%, rgba(24, 29, 34, 0.9) 100%)"
          pointerEvents="none"
        />
        <Flex
          aria-hidden
          position="absolute"
          top={3}
          right={3}
          w="34px"
          h="34px"
          align="center"
          justify="center"
          borderRadius="full"
          bg="var(--cc-bg-raised)"
          border="1px solid var(--cc-line-strong)"
          color="var(--cc-text-soft)"
          backdropFilter="blur(10px)"
        >
          <Maximize2 size={15} strokeWidth={1.75} />
        </Flex>
      </Box>

      <Stack spacing={1.5} p={{ base: 5, md: 6 }} pt={{ base: 4, md: 5 }}>
        <Text fontSize={{ base: "17px", md: "18px" }} fontWeight={600} lineHeight={1.25} color="var(--cc-text)">
          {c.name}
        </Text>
        <Text fontSize="15px" lineHeight={1.55} color="var(--cc-text-2)">
          {c.description}
        </Text>
      </Stack>
    </Box>
  );
}

/* ── Abschnitt ── */

export function CasesSection() {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  return (
    <Box as="section" aria-labelledby="cases-title" w="100%" py={{ base: 16, md: 24 }} px={{ base: 4, md: 8, lg: 12 }}>
      <Box maxW="1200px" mx="auto">
        <Reveal>
          <Stack spacing={4} align="center" textAlign="center" mb={{ base: 10, md: 14 }}>
            <Eyebrow>Echte Ergebnisse</Eyebrow>
            <DisplayHeading id="cases-title">
              Was in weniger als <Accent>2 Monaten</Accent> möglich ist
            </DisplayHeading>
          </Stack>
        </Reveal>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 4, md: 5 }} mb={{ base: 12, md: 16 }}>
          {CASES.map((c, i) => (
            <Reveal key={c.name} delay={(i % 2) * 90}>
              <CaseCard c={c} onOpen={() => setLightboxIdx(i)} />
            </Reveal>
          ))}
        </SimpleGrid>

        <Reveal>
          <Stack spacing={3} align="center" textAlign="center" maxW="660px" mx="auto">
            <Text fontSize={{ base: "15px", md: "16px" }} lineHeight={1.7} color="var(--cc-text-2)">
              Das sind keine Ausnahmen.
            </Text>
            <Text
              fontSize={{ base: "20px", md: "24px" }}
              fontWeight={600}
              lineHeight={1.4}
              letterSpacing="-0.01em"
              color="var(--cc-gold-light)"
            >
              Das ist das Ergebnis wenn ein klares System auf ernsthafte Trader trifft.
            </Text>
          </Stack>
        </Reveal>
      </Box>

      {lightboxIdx !== null && <Lightbox c={CASES[lightboxIdx]} onClose={() => setLightboxIdx(null)} />}
    </Box>
  );
}
