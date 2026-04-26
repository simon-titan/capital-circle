import { Stack, Text } from "@chakra-ui/react";
import { NewsManager } from "@/components/admin/NewsManager";

export default function AdminNewsPage() {
  return (
    <Stack gap={8} maxW="var(--adminMaxWidth, 1440px)" mx="auto">
      <Stack spacing={2}>
        <Text as="h1" className="radley-regular" fontSize={{ base: "xl", md: "2xl" }} color="whiteAlpha.900">
          Capital Circle News
        </Text>
        <Text className="inter" fontSize="sm" color="gray.500">
          Kurze News-Beitraege fuer alle Mitglieder (Free &amp; Paid). Interaktionen: Like, Kommentar (max. 1 pro
          User), Speichern.
        </Text>
      </Stack>
      <NewsManager />
    </Stack>
  );
}
