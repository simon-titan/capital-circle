import { Box, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { FunnelEyebrow, FunnelHeadline, GoldWord, rise } from "./funnel-ui";

const STATS = [
  { value: "6 Jahre", label: "Aktives Trading" },
  { value: "7-stellig", label: "Funded Status" },
  { value: "+300.000 €", label: "In Payouts" },
  { value: "1.000+", label: "Ausgebildete Trader" },
] as const;

/**
 * Emre's Credibility-Stats — 4 Zahlen-Kacheln als Glas-Karten mit Gold-Kante.
 * Dient als Social-Proof-Anker auf der Free-Funnel-Landing-Page.
 */
export function EmreStats() {
  return (
    <Box maxW="768px" mx="auto" w="full">
      <Stack spacing={4} mb={6} textAlign="center" align="center" {...rise(3)}>
        <FunnelEyebrow>Dein Mentor</FunnelEyebrow>
        <FunnelHeadline as="h2" scale="md">
          <GoldWord>Emre</GoldWord> — Profi-Trader und Gründer von Capital Circle
        </FunnelHeadline>
      </Stack>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 3, md: 4 }}>
        {STATS.map((stat, i) => (
          <Box key={stat.label} p={{ base: 4, md: 5 }} textAlign="center" minW={0} {...rise(4 + i, "cc-card")}>
            {/* Proportionale Ziffern (kein .cc-num): Einzelwerte, keine Spalten — sonst Lücke in „7-stellig“. */}
            <Text
              fontSize={{ base: "22px", md: "24px", lg: "26px" }}
              fontWeight={600}
              letterSpacing="-0.02em"
              lineHeight={1.1}
              whiteSpace="nowrap"
              color="var(--cc-text)"
            >
              {stat.value}
            </Text>
            <Text fontSize="13px" color="var(--cc-text-2)" lineHeight={1.4} mt={1.5}>
              {stat.label}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
