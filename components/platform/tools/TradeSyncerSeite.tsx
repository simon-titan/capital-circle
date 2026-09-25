"use client";

import { Box, Grid, Stack, Text } from "@chakra-ui/react";
import Image from "next/image";
import { TRADESYNCER } from "@/config/partner";
import { CodeKarte, Eyebrow, rise } from "./toolsUi";

/**
 * TradeSyncer-Partnerseite nach dem Kunden-Mockup (25.09.2026): Kopf,
 * zwei echte Auswertungen, zwei Benefits, Vorteilskarte mit Code und
 * Affiliate-Link.
 *
 * Die Auswertungen sind Fremdmarke in Blau; sie stehen als Bild in einer
 * Graphit-Karte. Die Fläche drumherum bekommt kein Blau.
 */
export function TradeSyncerSeite() {
  return (
    <Stack spacing={{ base: 6, md: 8 }}>
      <Stack spacing={3} className="cc-rise" {...rise(0)}>
        <Eyebrow>{TRADESYNCER.eyebrow}</Eyebrow>
        <Box
          as="h1"
          fontSize={{ base: "28px", md: "38px" }}
          fontWeight={600}
          letterSpacing="-0.015em"
          lineHeight={1.15}
          color="var(--cc-text)"
        >
          {TRADESYNCER.headline}
        </Box>
        <Text fontSize={{ base: "15px", md: "17px" }} color="var(--cc-text-2)" lineHeight={1.6} maxW="40rem">
          {TRADESYNCER.lead}
        </Text>
      </Stack>

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={{ base: 4, md: 5 }}>
        {TRADESYNCER.bilder.map((bild, i) => (
          <Box
            key={bild.src}
            className="cc-card cc-card--still cc-rise"
            p={{ base: 2, md: 2.5 }}
            overflow="hidden"
            {...rise(1 + i)}
          >
            <Image
              src={bild.src}
              alt={bild.alt}
              width={bild.width}
              height={bild.height}
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ width: "100%", height: "auto", display: "block", borderRadius: "10px" }}
            />
          </Box>
        ))}
      </Grid>

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={{ base: 4, md: 5 }}>
        {TRADESYNCER.benefits.map((b, i) => (
          <Box key={b.titel} className="cc-card cc-card--still cc-rise" p={{ base: 5, md: 6 }} {...rise(3 + i)}>
            <Text fontSize="17px" fontWeight={600} color="var(--cc-text)">
              {b.titel}
            </Text>
            <Text fontSize="15px" color="var(--cc-text-2)" mt={1.5} lineHeight={1.55}>
              {b.text}
            </Text>
          </Box>
        ))}
      </Grid>

      <Box className="cc-rise" {...rise(5)}>
        <CodeKarte
          titel="Capital Circle Vorteil"
          rabatt={TRADESYNCER.rabatt}
          code={TRADESYNCER.code}
          url={TRADESYNCER.url}
          ctaLabel={TRADESYNCER.ctaLabel}
          hinweis="Affiliate-Link wird automatisch verwendet."
        />
      </Box>
    </Stack>
  );
}
