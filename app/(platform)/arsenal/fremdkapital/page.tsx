import { Box, Stack, Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageArsenalCardsSection } from "@/components/platform/PageCards";
import { getArsenalCards, getCurrentUserAndProfile } from "@/lib/server-data";

export default async function ArsenalFremdkapitalPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const cards = await getArsenalCards("fremdkapital");

  return (
    <Stack gap={8}>
      <Stack gap={3}>
        <Text
          fontSize="xs"
          letterSpacing="0.12em"
          textTransform="uppercase"
          className="inter-semibold"
          color="rgba(74, 222, 128, 0.95)"
        >
          Arsenal · Partner
        </Text>
        <Box
          as="h1"
          className="radley-regular"
          fontSize="clamp(1.75rem, 4vw, 2.25rem)"
          color="var(--color-text-primary)"
        >
          Fremdkapital
        </Box>
        <Box
          h="2px"
          w={{ base: "100%", md: "min(280px, 100%)" }}
          borderRadius="full"
          bg="linear-gradient(90deg, rgba(74, 222, 128, 0) 0%, rgba(74, 222, 128, 0.85) 45%, rgba(74, 222, 128, 0.2) 100%)"
          boxShadow="0 0 16px rgba(74, 222, 128, 0.22)"
        />
        <Text className="inter" fontSize="sm" color="var(--color-text-muted)" maxW="42rem">
          Übersicht zu Partnern, Finanzierungsoptionen und relevanten Ressourcen.
        </Text>
      </Stack>
      <PageArsenalCardsSection cards={cards} accentColor="green" />
    </Stack>
  );
}
