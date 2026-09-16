"use client";

import { Box, Flex } from "@chakra-ui/react";
import { ArrowRight } from "lucide-react";
import { APEX_PROMO } from "@/config/apex-promo";

/** Kopien je Laufband-Hälfte — genug, damit die Leiste auch auf breiten Monitoren lückenlos gefüllt ist. */
const COPIES_PER_HALF = 6;

function PromoContent() {
  return (
    <Flex as="span" align="center" gap={3} whiteSpace="nowrap" fontSize="13px" color="var(--cc-text-2)" px={8}>
      <Box
        as="span"
        w="6px"
        h="6px"
        borderRadius="full"
        bg="var(--cc-gold-light)"
        boxShadow="0 0 8px rgba(232, 192, 148, 0.8)"
        flexShrink={0}
      />
      <Box as="span" color="var(--cc-text)">
        {APEX_PROMO.stripText}
      </Box>
      <Box as="span" aria-hidden color="var(--cc-text-3)">
        ·
      </Box>
      <Box as="span">
        Code{" "}
        <Box as="span" color="var(--cc-gold-light)" fontWeight={600} letterSpacing="0.04em">
          {APEX_PROMO.discountCode}
        </Box>
      </Box>
      <Box as="span" aria-hidden color="var(--cc-text-3)">
        ·
      </Box>
      <Flex as="span" align="center" gap={1.5} color="var(--cc-text)">
        {APEX_PROMO.stripCta}
        <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
      </Flex>
    </Flex>
  );
}

/**
 * Leiste über der Plattform: die Apex-Promo läuft als Band über die volle Breite.
 * Zwei identische Hälften + `translateX(-50%)` ergeben eine nahtlose Schleife;
 * Hover pausiert das Band, bei reduzierter Bewegung steht es still.
 */
export function PlatformTopStrip() {
  const copies = Array.from({ length: COPIES_PER_HALF * 2 }, (_, i) => <PromoContent key={i} />);

  return (
    <Flex
      as="aside"
      aria-label="Partnerangebot"
      position={{ base: "relative", lg: "sticky" }}
      top={0}
      zIndex={30}
      h="var(--cc-strip-h)"
      bg="var(--cc-bg-raised)"
      backdropFilter="blur(16px)"
      borderBottom="1px solid rgba(212, 176, 128, 0.18)"
      align="stretch"
      overflow="hidden"
    >
      <Box
        as="a"
        href={APEX_PROMO.ctaUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={`${APEX_PROMO.stripText}, Code ${APEX_PROMO.discountCode}. ${APEX_PROMO.stripCta} (öffnet Apex Trader Funding)`}
        flex="1"
        minW={0}
        display="flex"
        alignItems="center"
        overflow="hidden"
        transition="background-color 150ms var(--cc-ease)"
        _hover={{ bg: "rgba(212, 176, 128, 0.05)" }}
      >
        <Box display="flex" className="cc-marquee cc-marquee--right" w="max-content" style={{ animationDuration: "70s" }} aria-hidden>
          {copies}
        </Box>
      </Box>
    </Flex>
  );
}
