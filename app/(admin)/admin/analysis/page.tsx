import { Stack, Text } from "@chakra-ui/react";
import { AnalysisManager } from "@/components/admin/AnalysisManager";

export default function AdminAnalysisPage() {
  return (
    <Stack gap={8} maxW="var(--adminMaxWidth, 1440px)" mx="auto">
      <Stack spacing={2}>
        <Text as="h1" className="radley-regular" fontSize={{ base: "xl", md: "2xl" }} color="whiteAlpha.900">
          Weekly / Daily Analysis
        </Text>
        <Text className="inter" fontSize="sm" color="gray.500">
          Beiträge mit Bild und Text — erscheinen im Mitglieder-Feed unter Analyse.
        </Text>
      </Stack>
      <AnalysisManager />
    </Stack>
  );
}
