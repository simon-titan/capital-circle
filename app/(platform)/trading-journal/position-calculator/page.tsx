import { Box, Stack, Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PositionCalculator } from "@/components/trading-journal/PositionCalculator";
import { PaywallOverlay } from "@/components/ui/PaywallOverlay";
import { getCurrentUserAndProfile, userCanAccessTradingJournal } from "@/lib/server-data";

export default async function PositionCalculatorPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const paid = userCanAccessTradingJournal(Boolean(profile.is_paid));

  const header = (
    <Stack gap={3} w="100%" maxW="42rem" textAlign="center" align="center">
      <Text
        fontSize="xs"
        letterSpacing="0.12em"
        textTransform="uppercase"
        className="inter-semibold"
        color="rgba(212, 175, 55, 0.95)"
      >
        Trading Journal
      </Text>
      <Box
        as="h1"
        className="radley-regular"
        fontSize="clamp(1.75rem, 4vw, 2.25rem)"
        color="var(--color-text-primary)"
      >
        Positionsrechner
      </Box>
      <Box
        h="2px"
        w="min(280px, 100%)"
        borderRadius="full"
        bg="linear-gradient(90deg, rgba(212, 175, 55, 0) 0%, rgba(212, 175, 55, 0.85) 45%, rgba(212, 175, 55, 0.2) 100%)"
        boxShadow="0 0 16px rgba(212, 175, 55, 0.22)"
      />
      <Text className="inter" fontSize="sm" color="var(--color-text-muted)" maxW="42rem">
        Risiko und Reward für Futures-Minis und -Mikros schnell überschlagen — Ticks oder accountbasiert.
      </Text>
    </Stack>
  );

  const content = (
    <Stack gap={{ base: 6, md: 8 }} w="100%" align="center">
      {header}
      <Box
        w="100%"
        maxW="720px"
        mx="auto"
        bg="rgba(255,255,255,0.03)"
        border="1px solid rgba(255,255,255,0.08)"
        borderRadius="2xl"
        px={{ base: 4, md: 8 }}
        py={6}
      >
        <PositionCalculator />
      </Box>
    </Stack>
  );

  if (!paid) {
    return <PaywallOverlay active>{content}</PaywallOverlay>;
  }

  return content;
}
