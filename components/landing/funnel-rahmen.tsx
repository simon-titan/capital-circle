"use client";

import { Box, Button, Flex, HStack, IconButton, Stack, Text } from "@chakra-ui/react";
import { Menu, X } from "lucide-react";
import NextLink from "next/link";
import { useEffect, useState, type ReactNode } from "react";

/*
 * Rahmen der Funnel-Seiten `/training` und `/call` im Look der Verkaufsseite `/`
 * (DESIGN.md → Marketing): klebende Kopfleiste, die erst beim Scrollen zu Glas
 * wird, Hero-Pill mit pulsierendem Punkt, Video mit Gold-/Weiß-Schein und eine
 * feste Aktionsleiste auf schmalen Bildschirmen.
 *
 * Die Verkaufsseite selbst behält ihre eigenen Bausteine (`MembershipNav`,
 * `MembershipMobileCta`): Die hängen am Beitritts-Dialog und an den Preiskarten.
 * Hier steht dasselbe Bild, nur mit frei wählbarer Hauptaktion.
 *
 * Wichtig: Diese Seiten dürfen **nicht** `FunnelPageStyles` laden — das blendet
 * jedes `nav[aria-label]` aus und damit auch die Navigation dieser Kopfleiste.
 */

export type Sprungmarke = { id: string; label: string };

/**
 * Kopfleiste: Wortmarke, optional Sprungmarken (ab `lg`), „Anmelden" und die
 * Hauptaktion. Ohne Sprungmarken entfällt auch das Mobilmenü — `/call` hat
 * genau eine Aktion, ein Menü wäre dort ein Umweg.
 */
