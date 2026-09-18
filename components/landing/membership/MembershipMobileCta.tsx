"use client";

import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { preiskarten } from "@/config/landing-membership";
import { BeitrittCta } from "./BeitrittModal";

/**
 * Fester CTA-Balken, nur auf schmalen Bildschirmen.
 *
 * Erscheint erst, wenn der Hero durchgescrollt ist. Direkt unter dem
 * Hero-Knopf stünde er als zweiter, identischer Knopf da und nähme dem ersten
 * die Wirkung; ab dem zweiten Bildschirm ist er dagegen der einzige Weg zurück
 * zur Aktion, ohne nach oben zu scrollen.
 *
 * Er verschwindet wieder, sobald die Preiskarten sichtbar sind — dort steht
 * der echte Knopf, und zwei gleichlautende Aktionen übereinander sind eine zu
 * viel.
 */
export function MembershipMobileCta() {
  const [sichtbar, setSichtbar] = useState(false);

  useEffect(() => {
    const angebot = document.getElementById("angebot");

    const pruefen = () => {
      const heroDurch = window.scrollY > window.innerHeight * 0.85;
      const angebotSichtbar = angebot
        ? angebot.getBoundingClientRect().top < window.innerHeight && angebot.getBoundingClientRect().bottom > 0
        : false;
      setSichtbar(heroDurch && !angebotSichtbar);
    };

    pruefen();
    window.addEventListener("scroll", pruefen, { passive: true });
    window.addEventListener("resize", pruefen);
    return () => {
      window.removeEventListener("scroll", pruefen);
      window.removeEventListener("resize", pruefen);
    };
  }, []);

  // `preiskarten[0]` ist der **Monats**plan und damit der teuerste Monatspreis —
  // „Ab" davor war in die falsche Richtung falsch: Der guenstigste Monatspreis
  // steckt im Jahresplan (82,50 €). Hier steht jetzt schlicht der Einstiegspreis.
  const einstieg = preiskarten[0];

  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      zIndex={90}
      display={{ base: "block", md: "none" }}
      bg="var(--cc-bg-raised)"
      backdropFilter="blur(18px)"
      borderTop="1px solid rgba(212, 176, 128, 0.18)"
      boxShadow="0 -12px 32px rgba(0, 0, 0, 0.45)"
      px={4}
      pt={3}
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      // Ausgeblendet statt ausgehängt: Ein Element, das beim Scrollen aus dem
      // DOM verschwindet, zieht den Fokus mit sich, falls jemand gerade darauf
      // steht.
      transform={sichtbar ? "translateY(0)" : "translateY(120%)"}
      opacity={sichtbar ? 1 : 0}
      pointerEvents={sichtbar ? "auto" : "none"}
      aria-hidden={!sichtbar}
      transition="transform 260ms var(--cc-ease), opacity 200ms var(--cc-ease)"
    >
      <Box
        aria-hidden
        position="absolute"
        top="-1px"
        left="16%"
        right="16%"
        h="1px"
        bg="linear-gradient(90deg, transparent, rgba(232, 192, 148, 0.7), transparent)"
      />
      <Stack spacing={2.5}>
        {/* Öffnet den Beitritts-Dialog statt zum Angebot zu springen. Gerade
            hier zählt das am meisten: Der Balken erscheint mitten im Lesen, und
            ein Sprung ans Seitenende verliert die Stelle, an der jemand gerade
            war. */}
        <BeitrittCta w="full" h="52px" fontSize="16px" tabIndex={sichtbar ? 0 : -1} />
        <HStack justify="center" spacing={3}>
          <Text fontSize="12px" color="var(--cc-text-3)" className="cc-num">
            {einstieg.preis} im Monat
          </Text>
          <Box aria-hidden w="1px" h="10px" bg="var(--cc-line-strong)" />
          <Text fontSize="12px" color="var(--cc-text-3)">
            Monatlich kündbar
          </Text>
        </HStack>
      </Stack>
    </Box>
  );
}
