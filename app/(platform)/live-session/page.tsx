import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageLiveSessionGrid } from "@/components/platform/PageCards";
import {
  getCurrentUserAndProfile,
  getLiveSessionCategories,
  getLiveSessions,
} from "@/lib/server-data";
import { Radio } from "lucide-react";

export default async function LiveSessionPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const [categories, sessions] = await Promise.all([
    getLiveSessionCategories(),
    getLiveSessions(null),
  ]);

  return (
    <Stack gap={{ base: 6, md: 8 }}>
      <Stack gap={3}>
        <Flex align="center" gap={3} flexWrap="wrap">
          <Flex
            align="center"
            justify="center"
            w="44px"
            h="44px"
            borderRadius="12px"
            bg="linear-gradient(145deg, rgba(74, 144, 217, 0.35), rgba(30, 58, 138, 0.25))"
            borderWidth="1px"
            borderColor="rgba(100, 170, 240, 0.45)"
            boxShadow="0 0 22px rgba(74, 144, 217, 0.28)"
          >
            <Radio size={22} strokeWidth={2} aria-hidden style={{ color: "white" }} />
          </Flex>
          <Stack gap={1} flex={1} minW={0}>
            <Text
              fontSize="xs"
              letterSpacing="0.12em"
              textTransform="uppercase"
              className="inter-semibold"
              color="rgba(147, 197, 253, 0.95)"
            >
              Replay-Archiv
            </Text>
            <Box
              as="h1"
              className="radley-regular"
              fontSize="clamp(1.75rem, 4vw, 2.25rem)"
              color="var(--color-text-primary)"
            >
              Live Sessions
            </Box>
          </Stack>
        </Flex>
        <Box
          h="2px"
          w={{ base: "100%", md: "min(300px, 100%)" }}
          borderRadius="full"
          bg="linear-gradient(90deg, rgba(74, 144, 217, 0) 0%, rgba(100, 170, 240, 0.95) 45%, rgba(74, 144, 217, 0.25) 100%)"
          boxShadow="0 0 18px rgba(74, 144, 217, 0.25)"
        />
        <Text className="inter" fontSize="sm" color="var(--color-text-muted)" maxW="42rem">
          Aufzeichnungen vergangener Live Calls — nach Kategorie sortiert, mit Detail-Ansicht wie im Institut. Videos
          liegen auf unserem sicheren Speicher.
        </Text>
      </Stack>
      <PageLiveSessionGrid categories={categories} sessions={sessions} />
    </Stack>
  );
}
