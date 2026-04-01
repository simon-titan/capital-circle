import { Box, Stack, Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageArsenalAttachmentsBrowser } from "@/components/platform/PageCards";
import { getArsenalAttachmentsByKind, getCurrentUserAndProfile } from "@/lib/server-data";

export default async function ArsenalPdfsPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const items = await getArsenalAttachmentsByKind("pdf");

  return (
    <Stack gap={{ base: 6, md: 8 }}>
      <Stack gap={3}>
        <Text
          fontSize="xs"
          letterSpacing="0.12em"
          textTransform="uppercase"
          className="inter-semibold"
          color="#fdba74"
        >
          Arsenal · Dokumente
        </Text>
        <Box
          h="2px"
          w={{ base: "100%", md: "min(280px, 100%)" }}
          borderRadius="full"
          bg="linear-gradient(90deg, rgba(255, 130, 70, 0) 0%, rgba(255, 170, 100, 0.9) 45%, rgba(255, 130, 70, 0.25) 100%)"
          boxShadow="0 0 18px rgba(255, 130, 70, 0.22)"
        />
      </Stack>
      <PageArsenalAttachmentsBrowser
        items={items}
        title="PDFs"
        subtitle="Dokumente und PDFs aus dem Institut. Filtere nach Modul, Video und Kategorie oder nutze die Freitextsuche. Kategorien verwaltest du im Admin unter Arsenal."
        accentColor="orange"
      />
    </Stack>
  );
}
