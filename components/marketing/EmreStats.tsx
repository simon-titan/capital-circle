import { Box, SimpleGrid, Stack, Text } from "@chakra-ui/react";

const STATS = [
  { value: "6 Jahre", label: "Aktives Trading" },
  { value: "7-stellig", label: "Funded Status" },
  { value: "+300.000 €", label: "In Payouts" },
  { value: "1.000+", label: "Ausgebildete Trader" },
] as const;

/**
 * Emre's Credibility-Stats — 4 Zahlen-Kacheln im Glassmorphism-Look.
 * Dient als Social-Proof-Anker auf der Free-Funnel-Landing-Page.
 */
export function EmreStats() {
  return (
    <Box maxW="768px" mx="auto" w="full">
      <Stack spacing={4} mb={6} textAlign="center">
        <Text
          fontSize="xs"
          letterSpacing="0.20em"
          textTransform="uppercase"
          color="var(--color-accent-gold)"
          className="inter-semibold"
        >
          Dein Mentor
        </Text>
        <Text
          className="radley-regular"
          fontWeight={400}
          fontSize={{ base: "xl", md: "2xl" }}
          color="var(--color-text-primary)"
          lineHeight="1.3"
        >
          Emre — Profi-Trader und Gründer von Capital Circle
        </Text>
      </Stack>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        {STATS.map((stat) => (
          <Box
            key={stat.label}
            p={{ base: 4, md: 5 }}
            textAlign="center"
            sx={{
              background: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(212,175,55,0.18)",
              borderRadius: "16px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            <Text
              className="radley-regular"
              fontWeight={400}
              fontSize={{ base: "2xl", md: "3xl" }}
              color="var(--color-accent-gold)"
              lineHeight="1.1"
              mb={1}
            >
              {stat.value}
            </Text>
            <Text
              fontSize="xs"
              color="rgba(255,255,255,0.55)"
              className="inter"
              lineHeight="1.4"
            >
              {stat.label}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
