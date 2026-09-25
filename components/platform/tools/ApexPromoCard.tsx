"use client";

import { Box, Button, Grid, GridItem, HStack, Icon, Stack, Text, useClipboard } from "@chakra-ui/react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import Image from "next/image";
import { APEX_PROMO } from "@/config/apex-promo";
import { Panel } from "@/components/journal/Panel";

/**
 * Partner-Promo Apex Trader Funding — seit 25.09.2026 auf `/tools/propfirms`,
 * vorher im Journal-Home.
 *
 * Das Logo ist die für dunkle Flächen gedachte Variante der Marke und wird
 * unverändert gezeigt — kein CSS-Filter, kein Kachel-Hintergrund. Der blaue
 * Chevron ist die einzige Farbe der Seite, die weder Weiß noch Gewinn/Verlust
 * ist; sie gehört Apex, nicht uns, und markiert die Karte als Fremdmarke.
 *
 * Rabatt-Badge und CTA in Brand-Gold — wie jede Hauptaktion der Plattform.
 */
export function ApexPromoCard() {
  const { onCopy, hasCopied } = useClipboard(APEX_PROMO.discountCode);

  return (
    <Panel p={{ base: 5, md: 7 }}>
      <Grid templateColumns={{ base: "1fr", md: "1fr 200px" }} gap={{ base: 6, md: 10 }} alignItems="center">
        {/* Auf Mobil zuerst das Logo — es setzt den Kontext, bevor der Text kommt. */}
        <GridItem order={{ base: 0, md: 1 }} justifySelf="center">
          {/* 863 × 1024 im Original; die Claim-Zeile darunter braucht Größe, um lesbar zu bleiben. */}
          <Box w={{ base: "140px", md: "172px" }}>
            <Image
              src={APEX_PROMO.logoSrc}
              alt={APEX_PROMO.logoAlt}
              width={172}
              height={204}
              style={{ width: "100%", height: "auto" }}
            />
          </Box>
        </GridItem>

        <GridItem order={{ base: 1, md: 0 }}>
          <Stack gap={5}>
            <Stack gap={2}>
              <Text
                fontSize="10px"
                letterSpacing="0.16em"
                textTransform="uppercase"
                className="inter-semibold"
                color="var(--cc-gold-light)"
              >
                {APEX_PROMO.eyebrow}
              </Text>
              <HStack gap={3} align="center" flexWrap="wrap">
                <Text
                  className="inter-semibold"
                  fontSize={{ base: "lg", md: "1.6rem" }}
                  color="var(--cc-text)"
                  letterSpacing="-0.025em"
                  lineHeight="1.15"
                >
                  {APEX_PROMO.headline}
                </Text>
                <Box
                  px={2.5}
                  py={1}
                  borderRadius="6px"
                  bg="var(--cc-gold-grad)"
                  color="var(--cc-on-gold)"
                  boxShadow="0 0 14px rgba(212, 176, 128, 0.35)"
                  fontSize="10px"
                  letterSpacing="0.06em"
                  className="inter-semibold"
                  whiteSpace="nowrap"
                  flexShrink={0}
                >
                  {APEX_PROMO.discountLabel}
                </Box>
              </HStack>
            </Stack>

            <Stack as="ul" gap={2.5} listStyleType="none">
              {APEX_PROMO.bullets.map((bullet) => (
                <HStack as="li" key={bullet} gap={3} align="flex-start">
                  <Icon as={Check} boxSize={3.5} color="var(--cc-gold-light)" flexShrink={0} mt="3px" />
                  <Text fontSize="sm" color="var(--cc-text-2)" lineHeight="1.5">
                    {bullet}
                  </Text>
                </HStack>
              ))}
            </Stack>

            <Text fontSize="sm" color="var(--cc-text-2)" lineHeight="1.6">
              {APEX_PROMO.body}
            </Text>

            <HStack gap={2.5} flexWrap="wrap">
              <Button
                as="a"
                href={APEX_PROMO.ctaUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                variant="gold"
                rightIcon={<ArrowUpRight size={16} />}
                w={{ base: "100%", sm: "fit-content" }}
              >
                {APEX_PROMO.ctaLabel}
              </Button>

              <Button
                onClick={onCopy}
                variant="line"
                color="var(--cc-gold-light)"
                leftIcon={hasCopied ? <Check size={14} /> : <Copy size={14} />}
                letterSpacing="0.04em"
                w={{ base: "100%", sm: "fit-content" }}
              >
                {hasCopied ? "Kopiert" : APEX_PROMO.discountCode}
              </Button>
            </HStack>

            <Text fontSize="xs" fontStyle="italic" color="var(--cc-text-3)" lineHeight="1.5">
              {APEX_PROMO.footnote}
            </Text>
          </Stack>
        </GridItem>
      </Grid>
    </Panel>
  );
}
