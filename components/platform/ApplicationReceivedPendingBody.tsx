"use client";

import { Box, Button, HStack, Stack, Text, type TextProps } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState, type MouseEvent } from "react";

const slideEase = [0.16, 1, 0.3, 1] as const;
/** sync = Überblendung ohne Zwischen-Leerstand (verhindert Layout-Sprünge / „Reload“-Gefühl). */
const slideTransition = { duration: 0.45, ease: slideEase };

/** Nur im CTA — nicht in den Fließtext duplizieren. */
export const TELEGRAM_COMMUNITY_URL = "https://t.me/capitalcircletrading" as const;

/**
 * Dateien liegen physisch in `public/tg-slides/`.
 * Im Browser heißt die URL immer `/tg-slides/...` (ohne `public` — der Ordner ist die Site-Root).
 */
const TG_SLIDE_FILES = ["1.jpeg", "2.jpeg", "3.jpeg", "4.jpeg"] as const;

const TG_SLIDES = TG_SLIDE_FILES.map((f) => `/tg-slides/${f}`);

const BODY_TEXT: TextProps = {
  fontSize: "16px",
  lineHeight: 1.6,
  color: "var(--cc-text-soft)",
};

function TelegramSlideshow() {
  const [idx, setIdx] = useState(0);

  const advance = useCallback(() => setIdx((i) => (i + 1) % TG_SLIDES.length), []);

  useEffect(() => {
    const id = window.setInterval(advance, 5000);
    return () => window.clearInterval(id);
  }, [advance]);

  const src = TG_SLIDES[idx]!;

  return (
    <Box w="full" pt={3}>
      <Text
        fontSize="12px"
        fontWeight={500}
        letterSpacing="0.12em"
        textTransform="uppercase"
        color="var(--cc-text-soft)"
        textAlign="center"
        mb={3}
      >
        Einblicke aus der Telegram-Gruppe
      </Text>
      {/* Medienrahmen: 10px, Gold-Haarlinie, Tiefenschatten (DESIGN.md › Medien) */}
      <Box
        position="relative"
        w="100%"
        maxW={{ base: "260px", sm: "300px", md: "340px" }}
        h={{ base: "min(44vh, 300px)", sm: "min(42vh, 320px)", md: "min(40vh, 340px)" }}
        minH={{ base: "220px", md: "260px" }}
        mx="auto"
        borderRadius="10px"
        overflow="hidden"
        bg="var(--cc-bg)"
        border="1px solid rgba(212, 176, 128, 0.28)"
        boxShadow="0 10px 28px rgba(0, 0, 0, 0.45)"
        sx={{ contain: "layout style" }}
      >
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={src}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              willChange: "opacity, filter",
            }}
            initial={{ opacity: 0, filter: "blur(6px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(4px)" }}
            transition={slideTransition}
          >
            <Box
              as="img"
              src={src}
              alt={`Telegram Einblick ${idx + 1}`}
              loading={idx === 0 ? "eager" : "lazy"}
              decoding="async"
              display="block"
              maxW="100%"
              maxH="100%"
              w="auto"
              h="auto"
              objectFit="contain"
              objectPosition="center"
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>
      </Box>
      <HStack spacing={1.5} justify="center" pt={3}>
        {TG_SLIDES.map((_, i) => (
          <Box
            key={i}
            as="button"
            type="button"
            w={i === idx ? "18px" : "7px"}
            h="7px"
            borderRadius="full"
            bg={i === idx ? "var(--cc-gold)" : "rgba(255, 255, 255, 0.22)"}
            boxShadow={i === idx ? "0 0 10px rgba(212, 176, 128, 0.4)" : undefined}
            transition="all 0.3s ease"
            flexShrink={0}
            onMouseDown={(e: MouseEvent<HTMLButtonElement>) => e.preventDefault()}
            onClick={() => setIdx(i)}
            aria-label={`Slide ${i + 1}`}
            aria-current={i === idx ? "true" : undefined}
          />
        ))}
      </HStack>
    </Box>
  );
}

/**
 * Inhalt nach eingegangener Free-Bewerbung (Plattform + Modal).
 * Keine URL im sichtbaren Text — nur im Button.
 */
export function ApplicationReceivedPendingBody() {
  return (
    <Stack spacing={4} w="full" textAlign="left">
      <Text {...BODY_TEXT}>
        Die meisten die sich bewerben kommen nicht weiter. Die, die es tun, verändern, wie sie
        den Markt für immer sehen.
      </Text>
      <Text {...BODY_TEXT}>Du hörst innerhalb von 48 Stunden von mir.</Text>
      <Text {...BODY_TEXT}>Bis dahin, falls du noch nicht in meiner Telegram-Gruppe bist:</Text>
      <Text {...BODY_TEXT}>
        Jeden Tag kostenlose Marktanalysen, Weekly Outlooks und Trade Recaps. Direkt von
        mir.
      </Text>
      <Box pt={1}>
        <Button
          as="a"
          href={TELEGRAM_COMMUNITY_URL}
          target="_blank"
          rel="noopener noreferrer"
          variant="gold"
          size="lg"
          w="full"
          whiteSpace="normal"
        >
          Hier kostenlos beitreten
        </Button>
      </Box>
      <Text {...BODY_TEXT} w="full" textAlign="center" pt={1}>
        Jeder Tag ohne System kostet dich.
      </Text>
      <TelegramSlideshow />
    </Stack>
  );
}
