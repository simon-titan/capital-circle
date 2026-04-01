import { Box, Stack, Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageArsenalCardsSection } from "@/components/platform/PageCards";
import { getArsenalCards, getCurrentUserAndProfile } from "@/lib/server-data";

export default async function ArsenalToolsPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const cards = await getArsenalCards("tools");

  return (
    <Stack gap={8}>
      <Stack gap={3}>
        <Text
          fontSize="xs"
          letterSpacing="0.12em"
          textTransform="uppercase"
          className="inter-semibold"
          color="rgba(74, 144, 217, 0.95)"
        >
          Arsenal · Tools
        </Text>
        <Box
          as="h1"
          className="radley-regular"
          fontSize="clamp(1.75rem, 4vw, 2.25rem)"
          color="var(--color-text-primary)"
        >
          Tools & Software
        </Box>
        <Box
          h="2px"
          w={{ base: "100%", md: "min(280px, 100%)" }}
          borderRadius="full"
          bg="linear-gradient(90deg, rgba(74, 144, 217, 0) 0%, rgba(74, 144, 217, 0.85) 45%, rgba(74, 144, 217, 0.2) 100%)"
          boxShadow="0 0 16px rgba(74, 144, 217, 0.25)"
        />
        <Text className="inter" fontSize="sm" color="var(--color-text-muted)" maxW="42rem">
          Empfohlene Werkzeuge und Software rund um dein Trading — kuratiert vom Capital Circle Team.
        </Text>
      </Stack>
      <PageArsenalCardsSection cards={cards} accentColor="blue" />
    </Stack>
  );
}
