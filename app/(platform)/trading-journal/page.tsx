import { Box, Stack, Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { JournalShell } from "@/components/trading-journal/JournalShell";
import { getCurrentUserAndProfile } from "@/lib/server-data";

export default async function TradingJournalPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  return (
    <Stack gap={{ base: 6, md: 8 }} w="100%">
      <Stack gap={3}>
        <Text
          fontSize="xs"
          letterSpacing="0.12em"
          textTransform="uppercase"
          className="inter-semibold"
          color="rgba(212, 175, 55, 0.95)"
        >
          Plattform
        </Text>
        <Box
          as="h1"
          className="radley-regular"
          fontSize="clamp(1.75rem, 4vw, 2.25rem)"
          color="var(--color-text-primary)"
        >
          Trading Journal
        </Box>
        <Box
          h="2px"
          w={{ base: "100%", md: "min(280px, 100%)" }}
          borderRadius="full"
          bg="linear-gradient(90deg, rgba(212, 175, 55, 0) 0%, rgba(212, 175, 55, 0.85) 45%, rgba(212, 175, 55, 0.2) 100%)"
          boxShadow="0 0 16px rgba(212, 175, 55, 0.22)"
        />
        <Text className="inter" fontSize="sm" color="var(--color-text-muted)" maxW="42rem">
          Erfasse Trades, filtere den Verlauf und werte deine Performance aus — inklusive Kalenderansicht und
          Screenshots.
        </Text>
      </Stack>
      <JournalShell />
    </Stack>
  );
}
