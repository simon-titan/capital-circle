"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import Image from "next/image";

/**
 * Cover des Trading Blueprints, in CSS nachgebaut (Emres Mockup, 08.11.2026):
 * ein dunkles Buch mit Rücken, ein zweites Blatt dahinter, oben die Wortmarke,
 * mittig der Titel, unten eine leise Chart-Linie in Smaragd (seit 14.11.2026,
 * vorher Champagner).
 *
 * Alle Maße hängen über `em` an `breite` — das Cover skaliert als Ganzes und
 * sieht in der Dashboard-Karte (≈ 150 px) wie auf der Blueprint-Seite gleich aus.
 * Reine Illustration: `aria-hidden`, kein Schein, keine Gold-Kante.
 */
export function BlueprintCover({ breite = 150 }: { breite?: number }) {
  return (
    <Box
      position="relative"
      w={`${breite}px`}
      flexShrink={0}
      fontSize={`${breite / 10}px`}
      pt="0.5em"
      pl="0.5em"
      aria-hidden
    >
      {/* Blatt dahinter */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right="0.5em"
        bottom="0.5em"
        borderRadius="0.25em 0.55em 0.55em 0.25em"
        bg="linear-gradient(160deg, #23282e 0%, #171b20 100%)"
        border="1px solid rgba(255, 255, 255, 0.06)"
      />
      {/* Vorderseite */}
      <Box
        position="relative"
        style={{ aspectRatio: "3 / 4" }}
        borderRadius="0.25em 0.55em 0.55em 0.25em"
        overflow="hidden"
        bg="linear-gradient(165deg, #20252b 0%, #15191d 55%, #111418 100%)"
        border="1px solid rgba(255, 255, 255, 0.09)"
        boxShadow="0 0.9em 1.8em rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
      >
        {/* Buchrücken */}
        <Box
          position="absolute"
          top={0}
          bottom={0}
          left={0}
          w="0.55em"
          bg="linear-gradient(90deg, rgba(0, 0, 0, 0.45) 0%, rgba(255, 255, 255, 0.05) 70%, rgba(0, 0, 0, 0.2) 100%)"
        />
        {/* Welle unten rechts */}
        <svg
          viewBox="0 0 100 60"
          preserveAspectRatio="none"
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", height: "45%" }}
        >
          <defs>
            <linearGradient id="cc-bp-welle" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1c7a5a" stopOpacity="0" />
              <stop offset="60%" stopColor="#1c7a5a" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6fd0a6" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          <path d="M0 48 C 30 30, 55 62, 100 22 L 100 60 L 0 60 Z" fill="url(#cc-bp-welle)" opacity="0.35" />
          <path d="M0 50 C 30 32, 55 64, 100 24" fill="none" stroke="#6fd0a6" strokeOpacity="0.75" strokeWidth="0.7" />
          <path d="M0 56 C 34 40, 60 66, 100 34" fill="none" stroke="#2a9a73" strokeOpacity="0.45" strokeWidth="0.45" />
        </svg>

        <Flex direction="column" align="center" h="100%" pt="1.1em" px="0.9em" position="relative">
          <Image
            src="/logo/cc-wortmarke-weiss.png"
            alt=""
            width={1585}
            height={199}
            style={{ height: "0.42em", width: "auto", opacity: 0.75 }}
          />
          <Flex flex="1" direction="column" align="center" justify="center" pb="1.4em">
            <Text
              fontSize="1.05em"
              lineHeight={1.2}
              fontWeight={500}
              letterSpacing="0.06em"
              textAlign="center"
              textTransform="uppercase"
              color="var(--cc-text-soft)"
            >
              Trading
              <br />
              Blueprint
            </Text>
            <Box mt="0.6em" w="1.1em" h="1px" bg="rgba(255, 255, 255, 0.25)" />
          </Flex>
        </Flex>
      </Box>
    </Box>
  );
}
