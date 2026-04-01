import { Box, Stack, Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageAnalysisFeed } from "@/components/platform/PageCards";
import { getAnalysisPosts, getCurrentUserAndProfile } from "@/lib/server-data";

export default async function AnalysisPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const posts = await getAnalysisPosts("all");

  return (
    <Stack gap={{ base: 6, md: 8 }}>
      <Stack gap={3}>
        <Text
          fontSize="xs"
          letterSpacing="0.14em"
          textTransform="uppercase"
          className="inter-semibold"
          bgGradient="linear(to-r, #fdba74, #93c5fd)"
          bgClip="text"
          color="transparent"
          sx={{ WebkitBackgroundClip: "text" }}
        >
          Markt & Analyse
        </Text>
        <Box
          as="h1"
          className="radley-regular"
          fontSize="clamp(1.75rem, 4vw, 2.25rem)"
          color="var(--color-text-primary)"
        >
          Weekly / Daily Analysis
        </Box>
        <Box
          h="2px"
          w={{ base: "100%", md: "min(320px, 100%)" }}
          borderRadius="full"
          bg="linear-gradient(90deg, rgba(255, 140, 60, 0.2) 0%, rgba(255, 170, 100, 0.95) 35%, rgba(147, 197, 253, 0.95) 70%, rgba(74, 144, 217, 0.2) 100%)"
          boxShadow="0 0 20px rgba(212, 175, 55, 0.15)"
        />
        <Text className="inter" fontSize="sm" color="var(--color-text-muted)" maxW="42rem">
          Einblicke und Marktkommentare vom Team — chronologisch, nur Lesezugriff für Mitglieder. Weekly-Beiträge in warmem
          Orange-Ton, Daily-Updates in kühlem Blau.
        </Text>
      </Stack>
      <PageAnalysisFeed posts={posts} />
    </Stack>
  );
}