export function FunnelKopfleiste({
  anker = [],
  aktion,
  menueAktion,
  anmelden = true,
}: {
  anker?: readonly Sprungmarke[];
  /** Hauptaktion rechts, ab `sm` sichtbar. */
  aktion: ReactNode;
  /** Hauptaktion im Mobilmenü (volle Breite). */
  menueAktion?: ReactNode;
  anmelden?: boolean;
}) {
  const [gescrollt, setGescrollt] = useState(false);
  const [offen, setOffen] = useState(false);

  useEffect(() => {
    const beiScroll = () => setGescrollt(window.scrollY > 24);
    beiScroll();
    window.addEventListener("scroll", beiScroll, { passive: true });
    return () => window.removeEventListener("scroll", beiScroll);
  }, []);

  const glas = gescrollt || offen;
  const mitMenue = anker.length > 0;

  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={100}
      w="full"
      transition="background-color 220ms var(--cc-ease), border-color 220ms var(--cc-ease), backdrop-filter 220ms var(--cc-ease)"
      bg={glas ? "var(--cc-bg-raised)" : "transparent"}
      backdropFilter={glas ? "blur(16px)" : undefined}
      borderBottom="1px solid"
      borderColor={glas ? "rgba(212, 176, 128, 0.18)" : "transparent"}
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
        <Box
          as="a"
          href="#seitenanfang"
          aria-label="Capital Circle, zum Seitenanfang"
          display="inline-flex"
          alignItems="center"
          lineHeight={1}
          _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "4px" }}
        >
          <Box as="img" src="/logo/cc-wortmarke-weiss.png" alt="" h={{ base: "18px", md: "21px" }} w="auto" display="block" />
        </Box>

        {mitMenue ? (
          <HStack as="nav" aria-label="Seitenabschnitte" display={{ base: "none", lg: "flex" }} spacing={8}>
            {anker.map((punkt) => (
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
        ) : null}

        <HStack spacing={2}>
          {anmelden ? (
            <Button as={NextLink} href="/login" variant="line" h="40px" px={4} fontSize="15px" whiteSpace="nowrap">
              Anmelden
            </Button>
          ) : null}

          <Box display={{ base: "none", sm: "block" }}>{aktion}</Box>

          {mitMenue ? (
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
          ) : null}
        </HStack>
      </Flex>

      {mitMenue && offen ? (
        <Box display={{ base: "block", lg: "none" }} borderTop="1px solid var(--cc-line)" px={{ base: 4, md: 8 }} py={4}>
          <Stack as="nav" aria-label="Seitenabschnitte" spacing={0}>
            {anker.map((punkt) => (
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
          {/* Das Menü bleibt beim Klick offen: Schlösse es sich, verschwände der
              Knopf aus dem DOM und der Dialog hätte beim Schließen kein Fokusziel. */}
          {menueAktion ? <Box mt={4}>{menueAktion}</Box> : null}
        </Box>
      ) : null}
    </Box>
  );
}

/** Dachzeile des Hero in einer Pill mit leise pulsierendem Punkt (wie auf `/`). */
export function HeroPill({ children }: { children: ReactNode }) {
  return (
    <HStack
      spacing={{ base: 2.5, md: 3 }}
      h={{ base: "32px", md: "36px" }}
      px={{ base: 4, md: 5 }}
      maxW="100%"
      borderRadius="full"
      border="1px solid var(--cc-line-strong)"
      bg="rgba(255, 255, 255, 0.02)"
    >
      <Box
        className="cc-pulse"
        aria-hidden
        w="7px"
        h="7px"
        flexShrink={0}
        borderRadius="full"
        bg="var(--cc-gold-light)"
        boxShadow="0 0 10px rgba(232, 192, 148, 0.7)"
      />
      <Text
        as="span"
        fontSize={{ base: "11px", md: "13px" }}
        fontWeight={600}
        letterSpacing="0.22em"
        textTransform="uppercase"
        color="var(--cc-text-soft)"
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
      >
        {children}
      </Text>
    </HStack>
  );
}

/** Kleines Badge über einem Video (leiser als die Hero-Pill, kein Pulsieren). */
export function VideoBadge({ children }: { children: ReactNode }) {
  return (
    <Flex justify="center" mb={{ base: 3, md: 4 }}>
      <HStack
        spacing={2}
        minH={{ base: "24px", md: "26px" }}
        px={{ base: 2.5, md: 3 }}
        maxW="100%"
        borderRadius="full"
        border="1px solid var(--cc-line)"
        bg="rgba(255, 255, 255, 0.02)"
      >
        <Box aria-hidden w="5px" h="5px" flexShrink={0} borderRadius="full" bg="var(--cc-gold-light)" boxShadow="0 0 6px rgba(232, 192, 148, 0.6)" />
        <Text as="span" fontSize={{ base: "11px", md: "12px" }} fontWeight={500} color="var(--cc-text-2)">
          {children}
        </Text>
      </HStack>
    </Flex>
  );
}

/**
 * Rahmen um ein Video: nur Gold-/Weiß-Schein, keine Rahmenlinie — dieselben
 * Werte wie das Plattform-Video im Hero von `/`.
 */
export function VideoSchein({ children }: { children: ReactNode }) {
  return (
    <Box
      borderRadius={{ base: "12px", md: "16px" }}
      boxShadow={{
        base: "0 0 22px rgba(212, 176, 128, 0.22), 0 0 48px rgba(255, 255, 255, 0.05), 0 14px 34px rgba(0, 0, 0, 0.5)",
        md: "0 0 40px rgba(212, 176, 128, 0.26), 0 0 110px rgba(255, 255, 255, 0.07), 0 28px 70px rgba(0, 0, 0, 0.55)",
      }}
    >
      {children}
    </Box>
  );
}

/** Gesperrte Nummer, Lichtstrich und Marke in Gold — der Schrittkopf aus dem Prozess-Abschnitt auf `/`. */
export function SchrittMarke({ nummer, marke, as = "h3" }: { nummer: string; marke: string; as?: "h3" | "p" }) {
  return (
    <HStack spacing={{ base: 3, md: 4 }} align="center">
      <Text
        className="cc-num"
        fontSize={{ base: "30px", md: "34px" }}
        fontWeight={600}
        lineHeight={1}
        letterSpacing="-0.02em"
        color="var(--cc-text-3)"
        opacity={0.6}
        aria-hidden
      >
        {nummer}
      </Text>
      <Box aria-hidden w={{ base: "28px", md: "36px" }} h="1px" flexShrink={0} bg="linear-gradient(90deg, transparent, var(--cc-gold-line))" />
      <Text
        as={as}
        fontSize={{ base: "12px", md: "13px" }}
        fontWeight={600}
        letterSpacing="0.22em"
        textTransform="uppercase"
        color="var(--cc-gold-light)"
      >
        {marke}
      </Text>
    </HStack>
  );
}

/**
 * Feste Aktionsleiste unten, nur auf schmalen Bildschirmen. Erscheint, wenn
 * der Hero durchgescrollt ist, und verschwindet über den Abschnitten in
 * `ausblendenBei` — dort steht die Aktion ohnehin schon groß im Bild.
 */
export function MobilAktionsleiste({
  children,
  hinweis,
  ausblendenBei = [],
}: {
  children: (tabIndex: number) => ReactNode;
  hinweis?: readonly string[];
  ausblendenBei?: readonly string[];
}) {
  const [sichtbar, setSichtbar] = useState(false);
  const schluessel = ausblendenBei.join(",");

  useEffect(() => {
    const ziele = schluessel ? schluessel.split(",").map((id) => document.getElementById(id)) : [];
    const pruefen = () => {
      const heroDurch = window.scrollY > window.innerHeight * 0.85;
      const zielSichtbar = ziele.some((el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.top < window.innerHeight && r.bottom > 0;
      });
      setSichtbar(heroDurch && !zielSichtbar);
    };
    pruefen();
    window.addEventListener("scroll", pruefen, { passive: true });
    window.addEventListener("resize", pruefen);
    return () => {
      window.removeEventListener("scroll", pruefen);
      window.removeEventListener("resize", pruefen);
    };
  }, [schluessel]);

  return (
    <>
      {/* Platz am Seitenende, damit die Leiste nicht über der Fußzeile liegt. */}
      <Box aria-hidden display={{ base: "block", md: "none" }} h="120px" />
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
          {children(sichtbar ? 0 : -1)}
          {hinweis?.length ? (
            <HStack justify="center" spacing={3}>
              {hinweis.map((teil, i) => (
                <HStack key={teil} spacing={3}>
                  {i > 0 ? <Box aria-hidden w="1px" h="10px" bg="var(--cc-line-strong)" /> : null}
                  <Text fontSize="12px" color="var(--cc-text-3)">
                    {teil}
                  </Text>
                </HStack>
              ))}
            </HStack>
          ) : null}
        </Stack>
      </Box>
    </>
  );
}
