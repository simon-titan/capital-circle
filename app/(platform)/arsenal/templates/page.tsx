import { Box, Stack, Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageArsenalAttachmentsBrowser } from "@/components/platform/PageCards";
import { getArsenalAttachmentsByKind, getCurrentUserAndProfile } from "@/lib/server-data";

export default async function ArsenalTemplatesPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const items = await getArsenalAttachmentsByKind("template");

  return (
    <Stack gap={{ base: 6, md: 8 }}>
      <Stack gap={3}>
        <Text
          fontSize="xs"
          letterSpacing="0.12em"
          textTransform="uppercase"
          className="inter-semibold"
          color="#c4b5fd"
        >
          Arsenal · Vorlagen
        </Text>
        <Box
          h="2px"
          w={{ base: "100%", md: "min(280px, 100%)" }}
          borderRadius="full"
          bg="linear-gradient(90deg, rgba(139, 92, 246, 0) 0%, rgba(167, 139, 250, 0.9) 45%, rgba(139, 92, 246, 0.25) 100%)"
          boxShadow="0 0 18px rgba(139, 92, 246, 0.28)"
        />
      </Stack>
      <PageArsenalAttachmentsBrowser
        items={items}
        title="Templates"
        subtitle="Vorlagen für Trading-Software und Arbeitsabläufe. Filtere nach Modul, Video und Kategorie oder nutze die Suche. Kategorien legst du im Admin unter Arsenal an."
        accentColor="purple"
      />
    </Stack>
  );
}
