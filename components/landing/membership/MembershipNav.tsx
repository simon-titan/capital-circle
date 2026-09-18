"use client";

import { Box, Flex, HStack, IconButton, Stack } from "@chakra-ui/react";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { navAnker } from "@/config/landing-membership";
import { BeitrittCta } from "./BeitrittModal";

/**
 * Kopfleiste der Verkaufsseite.
 *
 * Bleibt oben kleben und wird erst zu Glas, wenn tatsächlich gescrollt wurde.
 * Über dem Hero liegt sie damit unsichtbar auf dem Sternenfeld — eine Leiste
 * mit Unterkante direkt unter der Headline würde den Himmel zerschneiden, den
 * der Hero gerade aufmacht.
 *
 * Alle Sprungmarken sind Anker auf derselben Seite, deshalb durchgehend
 * `<a href>` statt `next/link`: Für Sprungmarken hätte der Router nichts zu
 * holen. Die Hauptaktion ist seit 09/2026 keine Sprungmarke mehr, sondern
 * öffnet den Beitritts-Dialog — hier oben ist die Laufzeit noch offen, und der
 * Sprung ans Seitenende hat den Leser jedes Mal aus dem Text gerissen.
 */
export function MembershipNav() {
  const [gescrollt, setGescrollt] = useState(false);
  const [offen, setOffen] = useState(false);

  useEffect(() => {
    const beiScroll = () => setGescrollt(window.scrollY > 24);
    beiScroll();
    window.addEventListener("scroll", beiScroll, { passive: true });
    return () => window.removeEventListener("scroll", beiScroll);
  }, []);

  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={100}
      w="full"
      transition="background-color 220ms var(--cc-ease), border-color 220ms var(--cc-ease), backdrop-filter 220ms var(--cc-ease)"
      bg={gescrollt || offen ? "var(--cc-bg-raised)" : "transparent"}
      backdropFilter={gescrollt || offen ? "blur(16px)" : undefined}
      borderBottom="1px solid"
      borderColor={gescrollt || offen ? "rgba(212, 176, 128, 0.18)" : "transparent"}
    >
      <Flex
        maxW="1180px"
        mx="auto"
        h={{ base: "64px", md: "72px" }}
        px={{ base: 4, md: 8, lg: 12 }}
        align="center"
        justify="space-between"
        gap={4}
      >
        {/* Wortmarke — führt zurück an den Seitenanfang */}
        <Box
          as="a"
          href="#seitenanfang"
          fontSize={{ base: "13px", md: "15px" }}
          fontWeight={400}
          letterSpacing={{ base: "0.24em", md: "0.32em" }}
          textTransform="uppercase"
          color="var(--cc-text)"
          whiteSpace="nowrap"
          _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "4px" }}
        >
          Capital Circle
        </Box>

        <HStack as="nav" aria-label="Seitenabschnitte" display={{ base: "none", lg: "flex" }} spacing={8}>
          {navAnker.map((punkt) => (
            <Box
              key={punkt.id}
              as="a"
              href={`#${punkt.id}`}
              fontSize="15px"
              color="var(--cc-text-2)"
              transition="color 180ms var(--cc-ease)"
              _hover={{ color: "var(--cc-text)" }}
              _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "4px", borderRadius: "4px" }}
            >
              {punkt.label}
            </Box>
          ))}
        </HStack>

        <HStack spacing={2}>
          <BeitrittCta
            h="40px"
            px={5}
            fontSize="15px"
            // Der Text ist seit „Capital Circle beitreten" lang genug, dass er
            // zwischen Wortmarke und Sprungmarken sonst zweizeilig umbricht.
            whiteSpace="nowrap"
            // Unterhalb von `sm` ist die Leiste zu eng für den Knopf; dort
            // trägt ihn das Mobilmenü darunter.
            display={{ base: "none", sm: "inline-flex" }}
          />

          <IconButton
            display={{ base: "inline-flex", lg: "none" }}
            aria-label={offen ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={offen}
            icon={offen ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
            variant="line"
            h="40px"
            minW="40px"
            onClick={() => setOffen((v) => !v)}
          />
        </HStack>
      </Flex>

      {/* Mobiles Menü: einfache Liste statt Drawer — es sind fünf Sprungmarken. */}
      {offen ? (
        <Box display={{ base: "block", lg: "none" }} borderTop="1px solid var(--cc-line)" px={{ base: 4, md: 8 }} py={4}>
          <Stack as="nav" aria-label="Seitenabschnitte" spacing={0}>
            {navAnker.map((punkt) => (
              <Box
                key={punkt.id}
                as="a"
                href={`#${punkt.id}`}
                onClick={() => setOffen(false)}
                py={3}
                fontSize="16px"
                color="var(--cc-text-soft)"
                borderBottom="1px solid var(--cc-line)"
                _last={{ borderBottom: "none" }}
              >
                {punkt.label}
              </Box>
            ))}
          </Stack>

          {/* Die Hauptaktion auch hier: Unterhalb von `sm` fehlt sie in der
              Leiste, und ein Menü ohne den einen Knopf, um den es geht, wäre
              auf den schmalsten Geräten eine Sackgasse.

              Das Menü bleibt beim Klick bewusst offen. Würde es sich schließen,
              verschwände dieser Knopf aus dem DOM, und der Dialog hätte beim
              Schließen kein Ziel mehr für den Fokus — er fiele auf den
              Seitenanfang zurück. */}
          <BeitrittCta mt={4} w="full" h="48px" fontSize="16px" />
        </Box>
      ) : null}
    </Box>
  );
}
