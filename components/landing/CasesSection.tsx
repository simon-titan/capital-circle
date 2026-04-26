"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import Image from "next/image";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";

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
        <Box as="span" color="#D4AF37" className="inter-semibold" sx={{ textShadow: "0 0 10px rgba(212,175,55,0.35)" }}>
          3 Tagen
        </Box>
      </>
    ),
    accent: "#D4AF37",
    glow: "rgba(212,175,55,0.18)",
    bgGradient: "linear-gradient(135deg, rgba(212,175,55,0.10) 0%, rgba(8,8,8,0.65) 100%)",
    border: "rgba(212,175,55,0.30)",
  },
  {
    name: "Halil",
    image: "/cases/halil.png",
    description: (
      <>
        Zahlt sich{" "}
        <Box as="span" color="#FF9430" className="inter-semibold" sx={{ textShadow: "0 0 10px rgba(255,148,48,0.35)" }}>
          15.000$
        </Box>{" "}
        aus mithilfe unserer Trading Methodik
      </>
    ),
    accent: "#FF9430",
    glow: "rgba(255,148,48,0.16)",
    bgGradient: "linear-gradient(135deg, rgba(255,140,40,0.10) 0%, rgba(200,80,0,0.04) 50%, rgba(8,8,8,0.65) 100%)",
    border: "rgba(255,148,50,0.30)",
  },
  {
    name: "Yücel",
    image: "/cases/yuecel.png",
    description: (
      <>
        Zahlt sich innerhalb 7 Tagen{" "}
        <Box as="span" color="#F0DC82" className="inter-semibold" sx={{ textShadow: "0 0 10px rgba(240,220,130,0.35)" }}>
          7.000$
        </Box>{" "}
        aus
      </>
    ),
    accent: "#F0DC82",
    glow: "rgba(240,220,130,0.16)",
    bgGradient: "linear-gradient(135deg, rgba(240,220,130,0.10) 0%, rgba(212,175,55,0.04) 50%, rgba(8,8,8,0.65) 100%)",
    border: "rgba(240,220,130,0.30)",
  },
  {
    name: "Dominik",
    image: "/cases/dominik.png",
    description: (
      <>
        Zahlt sich{" "}
        <Box as="span" color="#B4C8E8" className="inter-semibold" sx={{ textShadow: "0 0 10px rgba(180,200,232,0.35)" }}>
          1.250$
        </Box>{" "}
        aus
      </>
    ),
    accent: "#B4C8E8",
    glow: "rgba(180,200,232,0.14)",
    bgGradient: "linear-gradient(135deg, rgba(180,200,230,0.08) 0%, rgba(212,175,55,0.03) 50%, rgba(8,8,8,0.65) 100%)",
    border: "rgba(190,210,240,0.25)",
  },
];

/* ── Fullscreen Lightbox ── */

function Lightbox({
  c,
  onClose,
}: {
  c: CaseData;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
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
      {/* Close button */}
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

      {/* Image + caption */}
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={c.image}
            alt={c.name}
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
      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") onOpen(); }}
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
      {/* Accent light line top */}
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

      {/* Screenshot image */}
      <Box
        position="relative"
        w="full"
        h={{ base: "200px", md: "260px" }}
        bg="rgba(0,0,0,0.4)"
      >
        <Image
          src={c.image}
          alt={c.name}
          fill
          sizes="(max-width: 48em) 100vw, 560px"
          style={{ objectFit: "cover", objectPosition: "top center" }}
          unoptimized
        />
      </Box>

      {/* Text content */}
      <Stack gap={1.5} p={{ base: 4, md: 5 }}>
        <Text
          fontSize={{ base: "md", md: "lg" }}
          className="inter-semibold"
          color={c.accent}
          lineHeight="1.2"
        >
          {c.name}
        </Text>
        <Text
          fontSize={{ base: "sm", md: "sm" }}
          className="inter"
          color="rgba(255,255,255,0.60)"
          lineHeight="1.55"
        >
          {c.description}
        </Text>
      </Stack>
    </Box>
  );
}

/* ── Cases Section ── */

export function CasesSection() {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  return (
    <Box
      as="section"
      w="100%"
      bg="var(--color-bg-primary, #07080A)"
      py={{ base: 14, md: 20 }}
      px={{ base: 4, md: 8, lg: 12 }}
    >
      <Box maxW="1200px" mx="auto">
        {/* Section label */}
        <HStack mb={3} justify="center" gap={3}>
          <Box
            w="28px"
            h="1px"
            bg="linear-gradient(90deg, transparent, rgba(212,175,55,0.70))"
          />
          <Text
            fontSize="xs"
            letterSpacing="0.22em"
            textTransform="uppercase"
            color="var(--color-accent-gold, #D4AF37)"
            className="inter-semibold"
          >
            Echte Ergebnisse
          </Text>
          <Box
            w="28px"
            h="1px"
            bg="linear-gradient(90deg, rgba(212,175,55,0.70), transparent)"
          />
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
              color: "var(--color-accent-gold, #D4AF37)",
              textShadow: "0 0 16px rgba(212,175,55,0.30)",
            }}
          >
            2 Monaten
          </Box>{" "}
          möglich ist
        </Text>

        {/* Subtitle */}
        <Text
          fontSize={{ base: "sm", md: "md" }}
          className="inter"
          color="rgba(255,255,255,0.45)"
          textAlign="center"
          maxW="600px"
          mx="auto"
          lineHeight="1.65"
          mb={{ base: 10, md: 14 }}
        >
          Capital Circle gibt es seit weniger als 2 Monaten.
          Diese Ergebnisse unserer Member entstanden in dieser Zeit.
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
        <Stack gap={3} align="center" textAlign="center" maxW="640px" mx="auto">
          <Text
            fontSize={{ base: "sm", md: "md" }}
            className="inter"
            color="rgba(255,255,255,0.40)"
            lineHeight="1.7"
          >
            Das sind keine Ausnahmen.
          </Text>
          <Text
            fontSize={{ base: "md", md: "lg" }}
            className="inter-semibold"
            lineHeight="1.55"
            sx={{
              color: "var(--color-accent-gold, #D4AF37)",
              textShadow: "0 0 20px rgba(212,175,55,0.25)",
            }}
          >
            Das ist das Ergebnis wenn ein klares System auf ernsthafte Trader trifft.
          </Text>
        </Stack>
      </Box>

      {/* Lightbox overlay */}
      {lightboxIdx !== null && (
        <Lightbox
          c={CASES[lightboxIdx]}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </Box>
  );
}
