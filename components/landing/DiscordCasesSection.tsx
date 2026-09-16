"use client";

import { Box, Stack, Text } from "@chakra-ui/react";
import Image from "next/image";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { ArrowUp, X } from "lucide-react";
import { FunnelEyebrow, GoldWord } from "./DiscordFunnelChrome";

/**
 * „Echte Ergebnisse“ für den Discord-Funnel (Struktur wie die CasesSection auf
 * /bewerbung). Look nach DESIGN.md v3.2: Glas-Karten, Werte in Gold hell.
 */

interface CaseData {
  name: string;
  image: string;
  description: ReactNode;
}

/** Hervorgehobener Wert in einer Case-Beschreibung. */
function CaseValue({ children }: { children: ReactNode }) {
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
        Besteht erste Challenge innerhalb <CaseValue>3 Tagen</CaseValue>
      </>
    ),
  },
  {
    name: "Halil",
    image: "/cases/halil.png",
    description: (
      <>
        Zahlt sich <CaseValue>15.000$</CaseValue> aus mithilfe unserer Trading Methodik
      </>
    ),
  },
  {
    name: "Yücel",
    image: "/cases/yuecel.png",
    description: (
      <>
        Zahlt sich innerhalb 7 Tagen <CaseValue>7.000$</CaseValue> aus
      </>
    ),
  },
  {
    name: "Dominik",
    image: "/cases/dominik.png",
    description: (
      <>
        Zahlt sich <CaseValue>1.250$</CaseValue> aus
      </>
    ),
  },
];

/* ── Fullscreen Lightbox ── */

