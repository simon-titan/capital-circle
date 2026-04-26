"use client";

import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
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
        fontSize="xs"
        color="rgba(212,175,55,0.9)"
        className="inter-semibold"
        textTransform="uppercase"
        letterSpacing="0.06em"
        mb={2}
        sx={{
          background: "linear-gradient(90deg, rgba(212,175,55,0.95) 0%, rgba(34,158,217,0.95) 100%)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}
      >
        Einblicke aus der Telegram-Gruppe
      </Text>
      <Box
        p="1px"
        borderRadius="12px"
        w="100%"
        maxW={{ base: "260px", sm: "300px", md: "340px" }}
        mx="auto"
        bg="linear-gradient(135deg, rgba(212,175,55,0.75) 0%, rgba(34,158,217,0.5) 52%, rgba(34,158,217,0.4) 100%)"
        boxShadow="0 6px 24px rgba(0,0,0,0.3), 0 0 16px rgba(34,158,217,0.08)"
        sx={{ contain: "layout style" }}
      >
        <Box
          position="relative"
          borderRadius="11px"
          overflow="hidden"
          bg="#07080b"
          mx="auto"
          w="100%"
          h={{ base: "min(44vh, 300px)", sm: "min(42vh, 320px)", md: "min(40vh, 340px)" }}
          minH={{ base: "220px", md: "260px" }}
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
      </Box>
      <HStack spacing={1.5} justify="center" pt={2.5}>
        {TG_SLIDES.map((_, i) => (
          <Box
            key={i}
            as="button"
            type="button"
            w={i === idx ? "18px" : "7px"}
            h="7px"
            borderRadius="full"
            bg={
              i === idx
                ? "linear-gradient(90deg, #D4AF37 0%, #229ED9 100%)"
                : "rgba(255,255,255,0.22)"
            }
            transition="all 0.3s ease"
            flexShrink={0}
            onMouseDown={(e: MouseEvent<HTMLButtonElement>) => e.preventDefault()}
            onClick={() => setIdx(i)}
            aria-label={`Slide ${i + 1}`}
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
    <Stack spacing={4} w="full" textAlign="left" className="inter">
      <Text fontSize="md" color="rgba(255,255,255,0.75)" lineHeight="1.6">
        Die meisten die sich bewerben kommen nicht weiter. Die die es tun – verändern wie sie
        den Markt für immer sehen.
      </Text>
      <Text fontSize="md" color="rgba(255,255,255,0.75)" lineHeight="1.6">
        Du hörst innerhalb von 48 Stunden von mir.
      </Text>
      <Text fontSize="md" color="rgba(255,255,255,0.75)" lineHeight="1.6">
        Bis dahin – falls du noch nicht in meiner Telegram-Gruppe bist:
      </Text>
      <Text fontSize="md" color="rgba(255,255,255,0.75)" lineHeight="1.6">
        Jeden Tag kostenlose Marktanalysen, Weekly Outlooks und Trade Recaps. Direkt von
        mir.
      </Text>
      <Box pt={1}>
        <Button
          as="a"
          href={TELEGRAM_COMMUNITY_URL}
          target="_blank"
          rel="noopener noreferrer"
          variant="unstyled"
          display="flex"
          alignItems="center"
          justifyContent="center"
          w="full"
          minH="48px"
          px={4}
          fontSize="md"
          className="inter-semibold"
          borderRadius="12px"
          color="rgba(252,252,255,0.98)"
          bg="linear-gradient(135deg, rgba(212,175,55,0.32) 0%, rgba(34,158,217,0.40) 52%, rgba(34,158,217,0.34) 100%)"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="rgba(212,175,55,0.42)"
          backdropFilter="blur(16px)"
          sx={{
            WebkitBackdropFilter: "blur(16px)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.14), 0 4px 22px rgba(0,0,0,0.28), 0 0 20px rgba(34,158,217,0.12)",
          }}
          _hover={{
            bg: "linear-gradient(135deg, rgba(212,175,55,0.44) 0%, rgba(34,158,217,0.48) 52%, rgba(34,158,217,0.40) 100%)",
            borderColor: "rgba(34,158,217,0.55)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.18), 0 6px 28px rgba(0,0,0,0.32), 0 0 28px rgba(34,158,217,0.2)",
          }}
          _active={{
            bg: "linear-gradient(135deg, rgba(166,124,0,0.35) 0%, rgba(26,143,192,0.45) 100%)",
          }}
        >
          Hier kostenlos beitreten
        </Button>
      </Box>
      <Text
        w="full"
        textAlign="center"
        fontSize="md"
        color="rgba(255,255,255,0.75)"
        lineHeight="1.6"
        className="inter"
        pt={1}
      >
        Jeder Tag ohne System kostet dich.
      </Text>
      <TelegramSlideshow />
    </Stack>
  );
}
