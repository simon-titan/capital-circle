"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import Image from "next/image";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { ArrowUp, X } from "lucide-react";

/**
 * Discord-gebrandete Kopie der /bewerbung „Echte Ergebnisse"-Section (CasesSection).
 * Struktur 1:1 übernommen, Farben auf das Discord-Funnel-Branding angepasst
 * (Aqua #47F7DC, Grün #16cc9b, Hell-Aqua #8FFBEB, Discord-Lila #5865F2; schwarzer BG).
 */

interface CaseData {
  name: string;
  image: string;
  description: ReactNode;
  accent: string;
  glow: string;
  bgGradient: string;
  border: string;
}

const CASES: CaseData[] = [
  {
    name: "Driton",
    image: "/cases/driton.png",
    description: (
      <>
        Besteht erste Challenge innerhalb{" "}
        <Box as="span" color="#47F7DC" className="inter-semibold" sx={{ textShadow: "0 0 10px rgba(71,247,220,0.35)" }}>
          3 Tagen
        </Box>
      </>
    ),
    accent: "#47F7DC",
    glow: "rgba(71,247,220,0.18)",
    bgGradient: "linear-gradient(135deg, rgba(71,247,220,0.10) 0%, rgba(6,6,8,0.65) 100%)",
    border: "rgba(71,247,220,0.30)",
  },
  {
    name: "Halil",
    image: "/cases/halil.png",
    description: (
      <>
        Zahlt sich{" "}
        <Box as="span" color="#16cc9b" className="inter-semibold" sx={{ textShadow: "0 0 10px rgba(22,204,155,0.35)" }}>
          15.000$
        </Box>{" "}
        aus mithilfe unserer Trading Methodik
      </>
    ),
    accent: "#16cc9b",
    glow: "rgba(22,204,155,0.18)",
    bgGradient: "linear-gradient(135deg, rgba(22,204,155,0.10) 0%, rgba(6,6,8,0.65) 100%)",
    border: "rgba(22,204,155,0.30)",
  },
  {
    name: "Yücel",
    image: "/cases/yuecel.png",
    description: (
      <>
        Zahlt sich innerhalb 7 Tagen{" "}
        <Box as="span" color="#8FFBEB" className="inter-semibold" sx={{ textShadow: "0 0 10px rgba(143,251,235,0.35)" }}>
          7.000$
        </Box>{" "}
        aus
      </>
    ),
    accent: "#8FFBEB",
    glow: "rgba(143,251,235,0.16)",
    bgGradient: "linear-gradient(135deg, rgba(143,251,235,0.10) 0%, rgba(6,6,8,0.65) 100%)",
    border: "rgba(143,251,235,0.30)",
  },
  {
    name: "Dominik",
    image: "/cases/dominik.png",
    description: (
      <>
        Zahlt sich{" "}
        <Box as="span" color="#5865F2" className="inter-semibold" sx={{ textShadow: "0 0 10px rgba(88,101,242,0.35)" }}>
          1.250$
        </Box>{" "}
        aus
      </>
    ),
    accent: "#5865F2",
    glow: "rgba(88,101,242,0.16)",
    bgGradient: "linear-gradient(135deg, rgba(88,101,242,0.10) 0%, rgba(6,6,8,0.65) 100%)",
    border: "rgba(88,101,242,0.30)",
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
      sx={{
        background: "rgba(0,0,0,0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        animation: "lbFadeIn 200ms ease forwards",
        "@keyframes lbFadeIn": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
      }}
    >
      <Box
        as="button"
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
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.70)",
          transition: "all 180ms ease",
          _hover: {
            background: "rgba(255,255,255,0.14)",
            color: "#fff",
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
        }}
      >
        <Box
          position="relative"
          borderRadius="12px"
          overflow="hidden"
          sx={{
            border: `1px solid ${c.border}`,
            boxShadow: `0 8px 48px ${c.glow}, 0 0 0 1px rgba(255,255,255,0.04) inset`,
          }}
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

        <Text
          className="inter-semibold"
          fontSize={{ base: "md", md: "lg" }}
          color={c.accent}
          textAlign="center"
        >
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
      borderRadius="16px"
      overflow="hidden"
      position="relative"
      cursor="pointer"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      sx={{
        background: c.bgGradient,
        border: `1px solid ${c.border}`,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: `0 4px 24px ${c.glow}, 0 0 0 1px rgba(255,255,255,0.03) inset`,
        transition: "transform 220ms ease, box-shadow 220ms ease",
        _hover: {
          transform: "translateY(-3px)",
          boxShadow: `0 8px 36px ${c.glow}, 0 0 0 1px rgba(255,255,255,0.05) inset`,
        },
      }}
    >
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="2px"
        zIndex={1}
        sx={{
          background: `linear-gradient(90deg, transparent, ${c.accent}CC, transparent)`,
        }}
      />

      <Box position="relative" w="full" h={{ base: "200px", md: "260px" }} bg="rgba(0,0,0,0.4)">
        <Image
          src={c.image}
          alt={c.name}
          fill
          sizes="(max-width: 48em) 100vw, 560px"
          style={{ objectFit: "cover", objectPosition: "top center" }}
        />
      </Box>

      <Stack gap={1.5} p={{ base: 4, md: 5 }}>
        <Text fontSize={{ base: "md", md: "lg" }} className="inter-semibold" color={c.accent} lineHeight="1.2">
          {c.name}
        </Text>
        <Text fontSize={{ base: "sm", md: "sm" }} className="inter" color="rgba(255,255,255,0.60)" lineHeight="1.55">
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
      w="100%"
      bg="#000000"
      py={{ base: 14, md: 20 }}
      px={{ base: 4, md: 8, lg: 12 }}
    >
      <Box maxW="1200px" mx="auto">
        {/* Section label */}
        <HStack mb={3} justify="center" gap={3}>
          <Box w="28px" h="1px" bg="linear-gradient(90deg, transparent, rgba(71,247,220,0.70))" />
          <Text
            fontSize="xs"
            letterSpacing="0.22em"
            textTransform="uppercase"
            color="#47F7DC"
            className="inter-semibold"
          >
            Echte Ergebnisse
          </Text>
          <Box w="28px" h="1px" bg="linear-gradient(90deg, rgba(71,247,220,0.70), transparent)" />
        </HStack>

        {/* Headline */}
        <Text
          as="h2"
          className="inter-bold"
          fontSize={{ base: "2xl", md: "3xl", lg: "4xl" }}
          color="var(--color-text-primary, #F0F0F2)"
          textAlign="center"
          lineHeight="1.15"
          mb={{ base: 3, md: 4 }}
        >
          Was in weniger als{" "}
          <Box
            as="span"
            sx={{
              color: "#47F7DC",
              textShadow: "0 0 16px rgba(71,247,220,0.40)",
            }}
          >
            2 Monaten
          </Box>{" "}
          möglich ist
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
          <Text fontSize={{ base: "sm", md: "md" }} className="inter" color="rgba(255,255,255,0.40)" lineHeight="1.7">
            Das sind keine Ausnahmen.
          </Text>
          <Text
            className="inter-bold"
            fontSize={{ base: "lg", md: "2xl" }}
            lineHeight="1.25"
            textTransform="uppercase"
            letterSpacing="0.01em"
            color="#FFFFFF"
          >
            Das ist nur ein kleiner Teil unserer Ergebnisse!
          </Text>

          {/* Scroll-to-top Pfeil-Button (animiert) */}
          <Box position="relative" w="60px" h="60px" mt={2}>
            {/* pulsierender Ring */}
            <Box
              position="absolute"
              inset={0}
              borderRadius="full"
              pointerEvents="none"
              sx={{
                border: "1.5px solid rgba(22,204,155,0.55)",
                animation: "scrollRing 2s ease-out infinite",
                "@keyframes scrollRing": {
                  "0%": { transform: "scale(1)", opacity: 0.6 },
                  "100%": { transform: "scale(1.7)", opacity: 0 },
                },
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
              color="#000000"
              sx={{
                background: "linear-gradient(135deg, #16cc9b 0%, #5FE6C6 100%)",
                boxShadow:
                  "0 0 30px rgba(22,204,155,0.45), inset 0 1px 0 rgba(255,255,255,0.30)",
                cursor: "pointer",
                animation: "scrollBounce 1.8s ease-in-out infinite",
                "@keyframes scrollBounce": {
                  "0%, 100%": { transform: "translateY(0)" },
                  "50%": { transform: "translateY(-8px)" },
                },
                transition: "filter 200ms ease, box-shadow 200ms ease",
                _hover: {
                  filter: "brightness(1.08)",
                  boxShadow:
                    "0 0 48px rgba(22,204,155,0.65), inset 0 1px 0 rgba(255,255,255,0.38)",
                },
              }}
            >
              <ArrowUp size={26} strokeWidth={2.75} />
            </Box>
          </Box>
        </Stack>
      </Box>

      {lightboxIdx !== null && <Lightbox c={CASES[lightboxIdx]} onClose={() => setLightboxIdx(null)} />}
    </Box>
  );
}