function Lightbox({ c, onClose }: { c: CaseData; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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
    <Box
      position="fixed"
      inset={0}
      zIndex={10000}
      display="flex"
      alignItems="center"
      justifyContent="center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={c.name}
      sx={{
        background: "rgba(8, 10, 12, 0.9)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        animation: "lbFadeIn 200ms ease forwards",
        "@keyframes lbFadeIn": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
      }}
    >
      <Box
        as="button"
        type="button"
        aria-label="Schließen"
        position="absolute"
        top={{ base: "16px", md: "28px" }}
        right={{ base: "16px", md: "28px" }}
        w="44px"
        h="44px"
        borderRadius="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        cursor="pointer"
        zIndex={1}
        onClick={onClose}
        sx={{
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid var(--cc-line-strong)",
          color: "var(--cc-text-2)",
          transition:
            "background-color 180ms var(--cc-ease), border-color 180ms var(--cc-ease), color 180ms var(--cc-ease)",
          _hover: {
            background: "rgba(212, 176, 128, 0.06)",
            borderColor: "var(--cc-gold-line)",
            color: "var(--cc-text)",
          },
        }}
      >
        <X size={20} />
      </Box>

      <Box
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        maxW="92vw"
        maxH="90vh"
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={4}
        sx={{
          animation: "lbScaleIn 250ms cubic-bezier(0.16,1,0.3,1) forwards",
          "@keyframes lbScaleIn": {
            "0%": { opacity: 0, transform: "scale(0.92)" },
            "100%": { opacity: 1, transform: "scale(1)" },
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        <Box
          position="relative"
          borderRadius="12px"
          overflow="hidden"
          border="1px solid rgba(212, 176, 128, 0.28)"
          boxShadow="0 10px 28px rgba(0, 0, 0, 0.45), 0 0 40px rgba(212, 176, 128, 0.12)"
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

        <Text fontSize={{ base: "16px", md: "18px" }} fontWeight={600} color="var(--cc-text)" textAlign="center">
          {c.name}
        </Text>
      </Box>
    </Box>
  );
}

/* ── Case Card ── */

function CaseCard({ c, onOpen }: { c: CaseData; onOpen: () => void }) {
  return (
    <Box
      className="cc-card"
      cursor="pointer"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      {/* Bild bündig oben; die Gold-Kante der Karte liegt auf dem Rand darüber */}
      <Box
        position="relative"
        w="full"
        h={{ base: "200px", md: "260px" }}
        bg="rgba(255, 255, 255, 0.02)"
        borderTopRadius="11px"
        overflow="hidden"
      >
        <Image
          src={c.image}
          alt={c.name}
          fill
          sizes="(max-width: 48em) 100vw, 560px"
          style={{ objectFit: "cover", objectPosition: "top center" }}
        />
      </Box>

      <Stack gap={1.5} p={{ base: 4, md: 5 }}>
        <Text fontSize={{ base: "16px", md: "18px" }} fontWeight={600} color="var(--cc-text)" lineHeight="1.2">
          {c.name}
        </Text>
        <Text fontSize="14px" color="var(--cc-text-2)" lineHeight="1.55">
          {c.description}
        </Text>
      </Stack>
    </Box>
  );
}

/* ── Cases Section ── */

export function DiscordCasesSection() {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  return (
    <Box
      as="section"
      aria-labelledby="discord-cases-title"
      w="100%"
      position="relative"
      py={{ base: 14, md: 20 }}
      px={{ base: 4, md: 8, lg: 12 }}
    >
      <Box maxW="1200px" mx="auto">
        <Box mb={3}>
          <FunnelEyebrow>Echte Ergebnisse</FunnelEyebrow>
        </Box>

        <Text
          as="h2"
          id="discord-cases-title"
          fontSize={{ base: "26px", md: "32px", lg: "40px" }}
          fontWeight={600}
          letterSpacing="-0.01em"
          color="var(--cc-text)"
          textAlign="center"
          lineHeight="1.15"
          mb={{ base: 8, md: 10 }}
        >
          Was in weniger als <GoldWord>2 Monaten</GoldWord> möglich ist
        </Text>

        {/* 2x2 Card Grid */}
        <Box
          display="grid"
          sx={{
            gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
            gap: { base: "16px", md: "20px" },
          }}
          mb={{ base: 10, md: 14 }}
        >
          {CASES.map((c, i) => (
            <CaseCard key={c.name} c={c} onOpen={() => setLightboxIdx(i)} />
          ))}
        </Box>

        {/* Fazit block */}
        <Stack gap={5} align="center" textAlign="center" maxW="640px" mx="auto">
          <Text fontSize={{ base: "15px", md: "16px" }} color="var(--cc-text-2)" lineHeight="1.7">
            Das sind keine Ausnahmen.
          </Text>
          <Text
            fontSize={{ base: "20px", md: "26px" }}
            fontWeight={600}
            lineHeight="1.25"
            letterSpacing="-0.01em"
            color="var(--cc-text)"
          >
            Das ist nur ein kleiner Teil unserer Ergebnisse!
          </Text>

          {/* Nach-oben-Button im Gold-Verlauf (Bewegung aus bei reduzierter Bewegung) */}
          <Box position="relative" w="60px" h="60px" mt={2}>
            <Box
              position="absolute"
              inset={0}
              borderRadius="full"
              pointerEvents="none"
              aria-hidden
              sx={{
                border: "1.5px solid rgba(212, 176, 128, 0.55)",
                animation: "scrollRing 2s ease-out infinite",
                "@keyframes scrollRing": {
                  "0%": { transform: "scale(1)", opacity: 0.6 },
                  "100%": { transform: "scale(1.7)", opacity: 0 },
                },
                "@media (prefers-reduced-motion: reduce)": { animation: "none", opacity: 0 },
              }}
            />
            <Box
              as="button"
              type="button"
              aria-label="Nach oben scrollen"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              position="relative"
              zIndex={1}
              w="60px"
              h="60px"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="var(--cc-on-gold)"
              sx={{
                background: "var(--cc-gold-grad)",
                boxShadow: "0 6px 18px rgba(212, 176, 128, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
                cursor: "pointer",
                animation: "scrollBounce 1.8s ease-in-out infinite",
                "@keyframes scrollBounce": {
                  "0%, 100%": { transform: "translateY(0)" },
                  "50%": { transform: "translateY(-8px)" },
                },
                transition: "filter 180ms var(--cc-ease), box-shadow 180ms var(--cc-ease)",
                _hover: {
                  filter: "brightness(1.06)",
                  boxShadow: "0 0 26px rgba(212, 176, 128, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
                },
                "@media (prefers-reduced-motion: reduce)": { animation: "none" },
              }}
            >
              <ArrowUp size={26} strokeWidth={2.25} />
            </Box>
          </Box>
        </Stack>
      </Box>

      {lightboxIdx !== null && <Lightbox c={CASES[lightboxIdx]} onClose={() => setLightboxIdx(null)} />}
    </Box>
  );
}
