import { Box, Stack } from "@chakra-ui/react";
import { AdminPageHeader } from "@/components/admin/adminUi";
import { ArsenalManager } from "@/components/admin/ArsenalManager";
import { StandaloneAttachmentManager } from "@/components/admin/StandaloneAttachmentManager";

export default function AdminArsenalPage() {
  return (
    <Box maxW="var(--adminMaxWidth, 1440px)" mx="auto">
      <AdminPageHeader
        title="Arsenal"
        subtitle="Tools, Fremdkapital, eigene Kategorien für Templates/PDFs sowie Datei-Uploads pro Modul/Video."
      />
      <Stack spacing={8}>
        <StandaloneAttachmentManager />
        <ArsenalManager />
      </Stack>
    </Box>
  );
}
