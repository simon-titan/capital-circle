import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageCodexReferenceView } from "@/components/platform/PageCards";
import { getCurrentUserAndProfile } from "@/lib/server-data";

export default async function CodexPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) {
    redirect("/einsteig");
  }
  // Schutz: Nutzer mit ausstehender Bewerbung dürfen die Codex-Referenz nicht sehen
  const appStatus = (profile as { application_status?: string | null } | null)
    ?.application_status;
  if (appStatus === "pending" || appStatus === "rejected") {
    redirect("/pending-review");
  }

  return (
    <Stack gap={{ base: 6, md: 8 }} w="full">
      <Box>
        <Text
          fontSize="xs"
          letterSpacing="0.14em"
          textTransform="uppercase"
          className="inter-semibold"
          color="var(--color-accent-gold-light)"
          mb={3}
        >
          Capital Circle
        </Text>
        <Heading
          as="h1"
          fontSize={{ base: "2xl", md: "3xl" }}
          fontWeight="400"
          className="radley-regular"
          letterSpacing="0.06em"
          color="var(--color-text-primary)"
          mb={3}
        >
          Capital Circle Codex
        </Heading>
        <Box
          h="2px"
          w={{ base: "100%", md: "min(320px, 100%)" }}
          borderRadius="full"
          mb={4}
          bg="linear-gradient(90deg, rgba(212, 175, 55, 0) 0%, rgba(232, 197, 71, 0.9) 42%, rgba(212, 175, 55, 0.35) 100%)"
          boxShadow="0 0 20px rgba(212, 175, 55, 0.25)"
        />
        <Box className="inter" fontSize="sm" color="var(--color-text-muted)" maxW="2xl">
          Die verbindlichen Grundsätze für Trading und Zusammenarbeit in der Community.
        </Box>
      </Box>

      <Box className="glass-card-hero" p={{ base: 5, md: 8 }} borderRadius="18px">
        <PageCodexReferenceView />
      </Box>
    </Stack>
  );
}
