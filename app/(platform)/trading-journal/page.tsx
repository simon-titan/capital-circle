import { Badge, Box, HStack, Stack, Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/server-data";

export default async function TradingJournalPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  return (
    <Stack gap={{ base: 6, md: 8 }} maxW="48rem">
      <Stack gap={3}>
        <HStack flexWrap="wrap" spacing={3} align="center">
          <Text
            fontSize="xs"
            letterSpacing="0.12em"
            textTransform="uppercase"
            className="inter-semibold"
            color="rgba(212, 175, 55, 0.95)"
          >
            Plattform
          </Text>
          <Badge colorScheme="yellow" fontSize="0.7rem" px={2} py={0.5} borderRadius="md">
            Demnächst verfügbar
          </Badge>
        </HStack>
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
          Hier entsteht dein persönliches Trading Journal — strukturierte Trades, Notizen und Auswertungen an einem Ort.
          Ideal für Marketing und Enrollment: zeige Interessierten, was bald kommt.
        </Text>
        <Text className="inter" fontSize="sm" color="var(--color-text-muted)" maxW="42rem">
          Wir arbeiten an der Funktion und geben Bescheid, sobald sie live geht.
        </Text>
      </Stack>
    </Stack>
  );
}
